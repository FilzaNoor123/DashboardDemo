import type { Intent } from './types'

export interface ParsedQuery {
  intent: Intent
  /** Batch id found in the question, if any. */
  batchId?: string
  /** Vendor lot id found in the question, if any. */
  vendorLotId?: string
  /** Which facets the asker actually wants, so the answer is not padded. */
  facets: Facet[]
  interpretation: string
}

export type Facet = 'room' | 'sop' | 'deviation' | 'shipment' | 'hold' | 'weights'

const BATCH_RE = /\bBR-\d{4}-\d{4}\b/i
const VENDOR_LOT_RE = /\bVL-\d{4}[A-Z]\b/i

const FACET_KEYWORDS: Array<{ facet: Facet; words: string[] }> = [
  { facet: 'room', words: ['room', 'temperature', 'temp', 'humidity', 'pressure', 'environmental', 'clean room', 'cleanroom', 'em'] },
  { facet: 'sop', words: ['sop', 'procedure', 'approved sop', 'effective'] },
  { facet: 'deviation', words: ['deviation', 'dev', 'capa', 'excursion', 'exception'] },
  { facet: 'shipment', words: ['ship', 'shipment', 'shipped', 'order', 'customer', 'allocation', 'stock'] },
  { facet: 'hold', words: ['hold', 'hold time', 'expiry', 'expire'] },
  { facet: 'weights', words: ['weight', 'bag', 'reconciliation'] },
]

const IMPACT_WORDS = ['withdraw', 'withdrawn', 'recall', 'impact', 'affected', 'in scope', 'quarantine', 'trace']

/**
 * Deterministic intent parsing for the prototype.
 *
 * This is the seam where an LLM goes later: swap the body for a model call that
 * returns the same ParsedQuery shape, and nothing downstream changes. Keeping
 * it rule-based for now means the prototype is reproducible in a demo and needs
 * no API key — and it makes the boundary explicit for whoever adds the model.
 */
export function parseQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase()
  const batchId = raw.match(BATCH_RE)?.[0].toUpperCase()
  const vendorLotId = raw.match(VENDOR_LOT_RE)?.[0].toUpperCase()

  const facets = FACET_KEYWORDS.filter(({ words }) => words.some((w) => q.includes(w))).map((f) => f.facet)

  const asksImpact = IMPACT_WORDS.some((w) => q.includes(w))

  if (vendorLotId && (asksImpact || !batchId)) {
    return {
      intent: 'lot_impact',
      vendorLotId,
      facets,
      interpretation: `Trace vendor lot ${vendorLotId} forward to every batch, finished lot, order and customer in scope.`,
    }
  }

  if (batchId) {
    // No facet named — the asker wants the whole picture for that batch.
    const wanted: Facet[] = facets.length > 0 ? facets : ['room', 'sop', 'deviation', 'shipment', 'hold']
    return {
      intent: 'batch_status',
      batchId,
      facets: wanted,
      interpretation: `Status of ${batchId}: ${wanted.map(facetLabel).join(', ')}.`,
    }
  }

  if (facets.includes('room')) {
    return {
      intent: 'room_conditions',
      facets: ['room'],
      interpretation: 'Current room conditions across all monitored locations, against the stated limits.',
    }
  }

  return {
    intent: 'unknown',
    facets: [],
    interpretation: 'Could not identify a batch, a vendor lot, or a room question in this request.',
  }
}

export function facetLabel(facet: Facet): string {
  switch (facet) {
    case 'room':
      return 'room conditions'
    case 'sop':
      return 'effective SOPs'
    case 'deviation':
      return 'deviation status'
    case 'shipment':
      return 'shipment status'
    case 'hold':
      return 'bulk hold time'
    case 'weights':
      return 'per-bag weights'
  }
}
