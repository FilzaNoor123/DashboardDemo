import type { Finding, FindingStatus } from '@/lib/agent/types'
import { stamp } from '@/lib/agent/format'

const STATUS_STYLES: Record<FindingStatus, { dot: string; chip: string; label: string }> = {
  ok: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', label: 'In limit' },
  attention: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-900 ring-amber-200', label: 'Attention' },
  breach: { dot: 'bg-rose-600', chip: 'bg-rose-50 text-rose-800 ring-rose-200', label: 'Out of limit' },
  info: { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 ring-slate-200', label: 'Info' },
}

export function FindingRow({ finding }: { finding: Finding }) {
  const style = STATUS_STYLES[finding.status]

  return (
    <div className="border-t border-slate-200 px-5 py-4 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {finding.label}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${style.chip}`}
            >
              {style.label}
            </span>
          </div>

          <p className="mt-1 text-[15px] leading-snug text-slate-900">{finding.value}</p>

          {finding.note ? (
            <p className="mt-1 text-[13px] leading-snug text-slate-600">{finding.note}</p>
          ) : null}

          {/*
            Provenance is not decoration. Every value on this screen names the
            system, the record and the read time so the reader can go and check
            it. A claim without this line must never render.
          */}
          <p className="mt-2 font-mono text-[11px] leading-snug text-slate-500">
            from {finding.source.system} · {finding.source.record}
            {finding.source.document ? ` · ${finding.source.document}` : ''} · read{' '}
            {stamp(finding.source.readAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
