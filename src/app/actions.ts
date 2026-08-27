'use server'

import { parseQuery } from '@/lib/agent/intent'
import { resolve } from '@/lib/agent/resolve'
import type { AgentAnswer } from '@/lib/agent/types'

/**
 * The single entry point from the UI.
 *
 * It reads and composes. There is deliberately no counterpart action that
 * writes, signs, acknowledges into a source system or sets a disposition —
 * acknowledging an advisory is a human act inside DataNinja, not here.
 */
export async function askAgent(question: string): Promise<AgentAnswer> {
  const parsed = parseQuery(question)
  return resolve(parsed)
}
