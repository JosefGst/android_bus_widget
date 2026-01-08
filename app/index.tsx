import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { formatEtaToHKTime } from './utils/time_formatting';


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