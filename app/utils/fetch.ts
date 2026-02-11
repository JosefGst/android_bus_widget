import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility functions for fetching KMB ETA data

export type ETA = {
  route: string;
  dir: string;
  service_type: string;
  dest_en: string;
  eta: string;
  data_timestamp: string;
};

export type ROUTS = {
  route: string;
  bound: string;
  service_type: string;
  orig_en: string;
  dest_en: string;
  seq: string;
  stop: string;

};

export type KMBResponse<T> = {
  type: string;
  version: string;
  generated_timestamp: string;
  data: T[];
};


export type Stop = {
  stop: string;
  name_en: string;
  name_tc?: string;
  name_sc?: string;
  lat?: string;
  long?: string;
  data_timestamp?: string;
};


// Fetch all BUS ROUTS route
export const fetchROUTE = async (): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ROUTS>>;
};

// Fetch all BUS STOPS
export const fetchSTOP = async (): Promise<KMBResponse<Stop>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<Stop>>;
};

// Fetch all ROUTS Stops for a given route
export const fetchRouteSTOP = async (route: string, dir: string, service_type: string): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${dir}/${service_type}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ROUTS>>;
};

// Fetch ETA for a single route
export const fetchRouteETA = async (route: string, dir: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route}/${dir}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ETA>>;
};

// Fetch ETA for a stop and route
export const fetchStopETA = async (stop: string, route: string, dir: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${dir}`;
  const response = await fetch(url);
  return response.json() as Promise<KMBResponse<ETA>>;
};


// Fetch stop info for a given stop ID
export const fetchStop = async (stop: string): Promise<Stop | null> => {
  try {
    const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop}`;
    const response = await fetch(url);
    const json = await response.json();
    return json.data as Stop;
  } catch (e) {
    console.error('Failed to fetch stop info', e);
    return null;
  }
};

// Fetch all ETAs for a list of routes and combine results
export const getAllBUSETAs = async (
  routesToFetch: { stop: string; route: string; dir: string }[]
): Promise<{ allData: ETA[]; generatedTimestamp: string }> => {
  const results = await Promise.all(
    routesToFetch.map(r => fetchStopETA(r.stop, r.route, r.dir))
  );
  const allData = results.flatMap(res => res.data);
  const generatedTimestamp = results[0]?.generated_timestamp || '';
  return { allData, generatedTimestamp };
};


// Cache keys
const ROUTE_CACHE_KEY = 'bus_routes_cache';
const STOP_CACHE_KEY = 'bus_stops_cache';

// Helper: Get current timestamp (ISO string)
const getNowTimestamp = () => new Date().toISOString();

// Helper: Check if a timestamp is older than 24 hours
export const isCacheStale = (timestamp: string | undefined): boolean => {
  if (!timestamp) return true;
  const now = Date.now();
  const cacheTime = new Date(timestamp).getTime();
  return now - cacheTime > 24 * 60 * 60 * 1000;
};

// Save data and timestamp to AsyncStorage
export const saveCache = async (key: string, data: any, generatedTimestamp: string) => {
  await AsyncStorage.setItem(key, JSON.stringify({ data, generatedTimestamp, cacheTimestamp: getNowTimestamp() }));
};

// Load data and timestamps from AsyncStorage
export const loadCache = async (key: string) => {
  const cached = await AsyncStorage.getItem(key);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

// High-level: Get routes with daily cache
export const getCachedRoutes = async (): Promise<{ routes: ROUTS[]; generatedTimestamp: string }> => {
  const cached = await loadCache(ROUTE_CACHE_KEY);
  if (cached && !isCacheStale(cached.cacheTimestamp)) {
    return { routes: cached.data, generatedTimestamp: cached.generatedTimestamp };
  }
  // Fetch from API and update cache
  const res = await fetchROUTE();
  await saveCache(ROUTE_CACHE_KEY, res.data, res.generated_timestamp);
  return { routes: res.data, generatedTimestamp: res.generated_timestamp };
};

// High-level: Get stops with daily cache
export const getCachedStops = async (): Promise<{ stops: Stop[]; generatedTimestamp: string }> => {
  const cached = await loadCache(STOP_CACHE_KEY);
  if (cached && !isCacheStale(cached.cacheTimestamp)) {
    return { stops: cached.data, generatedTimestamp: cached.generatedTimestamp };
  }
  // Fetch from API and update cache
  const res = await fetchSTOP();
  await saveCache(STOP_CACHE_KEY, res.data, res.generated_timestamp);
  return { stops: res.data, generatedTimestamp: res.generated_timestamp };
};
