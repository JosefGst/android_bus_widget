
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Favorite, list as listFavorites, remove as removeFavorite } from '../utils/favorites';
import { ETA, fetchStop, getAllBUSETAs } from '../utils/fetch';
import { normalizeStopName } from '../utils/string_formatting';
import { formatEtaToHKTime, getMinutesUntilArrival } from '../utils/time_formatting';

// Locally extend ETA to include stop
type ETAWithStop = ETA & { stop: string };

// Stable empty list so hooks depending on it don't re-run every render.
const NO_FAVORITES: Favorite[] = [];

const MyRoutes = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETAWithStop[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [stopNames, setStopNames] = useState<Record<string, string>>({});

  // State to trigger UI updates for countdown and show current time
  const [now, setNow] = useState(Date.now());


  // null until the first read from storage completes.
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const routesToFetch = favorites ?? NO_FAVORITES;

  const reloadFavorites = useCallback(async () => {
    try {
      setFavorites(await listFavorites());
    } catch (e) {
      console.error('Failed to load Favorites', e);
    }
  }, []);

  // Re-read on every focus: this tab stays mounted while the user stars Stops elsewhere.
  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
    }, [reloadFavorites])
  );

  // Fetch all ETAs and combine results using utils
  const fetchAll = useCallback(async () => {
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
  }, [routesToFetch]);

  // Fetch ETA data every 30 seconds, once the Favorites have loaded
  useEffect(() => {
    if (favorites === null) return;
    fetchAll();
    const fetchIntervalId = setInterval(() => {
      fetchAll();
    }, 30000); // 30 seconds
    return () => {
      clearInterval(fetchIntervalId);
    };
  }, [favorites, fetchAll]);

  // Update local clock every second for smooth countdown and current time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollView style={{flex: 1, padding: 24}}>
      <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>
        Local Time: {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text>Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {/* Group ETAs by normalized stop name (remove (...)) */}
          {(() => {
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

            // For each ETA, assign to the correct stop group by matching stopId directly from eta.stop
            data.forEach((eta) => {
              const stopId = eta.stop;
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
          {/* List of routes with delete button at the bottom */}
          <View style={{marginTop: 32}}>
            <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 4}}>My Routes</Text>
            {routesToFetch.length === 0 ? (
              <Text>No routes added.</Text>
            ) : (
              routesToFetch.map((route, idx) => {
                const stopName = stopNames[route.stop] || route.stop;
                return (
                  <View key={idx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                    <Text style={{flex: 1}}>
                      {route.route} ({stopName})
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        await removeFavorite(route);
                        await reloadFavorites();
                      }}
                      accessibilityLabel={`Remove route ${route.route}`}
                      style={{marginLeft: 8}}
                    >
                      <MaterialIcons name="delete" size={22} color="#c00" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default MyRoutes;
