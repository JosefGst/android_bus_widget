import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { ETA, fetchRouteSTOP, fetchStopETA, getCachedStops, ROUTS } from '../utils/fetch';
import { appendFavoriteStopId } from '../utils/storage';
import { formatEtaToHKTime, getMinutesUntilArrival } from '../utils/time_formatting';

const RoutesStopScreen = () => {
  const [now, setNow] = useState(Date.now());
  const router = useRouter();
  const params = useLocalSearchParams();
  const { route, bound, service_type } = params;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ROUTS[]>([]);
  const [stopNames, setStopNames] = useState<{ [stopId: string]: string }>({});
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [etaMap, setEtaMap] = useState<{ [stopId: string]: ETA[] }>({});
  const [loadingEta, setLoadingEta] = useState<string | null>(null);
  // Track favorite operations in progress to prevent rapid clicks
  const favoriteInProgress = useRef<{ [stopId: string]: boolean }>({});

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
          // Fetch stop names from cache - failures here must not hide the
          // route/stop data we already fetched successfully above.
          try {
            const { stops } = await getCachedStops();
            if (cancelled) return;
            const stopNameMap: { [stopId: string]: string } = {};
            stops.forEach(stop => {
              stopNameMap[stop.stop] = stop.name_en;
            });
            setStopNames(stopNameMap);
          } catch (nameErr: any) {
            console.warn('Failed to load stop names', nameErr);
          }
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
        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item.route}-${item.bound}-${item.service_type}-${item.seq}-${item.stop}-${index}`}
          renderItem={({ item }) => (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable
                  onPress={async () => {
                    if (expandedStop === item.stop) {
                      setExpandedStop(null);
                    } else {
                      setExpandedStop(item.stop);
                      // Only fetch if not already fetched
                      if (!etaMap[item.stop]) {
                        setLoadingEta(item.stop);
                        try {
                          // Use correct direction for API
                          let apiBound = bound;
                          if (bound === 'I') apiBound = 'inbound';
                          else if (bound === 'O') apiBound = 'outbound';
                          const etaRes = await fetchStopETA(item.stop, route as string, service_type as string);
                          setEtaMap(prev => ({ ...prev, [item.stop]: etaRes.data }));
                        } catch (e) {
                          setEtaMap(prev => ({ ...prev, [item.stop]: [] }));
                        } finally {
                          setLoadingEta(null);
                        }
                      }
                    }
                  }}
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
                    // Debounce: prevent rapid clicks
                    if (favoriteInProgress.current[item.stop]) {
                      return;
                    }

                    favoriteInProgress.current[item.stop] = true;
                    try {
                      const success = await appendFavoriteStopId(item.stop);

                      if (success) {
                        router.push({ pathname: '/my_favorites', params: { route: item.route, bound: item.bound, service_type: item.service_type, stop_id: item.stop } });
                      } else {
                        console.error('Failed to save favorite stop');
                      }
                    } catch (e) {
                      console.error('Error saving favorite stop', e);
                    } finally {
                      // Clear the debounce flag after a short delay
                      setTimeout(() => {
                        favoriteInProgress.current[item.stop] = false;
                      }, 500);
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
      )}
    </View>
  );
};

export default RoutesStopScreen;

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
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
