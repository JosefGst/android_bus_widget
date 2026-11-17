import type { ETA, ROUTS, Stop } from './fetch'
import { createRouteStopSession, RouteStopDeps, RouteStopSession, selectedArrivals } from './route_stop_session'

// A promise the test settles by hand, so replies can arrive in any order.
type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (e: Error) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (e: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

// Fake KMB: every call is recorded and waits until the test answers it.
type Call<A, R> = { args: A; reply: Deferred<R> }
function fakeDeps() {
  const routeStops: Call<{ route: string; bound: string; service_type: string }, ROUTS[]>[] = []
  const etas: Call<{ stop: string; route: string; service_type: string }, ETA[]>[] = []
  const stops: Call<string[], Stop[]>[] = []
  const routeInfo: Call<{ route: string; bound: string; service_type: string }, ROUTS | null>[] = []
  const record = <A, R>(calls: Call<A, R>[]) => (args: A): Promise<R> => {
    const reply = deferred<R>()
    calls.push({ args, reply })
    return reply.promise
  }
  const deps: RouteStopDeps = {
    fetchRouteStops: record(routeStops),
    fetchStopEtas: record(etas),
    getStopsFor: record(stops),
    getRouteInfo: record(routeInfo),
  }
  return { deps, routeStops, etas, stops, routeInfo, requests: () => routeStops.length + etas.length + stops.length + routeInfo.length }
}

// Lets settled promises run their `then`s.
const flush = async (): Promise<void> => { for (let i = 0; i < 5; i++) await Promise.resolve() }

const routeStop = (route: string, seq: number, stop: string, bound = 'O'): ROUTS => ({
  route, bound, service_type: '1', seq: String(seq), stop, orig_en: 'A', dest_en: 'B',
})
const eta = (minutesFromNow: number, extra: Partial<ETA> = {}): ETA => ({
  route: '1A', dir: 'O', seq: 1, service_type: '1', dest_en: 'B', data_timestamp: '',
  eta: new Date(Date.now() + minutesFromNow * 60_000).toISOString(), ...extra,
})

let session: RouteStopSession
afterEach(() => {
  session?.dispose()
  jest.useRealTimers()
})

describe('Route page session', () => {
  it('opening with no Route makes no request', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)

    session.open({})
    session.focus()
    await flush()

    expect(kmb.requests()).toBe(0)
    expect(session.getState().status).toBe('invalidRoute')
  })

  it('loads the Route\'s Stops, their names and the header', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)

    session.open({ route: '1A', bound: 'O', service_type: '1' })
    expect(session.getState().status).toBe('loading')
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    kmb.routeInfo[0].reply.resolve(routeStop('1A', 0, ''))
    await flush()
    kmb.stops[0].reply.resolve([{ stop: 'S1', name_en: 'One' }])
    await flush()

    const state = session.getState()
    expect(kmb.routeStops[0].args).toEqual({ route: '1A', bound: 'O', service_type: '1' })
    expect(kmb.stops[0].args).toEqual(['S1', 'S2'])
    expect(state.status).toBe('ready')
    expect(state.routeStops.map(r => r.stop)).toEqual(['S1', 'S2'])
    expect(state.stops).toEqual([{ stop: 'S1', name_en: 'One' }])
    expect(state.stopNamesStatus).toBe('loaded')
    expect(state.routeInfo?.route).toBe('1A')
  })

  it('opening another Route clears the Stops, ETAs and selection of the previous one', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1')])
    kmb.routeInfo[0].reply.resolve(routeStop('1A', 0, ''))
    await flush()
    kmb.stops[0].reply.resolve([{ stop: 'S1', name_en: 'One' }])
    session.select('1')
    kmb.etas[0].reply.resolve([eta(3)])
    await flush()
    expect(session.getState().etaRows).toHaveLength(1)

    session.open({ route: '2', bound: 'O', service_type: '1' })

    const state = session.getState()
    expect(state.status).toBe('loading')
    expect(state.routeStops).toEqual([])
    expect(state.stops).toEqual([])
    expect(state.routeInfo).toBeNull()
    expect(state.selected).toBeNull()
    expect(state.etaRows).toBeNull()
  })

  it('does not show the previous Route\'s times at a Stop both Routes share', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'SHARED')])
    await flush()
    session.select('1')
    kmb.etas[0].reply.resolve([eta(3, { route: '1A' })])
    await flush()

    session.open({ route: '2', bound: 'O', service_type: '1' })
    kmb.routeStops[1].reply.resolve([routeStop('2', 1, 'SHARED')])
    await flush()
    session.select('1')

    expect(session.getState().etaRows).toBeNull()
    expect(kmb.etas[1].args).toEqual({ stop: 'SHARED', route: '2', service_type: '1' })
  })

  it('drops the previous Route\'s Stop list when it arrives after the new Route was opened', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    session.open({ route: '2', bound: 'O', service_type: '1' })

    kmb.routeStops[1].reply.resolve([routeStop('2', 1, 'NEW')])
    await flush()
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'OLD')])
    await flush()

    expect(session.getState().routeStops.map(r => r.stop)).toEqual(['NEW'])
  })

  it('drops a late ETA reply for a Stop that is no longer selected', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    await flush()

    session.select('1')
    session.select('2')
    kmb.etas[1].reply.resolve([eta(7)])
    await flush()
    kmb.etas[0].reply.resolve([eta(1)])
    await flush()
    session.select('1')

    // S1's late reply was dropped: reselecting it waits for a fresh reply instead of showing stale times.
    expect(session.getState().etaRows).toBeNull()
  })

  it('preselects the Stop it was opened for once that Route\'s Stops are in', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1', stop: 'S2' })
    expect(session.getState().selected).toBeNull()

    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    await flush()

    expect(session.getState().selected).toMatchObject({ seq: '2', stop: 'S2' })
    expect(kmb.etas.map(c => c.args.stop)).toEqual(['S2'])
  })

  it('waits for the page to have focus before preselecting', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.open({ route: '1A', bound: 'O', service_type: '1', stop: 'S1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1')])
    await flush()
    expect(session.getState().selected).toBeNull()

    session.focus()

    expect(session.getState().selected).toMatchObject({ stop: 'S1' })
  })

  it('does not preselect from the previous Route\'s Stop list', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    await flush()

    session.open({ route: '2', bound: 'O', service_type: '1', stop: 'S2' })
    await flush()

    expect(session.getState().selected).toBeNull()
  })

  it('preselects once per visit, and again after leaving and coming back', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1', stop: 'S2' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    await flush()
    const first = session.getState().selected

    session.select(null)
    session.open({ route: '1A', bound: 'O', service_type: '1', stop: 'S2' })
    expect(session.getState().selected).toBeNull()

    session.blur()
    session.focus()
    expect(session.getState().selected).toMatchObject({ seq: '2' })
    // A new selection object, so the screen scrolls to it again.
    expect(session.getState().selected).not.toBe(first)
  })

  it('polls the selected Stop\'s ETAs only while the page has focus', async () => {
    jest.useFakeTimers()
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1')])
    await flush()
    session.select('1')
    expect(kmb.etas).toHaveLength(1)

    jest.advanceTimersByTime(30_000)
    expect(kmb.etas).toHaveLength(2)

    session.blur()
    jest.advanceTimersByTime(90_000)
    expect(kmb.etas).toHaveLength(2)

    session.focus()
    expect(kmb.etas).toHaveLength(3)
  })

  it('keeps the last ETAs when a refresh fails, and shows none only if there were none', async () => {
    jest.useFakeTimers()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1'), routeStop('1A', 2, 'S2')])
    await flush()

    session.select('1')
    kmb.etas[0].reply.resolve([eta(3)])
    await flush()
    jest.advanceTimersByTime(30_000)
    kmb.etas[1].reply.reject(new Error('network down'))
    await flush()
    expect(session.getState().etaRows).toHaveLength(1)

    session.select('2')
    kmb.etas[2].reply.reject(new Error('network down'))
    await flush()
    expect(session.getState().etaRows).toEqual([])
    jest.restoreAllMocks()
  })

  it('on a circular Route, a marker tap picks the Stop\'s first position and shows only its buses', async () => {
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '10', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('10', 1, 'LOOP'), routeStop('10', 2, 'MID'), routeStop('10', 3, 'LOOP')])
    await flush()

    session.selectStop('LOOP')
    kmb.etas[0].reply.resolve([eta(20, { seq: 1 }), eta(4, { seq: 3 }), eta(35, { seq: 1 })])
    await flush()

    const state = session.getState()
    expect(state.selected).toMatchObject({ seq: '1', stop: 'LOOP' })
    const now = new Date().toISOString()
    expect(selectedArrivals(state, now, 2)?.map(a => a.time)).toEqual([
      { kind: 'minutes', minutes: 20 },
      { kind: 'minutes', minutes: 35 },
    ])

    session.select('3')
    expect(selectedArrivals(session.getState(), now, 2)?.map(a => a.time)).toEqual([{ kind: 'minutes', minutes: 4 }])
  })

  it('loads the Stop names again on Retry after they failed', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1')])
    await flush()
    kmb.stops[0].reply.reject(new Error('403'))
    await flush()
    expect(session.getState().stopNamesStatus).toBe('failed')

    session.retryStopNames()
    kmb.stops[1].reply.resolve([{ stop: 'S1', name_en: 'One' }])
    await flush()

    expect(session.getState().stopNamesStatus).toBe('loaded')
    expect(session.getState().stops).toHaveLength(1)
    jest.restoreAllMocks()
  })

  it('keeps the newest Stop names when an earlier Retry fails after it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.open({ route: '1A', bound: 'O', service_type: '1' })
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'S1')])
    await flush()
    kmb.stops[0].reply.reject(new Error('403'))
    await flush()

    session.retryStopNames()
    session.retryStopNames()
    kmb.stops[2].reply.resolve([{ stop: 'S1', name_en: 'One' }])
    await flush()
    kmb.stops[1].reply.reject(new Error('403'))
    await flush()

    expect(session.getState().stopNamesStatus).toBe('loaded')
    jest.restoreAllMocks()
  })

  it('starts over after dispose: the next open loads the Route again and late replies are dropped', async () => {
    jest.useFakeTimers()
    const kmb = fakeDeps()
    session = createRouteStopSession(kmb.deps)
    session.focus()
    session.open({ route: '1A', bound: 'O', service_type: '1' })

    session.dispose()
    kmb.routeStops[0].reply.resolve([routeStop('1A', 1, 'OLD')])
    await flush()
    expect(session.getState().status).toBe('idle')

    session.open({ route: '1A', bound: 'O', service_type: '1' })
    session.focus()
    kmb.routeStops[1].reply.resolve([routeStop('1A', 1, 'NEW')])
    await flush()
    expect(session.getState().routeStops.map(r => r.stop)).toEqual(['NEW'])
  })
})
