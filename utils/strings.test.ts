import { LANGUAGES } from './language'
import { arrivalText, spokenArrival, STRINGS } from './strings'

describe('STRINGS', () => {
  it.each(LANGUAGES)('has text for every key in %s', language => {
    Object.entries(STRINGS[language]).forEach(([key, value]: [string, unknown]) => {
      const text = typeof value === 'function' ? String(value('272X', 5, '10:30')) : String(value)
      expect([key, text.trim()]).not.toEqual([key, ''])
    })
  })

  it('puts the minutes and the time into the ETA sentence', () => {
    LANGUAGES.forEach(language => {
      const text = STRINGS[language].arrivesIn(7, '10:42')
      expect(text).toContain('7')
      expect(text).toContain('10:42')
    })
  })

  it('writes Traditional and Simplified tab names differently where the characters differ', () => {
    expect(STRINGS.tc.tabRoutesStop).toBe('路線車站')
    expect(STRINGS.sc.tabRoutesStop).toBe('路线车站')
    expect(STRINGS.sc.tabFavorites).toBe('我的巴士')
  })
})

describe('arrivalText', () => {
  const now = '2026-11-13T04:50:00Z'
  const inFiveMinutes = '2026-11-13T12:55:00+08:00'

  it.each(LANGUAGES)('gives the minutes and the Hong Kong time in %s', language => {
    const text = arrivalText(STRINGS[language], inFiveMinutes, now)
    expect(text).toContain('5')
    expect(text).toContain('12:55:00')
  })

  it('says 0 minutes for a bus that is due now', () => {
    expect(arrivalText(STRINGS.en, now, now)).toBe('arrives in 0 minutes (ETA: 12:50:00)')
  })

  it('says there is no ETA instead of a blank count when the API gives no time', () => {
    expect(arrivalText(STRINGS.en, '', now)).toBe('No ETA available')
  })
})

describe('spokenArrival', () => {
  it('reads the next bus and the one after it', () => {
    expect(spokenArrival(STRINGS.en, { next: { kind: 'minutes', minutes: 3 }, then: 15 })).toBe('3 min, then 15 min')
    expect(spokenArrival(STRINGS.tc, { next: { kind: 'minutes', minutes: 3 }, then: null })).toBe('3 分鐘')
  })

  it('says a due bus is here now', () => {
    expect(spokenArrival(STRINGS.en, { next: { kind: 'now' }, then: 12 })).toBe('Now, then 12 min')
  })

  it('says there is no time yet when the API gave none', () => {
    expect(spokenArrival(STRINGS.sc, { next: { kind: 'unknown' }, then: null })).toBe('未有时间')
  })
})

describe('routesMatch', () => {
  it('says how many routes match, singular and plural', () => {
    expect(STRINGS.en.routesMatch(1, '967')).toBe('1 route matches “967”')
    expect(STRINGS.en.routesMatch(3, '27')).toBe('3 routes match “27”')
    expect(STRINGS.tc.routesMatch(3, '27')).toBe('3 條路線符合「27」')
    expect(STRINGS.sc.routesMatch(3, '27')).toBe('3 条路线符合“27”')
  })
})

describe('routeResultLabel', () => {
  it('reads a result card as route, start and end', () => {
    expect(STRINGS.en.routeResultLabel('272P', 'Tuen Mun', 'Causeway Bay')).toBe('272P, from Tuen Mun to Causeway Bay')
    expect(STRINGS.tc.routeResultLabel('272P', '屯門', '銅鑼灣')).toBe('272P，由屯門往銅鑼灣')
  })
})
