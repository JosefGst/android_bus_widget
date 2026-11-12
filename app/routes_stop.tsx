import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapResizeHandle } from '../components/MapResizeHandle';
import { StopMap } from '../components/StopMap';
import { useUserLocation } from '../components/use_user_location';
import { add as addFavorite } from '../utils/favorites';
import { ETA, fetchRouteSTOP, fetchStopETA, ROUTS, Stop } from '../utils/fetch';
import { DEFAULT_MAP_FRACTION, growForMarker, loadMapSize, saveMapSize, snapFraction } from '../utils/map_size';
import { buildRouteMarkers } from '../utils/route_stop_map';
import { getStopsFor } from '../utils/stops';
import { formatEtaToHKTime, getMinutesUntilArrival } from '../utils/time_formatting';

const RoutesStopScreen = () => {
  const [now, setNow] = useState(Date.now());
  const router = useRouter();
  const params = useLocalSearchParams();
  const { route, bound, service_type } = params;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ROUTS[]>([]);
  const [stopNames, setStopNames] = useState<{ [stopId: string]: string }>({});
  const [stops, setStops] = useState<Stop[]>([]);
  const markers = useMemo(() => buildRouteMarkers(data, stops), [data, stops]);
  // The Stop list whose names finished loading; null while a load is running.
  const [namesLoadedFor, setNamesLoadedFor] = useState<ROUTS[] | null>(null);
  // Bumped by the Retry row to load the Stop names again.
  const [namesAttempt, setNamesAttempt] = useState(0);
  const namesMissing = namesLoadedFor === data && data.some(item => !stopNames[item.stop]);
  // Height of the area below the header; map sizes are fractions of it so the handle and list stay on
  // screen. The map waits for this measurement so it never flashes at the wrong size.
  const [contentHeight, setContentHeight] = useState(0);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [etaMap, setEtaMap] = useState<{ [stopId: string]: ETA[] }>({});
  const [loadingEta, setLoadingEta] = useState<string | null>(null);
  const listRef = useRef<FlatList<ROUTS>>(null);
  const [mapVisible, setMapVisible] = useState(true);
  // Map height as a fraction of the window: the saved snap size, or the live value while dragging.
  const [mapFraction, setMapFraction] = useState(DEFAULT_MAP_FRACTION);
  useEffect(() => {
    let cancelled = false;
    loadMapSize().then(f => { if (!cancelled) setMapFraction(f); });
    return () => { cancelled = true; };
  }, []);
  // The user's position: watched only while this screen has focus and the map is shown.
  const isFocused = useIsFocused();
  const userLocation = useUserLocation(isFocused && mapVisible);
  const [centerOnUserToken, setCenterOnUserToken] = useState(0);
  const [fitRouteToken, setFitRouteToken] = useState(0);
  // A "locate me" tap made before the first position arrived; centers once it does.
  const [centerPending, setCenterPending] = useState(false);
  const { location, start: startLocation } = userLocation;
  useEffect(() => {
    if (!centerPending || !location) return;
    setCenterPending(false);
    setCenterOnUserToken(t => t + 1);
  }, [centerPending, location]);
  const onLocateMe = useCallback(async () => {
    if (await startLocation()) setCenterPending(true);
  }, [startLocation]);
  const showLocateMe = Platform.OS === 'android' && userLocation.permission !== 'denied';
  const onMapResizeRelease = useCallback((fraction: number) => {
    const snapped = snapFraction(fraction);
    setMapFraction(snapped);
    saveMapSize(snapped);
  }, []);

  // The one selected Stop: drives the expanded row and the highlighted marker.
  const selectStop = useCallback(async (stopId: string | null) => {
    setExpandedStop(stopId);
    if (!stopId || etaMap[stopId]) return;
    setLoadingEta(stopId);
    try {
      const etaRes = await fetchStopETA(stopId, route as string, service_type as string);
      setEtaMap(prev => ({ ...prev, [stopId]: etaRes.data }));
    } catch {
      setEtaMap(prev => ({ ...prev, [stopId]: [] }));
    } finally {
      setLoadingEta(null);
    }
  }, [etaMap, route, service_type]);

  // A marker tap selects the Stop, grows a small map (not saved) and brings its row into view.
  const onMarkerPress = useCallback((stopId: string) => {
    selectStop(stopId);
    setMapFraction(growForMarker);
    const index = data.findIndex(item => item.stop === stopId);
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, [data, selectStop]);

  // Update local clock every second for smooth countdown and current time
    useEffect(() => {
      const timer = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (typeof route === 'string' && typeof bound === 'string' && typeof service_type === 'string') {
          let apiBound = bound;
          if (bound === 'I') apiBound = 'inbound';
          else if (bound === 'O') apiBound = 'outbound';
          const res = await fetchRouteSTOP(route, apiBound, service_type);
          if (cancelled) return;
          setData(res.data);
        } else {
          if (!cancelled) setError('Invalid route, bound, or service type');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to fetch data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [route, bound, service_type]);

  // Stop names and coordinates for the Route's Stops. A failure here must not
  // hide the Stop list fetched above; rows fall back to Stop ids and a Retry row.
  useEffect(() => {
    let cancelled = false;
    const loadStopNames = async () => {
      setNamesLoadedFor(null);
      try {
        const found = await getStopsFor(data.map(item => item.stop));
        if (cancelled) return;
        const stopNameMap: { [stopId: string]: string } = {};
        found.forEach(stop => {
          stopNameMap[stop.stop] = stop.name_en;
        });
        setStopNames(stopNameMap);
        setStops(found);
      } catch (e) {
        console.error('Failed to load stop names', e);
      } finally {
        if (!cancelled) setNamesLoadedFor(data);
      }
    };
    loadStopNames();
    return () => {
      cancelled = true;
    };
  }, [data, namesAttempt]);

  return (
    <View style={{ flex: 1, paddingTop: 40 }}>
      <Pressable onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: 40, padding: 8, zIndex: 10 }}>
        <MaterialIcons name="navigate-before" size={42} color="#007aff" />
      </Pressable>
      <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
        {typeof route === 'string' ? `Route: ${route}` : 'Route'}
      </Text>
      <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 12 }}>
        {typeof bound === 'string' ? `Direction: ${bound}` : ''} {typeof service_type === 'string' ? `Service Type: ${service_type}` : ''}
      </Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
      ) : (
        <View style={{ flex: 1 }} onLayout={e => setContentHeight(e.nativeEvent.layout.height)}>
        {mapVisible && contentHeight > 0 && (
          <View style={[styles.mapContainer, { height: Math.round(contentHeight * mapFraction) }]} testID="route-map">
            {markers.length > 0 ? (
              <StopMap
                markers={markers}
                selectedStop={expandedStop}
                onMarkerPress={onMarkerPress}
                userLocation={location}
                centerOnUserToken={centerOnUserToken}
                fitRouteToken={fitRouteToken}
              />
            ) : (
              <Text style={styles.mapUnavailable}>Map unavailable</Text>
            )}
            {markers.length > 0 && (
              <Pressable
                onPress={() => setFitRouteToken(t => t + 1)}
                style={[styles.mapButton, { bottom: showLocateMe ? 80 : 24 }]}
                accessibilityRole="button"
                accessibilityLabel="Show route"
              >
                <MaterialIcons name="zoom-out-map" size={24} color="#1a73e8" />
              </Pressable>
            )}
            {markers.length > 0 && showLocateMe && (
              <Pressable
                onPress={onLocateMe}
                style={[styles.mapButton, { bottom: 24 }]}
                accessibilityRole="button"
                accessibilityLabel="Show my location"
              >
                <MaterialIcons name="my-location" size={24} color="#1a73e8" />
              </Pressable>
            )}
          </View>
        )}
        {mapVisible && contentHeight > 0 && (
          <MapResizeHandle
            fraction={mapFraction}
            areaHeight={contentHeight}
            onDrag={setMapFraction}
            onRelease={onMapResizeRelease}
          />
        )}
        <Pressable
          onPress={() => setMapVisible(v => !v)}
          style={styles.mapToggle}
          accessibilityRole="button"
          accessibilityLabel={mapVisible ? 'Hide map' : 'Show map'}
        >
          <MaterialIcons name={mapVisible ? 'expand-less' : 'map'} size={22} color="#007aff" />
          <Text style={styles.mapToggleText}>{mapVisible ? 'Hide map' : 'Show map'}</Text>
        </Pressable>
        {namesMissing && (
          <Pressable
            onPress={() => setNamesAttempt(n => n + 1)}
            style={styles.namesRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading stop names"
          >
            <MaterialIcons name="refresh" size={20} color="#007aff" />
            <Text style={styles.mapToggleText}>Couldn&apos;t load stop names — Retry</Text>
          </Pressable>
        )}
        <FlatList
          ref={listRef}
          data={data}
          onScrollToIndexFailed={info => {
            // Row not measured yet: jump near it, then retry once it has rendered.
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 100);
          }}
          keyExtractor={(item, index) => `${item.route}-${item.bound}-${item.service_type}-${item.seq}-${item.stop}-${index}`}
          renderItem={({ item }) => (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable
                  onPress={() => selectStop(expandedStop === item.stop ? null : item.stop)}
                  style={{ flex: 1, paddingVertical: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.seqCircle}>
                      <Text style={styles.seqText}>
                        {item.seq}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, marginBottom: expandedStop === item.stop ? 0 : 8 }}>
                      {stopNames[item.stop] || item.stop}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    // add() is idempotent and serialized, so rapid taps can't duplicate or lose a Favorite.
                    const saved = await addFavorite({ route: item.route, service_type: item.service_type, stop: item.stop });
                    if (saved) {
                      router.push('/my_favorites');
                    } else {
                      console.error('Failed to save Favorite');
                    }
                  }}
                  hitSlop={8}
                  accessibilityLabel="Favorite this stop"
                >
                  <MaterialIcons name="star" size={42} color="#FFD700" />
                </Pressable>
              </View>
              {expandedStop === item.stop && (
                <View style={{ paddingLeft: 16, paddingBottom: 8 }}>
                  {loadingEta === item.stop ? (
                    <Text style={{ fontSize: 15, color: 'black' }}>Loading ETA...</Text>
                  ) : etaMap[item.stop] && etaMap[item.stop].length > 0 ? (
                    etaMap[item.stop].map((eta, idx) => (
                      <Text key={idx} style={{ fontSize: 15, color: 'black' }}>
                        arrives in {getMinutesUntilArrival(eta.eta, new Date(now).toISOString()) || '-'} minutes (ETA: {formatEtaToHKTime(eta.eta)})
                      </Text>
                    ))
                  ) : (
                    <Text style={{ fontSize: 15, color: 'black' }}>No ETA available</Text>
                  )}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<Text>No stops found for this route.</Text>}
        />
        </View>
      )}
    </View>
  );
};

export default RoutesStopScreen;

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
  },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  mapToggleText: {
    color: '#007aff',
    fontSize: 15,
    marginLeft: 4,
  },
  namesRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  mapButton: {
    position: 'absolute',
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  mapUnavailable: {
    textAlign: 'center',
    color: '#666',
  },
  seqCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  seqText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
});
