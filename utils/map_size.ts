import AsyncStorage from '@react-native-async-storage/async-storage'

/** Route map heights, as fractions of the screen area below the header. */
export const MAP_SNAP_FRACTIONS = [1 / 3, 1 / 2, 0.85] as const
export const DEFAULT_MAP_FRACTION = MAP_SNAP_FRACTIONS[0]
export const MAP_SIZE_KEY = 'route_map_size'

/** The snap size closest to a dragged fraction. */
export function snapFraction(fraction: number): number {
  return MAP_SNAP_FRACTIONS.reduce((best, f) => (Math.abs(f - fraction) < Math.abs(best - fraction) ? f : best))
}

/** Size after a tap on the resize handle: the next larger size, wrapping from the largest to the smallest. */
export function nextMapSize(fraction: number): number {
  const snapped = snapFraction(fraction)
  const index = MAP_SNAP_FRACTIONS.findIndex(f => f === snapped)
  return MAP_SNAP_FRACTIONS[(index + 1) % MAP_SNAP_FRACTIONS.length]
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

/** Spoken name of a map size, used in the resize handle's label. */
export type MapSizeName = 'small' | 'half' | 'large'

export function mapSizeName(fraction: number): MapSizeName {
  const snapped = snapFraction(fraction)
  if (snapped === MAP_SNAP_FRACTIONS[0]) return 'small'
  if (snapped === MAP_SNAP_FRACTIONS[1]) return 'half'
  return 'large'
}
