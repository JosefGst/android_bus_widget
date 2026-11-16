import { MaterialIcons } from '@expo/vector-icons'
import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { UpcomingArrival } from '../utils/arrival_display'
import type { Language } from '../utils/language'
import type { Strings } from '../utils/strings'
import { formatClockTime } from '../utils/time_formatting'
import { COLORS, FONT_SIZES, FONTS } from './theme'

interface SelectedStopCardProps {
  /** null while the ETAs load. */
  arrivals: UpcomingArrival[] | null
  saved: boolean
  onSave: () => void
  language: Language
  strings: Strings
}

/** The open Stop: its next two buses and a Save to My Buses button. Shown under its row in the stop list,
 * which already names the Stop. */
export function SelectedStopCard({ arrivals, saved, onSave, language, strings }: SelectedStopCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      {arrivals === null ? (
        <ActivityIndicator color={COLORS.accent} accessibilityLabel={strings.loadingEta} />
      ) : arrivals.length === 0 ? (
        <Text style={styles.noTime}>{strings.noTimeYet}</Text>
      ) : (
        <View style={styles.tiles}>
          {arrivals.map((arrival, index) => (
            <View key={arrival.eta} style={styles.tile}>
              <Text style={styles.tileLabel}>{index === 0 ? strings.nextBus : strings.afterThat}</Text>
              {arrival.time.kind === 'minutes' ? (
                <View style={styles.minutesRow}>
                  <Text style={styles.minutes}>{arrival.time.minutes}</Text>
                  <Text style={styles.minutesUnit}>{strings.minutesUnit}</Text>
                </View>
              ) : (
                <Text style={styles.now}>{strings.arrivingNow}</Text>
              )}
              <Text style={styles.tileLabel}>{strings.atTime(formatClockTime(arrival.eta, language))}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        onPress={onSave}
        disabled={saved}
        accessibilityRole="button"
        accessibilityLabel={saved ? strings.savedToMyBuses : strings.saveToMyBuses}
        style={({ pressed }) => [styles.save, saved && styles.saved, pressed && styles.pressed]}
      >
        <MaterialIcons name={saved ? 'check' : 'star'} size={26} color={saved ? COLORS.accent : COLORS.onAccent} />
        <Text style={[styles.saveText, saved && styles.savedText]}>{saved ? strings.savedToMyBuses : strings.saveToMyBuses}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.accent,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  tileLabel: { fontSize: FONT_SIZES.label, fontFamily: FONTS.regular, color: COLORS.inkMuted },
  minutesRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  minutes: { fontSize: 40, fontFamily: FONTS.bold, fontWeight: '700', lineHeight: 46, color: COLORS.ink },
  minutesUnit: { fontSize: FONT_SIZES.body, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  now: {
    alignSelf: 'flex-start',
    marginVertical: 6,
    fontSize: 22,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.nowInk,
    backgroundColor: COLORS.nowBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  noTime: { fontSize: FONT_SIZES.body, fontFamily: FONTS.regular, color: COLORS.inkMuted },
  save: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saved: { backgroundColor: COLORS.accentSoft },
  saveText: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.onAccent },
  savedText: { color: COLORS.accent },
  pressed: { opacity: 0.6 },
})
