import { MaterialIcons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useLanguage } from '../components/language_context'
import { RouteBadge } from '../components/RouteBadge'
import { CARD_RADIUS, COLORS, FONT_SIZES, SCREEN_GUTTER, TOUCH_TARGET } from '../components/theme'
import { ArrivalTime, routeRow } from '../utils/arrival_display'
import { FavoriteBoard, loadFavoriteBoard, RouteArrivals } from '../utils/favorite_board'
import { Favorite, list as listFavorites, remove as removeFavorite } from '../utils/favorites'
import type { Language } from '../utils/language'
import { displayPlaceName } from '../utils/string_formatting'
import { spokenArrival, Strings } from '../utils/strings'
import { formatClockTime } from '../utils/time_formatting'

const EMPTY_BOARD: FavoriteBoard = { groups: [], generatedTimestamp: '' }
const BOARD_REFRESH_MS = 30_000
// Minutes are whole numbers, so a 10 s tick keeps the countdown current without constant redraws.
const CLOCK_TICK_MS = 10_000

export default function MyBuses(): React.JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { language, strings } = useLanguage()
  const [isLoading, setLoading] = useState(true)
  const [isRefreshing, setRefreshing] = useState(false)
  const [board, setBoard] = useState<FavoriteBoard>(EMPTY_BOARD)
  const [now, setNow] = useState(Date.now())
  const [isEditing, setEditing] = useState(false)
  // null until the first read from storage completes.
  const [favorites, setFavorites] = useState<Favorite[] | null>(null)

  const reloadFavorites = useCallback(async () => {
    try {
      setFavorites(await listFavorites())
    } catch (e) {
      console.error('Failed to load Favorites', e)
    }
  }, [])

  // Re-read on every focus: this tab stays mounted while the user saves Stops elsewhere.
  useFocusEffect(
    useCallback(() => {
      reloadFavorites()
    }, [reloadFavorites])
  )

  const refreshBoard = useCallback(async () => {
    if (favorites === null) return
    try {
      setBoard(await loadFavoriteBoard(favorites, new Date(), language))
      setNow(Date.now())
    } catch (e) {
      console.error('Failed to load Favorite board', e)
    } finally {
      setLoading(false)
    }
  }, [favorites, language])

  useEffect(() => {
    refreshBoard()
    const id = setInterval(refreshBoard, BOARD_REFRESH_MS)
    return () => clearInterval(id)
  }, [refreshBoard])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshBoard()
    setRefreshing(false)
  }, [refreshBoard])

  const onRemove = useCallback(async (favorite: Favorite) => {
    await removeFavorite(favorite)
    await reloadFavorites()
  }, [reloadFavorites])

  // Stop id -> display name, for the rows in "Change my buses".
  const stopNameById = useMemo(() => {
    const names: Record<string, string> = {}
    board.groups.forEach(group => group.stopIds.forEach(id => { names[id] = displayPlaceName(group.stopName, language) }))
    return names
  }, [board, language])

  const nowIso = new Date(now).toISOString()
  const updated = formatClockTime(board.generatedTimestamp, language)
  const hasFavorites = favorites !== null && favorites.length > 0

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{strings.myBuses}</Text>
        {hasFavorites && <View style={styles.headerRow}>
          <Text style={styles.updated}>{updated ? strings.updatedAt(updated) : ' '}</Text>
          <Pressable
            onPress={onRefresh}
            disabled={isRefreshing}
            accessibilityRole="button"
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
          >
            {isRefreshing ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : (
              <MaterialIcons name="refresh" size={26} color={COLORS.accent} />
            )}
            <Text style={styles.outlineButtonText}>{strings.refresh}</Text>
          </Pressable>
        </View>}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loading} />
      ) : !hasFavorites ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyText}>{strings.emptyMyBuses}</Text>
          <Pressable
            onPress={() => router.push('/find_route')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="search" size={26} color={COLORS.onAccent} />
            <Text style={styles.primaryButtonText}>{strings.findARoute}</Text>
          </Pressable>
        </View>
      ) : isEditing ? (
        <View style={styles.card}>
          {favorites.map(favorite => {
            const stopName = stopNameById[favorite.stop] ?? favorite.stop
            return (
              <View key={`${favorite.stop}|${favorite.route}|${favorite.service_type}`} style={styles.editRow}>
                <RouteBadge route={favorite.route} />
                <Text style={styles.editStop}>{stopName}</Text>
                <Pressable
                  onPress={() => onRemove(favorite)}
                  accessibilityRole="button"
                  accessibilityLabel={strings.removeRouteAtStop(favorite.route, stopName)}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="delete-outline" size={24} color={COLORS.danger} />
                  <Text style={styles.removeText}>{strings.remove}</Text>
                </Pressable>
              </View>
            )
          })}
        </View>
      ) : (
        board.groups.map(group => {
          const stopName = displayPlaceName(group.stopName, language)
          return (
          <View key={group.stopName} style={styles.card}>
            <View style={styles.stopHeader}>
              <MaterialIcons name="place" size={26} color={COLORS.inkMuted} />
              <Text style={styles.stopName}>{stopName}</Text>
            </View>
            {group.routes.length === 0 ? (
              <Text style={styles.noBuses}>{strings.noBusesForStop}</Text>
            ) : (
              group.routes.map(route => (
                <RouteRowButton
                  key={`${route.stop}|${route.route}|${route.bound}`}
                  route={route}
                  stopName={stopName}
                  now={nowIso}
                  language={language}
                  strings={strings}
                  onPress={() => router.push({
                    pathname: '/routes_stop',
                    params: { route: route.route, bound: route.bound, service_type: route.service_type, stop: route.stop },
                  })}
                />
              ))
            )}
          </View>
          )
        })
      )}

      {hasFavorites && !isLoading && (
        <Pressable
          onPress={() => setEditing(e => !e)}
          accessibilityRole="button"
          style={({ pressed }) => [isEditing ? styles.primaryButton : styles.secondaryButton, pressed && styles.pressed]}
        >
          <MaterialIcons name={isEditing ? 'check' : 'edit'} size={24} color={isEditing ? COLORS.onAccent : COLORS.ink} />
          <Text style={isEditing ? styles.primaryButtonText : styles.secondaryButtonText}>
            {isEditing ? strings.done : strings.changeMyBuses}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

interface RouteRowButtonProps {
  route: RouteArrivals
  stopName: string
  now: string
  language: Language
  strings: Strings
  onPress: () => void
}

function RouteRowButton({ route, stopName, now, language, strings, onPress }: RouteRowButtonProps): React.JSX.Element {
  const row = routeRow(route.arrivals, now)
  const dest = displayPlaceName(route.dest, language)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings.routeRowLabel(route.route, stopName, dest, spokenArrival(strings, row))}
      style={({ pressed }) => [styles.routeRow, pressed && styles.pressed]}
    >
      <RouteBadge route={route.route} />
      <View style={styles.destination}>
        <Text style={styles.toLabel}>{strings.toDestination}</Text>
        <Text style={styles.destText}>{dest}</Text>
      </View>
      <View style={styles.times}>
        <NextArrival time={row.next} strings={strings} />
        {row.then !== null && <Text style={styles.thenText}>{strings.thenMinutes(row.then)}</Text>}
      </View>
      <MaterialIcons name="chevron-right" size={28} color={COLORS.chevron} />
    </Pressable>
  )
}

function NextArrival({ time, strings }: { time: ArrivalTime; strings: Strings }): React.JSX.Element {
  switch (time.kind) {
    case 'now':
      return <Text style={styles.nowPill}>{strings.arrivingNow}</Text>
    case 'minutes':
      return (
        <View style={styles.minutesRow}>
          <Text style={styles.minutes}>{time.minutes}</Text>
          <Text style={styles.minutesUnit}>{strings.minutesUnit}</Text>
        </View>
      )
    case 'unknown':
      return <Text style={styles.noTime}>{strings.noTimeYet}</Text>
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 32, gap: 16 },
  header: { gap: 10, paddingHorizontal: 4 },
  // Leaves room for the floating language button at the top right.
  title: { fontSize: FONT_SIZES.title, fontWeight: '700', color: COLORS.ink, marginRight: 64 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  updated: { flex: 1, fontSize: FONT_SIZES.body, color: COLORS.inkMuted },
  loading: { marginTop: 48 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
  },
  stopHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  stopName: { flex: 1, fontSize: FONT_SIZES.stopName, fontWeight: '700', color: COLORS.ink },
  noBuses: { fontSize: FONT_SIZES.body, color: COLORS.inkMuted, paddingHorizontal: 18, paddingBottom: 16 },
  routeRow: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 18,
    paddingRight: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
  },
  pressed: { opacity: 0.6 },
  destination: { flex: 1, minWidth: 0 },
  toLabel: { fontSize: FONT_SIZES.label, color: COLORS.inkMuted },
  destText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.ink },
  times: { alignItems: 'flex-end', gap: 2 },
  minutesRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  minutes: { fontSize: FONT_SIZES.minutes, lineHeight: FONT_SIZES.minutes + 4, fontWeight: '700', color: COLORS.ink },
  minutesUnit: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.ink },
  nowPill: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.nowInk,
    backgroundColor: COLORS.nowBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  noTime: { fontSize: FONT_SIZES.body, color: COLORS.inkMuted },
  thenText: { fontSize: FONT_SIZES.label, color: COLORS.inkMuted },
  emptyCard: { padding: 18, gap: 16 },
  emptyText: { fontSize: FONT_SIZES.body, lineHeight: 28, color: COLORS.ink },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineSoft,
  },
  editStop: { flex: 1, fontSize: FONT_SIZES.body, color: COLORS.ink },
  removeButton: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeText: { fontSize: 18, fontWeight: '700', color: COLORS.danger },
  outlineButton: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 18,
    borderRadius: TOUCH_TARGET / 2,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outlineButtonText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.accent },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.onAccent },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.ink },
})
