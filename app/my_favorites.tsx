
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
// #region agent log
try{const jsxRuntime=require('react/jsx-dev-runtime');fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'850410'},body:JSON.stringify({sessionId:'850410',location:'my_favorites.tsx:6',message:'Checking React import and JSX runtime',data:{reactVersion:React.version,hasReact:typeof React!=='undefined',jsxRuntimeAvailable:jsxRuntime!==undefined,jsxDEVType:typeof jsxRuntime?.jsxDEV,hasJsxDEV:typeof jsxRuntime?.jsxDEV==='function'},timestamp:Date.now(),runId:'initial',hypothesisId:'A,D'})}).catch(()=>{});}catch(e){fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'850410'},body:JSON.stringify({sessionId:'850410',location:'my_favorites.tsx:6',message:'JSX runtime check failed',data:{error:String(e),reactVersion:React.version},timestamp:Date.now(),runId:'initial',hypothesisId:'A,D'})}).catch(()=>{});}
// #endregion
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
// #region agent log
fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'850410'},body:JSON.stringify({sessionId:'850410',location:'my_favorites.tsx:8',message:'Checking ScrollView import',data:{scrollViewType:typeof ScrollView,hasScrollView:ScrollView!==undefined},timestamp:Date.now(),runId:'initial',hypothesisId:'C'})}).catch(()=>{});
// #endregion

import { ETA, fetchStop, getAllBUSETAs } from '../utils/fetch';
import { loadFavoriteStopIds } from '../utils/storage';
import { normalizeStopName } from '../utils/string_formatting';
import { formatEtaToHKTime, getMinutesUntilArrival } from '../utils/time_formatting';

// Locally extend ETA to include stop
type ETAWithStop = ETA & { stop: string };

const MyRoutes = () => {
  // #region agent log
  fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'850410'},body:JSON.stringify({sessionId:'850410',location:'my_favorites.tsx:16',message:'Component initialization started',data:{reactVersion:React.version},timestamp:Date.now(),runId:'initial',hypothesisId:'A,B,D,E'})}).catch(()=>{});
  // #endregion
  const params = useLocalSearchParams();
  const stopIdFromParam = typeof params.stop_id === 'string' ? params.stop_id : undefined;
  const routeFromParam = typeof params.route === 'string' ? params.route : undefined;
  const boundFromParam = typeof params.bound === 'string' ? params.bound : undefined;
  const serviceTypeFromParam = typeof params.service_type === 'string' ? params.service_type : undefined;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<ETAWithStop[]>([]);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string>('');
  const [stopNames, setStopNames] = useState<Record<string, string>>({});

  // List of routes to fetch

  // State to trigger UI updates for countdown and show current time
  const [now, setNow] = useState(Date.now());
  // Use state to accumulate all bus stops passed from star button

  const ROUTES_KEY = 'baseRoutesToFetch';
  const defaultRoutes = [
    { stop: 'B464BD6334A93FA1', route: '272P', service_type: '1' },
    { stop: 'B644204AEDE7A031', route: '272X', service_type: '1' },
    // Add more routes here, e.g. { stop: 'SOME_STOP_ID', route: 'SOME_ROUTE', service_type: '1' }
  ];

  const [routesToFetch, setRoutesToFetch] = useState(defaultRoutes);

  // Mutex to serialize AsyncStorage operations for routes
  const routesStorageQueueRef = React.useRef<Promise<void>>(Promise.resolve());

  // Load routes from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ROUTES_KEY);
        if (saved) {
          setRoutesToFetch(JSON.parse(saved));
        }
      } catch (e) {
        // ignore, use default
      }
    })();
  }, []);

  // Save routes to storage whenever they change (serialized to prevent race conditions)
  useEffect(() => {
    // Wait for previous save to complete
    routesStorageQueueRef.current = routesStorageQueueRef.current.then(async () => {
      try {
        await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routesToFetch));
      } catch (e) {
        console.error('Failed to save routes to storage', e);
      }
    });
  }, [routesToFetch]);

  // Append new bus stop from params if present and not already in the array
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e9dd1'},body:JSON.stringify({sessionId:'1e9dd1',location:'my_favorites.tsx:70',message:'useEffect triggered for params',data:{routeFromParam,boundFromParam,serviceTypeFromParam,stopIdFromParam},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (routeFromParam && boundFromParam && serviceTypeFromParam && stopIdFromParam) {
      setRoutesToFetch(prev => {
        // #region agent log
        fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e9dd1'},body:JSON.stringify({sessionId:'1e9dd1',location:'my_favorites.tsx:73',message:'Checking if route exists',data:{stopIdFromParam,routeFromParam,serviceTypeFromParam,currentRoutes:prev},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        const exists = prev.some(r => r.stop === stopIdFromParam && r.route === routeFromParam && r.service_type === serviceTypeFromParam);
        if (!exists) {
          // #region agent log
          fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e9dd1'},body:JSON.stringify({sessionId:'1e9dd1',location:'my_favorites.tsx:76',message:'Adding new route to state',data:{stopIdFromParam,routeFromParam,serviceTypeFromParam},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          return [
            ...prev,
            { stop: stopIdFromParam, route: routeFromParam, service_type: serviceTypeFromParam }
          ];
        }
        // #region agent log
        fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1e9dd1'},body:JSON.stringify({sessionId:'1e9dd1',location:'my_favorites.tsx:82',message:'Route already exists, skipping',data:{stopIdFromParam,routeFromParam,serviceTypeFromParam},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return prev;
      });
    }
     
  }, [routeFromParam, boundFromParam, serviceTypeFromParam, stopIdFromParam]);

  // Fetch all ETAs and combine results using utils
  const fetchAll = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:101',message:'fetchAll called',data:{routesToFetchLength:routesToFetch.length,routesToFetch},timestamp:Date.now(),runId:'initial',hypothesisId:'A,B,D'})}).catch(()=>{});
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:103',message:'Calling getAllBUSETAs',data:{routesToFetchLength:routesToFetch.length,isEmpty:routesToFetch.length===0},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { allData, generatedTimestamp } = await getAllBUSETAs(routesToFetch);
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:105',message:'getAllBUSETAs returned',data:{allDataLength:allData.length,generatedTimestamp},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setData(allData);
      setGeneratedTimestamp(generatedTimestamp);

      // Fetch stop names for all unique stops
      const uniqueStops = Array.from(new Set(routesToFetch.map(r => r.stop)));
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:110',message:'Fetching stop names',data:{uniqueStopsLength:uniqueStops.length,uniqueStops},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const stopInfoResults = await Promise.all(uniqueStops.map(stopId => fetchStop(stopId)));
      const stopNameMap: Record<string, string> = {};
      stopInfoResults.forEach((info, idx) => {
        if (info) {
          stopNameMap[uniqueStops[idx]] = info.name_en;
        }
      });
      setStopNames(stopNameMap);
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:118',message:'fetchAll completed successfully',data:{stopNameMapKeys:Object.keys(stopNameMap).length},timestamp:Date.now(),runId:'initial',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:120',message:'fetchAll error caught',data:{error:String(error),errorType:typeof error,routesToFetchLength:routesToFetch.length},timestamp:Date.now(),runId:'initial',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [routesToFetch]);

  // Fetch ETA data every 30 seconds
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:125',message:'useEffect for fetchAll triggered',data:{routesToFetchLength:routesToFetch.length},timestamp:Date.now(),runId:'initial',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    fetchAll();
    const fetchIntervalId = setInterval(() => {
      fetchAll();
    }, 30000); // 30 seconds
    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:130',message:'useEffect cleanup - clearing interval',data:{routesToFetchLength:routesToFetch.length},timestamp:Date.now(),runId:'initial',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion
      clearInterval(fetchIntervalId);
    };
  }, [routesToFetch, fetchAll]);



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

  // #region agent log
  fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'850410'},body:JSON.stringify({sessionId:'850410',location:'my_favorites.tsx:187',message:'Before JSX return - checking JSX runtime',data:{reactVersion:React.version,hasCreateElement:typeof React.createElement!=='undefined',scrollViewAvailable:ScrollView!==undefined,jsxDevRuntime:typeof (React as any).jsxDEV!=='undefined'},timestamp:Date.now(),runId:'initial',hypothesisId:'A,B,D,E'})}).catch(()=>{});
  // #endregion

  return (
    <ScrollView style={{flex: 1, padding: 24}}>
      <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>
        Local Time: {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </Text>
      <Text>Generated Timestamp: {formatEtaToHKTime(generatedTimestamp) || 'N/A'}</Text>
      {/* Show all data passed from star button press if present
      {(routeFromParam || boundFromParam || serviceTypeFromParam || stopIdFromParam) && (
        <View style={{ backgroundColor: '#e0ffe0', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold', color: '#007a00' }}>Data from Star Button:</Text>
          {routeFromParam && <Text>Route: {routeFromParam}</Text>}
          {boundFromParam && <Text>Bound: {boundFromParam}</Text>}
          {serviceTypeFromParam && <Text>Service Type: {serviceTypeFromParam}</Text>}
          {stopIdFromParam && <Text>Stop ID: {stopIdFromParam}</Text>}
        </View>
      )} */}
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {/* Group ETAs by normalized stop name (remove (...)) */}
          {(() => {
            // #region agent log
            fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:171',message:'Rendering stop groups',data:{routesToFetchLength:routesToFetch.length,dataLength:data.length},timestamp:Date.now(),runId:'initial',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
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
                      onPress={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:224',message:'Delete button pressed',data:{routeToDelete:route,currentRoutesLength:routesToFetch.length,willBeEmpty:routesToFetch.length===1},timestamp:Date.now(),runId:'initial',hypothesisId:'E'})}).catch(()=>{});
                        // #endregion
                        setRoutesToFetch(prev => {
                          const filtered = prev.filter(r => !(r.stop === route.stop && r.route === route.route && r.service_type === route.service_type));
                          // #region agent log
                          fetch('http://127.0.0.1:7762/ingest/956c9b76-c79f-4ae9-ad09-1053517c875a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35fc52'},body:JSON.stringify({sessionId:'35fc52',location:'my_favorites.tsx:227',message:'Routes filtered',data:{beforeLength:prev.length,afterLength:filtered.length,isEmpty:filtered.length===0},timestamp:Date.now(),runId:'initial',hypothesisId:'E'})}).catch(()=>{});
                          // #endregion
                          return filtered;
                        });
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