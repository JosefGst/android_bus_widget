import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { getLanguage, initialLanguage, Language, onLanguageChanged, setLanguage as saveLanguage } from '../utils/language'
import { STRINGS, Strings } from '../utils/strings'

type LanguageContextValue = {
  language: Language
  strings: Strings
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Web starts in English to match the static pre-render (no hydration mismatch), then
// switches in the effect. Native reads the phone language synchronously, so the first
// frame is usually already right.
const firstLanguage = (): Language => (Platform.OS === 'web' ? 'en' : initialLanguage())

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps): React.JSX.Element {
  const [language, setLanguageState] = useState<Language>(firstLanguage)

  useEffect(() => {
    let cancelled = false
    getLanguage().then(saved => {
      if (!cancelled) setLanguageState(saved)
    })
    const unsubscribe = onLanguageChanged(setLanguageState)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    saveLanguage(next)
  }, [])

  const value = useMemo(() => ({ language, strings: STRINGS[language], setLanguage }), [language, setLanguage])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage() must be used inside <LanguageProvider>')
  return value
}
