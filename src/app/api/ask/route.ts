import { NextResponse } from 'next/server'
import { parseQuery } from '@/lib/agent/intent'
import { resolve } from '@/lib/agent/resolve'

/**
 * Read-only JSON endpoint over the same agent the UI uses.
 *
 * Prototype convenience: it makes the fan-out testable from a terminal and
 * lets someone try a question without the UI. It is GET-only and calls the
 * same resolve() path, so it cannot do anything the screen cannot.
 *
 * Before this goes anywhere real it needs the same auth and role scoping as
 * the rest of Atlas — an agent answering across systems must inherit the
 * asker's training, SOP-effectivity and role authority, not bypass them.
 */
export async function GET(request: Request) {
  const question = new URL(request.url).searchParams.get('q') ?? ''

  if (question.trim().length === 0) {
    return NextResponse.json({ error: 'Pass a question as ?q=' }, { status: 400 })
  }

  const answer = await resolve(parseQuery(question))
  return NextResponse.json(answer)
}
