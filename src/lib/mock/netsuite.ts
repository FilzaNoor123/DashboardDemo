/**
 * Mock NetSuite ERP data — orders, allocation, shipment status.
 * Mirrors the mockup's FE-08 impact query and FE-01 allocation advisory.
 */

export interface MockOrder {
  id: string
  customer: string
  vials: number
  finishedLot: string
  batch: string
  shipmentId?: string
  status: 'Shipped' | 'Allocated' | 'Held'
  shippedAt?: string
}

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'SO-2026-7741',
    customer: "St. Peter's Health",
    vials: 200,
    finishedLot: 'GX-CEF-1G-260820',
    batch: 'BR-2026-0417',
    shipmentId: 'SHP-441029',
    status: 'Shipped',
    shippedAt: '2026-08-24T09:15:00',
  },
  {
    id: 'SO-2026-7702',
    customer: 'Albany Medical Center',
    vials: 420,
    finishedLot: 'GX-CEF-1G-260814',
    batch: 'BR-2026-0414',
    shipmentId: 'SHP-440887',
    status: 'Shipped',
    shippedAt: '2026-08-21T13:40:00',
  },
  {
    id: 'SO-2026-7718',
    customer: 'Ellis Hospital',
    vials: 286,
    finishedLot: 'GX-CEF-1G-260816',
    batch: 'BR-2026-0415',
    shipmentId: 'SHP-440951',
    status: 'Shipped',
    shippedAt: '2026-08-23T10:05:00',
  },
  {
    id: 'SO-2026-7756',
    customer: 'Albany Medical Center',
    vials: 340,
    finishedLot: 'GX-CEF-1G-260821',
    batch: 'BR-2026-0418',
    status: 'Allocated',
  },
  {
    id: 'SO-2026-7761',
    customer: "St. Peter's Health",
    vials: 366,
    finishedLot: 'GX-CEF-1G-260821',
    batch: 'BR-2026-0418',
    status: 'Allocated',
  },
]

/**
 * When NetSuite was last read. The mockup shows this on the impact query
 * ("shipment status is read from NetSuite at 14:31") because a recall answer
 * is only as good as the freshness of the shipment data behind it.
 */
export const NETSUITE_READ_AT = '2026-08-25T14:31:00'

/** Released stock vs committed demand — the Class 1 allocation advisory. */
export const ALLOCATION = {
  releasedVials: 466,
  committedNextWeek: 706,
  get shortfall(): number {
    return this.committedNextWeek - this.releasedVials
  },
}
