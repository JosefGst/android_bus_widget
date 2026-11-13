import { LANGUAGES } from './language'
import { arrivalText, STRINGS } from './strings'

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
    expect(STRINGS.sc.tabFavorites).toBe('我的收藏')
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
    expect(arrivalText(STRINGS.tc, now, now, '272P')).toBe('272P 0 分鐘後到達（12:50:00）')
  })

  it('says there is no ETA instead of a blank count when the API gives no time', () => {
    expect(arrivalText(STRINGS.en, '', now)).toBe('No ETA available')
    expect(arrivalText(STRINGS.sc, '', now, '272P')).toBe('272P：没有到站时间')
    expect(arrivalText(STRINGS.en, '', now, '272P')).toBe('272P: No ETA available')
  })
})
