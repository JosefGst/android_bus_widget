import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'

import {
  getLanguage,
  Language,
  languageFromLocales,
  localized,
  nextLanguage,
  onLanguageChanged,
  setLanguage,
} from './language'

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }))

const mockedGetLocales = jest.mocked(getLocales)

const locale = (tag: string): { languageCode: string | null; languageScriptCode: string | null; regionCode: string | null } => {
  const parts = tag.split('-')
  const script = parts.find(p => p.length === 4) ?? null
  const region = parts.slice(1).find(p => p.length === 2) ?? null
  return { languageCode: parts[0], languageScriptCode: script, regionCode: region }
}

const phoneLocales = (...tags: string[]): void => {
  mockedGetLocales.mockReturnValue(
    tags.map(tag => ({ ...locale(tag), languageTag: tag, textDirection: 'ltr', digitGroupingSeparator: ',', decimalSeparator: '.', measurementSystem: 'metric', currencyCode: null, currencySymbol: null, languageCurrencyCode: null, languageCurrencySymbol: null, languageRegionCode: null, temperatureUnit: 'celsius' })),
  )
}

describe('languageFromLocales', () => {
  it.each<[string, Language]>([
    ['zh-Hant-HK', 'tc'],
    ['zh-HK', 'tc'],
    ['zh-MO', 'tc'],
    ['zh-TW', 'tc'],
    ['zh-Hans-CN', 'sc'],
    ['zh-CN', 'sc'],
    ['zh-SG', 'sc'],
    ['zh-Hans-HK', 'sc'],
    ['zh', 'tc'],
    ['en-US', 'en'],
    ['en-HK', 'en'],
    ['fr-FR', 'en'],
  ])('maps %s to %s', (tag, expected) => {
    expect(languageFromLocales([locale(tag)])).toBe(expected)
  })

  it('lets the first locale decide', () => {
    expect(languageFromLocales([locale('en-GB'), locale('zh-HK')])).toBe('en')
  })

  it('uses English when the phone lists no locale', () => {
    expect(languageFromLocales([])).toBe('en')
  })
})

describe('nextLanguage', () => {
  it('cycles English, Traditional, Simplified', () => {
    expect(nextLanguage('en')).toBe('tc')
    expect(nextLanguage('tc')).toBe('sc')
    expect(nextLanguage('sc')).toBe('en')
  })
})

describe('localized', () => {
  const stop = { name_en: 'UNIVERSITY STATION', name_tc: '大學站', name_sc: '大学站' }

  it('picks the field for the language', () => {
    expect(localized(stop, 'name', 'en')).toBe('UNIVERSITY STATION')
    expect(localized(stop, 'name', 'tc')).toBe('大學站')
    expect(localized(stop, 'name', 'sc')).toBe('大学站')
  })

  it('falls back to English when the Chinese field is missing or empty', () => {
    expect(localized({ name_en: 'X' }, 'name', 'tc')).toBe('X')
    expect(localized({ name_en: 'X', name_sc: '' }, 'name', 'sc')).toBe('X')
  })
})

describe('getLanguage / setLanguage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    phoneLocales('en-US')
  })

  it('follows the phone when the user never chose', async () => {
    phoneLocales('zh-Hant-HK')
    expect(await getLanguage()).toBe('tc')
  })

  it('keeps following the phone after it changes', async () => {
    phoneLocales('zh-CN')
    expect(await getLanguage()).toBe('sc')
    phoneLocales('en-US')
    expect(await getLanguage()).toBe('en')
  })

  it('lets a saved choice win over the phone', async () => {
    phoneLocales('zh-HK')
    await setLanguage('sc')
    expect(await getLanguage()).toBe('sc')
  })

  it('ignores a stored value that is not a language', async () => {
    await AsyncStorage.setItem('app_language', 'klingon')
    expect(await getLanguage()).toBe('en')
  })

  it('uses English when the phone language cannot be read', async () => {
    mockedGetLocales.mockImplementation(() => {
      throw new Error('no native module')
    })
    expect(await getLanguage()).toBe('en')
  })

  it('follows the phone when storage does not answer in time', async () => {
    jest.useFakeTimers()
    try {
      phoneLocales('zh-HK')
      jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise(() => {}))
      const language = getLanguage()
      jest.advanceTimersByTime(1500)
      expect(await language).toBe('tc')
    } finally {
      jest.useRealTimers()
    }
  })

  it('tells listeners about a change, and stops after unsubscribe', async () => {
    const listener = jest.fn()
    const unsubscribe = onLanguageChanged(listener)
    await setLanguage('tc')
    expect(listener).toHaveBeenCalledWith('tc')
    unsubscribe()
    await setLanguage('sc')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps the last of two quick choices', async () => {
    await Promise.all([setLanguage('tc'), setLanguage('sc')])
    expect(await getLanguage()).toBe('sc')
  })
})
