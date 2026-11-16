import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLanguage } from './language_context'
import { COLORS, FONT_SIZES, FONTS } from './theme'

interface LetterKeypadProps {
  letters: string[]
  onPressLetter: (letter: string) => void
}

const ROW_HEIGHT = 52

/** One row of the letters that can come next in a route number; scrolls sideways when there are many. */
export function LetterKeypad({ letters, onPressLetter }: LetterKeypadProps): React.JSX.Element {
  const { strings } = useLanguage()
  return (
    <View style={styles.row}>
      {letters.length > 0 && <Text style={styles.label}>{strings.keypadLetters}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keys}>
        {letters.map(letter => (
          <Pressable
            key={letter}
            onPress={() => onPressLetter(letter)}
            accessibilityRole="button"
            testID={`letter-${letter}`}
            style={({ pressed }) => [styles.key, pressed && styles.pressed]}
          >
            <Text style={styles.letter}>{letter}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // Fixed height so the number keys don't jump when the letters come and go.
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: FONT_SIZES.label, fontFamily: FONTS.regular, color: COLORS.inkMuted },
  keys: { gap: 8, alignItems: 'center' },
  key: {
    minWidth: 64,
    height: ROW_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 24, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.accent },
  pressed: { opacity: 0.6 },
})
