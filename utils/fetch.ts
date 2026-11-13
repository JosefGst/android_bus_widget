import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility functions for fetching KMB ETA data

export type ETA = {
  route: string;
  dir: string;
  service_type: string;
  dest_en: string;
  dest_tc?: string;
  dest_sc?: string;
  eta: string;
  data_timestamp: string;
};

export type ROUTS = {
  route: string;
  bound: string;
  service_type: string;
  orig_en: string;
  orig_tc?: string;
  orig_sc?: string;
  dest_en: string;
  dest_tc?: string;
  dest_sc?: string;
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

/** Fetch URL and parse as JSON; throw a clear error if response is HTML or invalid JSON. */
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error(`Server returned non-JSON (status ${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from server (status ${response.status})`);
  }
}

// Fetch all BUS ROUTS route
export const fetchROUTE = async (): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route`;
  return fetchJson<KMBResponse<ROUTS>>(url);
};

// Fetch all BUS STOPS
export const fetchSTOP = async (): Promise<KMBResponse<Stop>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop`;
  return fetchJson<KMBResponse<Stop>>(url);
};

// Fetch all ROUTS Stops for a given route
export const fetchRouteSTOP = async (route: string, dir: string, service_type: string): Promise<KMBResponse<ROUTS>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${dir}/${service_type}`;
  return fetchJson<KMBResponse<ROUTS>>(url);
};

// Fetch ETA for a single route
export const fetchRouteETA = async (route: string, dir: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route}/${dir}`;
  return fetchJson<KMBResponse<ETA>>(url);
};

// Fetch ETA for a stop and route
export const fetchStopETA = async (stop: string, route: string, service_type: string): Promise<KMBResponse<ETA>> => {
  const url = `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop}/${route}/${service_type}`;
  return fetchJson<KMBResponse<ETA>>(url);
};

// Fetch stop info for a given stop ID
export const fetchStop = async (stop: string): Promise<Stop | null> => {
  try {
    const url = `https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop}`;
    const json = await fetchJson<{ data?: Stop }>(url);
    return json.data ?? null;
  } catch (e) {
    console.error("Failed to fetch stop info", e);
    return null;
  }
};

// Cache keys
const ROUTE_CACHE_KEY = 'bus_routes_cache';

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
