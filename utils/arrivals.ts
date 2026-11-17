// Arrivals: KMB ETA rows as the user sees them at a given moment (Now / N min / unknown), recomputed
// on every clock tick. The one place that decides which buses count, in what order, and when one has left.

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

export type UpcomingArrival = { eta: string; time: ArrivalTime }

// One KMB ETA row as Arrivals reads it. `dir` and `seq` are present on rows from the API.
export type ArrivalRow = { eta: string; dir?: string; seq?: number | string }
// Which buses to keep: those going `dir`, and on a circular Route, those at position `seq`.
export type ArrivalFilter = { dir: string; seq?: number | string }

const matches = (row: ArrivalRow, filter?: ArrivalFilter): boolean => {
  if (!filter) return true
  if (row.dir !== filter.dir) return false
  // KMB rows always carry `seq`; a row without one can only be told apart by direction.
  return filter.seq === undefined || row.seq === undefined || Number(row.seq) === Number(filter.seq)
}

/**
 * The buses still to come, as the user sees them at `now`: soonest first, buses that have left
 * dropped, buses with no time last.
 */
export function arrivals(rows: readonly ArrivalRow[], now: string, filter?: ArrivalFilter): UpcomingArrival[] {
  return rows
    .filter(row => matches(row, filter))
    .map(({ eta }) => ({ eta, minutes: minutesUntil(eta, now) }))
    .filter(a => a.minutes === null || a.minutes > -GONE_AFTER_MINUTES)
    .sort((a, b) => (a.minutes === null ? (b.minutes === null ? 0 : 1) : b.minutes === null ? -1 : a.minutes - b.minutes))
    .map(({ eta }) => ({ eta, time: arrivalTime(eta, now) }))
}

/** The next `count` buses that have a time and have not left, soonest first. */
export function upcomingArrivals(rows: readonly ArrivalRow[], now: string, count: number, filter?: ArrivalFilter): UpcomingArrival[] {
  return arrivals(rows, now, filter)
    .filter(a => a.time.kind !== 'unknown')
    .slice(0, count)
}

export function routeRow(rows: readonly ArrivalRow[], now: string): RouteRow {
  const [first, second] = arrivals(rows, now)
  return {
    next: first ? first.time : { kind: 'unknown' },
    then: second?.time.kind === 'minutes' ? second.time.minutes : null,
  }
}
