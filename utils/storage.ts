import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_STOP_KEY = 'FAVORITE_STOP_IDS';

// Mutex to serialize AsyncStorage operations and prevent race conditions
let operationQueue: Promise<void> = Promise.resolve();

/**
 * Append a stop ID to favorites with race condition protection.
 * Returns true if successful, false otherwise.
 */
export function appendFavoriteStopId(stopId: string): Promise<boolean> {
  // Chain onto the queue synchronously (no await before this point) so concurrent
  // callers each see the previous caller's link, not the same pre-await snapshot.
  const result = operationQueue.then(async () => {
    try {
      const existing = await AsyncStorage.getItem(FAVORITE_STOP_KEY);
      let ids: string[] = [];
      if (existing) {
        try {
          ids = JSON.parse(existing);
          if (!Array.isArray(ids)) {
            ids = [];
          }
        } catch (parseError) {
          ids = [];
        }
      }

      let success = false;
      if (!ids.includes(stopId)) {
        ids.push(stopId);
        await AsyncStorage.setItem(FAVORITE_STOP_KEY, JSON.stringify(ids));

        // Verify the write succeeded by reading back
        const verify = await AsyncStorage.getItem(FAVORITE_STOP_KEY);
        const verifyIds = verify ? JSON.parse(verify) : [];
        success = Array.isArray(verifyIds) && verifyIds.includes(stopId);
      } else {
        success = true; // Already exists, consider it success
      }

      return success;
    } catch (e) {
      console.error('Failed to append favorite stop id', e);
      return false;
    }
  });

  // Keep the queue itself always-resolved so one failed operation doesn't stall later ones.
  operationQueue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
}

export async function loadFavoriteStopIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITE_STOP_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error('Failed to load favorite stop ids', e);
    return [];
  }
}
