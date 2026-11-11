import AsyncStorage from '@react-native-async-storage/async-storage'

/** Route map heights, as fractions of the window height. */
export const MAP_SNAP_FRACTIONS = [1 / 3, 1 / 2, 0.85] as const
export const DEFAULT_MAP_FRACTION = MAP_SNAP_FRACTIONS[0]
export const MAP_SIZE_KEY = 'route_map_size'

/** The snap size closest to a dragged fraction. */
export function snapFraction(fraction: number): number {
  return MAP_SNAP_FRACTIONS.reduce((best, f) => (Math.abs(f - fraction) < Math.abs(best - fraction) ? f : best))
}

/** Size after a marker tap: the smallest size grows to half; larger sizes stay. */
export function growForMarker(fraction: number): number {
  return fraction < MAP_SNAP_FRACTIONS[1] ? MAP_SNAP_FRACTIONS[1] : fraction
}

/** The map size the user last chose, or the default. */
export async function loadMapSize(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(MAP_SIZE_KEY)
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw)
    if (!Number.isFinite(n) || n <= 0 || n > 1) return DEFAULT_MAP_FRACTION
    return snapFraction(n)
  } catch (e) {
    console.error('Failed to load map size', e)
    return DEFAULT_MAP_FRACTION
  }
}

/** Remember the map size the user dragged to. */
export async function saveMapSize(fraction: number): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_SIZE_KEY, String(snapFraction(fraction)))
  } catch (e) {
    console.error('Failed to save map size', e)
  }
}
