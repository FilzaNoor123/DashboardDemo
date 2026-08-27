/** Render an ISO timestamp the way the floor reads it: "25 Aug · 14:31". */
export function stamp(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const time = d.toTimeString().slice(0, 5)
  return `${day} ${month} · ${time}`
}

/** Minutes between two ISO timestamps, positive when b is after a. */
export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

export function hoursMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : ''
  const abs = Math.abs(totalMinutes)
  return `${sign}${Math.floor(abs / 60)} h ${abs % 60} m`
}
