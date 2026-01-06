import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

type Buses = {
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
  data : Buses[];
};

const App = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<Buses[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');

  const getBUSETA = async () => {
    try {
      const response = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route-eta/3M/1');
      const json = (await response.json()) as KMBResponse;
      setData(json.data);
      setGeneratedTimestamp(json.generated_timestamp);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBUSETA();
    const intervalId = setInterval(() => {
      getBUSETA();
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

  return (
    <View style={{flex: 1, padding: 24}}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text>Generated Timestamp: {generatedTimestamp || 'N/A'}</Text>
          <FlatList
            data={data}
            keyExtractor={({route}) => route}
            renderItem={({item}) => (
              <Text>
                {item.route} - {item.dir} ({item.service_type}) to {item.dest_en} ETA: {formatEtaToHKTime(item.eta)}
              </Text>
            )}
          />
        </>
      )}
    </View>
  );
};

export default App;