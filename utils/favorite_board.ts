// Favorite board: the user's Favorites with live ETAs, grouped by Stop name, ready to display.
// Shared by the My Favorites screen and the home-screen widget.

import { arrivals, compareEtas } from './arrivals'
import type { Favorite } from './favorites'
import { ETA, fetchStopETA, KMBResponse, Stop } from './fetch'
import { Language, localized } from './language'
import { getStopsFor } from './stops'
import { stopDisplayName } from './string_formatting'

// One ETA's time as KMB gave it; the Arrival (Now / N min) is worked out by utils/arrivals at render time.
export type BoardEta = { eta: string }
// dest: where the Route is heading, in the board's language as KMB writes it.
export type BoardRoute = { route: string; stop: string; bound: string; service_type: string; dest: string; etas: BoardEta[] }
// stopIds: every Stop id merged into this group (several ids can share one normalized name).
export type StopGroup = { stopName: string; stopIds: string[]; routes: BoardRoute[] }
export type FavoriteBoard = { groups: StopGroup[]; generatedTimestamp: string }

export type BoardDeps = { getStopsFor: (stopIds: string[]) => Promise<Stop[]> }
const DEFAULT_DEPS: BoardDeps = { getStopsFor }
// The widget never starts the full Stop list download (see StopLookupOptions in utils/stops).
export const WIDGET_BOARD_DEPS: BoardDeps = { getStopsFor: stopIds => getStopsFor(stopIds, { downloadAll: false }) }

// Display name per Stop id. A Stop that cannot be loaded is left out; the board shows its id.
async function loadStopNames(stopIds: string[], language: Language, deps: BoardDeps): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  try {
    const stops = await deps.getStopsFor(Array.from(new Set(stopIds)))
    stops.forEach(stop => names.set(stop.stop, stopDisplayName(stop, language)))
  } catch (e) {
    console.error('Failed to load Stop names', e)
  }
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

// Each Route's arrivals soonest first (gone buses dropped), then Routes ordered by their next
// arrival, Routes with no time last. Uses utils/arrivals so the board and the rows agree.
function sortRoutes(routes: Iterable<BoardRoute>, now: string): BoardRoute[] {
  return Array.from(routes, route => ({ ...route, etas: arrivals(route.etas, now).map(({ eta }) => ({ eta })) }))
    .sort((a, b) => compareEtas(a.etas[0]?.eta ?? '', b.etas[0]?.eta ?? ''))
}

export async function loadFavoriteBoard(favorites: Favorite[], now: Date, language: Language, deps: BoardDeps = DEFAULT_DEPS): Promise<FavoriteBoard> {
  const [etaResponses, stopNames] = await Promise.all([
    Promise.all(favorites.map(loadEtas)),
    loadStopNames(favorites.map(f => f.stop), language, deps),
  ])
  // Fully offline: reject rather than show every Stop as "no buses", so callers keep their last board.
  if (favorites.length > 0 && etaResponses.every(r => r === null)) {
    throw new Error('No ETAs could be loaded')
  }
  const reference = now.toISOString()

  // stopName -> its Stop ids and (stop+route+direction -> arrivals). Maps keep first-seen order.
  const groups = new Map<string, { stopIds: Set<string>; routes: Map<string, BoardRoute> }>()
  const rowOwner = new Map<string, number>()
  favorites.forEach((favorite, i) => {
    const stopName = stopNames.get(favorite.stop) ?? favorite.stop
    const group = groups.get(stopName) ?? { stopIds: new Set<string>(), routes: new Map<string, BoardRoute>() }
    groups.set(stopName, group)
    group.stopIds.add(favorite.stop)
    etaResponses[i]?.data.filter(row => favorite.bound === undefined || row.dir === favorite.bound).forEach(row => {
      const key = `${favorite.stop}|${row.route}|${row.dir}`
      // Two Favorites can cover one direction (a legacy one and a directed one); the first supplies the row.
      if (rowOwner.get(key) !== undefined && rowOwner.get(key) !== i) return
      rowOwner.set(key, i)
      const entry = group.routes.get(key) ?? { route: row.route, stop: favorite.stop, bound: row.dir, service_type: favorite.service_type, dest: localized(row, 'dest', language), etas: [] }
      group.routes.set(key, entry)
      entry.etas.push({ eta: row.eta })
    })
  })

  return {
    groups: Array.from(groups, ([stopName, { stopIds, routes }]) => ({
      stopName,
      stopIds: Array.from(stopIds),
      routes: sortRoutes(routes.values(), reference),
    })),
    generatedTimestamp: etaResponses.find(r => r !== null)?.generated_timestamp ?? '',
  }
}
