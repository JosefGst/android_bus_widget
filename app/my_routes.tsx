import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { ETA, getAllBUSETAs } from './utils/fetch';
import { formatEtaToHKTime, getMinutesUntilArrival } from './utils/time_formatting';

const MyRoutes = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETA[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');

  // List of routes to fetch
  const routesToFetch = [
    { stop: 'B464BD6334A93FA1', route: '272P', dir: '1' },
    { stop: 'B644204AEDE7A031', route: '272X', dir: '1' },
    // Add more routes here, e.g. { stop: 'SOME_STOP_ID', route: 'SOME_ROUTE', dir: '1' }
  ];

  // Fetch all ETAs and combine results using utils
  const fetchAll = async () => {
    try {
      const { allData, generatedTimestamp } = await getAllBUSETAs(routesToFetch);
      setData(allData);
      setGeneratedTimestamp(generatedTimestamp);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const intervalId = setInterval(() => {
      fetchAll();
    }, 30000); // 30 seconds
    return () => clearInterval(intervalId);
  }, []);


  return (
    <View style={{flex: 1, padding: 24}}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text>Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}</Text>
          <FlatList
            data={data}
            keyExtractor={item => `${item.route}-${item.dir}-${item.service_type}-${item.dest_en}-${item.eta}`}
            renderItem={({item}) => (
              <Text>
                {item.route} will arrive in {getMinutesUntilArrival(item.eta) || '-'} minutes (ETA: {formatEtaToHKTime(item.eta)})
              </Text>
            )}
          />
        </>
      )}
    </View>
  );
};

export default MyRoutes;