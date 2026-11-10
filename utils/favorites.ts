import AsyncStorage from '@react-native-async-storage/async-storage'

// Favorites: the {route, service_type, stop} triples the user follows.
// The only module that reads or writes the persisted Favorite list.

export type Favorite = { route: string; service_type: string; stop: string }

// Persisted contract: existing users' Favorites live under this key. Do not rename.
const STORAGE_KEY = 'baseRoutesToFetch'

export const STARTER_FAVORITES: Favorite[] = [
  { stop: 'B464BD6334A93FA1', route: '272P', service_type: '1' },
  { stop: 'B644204AEDE7A031', route: '272X', service_type: '1' },
]

const isFavorite = (value: unknown): value is Favorite => {
  if (typeof value !== 'object' || value === null) return false
  const { route, service_type, stop } = value as Record<string, unknown>
  return (
    typeof route === 'string' && route !== '' &&
    typeof service_type === 'string' && service_type !== '' &&
    typeof stop === 'string' && stop !== ''
  )
}

// Returns null when nothing usable is stored, so the caller can fall back to the starter set.
const parseStored = (saved: string | null): Favorite[] | null => {
  if (!saved) return null
  try {
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isFavorite)) return null
    return parsed.map(({ route, service_type, stop }) => ({ stop, route, service_type }))
  } catch {
    return null
  }
}

const sameFavorite = (a: Favorite, b: Favorite): boolean =>
  a.route === b.route && a.service_type === b.service_type && a.stop === b.stop

export async function list(): Promise<Favorite[]> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY)
  return parseStored(saved) ?? STARTER_FAVORITES
}

const WIDGET_READ_TIMEOUT_MS = 1500

/**
 * For the widget's background task: never blocks for long and never throws.
 * Falls back to the starter Favorites when storage is slow or unavailable.
 */
export async function listForWidget(): Promise<Favorite[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), WIDGET_READ_TIMEOUT_MS)
  })
  try {
    const saved = await Promise.race([AsyncStorage.getItem(STORAGE_KEY), timeout])
    return parseStored(saved) ?? STARTER_FAVORITES
  } catch {
    return STARTER_FAVORITES
  } finally {
    clearTimeout(timer)
  }
}

// Serializes every write. The tail is kept always-resolved so one failed write doesn't stall the rest.
let writeQueue: Promise<unknown> = Promise.resolve()

// Applies `change` to the current list and persists it if it changed. Resolves false on storage failure.
function mutate(change: (current: Favorite[]) => Favorite[]): Promise<boolean> {
  // Chain synchronously so concurrent callers each see the previous caller's result.
  const result = writeQueue.then(async () => {
    try {
      const current = await list()
      const next = change(current)
      if (next !== current) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
      return true
    } catch (e) {
      console.error('Failed to update Favorites', e)
      return false
    }
  })
  writeQueue = result.catch(() => undefined)
  return result
}

/** Adds a Favorite. Adding one that already exists succeeds and changes nothing. */
export function add(favorite: Favorite): Promise<boolean> {
  return mutate(current =>
    current.some(f => sameFavorite(f, favorite)) ? current : [...current, favorite],
  )
}

/** Removes a Favorite. Removing one that isn't there succeeds and changes nothing. */
export function remove(favorite: Favorite): Promise<boolean> {
  return mutate(current =>
    current.some(f => sameFavorite(f, favorite))
      ? current.filter(f => !sameFavorite(f, favorite))
      : current,
  )
}
