/**
 * Mock DataNinja eBR data.
 *
 * Values mirror the target-state mockup (GalaxyPHar_Lowdemo_UIFD.html) so the
 * prototype tells the same story Sumesh screen-shared. Swap this module for a
 * real connector once read paths are known — nothing above it changes.
 */

export interface BatchStep {
  number: number
  title: string
  state: 'complete' | 'in_progress' | 'pending'
}

export interface MockBatch {
  id: string
  product: string
  productCode: string
  workOrder: string
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
  steps: BatchStep[]
  disposition: 'In execution' | 'Sent' | 'Held' | 'Awaiting QA review'
  finishedLot?: string
  vialsProduced?: number
}

export const MOCK_BATCHES: Record<string, MockBatch> = {
  'BR-2026-0417': {
    id: 'BR-2026-0417',
    product: 'Cefazolin 1 g',
    productCode: 'GX-CEF-1G',
    workOrder: 'WO-11492',
    mbr: 'MC-MBR-0217 r4',
    currentStep: 14,
    totalSteps: 41,
    operator: 'R. Menendez (trained)',
    holdStart: '2026-08-25T08:31:00',
    holdLimitHours: 8,
    holdExpires: '2026-08-25T16:35:00',
    bulkVolumeLitres: 18.4,
    bagCount: 12,
    bagWeightsKg: [1.502, 1.497, 1.511, 1.488, 1.505],
    bagWeightRange: [1.48, 1.52],
    balance: 'BAL-04',
    balanceCalValidTo: '2026-09-12',
    disposition: 'In execution',
    finishedLot: 'GX-CEF-1G-260820',
    vialsProduced: 480,
    steps: [
      { number: 11, title: 'Line clearance verified', state: 'complete' },
      { number: 12, title: 'Bulk pooling · hold start 08:31', state: 'complete' },
      { number: 13, title: 'Bulk volume 18.4 L recorded', state: 'complete' },
      { number: 14, title: 'Per-bag weight — 12 bags', state: 'in_progress' },
      { number: 15, title: 'Fill · IPC every 30 min', state: 'pending' },
      { number: 16, title: 'In-process sample IP-0417-3', state: 'pending' },
      { number: 17, title: 'Label lot verification', state: 'pending' },
      { number: 18, title: 'Custody handoff to QC', state: 'pending' },
    ],
  },
  'BR-2026-0414': {
    id: 'BR-2026-0414',
    product: 'Cefazolin 1 g',
    productCode: 'GX-CEF-1G',
    workOrder: 'WO-11488',
    mbr: 'MC-MBR-0217 r4',
    currentStep: 41,
    totalSteps: 41,
    operator: 'D. Okafor (trained)',
    holdStart: '2026-08-20T07:10:00',
    holdLimitHours: 8,
    holdExpires: '2026-08-20T15:10:00',
    bulkVolumeLitres: 18.2,
    bagCount: 12,
    bagWeightsKg: [],
    bagWeightRange: [1.48, 1.52],
    balance: 'BAL-04',
    balanceCalValidTo: '2026-09-12',
    disposition: 'Sent',
    finishedLot: 'GX-CEF-1G-260814',
    vialsProduced: 476,
    steps: [],
  },
  'BR-2026-0415': {
    id: 'BR-2026-0415',
    product: 'Cefazolin 1 g',
    productCode: 'GX-CEF-1G',
    workOrder: 'WO-11490',
    mbr: 'MC-MBR-0217 r4',
    currentStep: 33,
    totalSteps: 41,
    operator: 'L. Grant (trained)',
    holdStart: '2026-08-22T08:02:00',
    holdLimitHours: 8,
    holdExpires: '2026-08-22T16:02:00',
    bulkVolumeLitres: 18.5,
    bagCount: 12,
    bagWeightsKg: [],
    bagWeightRange: [1.48, 1.52],
    balance: 'BAL-04',
    balanceCalValidTo: '2026-09-12',
    disposition: 'Awaiting QA review',
    finishedLot: 'GX-CEF-1G-260816',
    vialsProduced: 480,
    steps: [],
  },
  'BR-2026-0418': {
    id: 'BR-2026-0418',
    product: 'Cefazolin 1 g',
    productCode: 'GX-CEF-1G',
    workOrder: 'WO-11495',
    mbr: 'MC-MBR-0217 r4',
    currentStep: 9,
    totalSteps: 41,
    operator: 'R. Menendez (trained)',
    holdStart: '2026-08-25T11:40:00',
    holdLimitHours: 8,
    holdExpires: '2026-08-25T19:40:00',
    bulkVolumeLitres: 18.1,
    bagCount: 12,
    bagWeightsKg: [],
    bagWeightRange: [1.48, 1.52],
    balance: 'BAL-04',
    balanceCalValidTo: '2026-09-12',
    disposition: 'In execution',
    finishedLot: 'GX-CEF-1G-260821',
    vialsProduced: 176,
    steps: [],
  },
}

/** The SOP that governs bulk hold time — cited on every hold-time advisory. */
export const HOLD_TIME_SOP = 'MC-SOP-PR-022 r5 (effective)'

/** SOPs effective for the compounding process, as the SOP register would return. */
export const EFFECTIVE_SOPS = [
  { id: 'MC-SOP-PR-022 r5', title: 'Bulk hold time and pooling', effective: '2026-06-01' },
  { id: 'MC-SOP-PR-014 r3', title: 'Per-bag weight verification', effective: '2026-03-15' },
  { id: 'MC-SOP-QA-014 r7', title: 'Batch record review and release', effective: '2026-08-01' },
  { id: 'MC-SOP-EM-006 r2', title: 'Environmental monitoring — ISO-7', effective: '2025-11-20' },
]
