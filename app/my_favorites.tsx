
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { useLanguage } from '../components/language_context';
import { FavoriteBoard, loadFavoriteBoard } from '../utils/favorite_board';
import { Favorite, list as listFavorites, remove as removeFavorite } from '../utils/favorites';
import { arrivalText } from '../utils/strings';
import { formatEtaToHKTime } from '../utils/time_formatting';

const EMPTY_BOARD: FavoriteBoard = { groups: [], generatedTimestamp: '' };

const MyRoutes = () => {
  const router = useRouter();
  const { language, strings } = useLanguage();
  const [isLoading, setLoading] = useState(true);
  const [board, setBoard] = useState<FavoriteBoard>(EMPTY_BOARD);

  // State to trigger UI updates for countdown and show current time
  const [now, setNow] = useState(Date.now());

  // null until the first read from storage completes.
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);

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

  // Load the Favorite board every 30 seconds, once the Favorites have loaded
  useEffect(() => {
    if (favorites === null) return;
    const refresh = async () => {
      try {
        setBoard(await loadFavoriteBoard(favorites, new Date(), language));
      } catch (e) {
        console.error('Failed to load Favorite board', e);
      } finally {
        setLoading(false);
      }
    };
    refresh();
    const fetchIntervalId = setInterval(refresh, 30000);
    return () => clearInterval(fetchIntervalId);
  }, [favorites, language]);

  // Update local clock every second for smooth countdown and current time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Stop id -> display name, for labelling each Favorite in "My Routes".
  const stopNameById = useMemo(() => {
    const names: Record<string, string> = {};
    board.groups.forEach(group => group.stopIds.forEach(id => { names[id] = group.stopName; }));
    return names;
  }, [board]);

  const nowIso = new Date(now).toISOString();

  return (
    <ScrollView style={{flex: 1, padding: 24}}>
      <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>
        {strings.localTime(formatEtaToHKTime(nowIso))}
      </Text>
      <Text>{strings.generatedTimestamp(formatEtaToHKTime(board.generatedTimestamp) || strings.notAvailable)}</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {board.groups.map(group => (
            <View key={group.stopName} style={{marginBottom: 24}}>
              <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 4}}>{group.stopName}</Text>
              {group.routes.length === 0 ? (
                <Text>{strings.noBusesForStop}</Text>
              ) : (
                group.routes.map(route => (
                  <Pressable
                    key={`${route.stop}|${route.route}|${route.bound}`}
                    accessibilityRole="button"
                    accessibilityLabel={strings.openRouteAtStop(route.route, group.stopName)}
                    onPress={() => router.push({
                      pathname: '/routes_stop',
                      params: { route: route.route, bound: route.bound, service_type: route.service_type, stop: route.stop },
                    })}
                    style={{flexDirection: 'row', alignItems: 'center'}}
                  >
                    <View style={{flex: 1}}>
                      {route.arrivals.map((arrival, idx) => (
                        <Text key={idx}>
                          {/* Recomputed from the ETA every tick so the countdown stays live between board refreshes. */}
                          {arrivalText(strings, arrival.eta, nowIso, route.route)}
                        </Text>
                      ))}
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color="#888" />
                  </Pressable>
                ))
              )}
            </View>
          ))}
          {/* List of routes with delete button at the bottom */}
          <View style={{marginTop: 32}}>
            <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 4}}>{strings.myRoutes}</Text>
            {!favorites || favorites.length === 0 ? (
              <Text>{strings.noRoutesAdded}</Text>
            ) : (
              favorites.map((route, idx) => (
                <View key={idx} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                  <Text style={{flex: 1}}>
                    {route.route} ({stopNameById[route.stop] ?? route.stop})
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await removeFavorite(route);
                      await reloadFavorites();
                    }}
                    accessibilityLabel={strings.removeRoute(route.route)}
                    style={{marginLeft: 8}}
                  >
                    <MaterialIcons name="delete" size={22} color="#c00" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default MyRoutes;
