import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { ETA, fetchRouteETA } from './utils/fetch';
import { formatEtaToHKTime, getMinutesUntilArrival } from './utils/time_formatting';

const RoutesStopScreen = () => {
  const [now, setNow] = useState(Date.now());
  const router = useRouter();
  const params = useLocalSearchParams();
  const { route, bound, service_type } = params;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETA[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (typeof route === 'string' && typeof service_type === 'string') {
          // For demo, use route as stopId. Replace with actual stopId logic as needed.
          const stopId = route; // Replace with actual stopId
          const res = await fetchRouteETA(route, service_type);
          setData(res.data);
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
          keyExtractor={(item, index) => `${item.route}-${item.dir}-${item.service_type}-${item.dest_en}-${item.eta}-${index}`}
          renderItem={({ item }) => (
            <Text style={{ fontSize: 16, marginBottom: 8 }}>
              {item.route} ({item.dir}) will arrive in {getMinutesUntilArrival(item.eta, new Date(now).toISOString()) || '-'} minutes (ETA: {formatEtaToHKTime(item.eta)})
            </Text>
          )}
          ListEmptyComponent={<Text>No ETAs found for this route.</Text>}
        />
      )}
    </View>
  );
};

export default RoutesStopScreen;
