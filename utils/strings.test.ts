import { LANGUAGES } from './language'
import { STRINGS } from './strings'

describe('STRINGS', () => {
  it.each(LANGUAGES)('has text for every key in %s', language => {
    Object.entries(STRINGS[language]).forEach(([key, value]: [string, string | ((...args: string[]) => string)]) => {
      const text = typeof value === 'function' ? value('272X', '5', '10:30') : value
      expect([key, text.trim()]).not.toEqual([key, ''])
    })
  })

  it('puts the minutes and the time into the ETA sentence', () => {
    LANGUAGES.forEach(language => {
      const text = STRINGS[language].arrivesIn('7', '10:42')
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
