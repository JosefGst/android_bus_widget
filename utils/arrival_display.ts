// What a Route row shows for its arrivals, recomputed from the ETA times on every clock tick.

export type ArrivalTime = { kind: 'now' } | { kind: 'minutes'; minutes: number } | { kind: 'unknown' }
export type RouteRow = { next: ArrivalTime; then: number | null }

const MS_PER_MINUTE = 60_000
// A bus this far past its ETA has left; the board refreshes every 30 s, so drop it in between.
const GONE_AFTER_MINUTES = 1

const minutesUntil = (eta: string, now: string): number | null => {
  const ms = Date.parse(eta) - Date.parse(now)
  return Number.isNaN(ms) ? null : ms / MS_PER_MINUTE
}

export function arrivalTime(eta: string, now: string): ArrivalTime {
  const minutes = minutesUntil(eta, now)
  if (minutes === null) return { kind: 'unknown' }
  const rounded = Math.round(minutes)
  return rounded <= 0 ? { kind: 'now' } : { kind: 'minutes', minutes: rounded }
}

export function routeRow(arrivals: readonly { eta: string }[], now: string): RouteRow {
  const coming = arrivals.filter(({ eta }) => {
    const minutes = minutesUntil(eta, now)
    return minutes === null || minutes > -GONE_AFTER_MINUTES
  })
  const [first, second] = coming
  const after = second ? arrivalTime(second.eta, now) : null
  return {
    next: first ? arrivalTime(first.eta, now) : { kind: 'unknown' },
    then: after?.kind === 'minutes' ? after.minutes : null,
  }
}
