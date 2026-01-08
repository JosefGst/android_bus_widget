import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

type ETA = {
  route: string;
  dir: string;
  service_type: string;
  dest_en: string;
  eta: string;
  data_timestamp: string;
};

type KMBResponse = {
  type: string;
  version: string;
  generated_timestamp: string;
  data : ETA[];
};

const App = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETA[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');

  // List of routes to fetch
  const routesToFetch = [
    { stop: 'B464BD6334A93FA1', route: '272P', dir: '1' },
    { stop: 'B644204AEDE7A031', route: '272X', dir: '1' },
    // Add more routes here, e.g. { stop: 'SOME_STOP_ID', route: 'SOME_ROUTE', dir: '1' }
  ];

  // Helper to fetch ETA for a single route
  const fetchRouteETA = async (stop: string, route: string, dir: string) => {
    const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${dir}`;
    const response = await fetch(url);
    return response.json() as Promise<KMBResponse>;
  };

  // Fetch all ETAs and combine results
  const getAllBUSETAs = async () => {
    try {
      const results = await Promise.all(
        routesToFetch.map(r => fetchRouteETA(r.stop, r.route, r.dir))
      );
      // Flatten all data arrays into one
      const allData = results.flatMap(res => res.data);
      setData(allData);
      // Use the latest generated timestamp
      setGeneratedTimestamp(results[0]?.generated_timestamp || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllBUSETAs();
    const intervalId = setInterval(() => {
      getAllBUSETAs();
    }, 30000); // 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Helper to convert ETA string to HK local time
  const formatEtaToHKTime = (eta: string) => {
    if (!eta) return 'N/A';
    // Try to parse as ISO string
    const date = new Date(eta);
    if (isNaN(date.getTime())) return eta; // fallback if not valid
    // Format to HH:mm:ss in HK time
    return date.toLocaleTimeString('en-HK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Hong_Kong',
    });
  };

  // Helper to calculate minutes until bus arrival
  const getMinutesUntilArrival = (eta: string) => {
    if (!eta) return null;
    const etaDate = new Date(eta);
    if (isNaN(etaDate.getTime())) return null;
    const now = new Date();
    // Convert both to milliseconds, adjust now to HK time
    const nowHK = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
    const diffMs = etaDate.getTime() - nowHK.getTime();
    return Math.max(0, Math.round(diffMs / 60000)); // in minutes
  };

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

export default App;