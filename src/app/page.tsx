import { ConnectorBanner } from '@/components/ConnectorBanner'
import { QueryConsole } from '@/components/QueryConsole'
import { getModes } from '@/lib/connectors/registry'

// Modes come from the environment, so this page reads them at request time
// rather than baking a build-time snapshot of which systems were live.
export const dynamic = 'force-dynamic'

export default function Page() {
  const modes = getModes()

  return (
    <main className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">Agent dashboard</h1>
            <p className="mt-0.5 text-[13px] text-slate-300">
              Query across DataNinja · NetSuite · QMS · OceaView — read-only, sourced, advisory
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-white/25 px-3 py-1 text-[12px]">
              AI advisory until HITL
            </span>
            <span className="rounded border border-white/25 px-3 py-1 text-[12px]">
              Albany 503B · Shift B
            </span>
          </div>
        </div>
      </header>

      <ConnectorBanner modes={modes} />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <QueryConsole />
      </div>
    </main>
  )
}
