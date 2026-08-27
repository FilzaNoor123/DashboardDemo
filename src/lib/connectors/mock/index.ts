import {
  EFFECTIVE_SOPS,
  MOCK_BATCHES,
} from '@/lib/mock/dataninja'
import { CUSTODY_TRAIL, MOCK_VENDOR_LOTS } from '@/lib/mock/genealogy'
import { ALLOCATION, MOCK_ORDERS, NETSUITE_READ_AT } from '@/lib/mock/netsuite'
import {
  BATCH_SUITE,
  MOCK_ROOM_READINGS,
  OCEAVIEW_READ_AT,
  ROOM_LIMITS,
} from '@/lib/mock/oceaview'
import { MOCK_DEVIATIONS, QMS_READ_AT } from '@/lib/mock/qms'
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
} from '../domain'
import type {
  DataNinjaPort,
  NetSuitePort,
  OceaViewPort,
  QmsPort,
  Sourced,
  SourceSystem,
} from '../ports'

/**
 * Fixture-backed connectors.
 *
 * They implement exactly the same ports as the live ones, so the agent cannot
 * tell them apart. That is what makes the swap a config change: nothing above
 * this layer knows whether a value came from a fixture or from NetSuite.
 *
 * Latency is simulated so the fan-out in the UI behaves like the real thing —
 * a demo where every answer is instant teaches the wrong expectation.
 */

const DATANINJA_READ_AT = '2026-08-25T14:46:00'

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function sourced<T>(
  data: T,
  system: SourceSystem,
  readAt: string,
  record: string,
  document?: string,
): Sourced<T> {
  return { data, system, readAt, record, document }
}

export class MockDataNinjaConnector implements DataNinjaPort {
  readonly system = 'DataNinja' as const

  async getBatch(batchId: string): Promise<Sourced<BatchRecord | null>> {
    await delay(120)
    const batch = MOCK_BATCHES[batchId] ?? null
    return sourced(
      batch,
      this.system,
      DATANINJA_READ_AT,
      `eBR ${batchId}`,
      batch?.mbr,
    )
  }

  async getEffectiveSops(): Promise<Sourced<Sop[]>> {
    await delay(50)
    return sourced(EFFECTIVE_SOPS, this.system, DATANINJA_READ_AT, 'SOP register')
  }

  async getVendorLot(lotId: string): Promise<Sourced<VendorLot | null>> {
    await delay(140)
    return sourced(
      MOCK_VENDOR_LOTS[lotId] ?? null,
      this.system,
      DATANINJA_READ_AT,
      'material consumption · point-of-use txn',
    )
  }

  async getCustodyTrail(_lotId: string): Promise<Sourced<CustodyEvent[]>> {
    await delay(60)
    return sourced(CUSTODY_TRAIL, this.system, DATANINJA_READ_AT, 'custody trail')
  }

  async getRecordedBagWeights(batchId: string): Promise<Sourced<number[]>> {
    await delay(40)
    return sourced(
      MOCK_BATCHES[batchId]?.bagWeightsKg ?? [],
      this.system,
      DATANINJA_READ_AT,
      'eBR step 14',
      'MC-SOP-PR-014 r3',
    )
  }
}

export class MockNetSuiteConnector implements NetSuitePort {
  readonly system = 'NetSuite' as const

  async getOrdersForBatches(batchIds: string[]): Promise<Sourced<Order[]>> {
    await delay(110)
    return sourced(
      MOCK_ORDERS.filter((order) => batchIds.includes(order.batch)),
      this.system,
      NETSUITE_READ_AT,
      'sales orders · shipments',
    )
  }

  async getAllocation(_productCode: string): Promise<Sourced<Allocation>> {
    await delay(70)
    const allocation: Allocation = {
      releasedVials: ALLOCATION.releasedVials,
      committedNextWeek: ALLOCATION.committedNextWeek,
      shortfall: ALLOCATION.shortfall,
    }
    return sourced(allocation, this.system, NETSUITE_READ_AT, 'NSAW lake · sales orders')
  }
}

export class MockQmsConnector implements QmsPort {
  readonly system = 'QMS' as const

  async getDeviations(batchId: string): Promise<Sourced<Deviation[]>> {
    await delay(70)
    return sourced(
      MOCK_DEVIATIONS.filter((deviation) => deviation.batch === batchId),
      this.system,
      QMS_READ_AT,
      `deviation register · ${batchId}`,
    )
  }
}

export class MockOceaViewConnector implements OceaViewPort {
  readonly system = 'OceaView' as const

  async getRoomReadings(locations?: string[]): Promise<Sourced<RoomReading[]>> {
    await delay(90)
    const readings = locations
      ? MOCK_ROOM_READINGS.filter((reading) => locations.includes(reading.location))
      : MOCK_ROOM_READINGS
    return sourced(
      readings,
      this.system,
      OCEAVIEW_READ_AT,
      'room log',
      'MET ONE 3400+ continuous',
    )
  }

  async getRoomLimits(): Promise<Sourced<RoomLimits>> {
    await delay(20)
    return sourced(ROOM_LIMITS, this.system, OCEAVIEW_READ_AT, 'monitoring limits')
  }

  async getSuiteForBatch(batchId: string): Promise<Sourced<string[]>> {
    await delay(30)
    return sourced(
      BATCH_SUITE[batchId] ?? [],
      this.system,
      OCEAVIEW_READ_AT,
      'suite assignment',
    )
  }
}
