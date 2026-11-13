import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales, Locale } from 'expo-localization'

// The one setting that picks English, Traditional or Simplified Chinese for all text.
// The codes match the KMB API's field suffixes (`name_en`, `name_tc`, `name_sc`).

export type Language = 'en' | 'tc' | 'sc'
export const LANGUAGES: readonly Language[] = ['en', 'tc', 'sc']

// Holds only a choice the user made. The phone language is never saved, so a user who
// never picks one keeps following the phone.
const STORAGE_KEY = 'app_language'

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)

type LocaleParts = Pick<Locale, 'languageCode' | 'languageScriptCode' | 'regionCode'>

const TRADITIONAL_REGIONS = new Set(['HK', 'MO', 'TW'])

/** The first locale decides. Chinese without a script or known region reads as Traditional. */
export function languageFromLocales(locales: readonly LocaleParts[]): Language {
  const first = locales[0]
  if (first?.languageCode !== 'zh') return 'en'
  if (first.languageScriptCode === 'Hant') return 'tc'
  if (first.languageScriptCode === 'Hans') return 'sc'
  if (first.regionCode && !TRADITIONAL_REGIONS.has(first.regionCode)) return 'sc'
  return 'tc'
}

function phoneLanguage(): Language {
  try {
    return languageFromLocales(getLocales())
  } catch (e) {
    console.error('Failed to read the phone language', e)
    return 'en'
  }
}

// The widget task reads this too; a slow storage read must not hold up its render.
const READ_TIMEOUT_MS = 1500

async function savedLanguage(): Promise<Language | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), READ_TIMEOUT_MS)
  })
  try {
    const saved = await Promise.race([AsyncStorage.getItem(STORAGE_KEY), timeout])
    return isLanguage(saved) ? saved : null
  } catch (e) {
    console.error('Failed to read the saved language', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The saved choice, else the phone language. Never throws, so the widget task can use it. */
export async function getLanguage(): Promise<Language> {
  return (await savedLanguage()) ?? phoneLanguage()
}

/** The phone language, read synchronously so the first frame needs no storage read. */
export const initialLanguage = phoneLanguage

export const nextLanguage = (language: Language): Language =>
  LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length]

type LanguageListener = (language: Language) => void
const listeners = new Set<LanguageListener>()

/** Fires after a choice is saved. Returns a function that unsubscribes. */
export function onLanguageChanged(listener: LanguageListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Kept always-resolved so one failed write doesn't stall the next.
let writeQueue: Promise<unknown> = Promise.resolve()

/** Saves the user's choice. Resolves false when storage fails. */
export function setLanguage(language: Language): Promise<boolean> {
  const result = writeQueue.then(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, language)
    } catch (e) {
      console.error('Failed to save the language', e)
      return false
    }
    listeners.forEach(listener => {
      try {
        listener(language)
      } catch (e) {
        console.error('Language listener failed', e)
      }
    })
    return true
  })
  writeQueue = result.catch(() => undefined)
  return result
}

type LocalizedRecord<F extends string> = Record<`${F}_en`, string> & Partial<Record<`${F}_tc` | `${F}_sc`, string>>

/** Picks `${field}_${language}` from a KMB record, falling back to English when it is missing or empty. */
export function localized<F extends string>(record: LocalizedRecord<F>, field: F, language: Language): string {
  const englishFields: Record<`${F}_en`, string> = record
  const chineseFields: Partial<Record<`${F}_tc` | `${F}_sc`, string>> = record
  const english = englishFields[`${field}_en`]
  if (language === 'en') return english
  return chineseFields[`${field}_${language}`] || english
}
