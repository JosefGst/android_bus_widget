import AsyncStorage from '@react-native-async-storage/async-storage'

import { getStopsFor } from './stops'

const BULK_URL = 'https://data.etabus.gov.hk/v1/transport/kmb/stop'
const STOP_URL = (id: string): string => `${BULK_URL}/${id}`

const stop = (id: string, name = `NAME ${id}`) => ({ stop: id, name_en: name, lat: '22.3', long: '114.2' })

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ status, text: async () => JSON.stringify(body) }) as Response

const forbidden = (): Response =>
  ({ status: 403, text: async () => '<html>403 Forbidden</html>' }) as Response

// Answers each URL from the given table; anything else is a 403.
const mockApi = (routes: Record<string, () => Response>): jest.SpyInstance =>
  jest.spyOn(global, 'fetch').mockImplementation(async input => {
    const answer = routes[String(input)]
    return answer ? answer() : forbidden()
  })

const saveStopCache = async (stops: unknown[], ageMs = 0): Promise<void> => {
  await AsyncStorage.setItem(
    'bus_stops_cache',
    JSON.stringify({
      data: stops,
      generatedTimestamp: 'gen-cached',
      cacheTimestamp: new Date(Date.now() - ageMs).toISOString(),
    })
  )
}

const readStopCache = async (): Promise<{ stop: string }[] | undefined> => {
  const raw = await AsyncStorage.getItem('bus_stops_cache')
  return raw ? JSON.parse(raw).data : undefined
}

describe('getStopsFor', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    jest.restoreAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns cached Stops without the network, however old the cache is', async () => {
    const fetchSpy = mockApi({})
    await saveStopCache([stop('A'), stop('B'), stop('C')], 400 * 24 * 60 * 60 * 1000)

    const result = await getStopsFor(['B', 'A'])

    expect(result).toEqual([stop('B'), stop('A')])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('downloads and caches the full Stop list when there is no cache', async () => {
    mockApi({
      [BULK_URL]: () => jsonResponse({ generated_timestamp: 'gen-1', data: [stop('A'), stop('B'), stop('C')] }),
    })

    const result = await getStopsFor(['A', 'C'])

    expect(result).toEqual([stop('A'), stop('C')])
    expect(await readStopCache()).toEqual([stop('A'), stop('B'), stop('C')])
  })

  it('fetches only the Stops missing from the cache and adds them to it', async () => {
    const fetchSpy = mockApi({
      [STOP_URL('NEW')]: () => jsonResponse({ data: stop('NEW') }),
    })
    await saveStopCache([stop('A')])

    const result = await getStopsFor(['A', 'NEW'])

    expect(result).toEqual([stop('A'), stop('NEW')])
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([STOP_URL('NEW')])
    expect(await readStopCache()).toEqual([stop('A'), stop('NEW')])
  })

  it('loads Stops one by one when the full list download is refused', async () => {
    mockApi({
      [STOP_URL('A')]: () => jsonResponse({ data: stop('A') }),
      [STOP_URL('B')]: () => jsonResponse({ data: stop('B') }),
    })

    const result = await getStopsFor(['A', 'B'])

    expect(result).toEqual([stop('A'), stop('B')])
    expect(await readStopCache()).toEqual([stop('A'), stop('B')])
  })

  it('leaves out Stops that cannot be loaded and keeps the rest', async () => {
    mockApi({
      [STOP_URL('A')]: () => jsonResponse({ data: stop('A') }),
      // KMB answers an unknown Stop id with 200 and an empty object.
      [STOP_URL('UNKNOWN')]: () => jsonResponse({ data: {} }),
    })

    const result = await getStopsFor(['A', 'UNKNOWN', 'BLOCKED'])

    expect(result).toEqual([stop('A')])
    expect(await readStopCache()).toEqual([stop('A')])
  })

  it('treats a cached Stop without a name as missing and fetches it again', async () => {
    mockApi({
      [STOP_URL('A')]: () => jsonResponse({ data: stop('A') }),
    })
    await saveStopCache([{ stop: 'A' }])

    const result = await getStopsFor(['A'])

    expect(result).toEqual([stop('A')])
  })

  it('does not cache a full list response without a data array', async () => {
    mockApi({
      [BULK_URL]: () => jsonResponse({ message: 'error' }),
      [STOP_URL('A')]: () => jsonResponse({ data: stop('A') }),
    })

    const result = await getStopsFor(['A'])

    expect(result).toEqual([stop('A')])
    expect(await readStopCache()).toEqual([stop('A')])
  })

  it('does not touch the cache when nothing could be loaded', async () => {
    mockApi({})

    const result = await getStopsFor(['A'])

    expect(result).toEqual([])
    expect(await readStopCache()).toBeUndefined()
  })

  it('returns nothing and stays offline for an empty list of Stop ids', async () => {
    const fetchSpy = mockApi({})

    expect(await getStopsFor([])).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('downloads the full list only once when two screens ask at the same time, and keeps both answers', async () => {
    const requested: string[] = []
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = String(input)
      requested.push(url)
      // The full list is slow; the single Stops are quick.
      await new Promise(resolve => setTimeout(resolve, url === BULK_URL ? 20 : 1))
      if (url === BULK_URL) return forbidden()
      return jsonResponse({ data: stop(url.slice(BULK_URL.length + 1)) })
    })

    const [first, second] = await Promise.all([getStopsFor(['A']), getStopsFor(['B'])])

    expect(first).toEqual([stop('A')])
    expect(second).toEqual([stop('B')])
    expect(requested.filter(url => url === BULK_URL)).toHaveLength(1)
    expect(await readStopCache()).toEqual([stop('A'), stop('B')])
  })

  it('still answers after an earlier call failed', async () => {
    mockApi({})
    await saveStopCache([stop('A')])
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage busy'))

    await expect(getStopsFor(['A'])).rejects.toThrow('storage busy')
    expect(await getStopsFor(['A'])).toEqual([stop('A')])
  })

  it('requests a Stop listed twice on a Route only once', async () => {
    // Loop Routes start and end at the same terminus.
    const fetchSpy = mockApi({
      [STOP_URL('T')]: () => jsonResponse({ data: stop('T') }),
      [STOP_URL('M')]: () => jsonResponse({ data: stop('M') }),
    })

    const result = await getStopsFor(['T', 'M', 'T'])

    expect(result).toEqual([stop('T'), stop('M')])
    expect(fetchSpy.mock.calls.filter(([url]) => String(url) === STOP_URL('T'))).toHaveLength(1)
  })

  it('treats a corrupt Stop cache as no cache', async () => {
    await AsyncStorage.setItem('bus_stops_cache', JSON.stringify({ data: { not: 'a list' } }))
    mockApi({
      [BULK_URL]: () => jsonResponse({ generated_timestamp: 'gen-1', data: [stop('A')] }),
    })

    const result = await getStopsFor(['A'])

    expect(result).toEqual([stop('A')])
    expect(await readStopCache()).toEqual([stop('A')])
  })

  it('sends at most 4 single-Stop requests at a time', async () => {
    const ids = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
    let inFlight = 0
    let maxInFlight = 0
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = String(input)
      if (url === BULK_URL) return forbidden()
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight -= 1
      return jsonResponse({ data: stop(url.slice(BULK_URL.length + 1)) })
    })

    const result = await getStopsFor(ids)

    expect(result.map(s => s.stop)).toEqual(ids)
    expect(maxInFlight).toBe(4)
  })
})
