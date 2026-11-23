// Route page session: the state of an open Routes Stop page — its Route, the Route's Stops, the
// selected Stop and that Stop's ETAs. The screen sends events and renders the state; everything
// about loading, resetting, preselecting and refreshing lives here so it can be tested without React.

import { upcomingArrivals, UpcomingArrival } from './arrivals'
import { ETA, fetchRouteSTOP, fetchStopETA, getCachedRoutes, ROUTS, Stop } from './fetch'
import { fareFor, FareLookup } from './fares'
import { getStopsFor } from './stops'

// Same pace as My Buses: fresh enough for a countdown, slow enough not to trip the KMB CDN's 403s.
export const ETA_REFRESH_MS = 30_000

// A Route as KMB names it in Route records; bound is 'O' or 'I'.
export type RouteRef = { route: string; bound: string; service_type: string }

export type RouteStopDeps = {
  fetchRouteStops: (ref: RouteRef) => Promise<ROUTS[]>
  fetchStopEtas: (query: { stop: string; route: string; service_type: string }) => Promise<ETA[]>
  getStopsFor: (stopIds: string[]) => Promise<Stop[]>
  getRouteInfo: (ref: RouteRef) => Promise<ROUTS | null>
}

export type RouteStopStatus = 'idle' | 'loading' | 'ready' | 'invalidRoute' | 'fetchFailed'

// A position on the Route. Every selection is a new object, so the screen can scroll to it again
// even when the same position is selected twice (e.g. the same Favorite opened again).
export type SelectedStop = { seq: string; stop: string; bound: string }

export type RouteStopState = {
  status: RouteStopStatus
  route: RouteRef | null
  // The Route's Stops in order. A circular Route lists some Stops twice (different seq).
  routeStops: ROUTS[]
  // Stop records (names in every Language, coordinates), so a Language switch needs no request.
  stops: Stop[]
  stopNamesStatus: 'loading' | 'loaded' | 'failed'
  // Start and end for the header; null until loaded.
  routeInfo: ROUTS | null
  selected: SelectedStop | null
  // The ETA rows for the selected Stop; null until its first reply.
  etaRows: ETA[] | null
}

export type OpenParams = { route?: string; bound?: string; service_type?: string; stop?: string }

export type RouteStopSession = {
  getState: () => RouteStopState
  subscribe: (listener: () => void) => () => void
  open: (params: OpenParams) => void
  focus: () => void
  blur: () => void
  // A list row tap: select that position, or null to close the open one.
  select: (seq: string | null) => void
  // A map marker tap: select the first position of that Stop on the Route.
  selectStop: (stopId: string) => void
  retryStopNames: () => void
  // Stop all work; a later open() starts over.
  dispose: () => void
}

const INITIAL_STATE: RouteStopState = {
  status: 'idle',
  route: null,
  routeStops: [],
  stops: [],
  stopNamesStatus: 'loading',
  routeInfo: null,
  selected: null,
  etaRows: null,
}

const sameRoute = (a: RouteRef | null, b: RouteRef | null): boolean =>
  !!a && !!b && a.route === b.route && a.bound === b.bound && a.service_type === b.service_type

/** The selected Stop's next `count` buses, in its direction and at its position; null before the first reply. */
export function selectedArrivals(state: RouteStopState, now: string, count: number): UpcomingArrival[] | null {
  if (!state.selected || !state.etaRows) return null
  return upcomingArrivals(state.etaRows, now, count, { dir: state.selected.bound, seq: state.selected.seq })
}

/** The Fare at a position (`seq`) on the open Route; null with no Route open, at the terminus or without fare data. */
export function fareAt(state: RouteStopState, seq: string, lookup: FareLookup = fareFor): number | null {
  return state.route ? lookup(state.route, seq) : null
}

export function createRouteStopSession(deps: RouteStopDeps = DEFAULT_DEPS): RouteStopSession {
  let state = INITIAL_STATE
  const listeners = new Set<() => void>()
  // ETA rows per Stop id for the current Route, so reselecting a Stop shows its last times at once.
  let etaByStop: { [stopId: string]: ETA[] } = {}
  // Bumped on every open of another Route: replies for an older Route are dropped.
  let routeGeneration = 0
  // Bumped whenever ETA polling stops or restarts: replies from an older poll are dropped.
  let pollGeneration = 0
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let focused = false
  // The Stop the page was opened for, and whether it was already selected during this visit.
  let pendingStop: string | null = null
  let preselectHandled = false
  // Bumped on every Stop names load: only the latest load (e.g. after a second Retry tap) may land.
  let namesGeneration = 0

  const set = (patch: Partial<RouteStopState>): void => {
    state = { ...state, ...patch }
    state = { ...state, etaRows: state.selected ? (etaByStop[state.selected.stop] ?? null) : null }
    listeners.forEach(listener => listener())
  }

  // Forget the current Route: stop polling, drop every reply still on its way, clear cached ETAs
  // and the pending preselect.
  const reset = (): void => {
    routeGeneration++
    namesGeneration++
    stopPolling()
    etaByStop = {}
    pendingStop = null
    preselectHandled = false
  }

  const stopPolling = (): void => {
    pollGeneration++
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  // Fetch now, then every ETA_REFRESH_MS, while focused with a loaded Route and a selected Stop.
  const restartPolling = (): void => {
    stopPolling()
    const { route, selected, status } = state
    if (!focused || status !== 'ready' || !route || !selected) return
    const generation = pollGeneration
    const stop = selected.stop
    const load = async (): Promise<void> => {
      try {
        const rows = await deps.fetchStopEtas({ stop, route: route.route, service_type: route.service_type })
        if (generation !== pollGeneration) return
        etaByStop = { ...etaByStop, [stop]: rows }
      } catch (e) {
        console.error('Failed to load ETAs', e)
        if (generation !== pollGeneration) return
        // Keep the last times on a failed refresh; show "no time" only if there were none.
        if (!etaByStop[stop]) etaByStop = { ...etaByStop, [stop]: [] }
      }
      set({})
    }
    load()
    pollTimer = setInterval(load, ETA_REFRESH_MS)
  }

  const selectPosition = (row: ROUTS | null): void => {
    set({ selected: row ? { seq: row.seq, stop: row.stop, bound: row.bound } : null })
    restartPolling()
  }

  // A map marker tap: the Stop's first position on the Route. Returns false if the Route has no such Stop.
  const selectStop = (stopId: string): boolean => {
    const row = state.routeStops.find(item => item.stop === stopId)
    if (row) selectPosition(row)
    return !!row
  }

  // Select the Stop the page was opened for, once per visit, as soon as this Route's Stops are in.
  // Goes through the marker-tap path, so a preselect behaves exactly like tapping that Stop's marker.
  const tryPreselect = (): void => {
    if (!focused || preselectHandled || !pendingStop || state.status !== 'ready') return
    if (selectStop(pendingStop)) preselectHandled = true
  }

  const loadStopNames = async (routeStops: ROUTS[]): Promise<void> => {
    const generation = ++namesGeneration
    set({ stopNamesStatus: 'loading' })
    try {
      const stops = await deps.getStopsFor(routeStops.map(item => item.stop))
      if (generation === namesGeneration) set({ stops, stopNamesStatus: 'loaded' })
    } catch (e) {
      console.error('Failed to load stop names', e)
      if (generation === namesGeneration) set({ stopNamesStatus: 'failed' })
    }
  }

  const loadRoute = async (route: RouteRef, generation: number): Promise<void> => {
    deps.getRouteInfo(route)
      .then(routeInfo => { if (generation === routeGeneration) set({ routeInfo }) })
      .catch(e => console.error('Failed to load the Route list for the header', e))
    try {
      const routeStops = await deps.fetchRouteStops(route)
      if (generation !== routeGeneration) return
      set({ status: 'ready', routeStops })
      loadStopNames(routeStops)
      tryPreselect()
    } catch (e) {
      console.error('Failed to fetch the Route\'s Stops', e)
      if (generation === routeGeneration) set({ status: 'fetchFailed' })
    }
  }

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    open: ({ route, bound, service_type, stop }) => {
      const ref = route && bound && service_type ? { route, bound, service_type } : null
      if (ref && sameRoute(ref, state.route)) {
        // Same Route, maybe another Stop to preselect.
        if ((stop ?? null) !== pendingStop) {
          pendingStop = stop ?? null
          preselectHandled = false
          tryPreselect()
        }
        return
      }
      // Another Route (or none): drop everything of the previous one, so none of it is shown for
      // (or reused by) the new Route.
      reset()
      pendingStop = stop ?? null
      set({ ...INITIAL_STATE, route: ref, status: ref ? 'loading' : 'invalidRoute' })
      // Routes Stop is mounted at start-up with no Route: it must not fetch then (KMB 403s bursts).
      if (ref) loadRoute(ref, routeGeneration)
    },
    focus: () => {
      if (focused) return
      focused = true
      restartPolling()
      tryPreselect()
    },
    blur: () => {
      focused = false
      stopPolling()
      // Leaving the page forgets the preselect, so opening the same Favorite again selects its Stop again.
      preselectHandled = false
    },
    select: seq => {
      selectPosition(seq === null ? null : (state.routeStops.find(item => item.seq === seq) ?? null))
    },
    selectStop: stopId => { selectStop(stopId) },
    retryStopNames: () => {
      if (state.status === 'ready') loadStopNames(state.routeStops)
    },
    // Stops polling and drops replies still on their way. The session can be used again: the next
    // open() loads the Route afresh (React mounts effects twice in development).
    dispose: () => {
      reset()
      focused = false
      set(INITIAL_STATE)
    },
  }
}

// KMB's route-stop endpoint names directions in words; Route records use 'O'/'I'.
const apiBound = (bound: string): string => (bound === 'I' ? 'inbound' : bound === 'O' ? 'outbound' : bound)

const DEFAULT_DEPS: RouteStopDeps = {
  fetchRouteStops: async ({ route, bound, service_type }) => (await fetchRouteSTOP(route, apiBound(bound), service_type)).data,
  fetchStopEtas: async ({ stop, route, service_type }) => (await fetchStopETA(stop, route, service_type)).data,
  getStopsFor,
  getRouteInfo: async ({ route, bound, service_type }) => {
    const { routes } = await getCachedRoutes()
    return routes.find(r => r.route === route && r.bound === bound && r.service_type === service_type) ?? null
  },
}
