import { arrivalTime, routeRow } from './arrival_display'

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
