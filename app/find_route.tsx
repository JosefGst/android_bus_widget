import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage } from '../components/language_context'
import { LetterKeypad } from '../components/LetterKeypad'
import { NumericKeypad } from '../components/NumericKeypad'
import { RouteBadge } from '../components/RouteBadge'
import { COLORS, COMPACT_SCREEN_HEIGHT, FONT_SIZES, SCREEN_GUTTER, TOUCH_TARGET, FONTS } from '../components/theme'
import { getCachedRoutes, ROUTS } from '../utils/fetch'
import { Language, localized } from '../utils/language'
import { filterRoutesByQuery, getAvailableLetters } from '../utils/route_search'
import { displayPlaceName } from '../utils/string_formatting'
import { Strings } from '../utils/strings'

export default function FindARoute(): React.JSX.Element {
  const router = useRouter()
  const { language, strings } = useLanguage()
  const insets = useSafeAreaInsets()
  const compact = useWindowDimensions().height < COMPACT_SCREEN_HEIGHT
  const [isLoading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<ROUTS[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  // Bumped by Try again. The KMB API sometimes refuses the app for a while, so a failed load must be retryable.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadRoutes = async () => {
      setLoading(true)
      setLoadFailed(false)
      try {
        const { routes } = await getCachedRoutes()
        if (!cancelled) setRoutes(routes)
      } catch (e) {
        console.error('Failed to load Routes', e)
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadRoutes()
    return () => {
      cancelled = true
    }
  }, [loadAttempt])

  const results = useMemo(() => filterRoutesByQuery(routes, query), [routes, query])
  const letters = useMemo(() => getAvailableLetters(routes, query), [routes, query])

  return (
    <View style={[styles.screen, { paddingTop: insets.top + (compact ? 12 : 24) }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{strings.findARoute}</Text>
        <View style={styles.fieldRow}>
          <TextInput
            style={[styles.field, compact && styles.fieldCompact]}
            accessibilityLabel={strings.busNumber}
            placeholder={strings.searchPlaceholder}
            placeholderTextColor={COLORS.inkMuted}
            value={query}
            onChangeText={text => setQuery(text.toUpperCase())}
            autoCorrect={false}
            autoCapitalize="characters"
            // The keypad below types; the phone keyboard would cover the results.
            showSoftInputOnFocus={false}
          />
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            testID="clear-search"
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>{strings.keypadClear}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.results}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.accent} style={styles.loading} />
        ) : loadFailed ? (
          <View style={styles.failed}>
            <Text style={styles.failedText}>{strings.routesLoadFailed}</Text>
            <Pressable
              onPress={() => setLoadAttempt(n => n + 1)}
              accessibilityRole="button"
              accessibilityLabel={strings.tryAgain}
              style={({ pressed }) => [styles.tryAgain, pressed && styles.pressed]}
            >
              <MaterialIcons name="refresh" size={26} color={COLORS.onAccent} />
              <Text style={styles.tryAgainText}>{strings.tryAgain}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => `${item.route}|${item.bound}|${item.service_type}`}
            contentContainerStyle={styles.resultList}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={query ? <Text style={styles.count}>{strings.routesMatch(results.length, query)}</Text> : null}
            renderItem={({ item }) => (
              <RouteResult
                route={item}
                language={language}
                strings={strings}
                onPress={() => router.push({
                  pathname: '/routes_stop',
                  params: { route: item.route, bound: item.bound, service_type: item.service_type },
                })}
              />
            )}
            ListEmptyComponent={<Text style={styles.empty}>{strings.noRoutes}</Text>}
          />
        )}
      </View>

      <View style={styles.keypad}>
        <LetterKeypad letters={letters} onPressLetter={letter => setQuery(q => q + letter)} />
        <NumericKeypad compact={compact} onPressDigit={digit => setQuery(q => q + digit)} onDelete={() => setQuery(q => q.slice(0, -1))} />
      </View>
    </View>
  )
}

interface RouteResultProps {
  route: ROUTS
  language: Language
  strings: Strings
  onPress: () => void
}

function RouteResult({ route, language, strings, onPress }: RouteResultProps): React.JSX.Element {
  const from = displayPlaceName(localized(route, 'orig', language), language)
  const to = displayPlaceName(localized(route, 'dest', language), language)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.routeResultLabel(route.route, from, to)}
      style={({ pressed }) => [styles.result, pressed && styles.pressed]}
    >
      <RouteBadge route={route.route} />
      <View style={styles.places}>
        <Text style={styles.place}>
          <Text style={styles.placeLabel}>{strings.fromOrigin} </Text>{from}
        </Text>
        <Text style={[styles.place, styles.destination]}>
          <Text style={styles.placeLabel}>{strings.toDestination} </Text>{to}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={28} color={COLORS.chevron} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SCREEN_GUTTER + 4, paddingBottom: 10, gap: 12 },
  // Leaves room for the floating language button at the top right.
  title: { fontSize: FONT_SIZES.title, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink, marginRight: 64 },
  titleCompact: { fontSize: 28 , fontFamily: FONTS.regular},
  fieldRow: { flexDirection: 'row', gap: 10 },
  field: {
    flex: 1,
    minWidth: 0,
    height: 64,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 18,
    fontSize: 30,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.ink,
  },
  fieldCompact: { height: 56, fontSize: 26 , fontFamily: FONTS.regular},
  clearButton: {
    minWidth: 92,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  results: { flex: 1, minHeight: 0 },
  resultList: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 12, gap: 8 },
  loading: { marginTop: 48 },
  count: { fontSize: 18, fontFamily: FONTS.regular, color: COLORS.inkMuted, marginHorizontal: 4, marginBottom: 2 },
  empty: { fontSize: FONT_SIZES.body, fontFamily: FONTS.regular, color: COLORS.ink, margin: 4 },
  failed: { margin: SCREEN_GUTTER, gap: 16 },
  failedText: { fontSize: FONT_SIZES.body, fontFamily: FONTS.regular, lineHeight: 28, color: COLORS.ink },
  tryAgain: {
    alignSelf: 'flex-start',
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tryAgainText: { fontSize: FONT_SIZES.body, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.onAccent },
  result: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  places: { flex: 1, minWidth: 0, gap: 2 },
  place: { fontSize: 18, fontFamily: FONTS.regular, lineHeight: 24, color: COLORS.ink },
  placeLabel: { fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.inkMuted },
  destination: { fontFamily: FONTS.bold, fontWeight: '700' },
  keypad: { backgroundColor: COLORS.keypadBackground, paddingHorizontal: SCREEN_GUTTER, paddingTop: 10, paddingBottom: 12, gap: 8 },
  pressed: { opacity: 0.6 },
})
