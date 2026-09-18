import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LetterKeypad from '../components/LetterKeypad';
import NumericKeypad from '../components/NumericKeypad';
import { ROUTS, getCachedRoutes } from '../utils/fetch';
import { filterRoutesByQuery, getAvailableLetters } from '../utils/route_search';
import { formatEtaToHKTime } from '../utils/time_formatting';



const App = () => {
  const router = useRouter();
  const [isLoading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<ROUTS[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load routes using daily cache logic
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const { routes, generatedTimestamp } = await getCachedRoutes();
        setRoutes(routes);
        setGeneratedTimestamp(generatedTimestamp);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadRoutes();
  }, []);

  const filteredRoutes = useMemo(
    () => filterRoutesByQuery(routes, searchQuery),
    [routes, searchQuery]
  );

  const availableLetters = useMemo(
    () => getAvailableLetters(routes, searchQuery),
    [routes, searchQuery]
  );


  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.headerText}>
            Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by route number..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            placeholderTextColor="black"
            showSoftInputOnFocus={false}
            caretHidden={false}
          />
          <FlatList
            style={styles.list}
            data={filteredRoutes}
            keyExtractor={(item, index) => `${item.route}-${item.bound}-${item.service_type}-${item.orig_en}-${item.dest_en}-${index}`}
            renderItem={({item}) => (
              <TouchableOpacity onPress={() => router.push({ pathname: '/routes_stop', params: { route: item.route, bound: item.bound, service_type: item.service_type } })}>
                <Text style={styles.routeText}>
                    <Text style={{ fontWeight: 'bold' }}>
                    {item.route}
                    </Text> {item.orig_en} → {item.dest_en}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text>No routes found.</Text>}
          />
          <View style={styles.keypadRow}>
            <View style={styles.numericKeypad}>
              <NumericKeypad
                onPressDigit={(digit) => setSearchQuery(prev => prev + digit)}
                onBackspace={() => setSearchQuery(prev => prev.slice(0, -1))}
                onClear={() => setSearchQuery('')}
              />
            </View>
            <View style={styles.letterKeypad}>
              <LetterKeypad
                letters={availableLetters}
                onPressLetter={(letter) => setSearchQuery(prev => prev + letter)}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  list: {
    flex: 1,
  },
  keypadRow: {
    flexDirection: 'row',
  },
  numericKeypad: {
    flex: 3,
  },
  letterKeypad: {
    flex: 2,
    marginLeft: 10,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  searchInput: {
    height: 56,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: 20,
  },
  routeText: {
    color: 'black',
    paddingVertical: 6,
    fontSize: 16,
  },
});

export default App;