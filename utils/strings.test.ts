import { LANGUAGES } from './language'
import { spokenArrival, STRINGS } from './strings'

describe('STRINGS', () => {
  it.each(LANGUAGES)('has text for every key in %s', language => {
    Object.entries(STRINGS[language]).forEach(([key, value]: [string, unknown]) => {
      const text = typeof value === 'function' ? String(value('272X', 5, '10:30')) : String(value)
      expect([key, text.trim()]).not.toEqual([key, ''])
    })
  })

  it('writes Traditional and Simplified tab names differently where the characters differ', () => {
    expect(STRINGS.tc.findARoute).toBe('搜尋路線')
    expect(STRINGS.sc.findARoute).toBe('搜索路线')
    expect(STRINGS.sc.myBuses).toBe('我的巴士')
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
