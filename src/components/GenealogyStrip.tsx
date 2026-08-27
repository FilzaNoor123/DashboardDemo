import type { GenealogyTrace } from '@/lib/agent/types'

export function GenealogyStrip({ trace }: { trace: GenealogyTrace }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Forward trace</h2>
        <p className="mt-0.5 text-[13px] text-slate-600">
          Vendor lot through to customer. Each hop is a consumption or shipment record, not an
          inference.
        </p>
      </header>

      {/* Wide on desktop, scrolls inside itself on narrow screens. */}
      <div className="overflow-x-auto px-5 py-4">
        <ol className="flex min-w-max items-stretch gap-2">
          {trace.nodes.map((node, index) => (
            <li key={node.stage} className="flex items-stretch gap-2">
              <div className="w-44 rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {node.stage}
                </p>
                <p className="mt-1 font-mono text-[13px] text-slate-900">{node.id}</p>
                {node.detail.map((line) => (
                  <p key={line} className="mt-0.5 text-[12px] leading-snug text-slate-600">
                    {line}
                  </p>
                ))}
              </div>

              {index < trace.nodes.length - 1 ? (
                <span className="self-center text-slate-300" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
