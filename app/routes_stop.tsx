import { MaterialIcons } from '@expo/vector-icons'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage } from '../components/language_context'
import { RouteBadge } from '../components/RouteBadge'
import { SelectedStopCard } from '../components/SelectedStopCard'
import { StopMap } from '../components/StopMap'
import { COLORS, FONT_SIZES, SCREEN_GUTTER, TOUCH_TARGET, FONTS } from '../components/theme'
import { useUserLocation } from '../components/use_user_location'
import { upcomingArrivals } from '../utils/arrival_display'
import { add as addFavorite, Favorite, includesFavorite, list as listFavorites } from '../utils/favorites'
import { ETA, fetchRouteSTOP, fetchStopETA, getCachedRoutes, ROUTS, Stop } from '../utils/fetch'
import { localized } from '../utils/language'
import { buildRouteMarkers } from '../utils/route_stop_map'
import { getStopsFor } from '../utils/stops'
import { displayPlaceName } from '../utils/string_formatting'

type RouteView = 'list' | 'map'

// Minutes are whole numbers, so a 10 s tick keeps the countdown current without constant redraws.
const CLOCK_TICK_MS = 10_000
// Same pace as My Buses: fresh enough for a countdown, slow enough not to trip the KMB CDN's 403s.
const ETA_REFRESH_MS = 30_000

export default function RoutesStopScreen(): React.JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { language, strings } = useLanguage()
  const params = useLocalSearchParams()
  const { route, bound, service_type } = params
  const [now, setNow] = useState(Date.now())
  const [isLoading, setLoading] = useState(true)
  const [data, setData] = useState<ROUTS[]>([])
  // The Route (route|bound|service_type) that `data` was loaded for; null while a load is running.
  const [dataRouteKey, setDataRouteKey] = useState<string | null>(null)
  const routeKey = `${route}|${bound}|${service_type}`
  const [routeInfo, setRouteInfo] = useState<ROUTS | null>(null)
  const [stops, setStops] = useState<Stop[]>([])
  // Derived per language from the Stop records, so switching language needs no new request.
  const stopNames = useMemo(() => {
    const names: { [stopId: string]: string } = {}
    stops.forEach(stop => { names[stop.stop] = displayPlaceName(localized(stop, 'name', language), language) })
    return names
  }, [stops, language])
  const markers = useMemo(() => buildRouteMarkers(data, stops, language), [data, stops, language])
  // The Stop list whose names finished loading; null while a load is running.
  const [namesLoadedFor, setNamesLoadedFor] = useState<ROUTS[] | null>(null)
  // Bumped by the Retry row to load the Stop names again.
  const [namesAttempt, setNamesAttempt] = useState(0)
  const namesMissing = namesLoadedFor === data && data.some(item => !stopNames[item.stop])
  const [view, setView] = useState<RouteView>('list')
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const [error, setError] = useState<'invalidRoute' | 'fetchFailed' | null>(null)
  const [etaMap, setEtaMap] = useState<{ [stopId: string]: ETA[] }>({})
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const listRef = useRef<FlatList<ROUTS>>(null)

  // The user's position: watched only while this screen has focus and the map is shown.
  const isFocused = useIsFocused()
  const userLocation = useUserLocation(isFocused && view === 'map')
  const [centerOnUserToken, setCenterOnUserToken] = useState(0)
  const [fitRouteToken, setFitRouteToken] = useState(0)
  // A "Where am I?" tap made before the first position arrived; centers once it does.
  const [centerPending, setCenterPending] = useState(false)
  const { location, start: startLocation } = userLocation
  useEffect(() => {
    if (!centerPending || !location) return
    setCenterPending(false)
    setCenterOnUserToken(t => t + 1)
  }, [centerPending, location])
  const onLocateMe = useCallback(async () => {
    if (await startLocation()) setCenterPending(true)
  }, [startLocation])
  const showLocateMe = Platform.OS === 'android' && userLocation.permission !== 'denied'

  const reloadFavorites = useCallback(async () => {
    try {
      setFavorites(await listFavorites())
    } catch (e) {
      console.error('Failed to load Favorites', e)
    }
  }, [])
  useFocusEffect(useCallback(() => { reloadFavorites() }, [reloadFavorites]))

  const selectStop = useCallback((stopId: string | null) => {
    setSelectedStop(stopId)
  }, [])

  // ETAs for the selected Stop: fetched on select and on focus, then polled while the screen has
  // focus, so the card never counts down to buses that have left. Cleanup drops a late response,
  // so a request for the previous Route or Stop never lands in `etaMap`.
  useEffect(() => {
    if (!isFocused || !selectedStop || dataRouteKey !== routeKey) return
    if (typeof route !== 'string' || typeof service_type !== 'string') return
    let cancelled = false
    const loadEtas = async () => {
      try {
        const etaRes = await fetchStopETA(selectedStop, route, service_type)
        if (!cancelled) setEtaMap(prev => ({ ...prev, [selectedStop]: etaRes.data }))
      } catch (e) {
        console.error('Failed to load ETAs', e)
        // Keep the last times on a failed refresh; show "no time" only if there were none.
        if (!cancelled) setEtaMap(prev => (prev[selectedStop] ? prev : { ...prev, [selectedStop]: [] }))
      }
    }
    loadEtas()
    const timer = setInterval(loadEtas, ETA_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isFocused, selectedStop, dataRouteKey, routeKey, route, service_type])

  // Selects a Stop and scrolls its row to the top, so its card (with Save) is in view.
  // The scroll runs from the selected row's onLayout (scrollToSelected), not here: only then has the
  // list measured the new layout. Scrolling earlier overshoots when another Stop's card closes above
  // it, and does nothing when the list is not on screen yet (a preselect, or the Map view).
  const scrollPending = useRef<string | null>(null)
  const focusStop = useCallback((stopId: string) => {
    selectStop(stopId)
    scrollPending.current = stopId
  }, [selectStop])
  const scrollToSelected = useCallback((stopId: string, index: number) => {
    if (scrollPending.current !== stopId) return
    scrollPending.current = null
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 }))
  }, [])

  // Preselect the Stop named by the `stop` param (e.g. from My Buses), once per opening of the page:
  // leaving the page forgets it, so tapping the same Favorite row again selects its Stop again.
  const handledStopRef = useRef<string | null>(null)
  const { stop: stopParam } = params
  useEffect(() => {
    if (!isFocused) {
      handledStopRef.current = null
      return
    }
    if (typeof stopParam !== 'string' || dataRouteKey !== routeKey) return
    if (!data.some(item => item.stop === stopParam)) return
    const key = `${routeKey}|${stopParam}`
    if (handledStopRef.current === key) return
    handledStopRef.current = key
    focusStop(stopParam)
  }, [isFocused, stopParam, routeKey, dataRouteKey, data, focusStop])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      // This screen stays mounted when it is opened for another Route: drop the previous Route's
      // Stops, ETAs and selection so none of them is shown for (or reused by) the new Route.
      setData([])
      setDataRouteKey(null)
      setEtaMap({})
      setSelectedStop(null)
      try {
        if (typeof route === 'string' && typeof bound === 'string' && typeof service_type === 'string') {
          const apiBound = bound === 'I' ? 'inbound' : bound === 'O' ? 'outbound' : bound
          const res = await fetchRouteSTOP(route, apiBound, service_type)
          if (cancelled) return
          setData(res.data)
          setDataRouteKey(`${route}|${bound}|${service_type}`)
        } else {
          if (!cancelled) setError('invalidRoute')
        }
      } catch (e) {
        console.error('Failed to fetch the Route\'s Stops', e)
        if (!cancelled) setError('fetchFailed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [route, bound, service_type])

  // Start and end for the header, from the Route list (cached for a day). Kept apart from the Stop
  // list load: reading the large cached list is slow on some devices and must not hold up the Stops.
  useEffect(() => {
    let cancelled = false
    setRouteInfo(null)
    // This screen is mounted at start-up with no Route; a second Route list download then would
    // double the start-up burst that gets the app 403'd by the KMB CDN.
    if (typeof route !== 'string') return
    const loadRouteInfo = async () => {
      try {
        const { routes } = await getCachedRoutes()
        if (cancelled) return
        setRouteInfo(routes.find(r => r.route === route && r.bound === bound && r.service_type === service_type) ?? null)
      } catch (e) {
        console.error('Failed to load the Route list for the header', e)
      }
    }
    loadRouteInfo()
    return () => {
      cancelled = true
    }
  }, [route, bound, service_type])

  // Stop names and coordinates for the Route's Stops. A failure here must not
  // hide the Stop list fetched above; rows fall back to Stop ids and a Retry row.
  useEffect(() => {
    let cancelled = false
    const loadStopNames = async () => {
      setNamesLoadedFor(null)
      try {
        const found = await getStopsFor(data.map(item => item.stop))
        if (cancelled) return
        setStops(found)
      } catch (e) {
        console.error('Failed to load stop names', e)
      } finally {
        if (!cancelled) setNamesLoadedFor(data)
      }
    }
    loadStopNames()
    return () => {
      cancelled = true
    }
  }, [data, namesAttempt])

  const onSave = useCallback(async (item: ROUTS) => {
    // add() is idempotent and serialized, so rapid taps can't duplicate or lose a Favorite.
    const saved = await addFavorite({ route: item.route, service_type: item.service_type, stop: item.stop })
    if (!saved) console.error('Failed to save Favorite')
    await reloadFavorites()
  }, [reloadFavorites])

  const nowIso = new Date(now).toISOString()
  const selectedItem = data.find(item => item.stop === selectedStop) ?? null
  const renderCard = (item: ROUTS, showTitle: boolean): React.JSX.Element => (
    <SelectedStopCard
      seq={item.seq}
      stopName={stopNames[item.stop] || item.stop}
      showTitle={showTitle}
      arrivals={etaMap[item.stop] ? upcomingArrivals(etaMap[item.stop], nowIso, 2) : null}
      saved={includesFavorite(favorites, { route: item.route, service_type: item.service_type, stop: item.stop })}
      onSave={() => onSave(item)}
      language={language}
      strings={strings}
    />
  )

  const from = routeInfo ? displayPlaceName(localized(routeInfo, 'orig', language), language) : null
  const to = routeInfo ? displayPlaceName(localized(routeInfo, 'dest', language), language) : null

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <MaterialIcons name="chevron-left" size={32} color={COLORS.accent} />
          <Text style={styles.backText}>{strings.back}</Text>
        </Pressable>
        <View style={styles.titleRow}>
          {typeof route === 'string' && <RouteBadge route={route} />}
          <View
            // accessible: Android exposes the label (and Maestro sees "Route: 1A") only on accessible views.
            accessible
            accessibilityRole="header"
            accessibilityLabel={typeof route === 'string' ? strings.routeHeader(route) : strings.routeHeaderEmpty}
            style={styles.places}
          >
            {from !== null && to !== null && (
              <>
                <Text style={styles.place}><Text style={styles.placeLabel}>{strings.fromOrigin} </Text>{from}</Text>
                <Text style={[styles.place, styles.destination]}><Text style={styles.placeLabel}>{strings.toDestination} </Text>{to}</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.switch}>
          <ViewButton view="list" label={strings.stopListView} icon="format-list-numbered" active={view === 'list'} onPress={setView} />
          <ViewButton view="map" label={strings.mapView} icon="map" active={view === 'map'} onPress={setView} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loading} />
      ) : error ? (
        <Text style={styles.error}>{strings[error]}</Text>
      ) : view === 'map' ? (
        <View style={styles.body}>
          <View style={styles.map} testID="route-map">
            {markers.length > 0 ? (
              <StopMap
                markers={markers}
                selectedStop={selectedStop}
                onMarkerPress={focusStop}
                userLocation={location}
                centerOnUserToken={centerOnUserToken}
                fitRouteToken={fitRouteToken}
                language={language}
              />
            ) : (
              <Text style={styles.mapUnavailable}>{strings.mapUnavailable}</Text>
            )}
            {markers.length > 0 && (
              <View style={styles.mapButtons}>
                {showLocateMe && (
                  <MapButton label={strings.whereAmI} icon="my-location" onPress={onLocateMe} />
                )}
                <MapButton label={strings.wholeRoute} icon="zoom-out-map" onPress={() => setFitRouteToken(t => t + 1)} />
              </View>
            )}
          </View>
          {selectedItem && <View style={styles.mapCard}>{renderCard(selectedItem, true)}</View>}
        </View>
      ) : (
        <View style={styles.body}>
          {namesMissing && (
            <Pressable
              onPress={() => setNamesAttempt(n => n + 1)}
              style={styles.retry}
              accessibilityRole="button"
              accessibilityLabel={strings.retryStopNamesLabel}
            >
              <MaterialIcons name="refresh" size={24} color={COLORS.accent} />
              <Text style={styles.retryText}>{strings.retryStopNames}</Text>
            </Pressable>
          )}
          <FlatList
            ref={listRef}
            data={data}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={styles.hint}>{strings.tapYourStop}</Text>}
            onScrollToIndexFailed={info => {
              // Row not measured yet: jump near it, then retry once it has rendered.
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 100)
            }}
            keyExtractor={(item, index) => `${item.route}-${item.bound}-${item.service_type}-${item.seq}-${item.stop}-${index}`}
            renderItem={({ item, index }) => {
              const name = stopNames[item.stop] || item.stop
              const isSelected = item.stop === selectedStop
              return (
                // Every row keeps an onLayout: on web, a view only reports layout if it had one when it mounted.
                <View onLayout={() => { if (isSelected) scrollToSelected(item.stop, index) }}>
                  <Pressable
                    onPress={() => (isSelected ? selectStop(null) : focusStop(item.stop))}
                    accessibilityRole="button"
                    accessibilityLabel={strings.stopRowLabel(item.seq, name)}
                    style={({ pressed }) => [styles.stopRow, pressed && styles.pressed]}
                  >
                    <View style={[styles.seq, isSelected && styles.seqSelected]}>
                      <Text style={[styles.seqText, isSelected && styles.seqTextSelected]}>{item.seq}</Text>
                    </View>
                    <Text style={styles.stopName}>{name}</Text>
                  </Pressable>
                  {isSelected && <View style={styles.listCard}>{renderCard(item, false)}</View>}
                </View>
              )
            }}
            ListEmptyComponent={<Text style={styles.hint}>{strings.noStops}</Text>}
          />
        </View>
      )}
    </View>
  )
}

interface ViewButtonProps {
  view: RouteView
  label: string
  icon: React.ComponentProps<typeof MaterialIcons>['name']
  active: boolean
  onPress: (view: RouteView) => void
}

function ViewButton({ view, label, icon, active, onPress }: ViewButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(view)}
      testID={`view-${view}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={active}
      style={({ pressed }) => [styles.switchButton, active && styles.switchButtonActive, pressed && styles.pressed]}
    >
      <MaterialIcons name={icon} size={24} color={active ? COLORS.ink : COLORS.inkMuted} />
      <Text style={[styles.switchText, active && styles.switchTextActive]}>{label}</Text>
    </Pressable>
  )
}

interface MapButtonProps {
  label: string
  icon: React.ComponentProps<typeof MaterialIcons>['name']
  onPress: () => void
}

function MapButton({ label, icon, onPress }: MapButtonProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={24} color={COLORS.accent} />
      <Text style={styles.mapButtonText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingHorizontal: SCREEN_GUTTER,
    paddingBottom: 12,
    gap: 10,
  },
  back: {
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 56 },
  places: { flex: 1, minWidth: 0, gap: 2 },
  place: { fontSize: 18, fontFamily: FONTS.regular, lineHeight: 24, color: COLORS.ink },
  placeLabel: { fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.inkMuted },
  destination: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700' },
  switch: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, backgroundColor: COLORS.keypadBackground },
  switchButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  switchButtonActive: { backgroundColor: COLORS.surface },
  switchText: { fontSize: FONT_SIZES.body, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.inkMuted },
  switchTextActive: { color: COLORS.ink },
  loading: { marginTop: 48 },
  error: { fontSize: FONT_SIZES.body, fontFamily: FONTS.regular, color: COLORS.danger, textAlign: 'center', margin: 24 },
  body: { flex: 1 },
  list: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24 },
  hint: { fontSize: 18, fontFamily: FONTS.regular, color: COLORS.inkMuted, marginVertical: 12, marginHorizontal: 4 },
  stopRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  seq: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  seqText: { fontSize: 17, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  seqTextSelected: { color: COLORS.onAccent },
  stopName: { flex: 1, fontSize: 20, fontFamily: FONTS.regular, color: COLORS.ink },
  listCard: { marginVertical: 6 },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: TOUCH_TARGET },
  retryText: { fontSize: 18, fontFamily: FONTS.regular, color: COLORS.accent },
  map: { flex: 1, backgroundColor: COLORS.keypadBackground, justifyContent: 'center' },
  mapUnavailable: { textAlign: 'center', fontSize: FONT_SIZES.body, fontFamily: FONTS.regular, color: COLORS.inkMuted },
  mapButtons: { position: 'absolute', top: 12, right: 12, gap: 10, alignItems: 'flex-end' },
  mapButton: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: TOUCH_TARGET / 2,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mapButtonText: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.ink },
  mapCard: { padding: 12, backgroundColor: COLORS.background },
  pressed: { opacity: 0.6 },
})
