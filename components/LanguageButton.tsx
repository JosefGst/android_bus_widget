import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { nextLanguage } from '../utils/language'
import { useLanguage } from './language_context'

/** Shows the current language ("EN", "繁", "简"); each tap moves to the next and saves it. */
export function LanguageButton(): React.JSX.Element {
  const { language, strings, setLanguage } = useLanguage()
  return (
    <Pressable
      onPress={() => setLanguage(nextLanguage(language))}
      style={styles.button}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={strings.languageButtonLabel}
      testID="language-button"
    >
      <Text style={styles.text}>{strings.languageButtonText}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007aff',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#007aff', fontSize: 15, fontWeight: '600' },
})
