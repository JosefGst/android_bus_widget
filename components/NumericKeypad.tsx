import { MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLanguage } from './language_context'
import { COLORS, FONT_SIZES, FONTS } from './theme'

interface NumericKeypadProps {
  onPressDigit: (digit: string) => void
  onDelete: () => void
  compact: boolean
}

const DIGIT_ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]

/** Phone-style number keys: 1–9, a wide 0, and a labelled Delete key. */
export function NumericKeypad({ onPressDigit, onDelete, compact }: NumericKeypadProps): React.JSX.Element {
  const { strings } = useLanguage()
  const keyHeight = { height: compact ? 46 : 56 }
  return (
    <View style={styles.keypad}>
      {DIGIT_ROWS.map(row => (
        <View key={row[0]} style={styles.row}>
          {row.map(digit => <DigitKey key={digit} digit={digit} onPress={onPressDigit} height={keyHeight} />)}
        </View>
      ))}
      <View style={styles.row}>
        <DigitKey digit="0" onPress={onPressDigit} height={keyHeight} wide />
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={strings.keypadDelete}
          testID="key-delete"
          style={({ pressed }) => [styles.key, keyHeight, styles.deleteKey, pressed && styles.pressed]}
        >
          <MaterialIcons name="backspace" size={24} color={COLORS.ink} />
          <Text style={styles.deleteText}>{strings.keypadDelete}</Text>
        </Pressable>
      </View>
    </View>
  )
}

interface DigitKeyProps {
  digit: string
  onPress: (digit: string) => void
  height: { height: number }
  wide?: boolean
}

function DigitKey({ digit, onPress, height, wide = false }: DigitKeyProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(digit)}
      accessibilityRole="button"
      testID={`key-${digit}`}
      style={({ pressed }) => [styles.key, height, wide && styles.wide, pressed && styles.pressed]}
    >
      <Text style={styles.digit}>{digit}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  keypad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.keyShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 2 },
  deleteKey: { flexDirection: 'row', gap: 6, backgroundColor: COLORS.keyMuted, borderBottomColor: COLORS.keyMuted },
  digit: { fontSize: 28, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  deleteText: { fontSize: FONT_SIZES.label + 2, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  pressed: { opacity: 0.6 },
})
