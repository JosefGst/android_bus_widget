// Stop details (names, coordinates) for the Stops a screen shows.
//
// The full Stop list (~1 MB) is downloaded once and cached with no expiry: Stops
// hardly change, and repeated downloads get the app 403'd by the KMB CDN. Stops
// missing from the cache (new Stops, or every Stop when the full download failed)
// are fetched one by one with /stop/{id} and added to the cache.
// See docs/ideas/stop-names-cache.md.

import { fetchStop, fetchSTOP, loadCache, saveCache, Stop } from './fetch'

// Storage key must not change: installed apps already hold a Stop list under it.
const STOP_CACHE_KEY = 'bus_stops_cache'
// Keeps a burst of single-Stop requests small enough not to trip the CDN's rate limit.
const MAX_PARALLEL_REQUESTS = 4

type StopCache = { stops: Stop[]; generatedTimestamp: string }

const isStop = (value: unknown): value is Stop =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Stop).stop === 'string' &&
  typeof (value as Stop).name_en === 'string'

async function readCache(): Promise<StopCache | null> {
  const cached = await loadCache(STOP_CACHE_KEY)
  if (!cached || !Array.isArray(cached.data)) return null
  return { stops: cached.data.filter(isStop), generatedTimestamp: cached.generatedTimestamp ?? '' }
}

// Null when the download fails or the response holds no Stop list.
async function downloadAllStops(): Promise<StopCache | null> {
  try {
    const res = await fetchSTOP()
    if (!Array.isArray(res.data)) return null
    return { stops: res.data.filter(isStop), generatedTimestamp: res.generated_timestamp }
  } catch (e) {
    console.error('Failed to download the Stop list', e)
    return null
  }
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Calls run one after another: each reads, extends and saves the whole cache, so
// overlapping calls would download the full list twice and overwrite each other.
let queue: Promise<unknown> = Promise.resolve()

/**
 * Stop details for the given Stop ids, in the same order. Stops that cannot be
 * loaded are left out, so callers can tell which names are still missing.
 */
export function getStopsFor(stopIds: string[]): Promise<Stop[]> {
  const run = queue.then(() => loadStopsFor(stopIds))
  queue = run.catch(() => undefined)
  return run
}

async function loadStopsFor(stopIds: string[]): Promise<Stop[]> {
  const wanted = Array.from(new Set(stopIds))
  if (wanted.length === 0) return []

  let cache = await readCache()
  let cacheChanged = false
  if (!cache) {
    cache = await downloadAllStops()
    cacheChanged = cache !== null
  }
  const byId = new Map((cache?.stops ?? []).map(s => [s.stop, s]))

  const missing = wanted.filter(id => !byId.has(id))
  const fetched = await mapWithLimit(missing, MAX_PARALLEL_REQUESTS, id => fetchStop(id))
  fetched.filter(isStop).forEach(s => {
    byId.set(s.stop, s)
    cacheChanged = true
  })

  if (cacheChanged) {
    try {
      await saveCache(STOP_CACHE_KEY, Array.from(byId.values()), cache?.generatedTimestamp ?? '')
    } catch (e) {
      console.error('Failed to save the Stop cache', e)
    }
  }

  return wanted.flatMap(id => {
    const found = byId.get(id)
    return found ? [found] : []
  })
}
