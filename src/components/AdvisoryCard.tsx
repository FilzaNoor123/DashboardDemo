import type { Advisory } from '@/lib/agent/types'
import { stamp } from '@/lib/agent/format'

export function AdvisoryCard({ advisory }: { advisory: Advisory }) {
  const isGxp = advisory.controlClass === 2

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ring-1 ${
            isGxp
              ? 'bg-indigo-50 text-indigo-800 ring-indigo-200'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          Class {advisory.controlClass} · {isGxp ? 'advisory' : 'non-GxP'}
        </span>

        {/*
          Labelled "retrieval conf", not "conf". Retrieval confidence, model
          confidence and data freshness are three different things; collapsing
          them into one unlabelled number is what an inspector would object to.
        */}
        <span className="font-mono text-[11px] text-slate-500">
          retrieval conf {advisory.retrievalConfidence.toFixed(2)}
        </span>
      </div>

      <p className="mt-2 text-[15px] font-medium leading-snug text-slate-900">{advisory.headline}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{advisory.detail}</p>

      <ul className="mt-3 space-y-0.5">
        {advisory.sources.map((source, index) => (
          <li key={index} className="font-mono text-[11px] text-slate-500">
            from {source.system} · {source.record}
            {source.document ? ` · ${source.document}` : ''} · read {stamp(source.readAt)}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] uppercase tracking-wide text-slate-400">
        Advisory only — writes nothing to any record
      </p>
    </article>
  )
}
