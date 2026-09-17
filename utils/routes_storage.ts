import AsyncStorage from '@react-native-async-storage/async-storage';

// Shared routes-to-fetch storage: used by both the widget task handler and the My Favorites screen.

export type RouteToFetch = { stop: string; route: string; service_type: string };

export const ROUTES_KEY = 'baseRoutesToFetch';

export const defaultRoutes: RouteToFetch[] = [
  { stop: 'B464BD6334A93FA1', route: '272P', service_type: '1' },
  { stop: 'B644204AEDE7A031', route: '272X', service_type: '1' },
];

// Parse and validate routes JSON as read from storage. Returns null if malformed (caller decides the fallback).
export const parseStoredRoutes = (saved: string | null): RouteToFetch[] | null => {
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (
      Array.isArray(parsed) &&
      parsed.every((r: any) => r && r.stop && r.route && r.service_type)
    ) {
      return parsed.map((r: any) => ({
        stop: r.stop,
        route: r.route,
        service_type: r.service_type,
      }));
    }
    return null;
  } catch {
    return null;
  }
};

export const loadRoutesToFetch = async (): Promise<RouteToFetch[] | null> => {
  const saved = await AsyncStorage.getItem(ROUTES_KEY);
  return parseStoredRoutes(saved);
};

export const saveRoutesToFetch = async (routes: RouteToFetch[]): Promise<void> => {
  await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
};
