import type {
  Allocation,
  BatchRecord,
  CustodyEvent,
  Deviation,
  Order,
  RoomLimits,
  RoomReading,
  Sop,
  VendorLot,
} from './domain'

export type SourceSystem = 'DataNinja' | 'NetSuite' | 'QMS' | 'OceaView'

/**
 * Every read carries when it happened and which record it came from.
 *
 * Provenance is produced by the connector, not assembled later by the agent —
 * only the connector knows when it actually talked to the system and what it
 * asked for. An answer whose freshness is guessed downstream is not evidence.
 */
export interface Sourced<T> {
  data: T
  system: SourceSystem
  /** ISO timestamp of the read itself. */
  readAt: string
  /** The record or endpoint read, e.g. "eBR step 12 timestamps". */
  record: string
  /** Controlling document where one applies, e.g. "MC-SOP-PR-022 r5". */
  document?: string
}

/**
 * READ-ONLY BY CONSTRUCTION.
 *
 * No port below declares a create, update, sign, acknowledge or delete method,
 * and none ever should. In a 503B facility no software may create or alter a
 * GMP record on its own — so the absence is enforced by the type system, and
 * read-only credentials are the second layer, not the only one.
 */

export interface DataNinjaPort {
  system: 'DataNinja'
  getBatch(batchId: string): Promise<Sourced<BatchRecord | null>>
  getEffectiveSops(): Promise<Sourced<Sop[]>>
  getVendorLot(lotId: string): Promise<Sourced<VendorLot | null>>
  getCustodyTrail(lotId: string): Promise<Sourced<CustodyEvent[]>>
  /** Bag weights recorded so far against a batch. */
  getRecordedBagWeights(batchId: string): Promise<Sourced<number[]>>
}

export interface NetSuitePort {
  system: 'NetSuite'
  getOrdersForBatches(batchIds: string[]): Promise<Sourced<Order[]>>
  getAllocation(productCode: string): Promise<Sourced<Allocation>>
}

export interface QmsPort {
  system: 'QMS'
  getDeviations(batchId: string): Promise<Sourced<Deviation[]>>
}

export interface OceaViewPort {
  system: 'OceaView'
  getRoomReadings(locations?: string[]): Promise<Sourced<RoomReading[]>>
  /** Limits live with the monitoring system, not hard-coded in the agent. */
  getRoomLimits(): Promise<Sourced<RoomLimits>>
  /** Which rooms a batch was compounded in — needed to join batch to room. */
  getSuiteForBatch(batchId: string): Promise<Sourced<string[]>>
}

export interface Connectors {
  dataNinja: DataNinjaPort
  netSuite: NetSuitePort
  qms: QmsPort
  oceaView: OceaViewPort
}

/**
 * Thrown by a live connector that has been selected but not yet given what it
 * needs. The message names the missing piece so the failure is actionable
 * rather than a stack trace.
 */
export class ConnectorNotConfiguredError extends Error {
  constructor(
    public readonly system: SourceSystem,
    public readonly missing: string[],
    public readonly hint?: string,
  ) {
    super(
      `${system} connector is not configured. Missing: ${missing.join(', ')}.` +
        (hint ? ` ${hint}` : ''),
    )
    this.name = 'ConnectorNotConfiguredError'
  }
}

/**
 * Thrown where the integration shape itself is still unknown — the discovery
 * task has not answered what the system exposes. Distinct from a missing
 * credential: no secret will fix this one.
 */
export class DiscoveryPendingError extends Error {
  constructor(
    public readonly system: SourceSystem,
    public readonly question: string,
  ) {
    super(`${system}: cannot implement this read until discovery answers — ${question}`)
    this.name = 'DiscoveryPendingError'
  }
}
