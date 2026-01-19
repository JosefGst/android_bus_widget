import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ETA, fetchStopInfo, getAllBUSETAs } from './utils/fetch';
import { formatEtaToHKTime, getMinutesUntilArrival } from './utils/time_formatting';

const MyRoutes = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETA[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [stopNames, setStopNames] = useState<Record<string, string>>({});

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

      // Fetch stop names for all unique stops
      const uniqueStops = Array.from(new Set(routesToFetch.map(r => r.stop)));
      const stopInfoResults = await Promise.all(uniqueStops.map(stopId => fetchStopInfo(stopId)));
      const stopNameMap: Record<string, string> = {};
      stopInfoResults.forEach((info, idx) => {
        if (info) {
          stopNameMap[uniqueStops[idx]] = info.name_en;
        }
      });
      setStopNames(stopNameMap);
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
          {/* Group ETAs by normalized stop name (remove (PA...)) */}
          {(() => {
            // Helper to normalize stop name by removing (PA...)
            const normalizeStopName = (name: string) => name.replace(/\s*\(PA\d+\)/, '').trim();

            // Build a map: normalizedStopName -> { stopIds: Set, etas: [] }
            const stopGroups: Record<string, { stopIds: Set<string>, etas: ETA[] }> = {};
            routesToFetch.forEach(routeObj => {
              const stopId = routeObj.stop;
              const stopNameRaw = stopNames[stopId] || stopId;
              const stopName = normalizeStopName(stopNameRaw);
              if (!stopGroups[stopName]) {
                stopGroups[stopName] = { stopIds: new Set(), etas: [] };
              }
              stopGroups[stopName].stopIds.add(stopId);
            });

            // For each ETA, assign to the correct stop group by matching stopId from routesToFetch
            data.forEach((eta, index) => {
              // Find the stopId for this ETA (by route/dir)
              const normalizeDir = (dir: string) => {
                if (dir === '1' || dir === 'O') return ['1', 'O'];
                if (dir === '2' || dir === 'I') return ['2', 'I'];
                return [dir];
              };
              const routeObj = routesToFetch.find(r => r.route === eta.route && normalizeDir(r.dir).includes(eta.dir));
              const stopId = routeObj ? routeObj.stop : routesToFetch[index]?.stop;
              const stopNameRaw = stopNames[stopId] || stopId;
              const stopName = normalizeStopName(stopNameRaw);
              if (stopGroups[stopName]) {
                stopGroups[stopName].etas.push(eta);
              }
            });

            // Render each stop group
            return Object.entries(stopGroups).map(([stopName, group]) => (
              <View key={stopName} style={{marginBottom: 24}}>
                <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 4}}>{stopName}</Text>
                {group.etas.length === 0 ? (
                  <Text>No buses found for this stop.</Text>
                ) : (
                  group.etas.map((item, idx) => (
                    <Text key={idx}>
                      {item.route} will arrive in {getMinutesUntilArrival(item.eta) || '-'} minutes (ETA: {formatEtaToHKTime(item.eta)})
                    </Text>
                  ))
                )}
              </View>
            ));
          })()}
        </>
      )}
    </View>
  );
};

export default MyRoutes;