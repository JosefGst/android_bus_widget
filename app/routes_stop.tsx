import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { ETA, fetchRouteSTOP, fetchStopETA, getCachedStops, ROUTS } from './utils/fetch';

const RoutesStopScreen = () => {
  // ...existing code...
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (typeof route === 'string' && typeof bound === 'string' && typeof service_type === 'string') {
          let apiBound = bound;
          if (bound === 'I') apiBound = 'inbound';
          else if (bound === 'O') apiBound = 'outbound';
          const res = await fetchRouteSTOP(route, apiBound, service_type);
          setData(res.data);
          // Fetch stop names from cache
          const { stops } = await getCachedStops();
          const stopNameMap: { [stopId: string]: string } = {};
          stops.forEach(stop => {
            stopNameMap[stop.stop] = stop.name_en;
          });
          setStopNames(stopNameMap);
        } else {
          setError('Invalid route, bound, or service type');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [route, bound, service_type]);

  return (
    <View style={{ flex: 1, paddingTop: 40 }}>
      <Pressable onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: 40, padding: 8, zIndex: 10 }}>
        <Text style={{ fontSize: 24, color: '#007aff' }}>{'←'}</Text>
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
                        const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${item.stop}/${route}/${service_type}`;
                        console.log('Fetching ETA URL:', url);
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
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 16, marginBottom: expandedStop === item.stop ? 0 : 8 }}>
                  Stop Seq {item.seq}: {stopNames[item.stop] || item.stop}
                </Text>
              </Pressable>
              {expandedStop === item.stop && (
                <View style={{ paddingLeft: 16, paddingBottom: 8 }}>
                  {loadingEta === item.stop ? (
                    <Text style={{ fontSize: 15, color: '#007aff' }}>Loading ETA...</Text>
                  ) : etaMap[item.stop] && etaMap[item.stop].length > 0 ? (
                    etaMap[item.stop].map((eta, idx) => (
                      <Text key={idx} style={{ fontSize: 15, color: '#007aff' }}>
                        ETA: {eta.eta ? eta.eta : 'N/A'}
                      </Text>
                    ))
                  ) : (
                    <Text style={{ fontSize: 15, color: '#007aff' }}>No ETA available</Text>
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
