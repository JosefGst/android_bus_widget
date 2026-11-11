import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StopMap } from '../components/StopMap';
import { add as addFavorite } from '../utils/favorites';
import { ETA, fetchRouteSTOP, fetchStopETA, ROUTS, Stop } from '../utils/fetch';
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
  const { height: windowHeight } = useWindowDimensions();
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [etaMap, setEtaMap] = useState<{ [stopId: string]: ETA[] }>({});
  const [loadingEta, setLoadingEta] = useState<string | null>(null);
  const listRef = useRef<FlatList<ROUTS>>(null);
  const [mapVisible, setMapVisible] = useState(true);

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

  // A marker tap selects the Stop and brings its row into view.
  const onMarkerPress = useCallback((stopId: string) => {
    selectStop(stopId);
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
        <>
        {mapVisible && (
          <View style={[styles.mapContainer, { height: Math.round(windowHeight / 3) }]} testID="route-map">
            {markers.length > 0 ? (
              <StopMap markers={markers} selectedStop={expandedStop} onMarkerPress={onMarkerPress} />
            ) : (
              <Text style={styles.mapUnavailable}>Map unavailable</Text>
            )}
          </View>
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
        </>
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
