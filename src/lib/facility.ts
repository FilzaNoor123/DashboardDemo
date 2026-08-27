import type { RoomLimits, RoomReading } from './connectors/domain'

/**
 * Facility knowledge that is not held in any of the four systems.
 *
 * The cascade order — which room must be at higher pressure than which — comes
 * from the facility's qualified design, not from OceaView, which only reports
 * numbers. It is therefore configuration here, and it MUST be confirmed
 * against the room qualification package before this is used for real.
 */
export const CASCADE_PAIRS: Array<{ from: string; to: string }> = [
  { from: 'Buffer Room Front', to: 'Gowning Room' },
  { from: 'Gowning Room', to: 'Ante Room' },
]

export interface CascadeResult {
  from: string
  to: string
  differentialPa: number
  passes: boolean
  /** True when air is flowing toward the cleaner room — a containment failure. */
  reversed: boolean
}

/**
 * Derive cascade differentials from logged room pressures.
 *
 * Note the difference between the two failure modes: a differential that is
 * positive but small is under-pressure; a NEGATIVE differential means the
 * cascade has inverted. The second is not a worse version of the first.
 */
export function computeCascades(
  readings: RoomReading[],
  limits: RoomLimits,
): CascadeResult[] {
  const byLocation = new Map(readings.map((reading) => [reading.location, reading]))
  const results: CascadeResult[] = []

  for (const pair of CASCADE_PAIRS) {
    const from = byLocation.get(pair.from)
    const to = byLocation.get(pair.to)
    if (!from || !to || from.pressurePa === null || to.pressurePa === null) continue

    const differentialPa = Number((from.pressurePa - to.pressurePa).toFixed(2))
    results.push({
      from: pair.from,
      to: pair.to,
      differentialPa,
      passes: differentialPa >= limits.minDifferentialPa,
      reversed: differentialPa < 0,
    })
  }

  return results
}
