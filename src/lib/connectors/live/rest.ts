import type { ConnectorConfig } from '../config'
import type {
  BatchRecord,
  CustodyEvent,
  Deviation,
  RoomLimits,
  RoomReading,
  Sop,
  VendorLot,
} from '../domain'
import {
  DiscoveryPendingError,
  type DataNinjaPort,
  type OceaViewPort,
  type QmsPort,
  type Sourced,
  type SourceSystem,
} from '../ports'
import { getJson, requireConfig } from './http'

/**
 * Live connectors for DataNinja, QMS and OceaView.
 *
 * Unlike NetSuite, these three are products whose API shape is not public and
 * was not established at the 25 Aug huddle. So rather than invent endpoints,
 * each read requires its path to be supplied explicitly through configuration.
 * Supply the path and a bearer token and the read works; leave it unset and
 * you get a named error saying exactly which discovery question is unanswered.
 *
 * The alternative — plausible-looking default endpoints — would fail at
 * runtime in a way that looks like a bug rather than a missing answer.
 */

interface PathConfig {
  [key: string]: string | undefined
}

abstract class RestReadConnector {
  protected constructor(
    protected readonly system: SourceSystem,
    protected readonly config: { baseUrl?: string; apiToken?: string },
    protected readonly paths: PathConfig,
    private readonly configHint: string,
  ) {}

  /**
   * Validated on first read, never in the constructor.
   *
   * Construction happens in the registry, outside any per-read error handling —
   * a constructor that throws takes down the whole answer, including the three
   * systems that were working. Deferring it here means a missing credential
   * degrades to a visible note on one system instead of a 500.
   */
  protected ensureConfigured(): void {
    requireConfig(this.system, this.config, ['baseUrl', 'apiToken'], this.configHint)
  }

  protected requirePath(key: string, question: string): string {
    // Credentials first: without them nothing works, so that is the more
    // actionable message when both are absent.
    this.ensureConfigured()

    const path = this.paths[key]
    if (!path) throw new DiscoveryPendingError(this.system, question)
    return path
  }

  protected async read<T>(
    path: string,
    search?: Record<string, string | number | undefined>,
  ): Promise<T> {
    this.ensureConfigured()
    return getJson<T>(this.system, this.config.baseUrl!, path, {
      headers: { Authorization: `Bearer ${this.config.apiToken}` },
      search,
    })
  }

  protected sourced<T>(data: T, record: string, document?: string): Sourced<T> {
    // Freshness is the moment of THIS read, never a value carried in fixtures.
    return {
      data,
      system: this.system,
      readAt: new Date().toISOString(),
      record,
      document,
    }
  }
}

/* ------------------------------------------------------------------ */

export class LiveDataNinjaConnector extends RestReadConnector implements DataNinjaPort {
  readonly system = 'DataNinja' as const

  constructor(config: ConnectorConfig['dataNinja']) {
    super(
      'DataNinja',
      config,
      {
        batch: process.env.DATANINJA_BATCH_PATH,
        sops: process.env.DATANINJA_SOP_PATH,
        vendorLot: process.env.DATANINJA_VENDOR_LOT_PATH,
        custody: process.env.DATANINJA_CUSTODY_PATH,
        bagWeights: process.env.DATANINJA_BAG_WEIGHTS_PATH,
      },
      'Ask Galaxy for a read-only API user on the eBR system, its base URL, and the endpoint paths.',
    )
  }

  async getBatch(batchId: string): Promise<Sourced<BatchRecord | null>> {
    const path = this.requirePath(
      'batch',
      'does DataNinja expose an eBR read endpoint, and at what path? Set DATANINJA_BATCH_PATH once known.',
    )
    const payload = await this.read<BatchRecord | null>(path.replace('{id}', batchId))
    return this.sourced(payload, `eBR ${batchId}`, payload?.mbr)
  }

  async getEffectiveSops(): Promise<Sourced<Sop[]>> {
    const path = this.requirePath(
      'sops',
      'where the SOP register lives and how "effective" is flagged. Set DATANINJA_SOP_PATH.',
    )
    return this.sourced(await this.read<Sop[]>(path), 'SOP register')
  }

  async getVendorLot(lotId: string): Promise<Sourced<VendorLot | null>> {
    const path = this.requirePath(
      'vendorLot',
      'how material consumption links a vendor lot to the batches that used it. Set DATANINJA_VENDOR_LOT_PATH.',
    )
    return this.sourced(
      await this.read<VendorLot | null>(path.replace('{id}', lotId)),
      'material consumption · point-of-use txn',
    )
  }

  async getCustodyTrail(lotId: string): Promise<Sourced<CustodyEvent[]>> {
    const path = this.requirePath(
      'custody',
      'whether the custody trail is queryable, and how the paper-only Production to QC hop is represented. Set DATANINJA_CUSTODY_PATH.',
    )
    return this.sourced(
      await this.read<CustodyEvent[]>(path.replace('{id}', lotId)),
      'custody trail',
    )
  }

  async getRecordedBagWeights(batchId: string): Promise<Sourced<number[]>> {
    const path = this.requirePath(
      'bagWeights',
      'how in-process step data (step 14 bag weights) is read back. Set DATANINJA_BAG_WEIGHTS_PATH.',
    )
    return this.sourced(
      await this.read<number[]>(path.replace('{id}', batchId)),
      'eBR step 14',
      'MC-SOP-PR-014 r3',
    )
  }
}

/* ------------------------------------------------------------------ */

export class LiveQmsConnector extends RestReadConnector implements QmsPort {
  readonly system = 'QMS' as const

  constructor(config: ConnectorConfig['qms']) {
    super(
      'QMS',
      config,
      { deviations: process.env.QMS_DEVIATIONS_PATH },
      'The QMS product itself was never named in the huddle — confirm whether it is Veeva, TrackWise, MasterControl or something else before wiring this.',
    )
  }

  async getDeviations(batchId: string): Promise<Sourced<Deviation[]>> {
    const path = this.requirePath(
      'deviations',
      'which QMS product this is and how deviations are filtered by batch. Set QMS_VENDOR and QMS_DEVIATIONS_PATH.',
    )
    return this.sourced(
      await this.read<Deviation[]>(path, { batch: batchId }),
      `deviation register · ${batchId}`,
    )
  }
}

/* ------------------------------------------------------------------ */

export class LiveOceaViewConnector extends RestReadConnector implements OceaViewPort {
  readonly system = 'OceaView' as const

  constructor(config: ConnectorConfig['oceaView']) {
    super(
      'OceaView',
      config,
      {
        readings: process.env.OCEAVIEW_READINGS_PATH,
        limits: process.env.OCEAVIEW_LIMITS_PATH,
        suite: process.env.OCEAVIEW_SUITE_PATH,
      },
      'If OceaView only produces scheduled exports rather than an API, set OCEAVIEW_EXPORT_PATH instead — a file-drop connector is then the right shape, not this one.',
    )
  }

  async getRoomReadings(locations?: string[]): Promise<Sourced<RoomReading[]>> {
    const path = this.requirePath(
      'readings',
      'whether OceaView exposes current readings over an API or only a scheduled export. Set OCEAVIEW_READINGS_PATH.',
    )
    return this.sourced(
      await this.read<RoomReading[]>(path, { locations: locations?.join(',') }),
      'room log',
      'MET ONE 3400+ continuous',
    )
  }

  async getRoomLimits(): Promise<Sourced<RoomLimits>> {
    const path = this.requirePath(
      'limits',
      'where the alarm limits are held — in OceaView, or in a validated document that QA maintains separately. This decides whether limits may be read at all. Set OCEAVIEW_LIMITS_PATH.',
    )
    return this.sourced(await this.read<RoomLimits>(path), 'monitoring limits')
  }

  async getSuiteForBatch(batchId: string): Promise<Sourced<string[]>> {
    const path = this.requirePath(
      'suite',
      'which system knows the room a batch was compounded in — OceaView, DataNinja, or neither. Set OCEAVIEW_SUITE_PATH.',
    )
    return this.sourced(
      await this.read<string[]>(path.replace('{id}', batchId)),
      'suite assignment',
    )
  }
}
