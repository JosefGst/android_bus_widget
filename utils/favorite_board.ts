// Favorite board: the user's Favorites with live ETAs, grouped by Stop name, ready to display.
// Shared by the My Favorites screen and the home-screen widget.

import type { Favorite } from './favorites'
import { ETA, fetchStop, fetchStopETA, KMBResponse } from './fetch'
import { normalizeStopName } from './string_formatting'
import { getMinutesUntilArrival } from './time_formatting'

export type Arrival = { eta: string; minutes: number | null }
export type RouteArrivals = { route: string; arrivals: Arrival[] }
// stopIds: every Stop id merged into this group (several ids can share one normalized name).
export type StopGroup = { stopName: string; stopIds: string[]; routes: RouteArrivals[] }
export type FavoriteBoard = { groups: StopGroup[]; generatedTimestamp: string }

async function loadStopNames(stopIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(stopIds))
  const infos = await Promise.all(unique.map(id => fetchStop(id)))
  const names = new Map<string, string>()
  unique.forEach((id, i) => names.set(id, normalizeStopName(infos[i]?.name_en ?? id)))
  return names
}

// One failed request must not blank the whole board: a failed Favorite yields null.
async function loadEtas(favorite: Favorite): Promise<KMBResponse<ETA> | null> {
  try {
    return await fetchStopETA(favorite.stop, favorite.route, favorite.service_type)
  } catch (e) {
    console.error('Failed to fetch ETAs for Favorite', favorite, e)
    return null
  }
}

// Soonest first; unknown (null) last.
const byMinutes = (a: number | null, b: number | null): number => {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  return a - b
}

export async function loadFavoriteBoard(favorites: Favorite[], now: Date): Promise<FavoriteBoard> {
  const [etaResponses, stopNames] = await Promise.all([
    Promise.all(favorites.map(loadEtas)),
    loadStopNames(favorites.map(f => f.stop)),
  ])
  // Fully offline: reject rather than show every Stop as "no buses", so callers keep their last board.
  if (favorites.length > 0 && etaResponses.every(r => r === null)) {
    throw new Error('No ETAs could be loaded')
  }
  const reference = now.toISOString()

  // stopName -> its Stop ids and (route+direction -> arrivals). Maps keep first-seen order.
  const groups = new Map<string, { stopIds: Set<string>; routes: Map<string, RouteArrivals> }>()
  favorites.forEach((favorite, i) => {
    const stopName = stopNames.get(favorite.stop) ?? favorite.stop
    const group = groups.get(stopName) ?? { stopIds: new Set<string>(), routes: new Map<string, RouteArrivals>() }
    groups.set(stopName, group)
    group.stopIds.add(favorite.stop)
    const { routes } = group
    etaResponses[i]?.data.forEach(row => {
      const key = `${row.route}|${row.dir}`
      const entry = routes.get(key) ?? { route: row.route, arrivals: [] }
      routes.set(key, entry)
      entry.arrivals.push({ eta: row.eta, minutes: getMinutesUntilArrival(row.eta, reference) })
    })
  })

  return {
    groups: Array.from(groups, ([stopName, { stopIds, routes }]) => ({
      stopName,
      stopIds: Array.from(stopIds),
      routes: Array.from(routes.values())
        .map(r => ({ ...r, arrivals: [...r.arrivals].sort((a, b) => byMinutes(a.minutes, b.minutes)) }))
        .sort((a, b) => byMinutes(a.arrivals[0]?.minutes ?? null, b.arrivals[0]?.minutes ?? null)),
    })),
    generatedTimestamp: etaResponses.find(r => r !== null)?.generated_timestamp ?? '',
  }
}
