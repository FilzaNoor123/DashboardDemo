'use client'

import { useState, useTransition } from 'react'
import { askAgent } from '@/app/actions'
import type { AgentAnswer } from '@/lib/agent/types'
import { AdvisoryCard } from './AdvisoryCard'
import { FindingRow } from './FindingRow'
import { GenealogyStrip } from './GenealogyStrip'
import { SystemNotes } from './SystemNotes'

const EXAMPLES = [
  'For BR-2026-0417 — room temperature, approved SOPs, deviation status and shipment status',
  'If VL-4471C were withdrawn, which batches and customers are in scope?',
  'Room conditions right now against the limits',
  'BR-2026-0417 hold time and per-bag weights',
]

export function QueryConsole() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AgentAnswer | null>(null)
  const [asked, setAsked] = useState('')
  const [isPending, startTransition] = useTransition()

  function ask(raw: string) {
    const trimmed = raw.trim()
    if (trimmed.length === 0) return

    setAsked(trimmed)
    startTransition(async () => {
      setAnswer(await askAgent(trimmed))
    })
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          ask(question)
        }}
        className="rounded-md border border-slate-200 bg-white p-5"
      >
        <label htmlFor="q" className="block text-sm font-semibold text-slate-900">
          Ask across DataNinja, NetSuite, QMS and OceaView
        </label>
        <p className="mt-1 text-[13px] text-slate-600">
          Name a batch, a vendor lot, or ask about room conditions. Every answer is read-only.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="q"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. For BR-2026-0417 — room temp, SOPs, deviation and shipment status"
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-[14px] outline-none focus:border-navy-700 focus:ring-1 focus:ring-navy-700"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-navy-900 px-5 py-2 text-[14px] font-medium text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {isPending ? 'Reading…' : 'Ask'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuestion(example)
                ask(example)
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-left text-[12px] text-slate-700 transition hover:border-navy-700 hover:text-navy-900"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {isPending ? <FanOutSkeleton /> : null}

      {!isPending && answer ? <AnswerView answer={answer} asked={asked} /> : null}
    </div>
  )
}

function FanOutSkeleton() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">Fanning out across the systems of record…</p>
      <div className="mt-3 space-y-2">
        {['DataNinja', 'OceaView', 'QMS', 'NetSuite'].map((system) => (
          <div key={system} className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
            <span className="font-mono text-[12px] text-slate-500">reading {system}…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnswerView({ answer, asked }: { answer: AgentAnswer; asked: string }) {
  return (
    <div className="space-y-6">
      <SystemNotes notes={answer.notes} />

      <section className="rounded-md border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-5 py-4">
          <p className="text-[13px] text-slate-500">You asked</p>
          <p className="mt-0.5 text-[15px] text-slate-900">{asked}</p>

          {/*
            The agent's reading of the question is shown back deliberately. If it
            misread the ask, the human sees that before they trust the numbers.
          */}
          <p className="mt-3 text-[13px] text-slate-500">Understood as</p>
          <p className="mt-0.5 text-[14px] text-slate-800">{answer.interpretation}</p>

          {answer.systemsQueried.length > 0 ? (
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              queried {answer.systemsQueried.join(' · ')} · {answer.elapsedMs} ms
            </p>
          ) : null}
        </header>

        {answer.fallback ? (
          <p className="px-5 py-4 text-[14px] text-slate-700">{answer.fallback}</p>
        ) : (
          <div>
            {answer.findings.map((finding, index) => (
              <FindingRow key={`${finding.label}-${index}`} finding={finding} />
            ))}
          </div>
        )}
      </section>

      {answer.genealogy ? <GenealogyStrip trace={answer.genealogy} /> : null}

      {answer.advisories.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Advisories</h2>
          {answer.advisories.map((advisory, index) => (
            <AdvisoryCard key={index} advisory={advisory} />
          ))}
        </section>
      ) : null}

      <p className="rounded-md border border-slate-200 bg-white px-5 py-4 text-[13px] leading-relaxed text-slate-600">
        Nothing on this screen has been written to a GMP record. Acknowledging, signing, raising a
        deviation or setting a disposition happens in the source system, by a named person, under
        their own Part 11 signature.
      </p>
    </div>
  )
}
