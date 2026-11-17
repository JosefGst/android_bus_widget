// Route page session: the state of an open Routes Stop page — its Route, the Route's Stops, the
// selected Stop and that Stop's ETAs. The screen sends events and renders the state; everything
// about loading, resetting, preselecting and refreshing lives here so it can be tested without React.

import { upcomingArrivals, UpcomingArrival } from './arrivals'
import { ETA, fetchRouteSTOP, fetchStopETA, getCachedRoutes, ROUTS, Stop } from './fetch'
import { getStopsFor } from './stops'

// Same pace as My Buses: fresh enough for a countdown, slow enough not to trip the KMB CDN's 403s.
export const ETA_REFRESH_MS = 30_000

// bound is the Route's direction as KMB writes it in Route records: 'O' or 'I'.
export type RouteRef = { route: string; bound: string; serviceType: string }

export type RouteStopDeps = {
  fetchRouteStops: (ref: RouteRef) => Promise<ROUTS[]>
  fetchStopEtas: (query: { stop: string; route: string; serviceType: string }) => Promise<ETA[]>
  getStopsFor: (stopIds: string[]) => Promise<Stop[]>
  getRouteInfo: (ref: RouteRef) => Promise<ROUTS | null>
}

export type RouteStopStatus = 'idle' | 'loading' | 'ready' | 'invalidRoute' | 'fetchFailed'

// A position on the Route. `id` changes on every selection, so the screen can scroll to it again
// even when the same position is selected twice (e.g. the same Favorite opened again).
export type SelectedStop = { seq: string; stop: string; bound: string; id: number }

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

export type OpenParams = { route?: string; bound?: string; serviceType?: string; stop?: string }

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
  !!a && !!b && a.route === b.route && a.bound === b.bound && a.serviceType === b.serviceType

/** The selected Stop's next `count` buses, in its direction and at its position; null before the first reply. */
export function selectedArrivals(state: RouteStopState, now: string, count: number): UpcomingArrival[] | null {
  if (!state.selected || !state.etaRows) return null
  return upcomingArrivals(state.etaRows, now, count, { dir: state.selected.bound, seq: state.selected.seq })
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
  let selectionCount = 0

  const set = (patch: Partial<RouteStopState>): void => {
    state = { ...state, ...patch }
    state = { ...state, etaRows: state.selected ? (etaByStop[state.selected.stop] ?? null) : null }
    listeners.forEach(listener => listener())
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
        const rows = await deps.fetchStopEtas({ stop, route: route.route, serviceType: route.serviceType })
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
    set({ selected: row ? { seq: row.seq, stop: row.stop, bound: row.bound, id: ++selectionCount } : null })
    restartPolling()
  }

  // Select the Stop the page was opened for, once per visit, as soon as this Route's Stops are in.
  const tryPreselect = (): void => {
    if (!focused || preselectHandled || !pendingStop || state.status !== 'ready') return
    const row = state.routeStops.find(item => item.stop === pendingStop)
    if (!row) return
    preselectHandled = true
    selectPosition(row)
  }

  const loadStopNames = async (generation: number, routeStops: ROUTS[]): Promise<void> => {
    set({ stopNamesStatus: 'loading' })
    try {
      const stops = await deps.getStopsFor(routeStops.map(item => item.stop))
      if (generation === routeGeneration) set({ stops, stopNamesStatus: 'loaded' })
    } catch (e) {
      console.error('Failed to load stop names', e)
      if (generation === routeGeneration) set({ stopNamesStatus: 'failed' })
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
      loadStopNames(generation, routeStops)
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
    open: ({ route, bound, serviceType, stop }) => {
      const ref = route && bound && serviceType ? { route, bound, serviceType } : null
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
      routeGeneration++
      stopPolling()
      etaByStop = {}
      pendingStop = stop ?? null
      preselectHandled = false
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
    selectStop: stopId => {
      const row = state.routeStops.find(item => item.stop === stopId)
      if (row) selectPosition(row)
    },
    retryStopNames: () => {
      if (state.status === 'ready') loadStopNames(routeGeneration, state.routeStops)
    },
    // Stops polling and drops replies still on their way. The session can be used again: the next
    // open() loads the Route afresh (React mounts effects twice in development).
    dispose: () => {
      stopPolling()
      routeGeneration++
      focused = false
      state = INITIAL_STATE
    },
  }
}

// KMB's route-stop endpoint names directions in words; Route records use 'O'/'I'.
const apiBound = (bound: string): string => (bound === 'I' ? 'inbound' : bound === 'O' ? 'outbound' : bound)

const DEFAULT_DEPS: RouteStopDeps = {
  fetchRouteStops: async ({ route, bound, serviceType }) => (await fetchRouteSTOP(route, apiBound(bound), serviceType)).data,
  fetchStopEtas: async ({ stop, route, serviceType }) => (await fetchStopETA(stop, route, serviceType)).data,
  getStopsFor,
  getRouteInfo: async ({ route, bound, serviceType }) => {
    const { routes } = await getCachedRoutes()
    return routes.find(r => r.route === route && r.bound === bound && r.service_type === serviceType) ?? null
  },
}
