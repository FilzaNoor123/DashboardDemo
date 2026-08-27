import type { SystemNote } from '@/lib/agent/types'

const KIND_LABEL: Record<SystemNote['kind'], string> = {
  not_configured: 'Not configured',
  discovery_pending: 'Discovery pending',
  unavailable: 'Unavailable',
}

/**
 * Systems that did not answer.
 *
 * Shown, never swallowed. If NetSuite could not be read, the reader has to
 * know that the shipment picture in front of them is absent rather than empty —
 * those are very different things when the question is a recall.
 */
export function SystemNotes({ notes }: { notes: SystemNote[] }) {
  if (notes.length === 0) return null

  return (
    <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">
        {notes.length === 1 ? '1 system did not answer' : `${notes.length} systems did not answer`}
      </h2>
      <p className="mt-1 text-[13px] text-amber-900/80">
        This answer is incomplete. Treat anything those systems would have contributed as unknown,
        not as absent.
      </p>

      <ul className="mt-3 space-y-2">
        {notes.map((note, index) => (
          <li key={index} className="border-t border-amber-200 pt-2 first:border-t-0 first:pt-0">
            <p className="text-[13px] font-medium text-amber-900">
              {note.system} · {KIND_LABEL[note.kind]}
            </p>
            <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-amber-900/75">
              {note.message}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
