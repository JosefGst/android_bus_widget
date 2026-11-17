import { arrivals, arrivalTime, routeRow, upcomingArrivals } from './arrivals'

const NOW = '2026-11-13T06:41:00Z'
const inMinutes = (minutes: number): string => new Date(Date.parse(NOW) + minutes * 60_000).toISOString()

describe('arrivalTime', () => {
  it('says the bus is here now when it is due within half a minute', () => {
    expect(arrivalTime(inMinutes(0.2), NOW)).toEqual({ kind: 'now' })
  })

  it('says a bus just past its time is here now, not a negative count', () => {
    expect(arrivalTime(inMinutes(-0.8), NOW)).toEqual({ kind: 'now' })
  })

  it('gives whole minutes for a bus that is on its way', () => {
    expect(arrivalTime(inMinutes(3), NOW)).toEqual({ kind: 'minutes', minutes: 3 })
    expect(arrivalTime(inMinutes(1), NOW)).toEqual({ kind: 'minutes', minutes: 1 })
  })

  it('says the time is unknown when the API gives none', () => {
    expect(arrivalTime('', NOW)).toEqual({ kind: 'unknown' })
    expect(arrivalTime('not-a-date', NOW)).toEqual({ kind: 'unknown' })
  })
})

describe('routeRow', () => {
  it('shows the next bus and the minutes of the one after it', () => {
    expect(routeRow([{ eta: inMinutes(3) }, { eta: inMinutes(15) }, { eta: inMinutes(27) }], NOW)).toEqual({
      next: { kind: 'minutes', minutes: 3 },
      then: 15,
    })
  })

  it('has no second bus when only one is coming', () => {
    expect(routeRow([{ eta: inMinutes(0) }], NOW)).toEqual({ next: { kind: 'now' }, then: null })
  })

  it('has no second bus when the one after has no time', () => {
    expect(routeRow([{ eta: inMinutes(4) }, { eta: '' }], NOW)).toEqual({
      next: { kind: 'minutes', minutes: 4 },
      then: null,
    })
  })

  it('is unknown when no arrivals are listed', () => {
    expect(routeRow([], NOW)).toEqual({ next: { kind: 'unknown' }, then: null })
  })

  it('moves on to the next bus once the first one has gone a minute past', () => {
    const later = inMinutes(5)
    expect(routeRow([{ eta: inMinutes(3) }, { eta: inMinutes(15) }], later)).toEqual({
      next: { kind: 'minutes', minutes: 10 },
      then: null,
    })
  })
})

describe('upcomingArrivals', () => {
  it('gives the next buses with their ETA, soonest first, at most the number asked for', () => {
    const etas = [{ eta: inMinutes(15) }, { eta: inMinutes(3) }, { eta: inMinutes(27) }]
    expect(upcomingArrivals(etas, NOW, 2)).toEqual([
      { eta: inMinutes(3), time: { kind: 'minutes', minutes: 3 } },
      { eta: inMinutes(15), time: { kind: 'minutes', minutes: 15 } },
    ])
  })

  it('gives only the asked direction', () => {
    expect(upcomingArrivals(ROUTE_30_ROWS, ROUTE_30_NOW, 2, { dir: 'I', seq: 14 }).map(a => a.eta)).toEqual([
      '2026-11-17T10:59:58+08:00',
      '2026-11-17T11:29:40+08:00',
    ])
  })

  it('leaves out buses that left over a minute ago and arrivals with no time', () => {
    expect(upcomingArrivals([{ eta: inMinutes(-3) }, { eta: '' }, { eta: inMinutes(0) }], NOW, 2)).toEqual([
      { eta: inMinutes(0), time: { kind: 'now' } },
    ])
  })
})

// Route 10 at Stop 09680C5849BFA077: a circular Route that passes the Stop twice (seq 1 and 48).
const ROUTE_10_NOW = '2026-11-17T02:50:52Z'
const ROUTE_10_ROWS = [
  { dir: 'O', seq: 1, eta: '2026-11-17T10:50:00+08:00', dest_en: 'TAI KOK TSUI (CIRCULAR)' },
  { dir: 'O', seq: 1, eta: '2026-11-17T11:30:00+08:00', dest_en: 'TAI KOK TSUI (CIRCULAR)' },
  { dir: 'O', seq: 48, eta: '2026-11-17T10:52:58+08:00', dest_en: 'TAI KOK TSUI (CIRCULAR)' },
  { dir: 'O', seq: 48, eta: '2026-11-17T11:09:12+08:00', dest_en: 'TAI KOK TSUI (CIRCULAR)' },
  { dir: 'O', seq: 48, eta: '2026-11-17T11:47:57+08:00', dest_en: 'TAI KOK TSUI (CIRCULAR)' },
]

// Recorded from the KMB API on 2026-11-17 (trimmed to the fields the app reads).
// Route 30 at Stop 68758E936DF9B173: the Stop is on both directions, so one request returns both.
const ROUTE_30_NOW = '2026-11-17T02:50:49Z'
const ROUTE_30_ROWS = [
  { dir: 'O', seq: 17, eta: '2026-11-17T11:05:38+08:00', dest_en: 'CHEUNG SHA WAN' },
  { dir: 'O', seq: 17, eta: '2026-11-17T11:32:07+08:00', dest_en: 'CHEUNG SHA WAN' },
  { dir: 'I', seq: 14, eta: '2026-11-17T10:59:58+08:00', dest_en: 'TSUEN WAN (ALLWAY GARDENS)' },
  { dir: 'I', seq: 14, eta: '2026-11-17T11:29:40+08:00', dest_en: 'TSUEN WAN (ALLWAY GARDENS)' },
]

describe('arrivals', () => {
  it('gives only the buses going the asked direction at a Stop both directions use', () => {
    expect(arrivals(ROUTE_30_ROWS, ROUTE_30_NOW, { dir: 'O' })).toEqual([
      { eta: '2026-11-17T11:05:38+08:00', time: { kind: 'minutes', minutes: 15 } },
      { eta: '2026-11-17T11:32:07+08:00', time: { kind: 'minutes', minutes: 41 } },
    ])
  })

  it('gives only the buses at the asked position of a circular Route', () => {
    expect(arrivals(ROUTE_10_ROWS, ROUTE_10_NOW, { dir: 'O', seq: '48' }).map(a => a.eta)).toEqual([
      '2026-11-17T10:52:58+08:00',
      '2026-11-17T11:09:12+08:00',
      '2026-11-17T11:47:57+08:00',
    ])
  })

  it('filters by direction only when the rows carry no position', () => {
    expect(arrivals([{ dir: 'O', eta: inMinutes(4) }, { dir: 'I', eta: inMinutes(2) }], NOW, { dir: 'O', seq: '3' }).map(a => a.time)).toEqual([
      { kind: 'minutes', minutes: 4 },
    ])
  })

  it('puts buses with no time after the ones that have a time', () => {
    expect(arrivals([{ eta: '' }, { eta: inMinutes(9) }, { eta: inMinutes(2) }], NOW).map(a => a.time)).toEqual([
      { kind: 'minutes', minutes: 2 },
      { kind: 'minutes', minutes: 9 },
      { kind: 'unknown' },
    ])
  })
})
