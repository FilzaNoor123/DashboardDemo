/**
 * Mock lot genealogy — vendor lot through to customer.
 * This is the FE-08 trace: today it takes QA hours to rebuild by hand across
 * five systems, which is why it is one of the two prototype scenarios.
 */

export interface MockVendorLot {
  id: string
  material: string
  vendor: string
  coaLinked: boolean
  receivedAt: string
  /** Batches this vendor lot was consumed by. */
  consumedBy: string[]
}

export const MOCK_VENDOR_LOTS: Record<string, MockVendorLot> = {
  'VL-4471C': {
    id: 'VL-4471C',
    material: 'Cefazolin API',
    vendor: 'Hovione',
    coaLinked: true,
    receivedAt: '2026-08-20T09:14:00',
    consumedBy: ['BR-2026-0414', 'BR-2026-0415', 'BR-2026-0417', 'BR-2026-0418'],
  },
  'VL-2210F': {
    id: 'VL-2210F',
    material: 'WFI · 20 L bags',
    vendor: 'Baxter',
    coaLinked: true,
    receivedAt: '2026-08-18T11:02:00',
    consumedBy: ['BR-2026-0417', 'BR-2026-0418'],
  },
  'VL-9903A': {
    id: 'VL-9903A',
    material: 'Vials & stoppers',
    vendor: 'Schott',
    coaLinked: true,
    receivedAt: '2026-08-17T08:30:00',
    consumedBy: ['BR-2026-0414', 'BR-2026-0415', 'BR-2026-0417', 'BR-2026-0418'],
  },
}

export interface CustodyEvent {
  when: string
  from: string
  to: string
  record: string
  paperOnly?: boolean
}

export const CUSTODY_TRAIL: CustodyEvent[] = [
  { when: '2026-08-20T09:14:00', from: 'Hovione', to: 'Warehouse', record: 'RCV-88214 scan' },
  { when: '2026-08-20T11:02:00', from: 'Quarantine', to: 'Approved store', record: 'QA e-sig · J. Alvarez' },
  { when: '2026-08-20T07:40:00', from: 'Store', to: 'Staging wave', record: 'WAVE-3318' },
  { when: '2026-08-20T08:31:00', from: 'Staging', to: 'Compounding 2', record: 'Point-of-use txn' },
  { when: '2026-08-20T15:20:00', from: 'Production', to: 'QC', record: 'Paper only', paperOnly: true },
]
