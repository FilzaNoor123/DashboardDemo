/**
 * Control class as shown on the target-state mockup.
 *  1 = non-GxP  — commercial / planning information, no GMP impact
 *  2 = advisory — touches a GMP process, still advisory only
 *
 * NOTE: these definitions are a working assumption. Confirm with QA
 * before anything here goes near a real record. (Dasboard.md §7.4)
 */
export type ControlClass = 1 | 2

// Defined once, with the connector ports — the agent's vocabulary for a
// system and the connector's must never drift apart.
export type { SourceSystem } from '@/lib/connectors/ports'
import type { SourceSystem } from '@/lib/connectors/ports'

/**
 * Provenance for a single fact. Every rendered value carries one of these —
 * a claim without a source ref must never reach the screen.
 */
export interface SourceRef {
  system: SourceSystem
  /** The released record the value was drawn from, e.g. "eBR step 12". */
  record: string
  /** When the source system was read. Freshness is part of the claim. */
  readAt: string
  /** Optional controlling document, e.g. "MC-SOP-PR-022 r5 (effective)". */
  document?: string
}

export type FindingStatus = 'ok' | 'attention' | 'breach' | 'info'

/** One line of an answer: a label, a value, a status, and where it came from. */
export interface Finding {
  label: string
  value: string
  status: FindingStatus
  /** Why the status is what it is — the limit, the rule, the threshold. */
  note?: string
  source: SourceRef
}

export interface Advisory {
  controlClass: ControlClass
  /**
   * Retrieval confidence — how sure we are the right records were found and
   * joined. This is NOT model confidence and NOT data-freshness confidence.
   * Keeping them apart matters for an inspector. (Dasboard.md §7.3)
   */
  retrievalConfidence: number
  headline: string
  detail: string
  sources: SourceRef[]
}

export type Intent = 'batch_status' | 'lot_impact' | 'room_conditions' | 'unknown'

/**
 * A system that could not be read, and why.
 *
 * Rendered alongside the answer rather than swallowed. An answer assembled
 * from three systems when four were asked is incomplete, and the reader has to
 * be told which one is missing before they act on what is there.
 */
export interface SystemNote {
  system: SourceSystem
  kind: 'not_configured' | 'discovery_pending' | 'unavailable'
  message: string
}

export interface AgentAnswer {
  intent: Intent
  /** Echo of what the agent understood, so the human can check the reading. */
  interpretation: string
  /** Which systems were queried, in order of fan-out. */
  systemsQueried: SourceSystem[]
  findings: Finding[]
  advisories: Advisory[]
  /** Systems that failed to answer, with the reason. Never silently dropped. */
  notes: SystemNote[]
  /** Populated for lot_impact — the trace the answer was computed over. */
  genealogy?: GenealogyTrace
  /** Set when the agent could not read the question. */
  fallback?: string
  elapsedMs: number
}

export interface GenealogyNode {
  stage: string
  id: string
  detail: string[]
}

export interface GenealogyTrace {
  nodes: GenealogyNode[]
  affectedBatches: string[]
  affectedCustomers: string[]
  vialsInScope: number
  vialsShipped: number
}
