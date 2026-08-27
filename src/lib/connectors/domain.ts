/**
 * The shapes the agent reasons over.
 *
 * These are OUR types, not any vendor's. A connector's job is to translate
 * whatever DataNinja / NetSuite / QMS / OceaView actually return into these.
 * That is the whole point of the connector layer: when a vendor changes its
 * payload, one adapter changes and the agent does not.
 */

export type BatchDisposition = 'In execution' | 'Sent' | 'Held' | 'Awaiting QA review'

export interface BatchStep {
  number: number
  title: string
  state: 'complete' | 'in_progress' | 'pending'
}

export interface BatchRecord {
  id: string
  product: string
  productCode: string
  workOrder: string
  /** Master batch record and revision, e.g. "MC-MBR-0217 r4". */
  mbr: string
  currentStep: number
  totalSteps: number
  operator: string
  holdStart: string
  holdLimitHours: number
  holdExpires: string
  bulkVolumeLitres: number
  bagCount: number
  bagWeightsKg: number[]
  bagWeightRange: [number, number]
  balance: string
  balanceCalValidTo: string
  disposition: BatchDisposition
  steps: BatchStep[]
  finishedLot?: string
  vialsProduced?: number
}

export interface Sop {
  id: string
  title: string
  effective: string
}

export interface VendorLot {
  id: string
  material: string
  vendor: string
  coaLinked: boolean
  receivedAt: string
  /** Batch ids that consumed this lot, from point-of-use transactions. */
  consumedBy: string[]
}

export interface CustodyEvent {
  when: string
  from: string
  to: string
  record: string
  /** True where the hop exists only on paper and cannot be verified here. */
  paperOnly?: boolean
}

export type OrderStatus = 'Shipped' | 'Allocated' | 'Held'

export interface Order {
  id: string
  customer: string
  vials: number
  finishedLot: string
  batch: string
  status: OrderStatus
  shipmentId?: string
  shippedAt?: string
}

export interface Allocation {
  releasedVials: number
  committedNextWeek: number
  shortfall: number
}

export type DeviationStatus = 'Open' | 'Under review' | 'Closed'

export interface Deviation {
  id: string
  batch: string
  title: string
  opened: string
  status: DeviationStatus
  blocksRelease: boolean
  owner: string
  narrative: string
}

export interface RoomReading {
  logger: string
  location: string
  temperatureC: number
  humidityRh: number
  /** null where the logger reports NA. */
  pressurePa: number | null
  nonViableTrend?: 'flat' | 'rising' | 'falling'
}

export interface RoomLimits {
  maxTemperatureC: number
  maxHumidityRh: number
  minDifferentialPa: number
}
