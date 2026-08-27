/**
 * Mock QMS data — deviations and CAPA.
 * DEV-2026-0093 is the gate blocking release of BR-2026-0417 in the mockup.
 */

export interface MockDeviation {
  id: string
  batch: string
  title: string
  opened: string
  status: 'Open' | 'Under review' | 'Closed'
  blocksRelease: boolean
  owner: string
  narrative: string
}

export const MOCK_DEVIATIONS: MockDeviation[] = [
  {
    id: 'DEV-2026-0093',
    batch: 'BR-2026-0417',
    title: 'Hold-time overrun — bulk held 42 min beyond 8 h limit',
    opened: '2026-08-20T16:35:00',
    status: 'Open',
    blocksRelease: true,
    owner: 'QA',
    narrative: 'AI draft ready — narrative due. Closure blocks batch release.',
  },
  {
    id: 'DEV-2026-0088',
    batch: 'BR-2026-0415',
    title: 'Visual inspection — 7 vials rejected at AQL, above trend',
    opened: '2026-08-22T11:20:00',
    status: 'Under review',
    blocksRelease: false,
    owner: 'Packaging QA',
    narrative: 'Within AQL limit. Trending review requested.',
  },
  {
    id: 'DEV-2026-0071',
    batch: 'BR-2026-0414',
    title: 'Anteroom pressure differential excursion',
    opened: '2026-08-19T07:45:00',
    status: 'Closed',
    blocksRelease: false,
    owner: 'Facilities',
    narrative: 'HVAC damper adjusted. Closed 21 Aug.',
  },
]

export const QMS_READ_AT = '2026-08-25T14:44:00'
