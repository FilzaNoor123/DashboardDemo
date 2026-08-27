import type { ConnectorMode } from '@/lib/connectors/config'
import type { SourceSystem } from '@/lib/connectors/ports'

/**
 * Which systems are real right now.
 *
 * Always visible, because "is this number from the actual eBR or from a
 * fixture" is the first thing anyone looking at a GMP-adjacent screen needs to
 * know, and it must never be inferred from how convincing the page looks.
 */
export function ConnectorBanner({ modes }: { modes: Record<SourceSystem, ConnectorMode> }) {
  const entries = Object.entries(modes) as Array<[SourceSystem, ConnectorMode]>
  const liveCount = entries.filter(([, mode]) => mode === 'live').length
  const allMock = liveCount === 0

  return (
    <div
      className={
        allMock ? 'border-b border-amber-200 bg-amber-50' : 'border-b border-sky-200 bg-sky-50'
      }
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2">
        <p className={`text-[12px] ${allMock ? 'text-amber-900' : 'text-sky-900'}`}>
          {allMock
            ? 'Prototype · every value below comes from mock data. Not for GMP use.'
            : `${liveCount} of ${entries.length} systems live · mixed data. Check each value's source line.`}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {entries.map(([system, mode]) => (
            <span
              key={system}
              className={`rounded px-2 py-0.5 font-mono text-[11px] ring-1 ${
                mode === 'live'
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                  : 'bg-white text-slate-600 ring-slate-300'
              }`}
            >
              {system} · {mode}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
