import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ETA, fetchStop, getAllBUSETAs } from './utils/fetch';
import { loadFavoriteStopIds } from './utils/storage';
import { formatEtaToHKTime, getMinutesUntilArrival } from './utils/time_formatting';

const MyRoutes = () => {
  const params = useLocalSearchParams();
  const stopIdFromParam = typeof params.stop_id === 'string' ? params.stop_id : undefined;
  const routeFromParam = typeof params.route === 'string' ? params.route : undefined;
  const boundFromParam = typeof params.bound === 'string' ? params.bound : undefined;
  const serviceTypeFromParam = typeof params.service_type === 'string' ? params.service_type : undefined;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETA[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [stopNames, setStopNames] = useState<Record<string, string>>({});

  // List of routes to fetch

  // State to trigger UI updates for countdown and show current time
  const [now, setNow] = useState(Date.now());
  // Use state to accumulate all bus stops passed from star button
  const baseRoutesToFetch = [
    { stop: 'B464BD6334A93FA1', route: '272P', service_type: '1' },
    { stop: 'B644204AEDE7A031', route: '272X', service_type: '1' },
    // Add more routes here, e.g. { stop: 'SOME_STOP_ID', route: 'SOME_ROUTE', service_type: '1' }
  ];

  const [routesToFetch, setRoutesToFetch] = useState(baseRoutesToFetch);

  // Append new bus stop from params if present and not already in the array
  useEffect(() => {
    if (routeFromParam && boundFromParam && serviceTypeFromParam && stopIdFromParam) {
      setRoutesToFetch(prev => {
        const exists = prev.some(r => r.stop === stopIdFromParam && r.route === routeFromParam && r.service_type === serviceTypeFromParam);
        if (!exists) {
          return [
            ...prev,
            { stop: stopIdFromParam, route: routeFromParam, service_type: serviceTypeFromParam }
          ];
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeFromParam, boundFromParam, serviceTypeFromParam, stopIdFromParam]);

  // Fetch all ETAs and combine results using utils
  const fetchAll = async () => {
    try {
      const { allData, generatedTimestamp } = await getAllBUSETAs(routesToFetch);
      setData(allData);
      setGeneratedTimestamp(generatedTimestamp);

      // Fetch stop names for all unique stops
      const uniqueStops = Array.from(new Set(routesToFetch.map(r => r.stop)));
      const stopInfoResults = await Promise.all(uniqueStops.map(stopId => fetchStop(stopId)));
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

  // Fetch ETA data every 30 seconds
  useEffect(() => {
    fetchAll();
    const fetchIntervalId = setInterval(() => {
      fetchAll();
    }, 30000); // 30 seconds
    return () => clearInterval(fetchIntervalId);
  }, [routesToFetch]);



  // Update local clock every second for smooth countdown and current time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load all favorite stop ids on mount
  useEffect(() => {
    loadFavoriteStopIds().then(setFavoriteStopIds);
  }, []);

  const [favoriteStopIds, setFavoriteStopIds] = useState<string[]>([]);

  return (
    <View style={{flex: 1, padding: 24}}>
      <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>
        Local Time: {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text>Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}</Text>
      {/* Show all data passed from star button press if present */}
      {(routeFromParam || boundFromParam || serviceTypeFromParam || stopIdFromParam) && (
        <View style={{ backgroundColor: '#e0ffe0', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold', color: '#007a00' }}>Data from Star Button:</Text>
          {routeFromParam && <Text>Route: {routeFromParam}</Text>}
          {boundFromParam && <Text>Bound: {boundFromParam}</Text>}
          {serviceTypeFromParam && <Text>Service Type: {serviceTypeFromParam}</Text>}
          {stopIdFromParam && <Text>Stop ID: {stopIdFromParam}</Text>}
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {/* Group ETAs by normalized stop name (remove (PA...)) */}
          {(() => {
            // Helper to normalize stop name by removing (PA...)
            const normalizeStopName = (name: string) =>
              typeof name === 'string' ? name.replace(/\s*\(PA\d+\)/, '').trim() : '';

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
              const routeObj = routesToFetch.find(r => r.route === eta.route && r.service_type === eta.service_type && normalizeDir(r.service_type).includes(eta.dir));
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
                      {item.route} will arrive in {getMinutesUntilArrival(item.eta, new Date(now).toISOString()) || '-'} minutes (ETA: {formatEtaToHKTime(item.eta)})
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