import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';

import { ROUTS, fetchBusROUTS } from './utils/fetch';
import { formatEtaToHKTime } from './utils/time_formatting';



const App = () => {
  const [isLoading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<ROUTS[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load routes from local storage, then fetch from network and update cache
  useEffect(() => {
    const loadAndFetchRoutes = async () => {
      try {
        // Try to load from AsyncStorage first
        const cached = await AsyncStorage.getItem('bus_routes_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setRoutes(parsed.routes || []);
          setGeneratedTimestamp(parsed.generatedTimestamp || '');
          setLoading(false); // Show cached data immediately
        }
      } catch (e) {
        // Ignore cache errors
      }
      // Always try to fetch latest from network
      try {
        const res = await fetchBusROUTS();
        setRoutes(res.data);
        setGeneratedTimestamp(res.generated_timestamp);
        await AsyncStorage.setItem('bus_routes_cache', JSON.stringify({
          routes: res.data,
          generatedTimestamp: res.generated_timestamp,
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadAndFetchRoutes();
  }, []);

  // Filter routes based on search query
  const filteredRoutes = routes.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.route.toLowerCase().includes(q) ||
      item.orig_en.toLowerCase().includes(q) ||
      item.dest_en.toLowerCase().includes(q)
    );
  });

  return (
    <View style={{flex: 1, padding: 24}}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>
            Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}
          </Text>
          <TextInput
            style={{
              height: 40,
              borderColor: '#ccc',
              borderWidth: 1,
              borderRadius: 6,
              marginBottom: 12,
              paddingHorizontal: 10,
              backgroundColor: '#fff',
            }}
            placeholder="Search by route, origin, or destination..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <FlatList
            data={filteredRoutes}
            keyExtractor={(item, index) => `${item.route}-${item.bound}-${item.service_type}-${item.orig_en}-${item.dest_en}-${index}`}
            renderItem={({item}) => (
              <Text>
                {item.route} ({item.bound}) [{item.service_type}] {item.orig_en} → {item.dest_en}
              </Text>
            )}
            ListEmptyComponent={<Text>No routes found.</Text>}
          />
        </>
      )}
    </View>
  );
};

export default App;