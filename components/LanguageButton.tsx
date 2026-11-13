import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { nextLanguage } from '../utils/language'
import { useLanguage } from './language_context'

/** Where the button floats: this far below the status bar, this tall. Screens whose top row reaches the right edge reserve this space. */
export const LANGUAGE_BUTTON_TOP = 4
export const LANGUAGE_BUTTON_HEIGHT = 32

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
    height: LANGUAGE_BUTTON_HEIGHT,
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
