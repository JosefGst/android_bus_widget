import AsyncStorage from '@react-native-async-storage/async-storage'

import { BoardDeps, loadFavoriteBoard, WIDGET_BOARD_DEPS } from './favorite_board'

// A fake KMB API keyed by URL. Anything not listed fails like a network error.
type FakeKmb = {
  // key: `${stop}/${route}/${service_type}` -> ETA rows, or 'fail'
  etas?: Record<string, { route?: string; dir?: string; eta: string; dest?: string; destTc?: string }[] | 'fail'>
  // key: stop id -> English name, or 'fail'
  stopNames?: Record<string, string | 'fail'>
  // key: stop id -> Traditional Chinese name (also sent as the Simplified name)
  chineseStopNames?: Record<string, string>
  generatedTimestamp?: string
}

const respond = (body: unknown): Response =>
  ({ status: 200, text: async () => JSON.stringify(body) }) as Response

// The Stop lookup the board is given: names come from the same table, so these tests need no cache.
let fakeDeps: BoardDeps = { getStopsFor: async () => [] }

const loadBoard = (favorites: Parameters<typeof loadFavoriteBoard>[0], now: Date, language: Parameters<typeof loadFavoriteBoard>[2]) =>
  loadFavoriteBoard(favorites, now, language, fakeDeps)

function stubKmb({ etas = {}, stopNames = {}, chineseStopNames = {}, generatedTimestamp = '2026-01-01T12:00:00Z' }: FakeKmb) {
  fakeDeps = {
    getStopsFor: async ids =>
      ids.flatMap(id => {
        const name = stopNames[id]
        if (!name || name === 'fail') return []
        const chinese = chineseStopNames[id]
        return [{ stop: id, name_en: name, ...(chinese ? { name_tc: chinese, name_sc: chinese } : {}) }]
      }),
  }
  jest.spyOn(global, 'fetch').mockImplementation(async input => {
    const path = new URL(String(input)).pathname
    const etaMatch = path.match(/\/eta\/([^/]+)\/([^/]+)\/([^/]+)$/)
    if (etaMatch) {
      const [, stop, route, service_type] = etaMatch
      const rows = etas[`${stop}/${route}/${service_type}`]
      if (!rows || rows === 'fail') throw new Error('network down')
      return respond({
        generated_timestamp: generatedTimestamp,
        data: rows.map(r => ({
          route: r.route ?? route,
          dir: r.dir ?? 'O',
          service_type,
          dest_en: r.dest ?? 'X',
          ...(r.destTc ? { dest_tc: r.destTc, dest_sc: r.destTc } : {}),
          eta: r.eta,
          data_timestamp: generatedTimestamp,
        })),
      })
    }
    throw new Error(`unexpected URL ${path}`)
  })
}

const NOW = new Date('2026-01-01T12:00:00Z')
const at = (minutesFromNow: number): string => new Date(NOW.getTime() + minutesFromNow * 60_000).toISOString()

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('loadFavoriteBoard: grouping by Stop', () => {
  it('puts each Favorite under its Stop name, with parenthesised suffixes removed', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(5) }] },
      stopNames: { S1: 'Tuen Mun Station (TM123)' },
    })

    const { groups } = await loadBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en')

    expect(groups).toEqual([
      { stopName: 'Tuen Mun Station', stopIds: ['S1'], routes: [{ route: '272P', stop: 'S1', bound: 'O', service_type: '1', dest: 'X', etas: [{ eta: at(5) }] }] },
    ])
  })

  it('merges two Stop ids whose names differ only by suffix into one group', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(3) }], 'S2/272X/1': [{ eta: at(7) }] },
      stopNames: { S1: 'Causeway Bay (PA1)', S2: 'Causeway Bay (PA2)' },
    })

    const { groups } = await loadBoard(
      [
        { stop: 'S1', route: '272P', service_type: '1' },
        { stop: 'S2', route: '272X', service_type: '1' },
      ],
      NOW,
      'en',
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].stopName).toBe('Causeway Bay')
    expect(groups[0].stopIds).toEqual(['S1', 'S2'])
    expect(groups[0].routes.map(r => r.route)).toEqual(['272P', '272X'])
  })

  it('keeps a group for a Favorite whose Stop has no upcoming ETAs', async () => {
    stubKmb({ etas: { 'S1/272P/1': [] }, stopNames: { S1: 'Quiet Stop' } })

    const { groups } = await loadBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en')

    expect(groups).toEqual([{ stopName: 'Quiet Stop', stopIds: ['S1'], routes: [] }])
  })

  it('labels a group with the Stop id when the Stop name cannot be loaded', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] }, stopNames: { S1: 'fail' } })

    const { groups } = await loadBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en')

    expect(groups[0].stopName).toBe('S1')
    expect(groups[0].routes).toHaveLength(1)
  })

  it('orders groups by the order of the Favorites', async () => {
    stubKmb({
      etas: { 'S2/1/1': [], 'S1/2/1': [] },
      stopNames: { S1: 'Alpha', S2: 'Bravo' },
    })

    const { groups } = await loadBoard(
      [
        { stop: 'S2', route: '1', service_type: '1' },
        { stop: 'S1', route: '2', service_type: '1' },
      ],
      NOW,
      'en',
    )

    expect(groups.map(g => g.stopName)).toEqual(['Bravo', 'Alpha'])
  })

  it('returns no groups for no Favorites', async () => {
    stubKmb({})
    expect(await loadBoard([], NOW, 'en')).toEqual({ groups: [], generatedTimestamp: '' })
  })
})

describe('loadFavoriteBoard: language', () => {
  it('names groups in the chosen language and merges full-width suffixes', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(3) }], 'S2/272X/1': [{ eta: at(7) }] },
      stopNames: { S1: 'TSIM SHA TSUI EAST (MODY ROAD)', S2: 'TSIM SHA TSUI EAST' },
      chineseStopNames: { S1: '尖沙咀東（麼地道）', S2: '尖沙咀東' },
    })

    const { groups } = await loadBoard(
      [
        { stop: 'S1', route: '272P', service_type: '1' },
        { stop: 'S2', route: '272X', service_type: '1' },
      ],
      NOW,
      'tc',
    )

    expect(groups.map(g => [g.stopName, g.stopIds])).toEqual([['尖沙咀東', ['S1', 'S2']]])
  })

  it('falls back to the English name when the Stop has no Chinese name', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: at(3) }] }, stopNames: { S1: 'Central' } })

    const { groups } = await loadBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'sc')

    expect(groups[0].stopName).toBe('Central')
  })

  it('gives each Route its destination in the chosen language', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(3), dest: 'CAUSEWAY BAY', destTc: '銅鑼灣' }] },
      stopNames: { S1: 'Stop' },
    })
    const fav = [{ stop: 'S1', route: '272P', service_type: '1' }]

    expect((await loadBoard(fav, NOW, 'en')).groups[0].routes[0].dest).toBe('CAUSEWAY BAY')
    expect((await loadBoard(fav, NOW, 'tc')).groups[0].routes[0].dest).toBe('銅鑼灣')
  })
})

describe('loadFavoriteBoard: arrivals', () => {
  const fav = { stop: 'S1', route: '272P', service_type: '1' }

  it('sorts a Route\'s arrivals soonest first, with unknown times last', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(20) }, { eta: '' }, { eta: at(4) }] },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadBoard([fav], NOW, 'en')

    expect(groups[0].routes[0].etas.map(a => a.eta)).toEqual([at(4), at(20), ''])
  })

  it('sorts Routes within a Stop by their next arrival, with no-time Routes last', async () => {
    stubKmb({
      etas: {
        'S1/A/1': [{ eta: '' }],
        'S1/B/1': [{ eta: at(9) }],
        'S1/C/1': [{ eta: at(2) }],
      },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadBoard(
      ['A', 'B', 'C'].map(route => ({ stop: 'S1', route, service_type: '1' })),
      NOW,
      'en',
    )

    expect(groups[0].routes.map(r => r.route)).toEqual(['C', 'B', 'A'])
  })

  it('does not put a Route first because of a bus that has already left', async () => {
    stubKmb({
      etas: {
        'S1/A/1': [{ eta: at(-3) }, { eta: at(10) }],
        'S1/B/1': [{ eta: at(5) }],
      },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadBoard(
      ['A', 'B'].map(route => ({ stop: 'S1', route, service_type: '1' })),
      NOW,
      'en',
    )

    expect(groups[0].routes.map(r => r.route)).toEqual(['B', 'A'])
  })

  it('keeps the same Route in two directions as separate entries', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ dir: 'O', eta: at(5) }, { dir: 'I', eta: at(8) }] },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadBoard([fav], NOW, 'en')

    expect(groups[0].routes).toEqual([
      { route: '272P', stop: 'S1', bound: 'O', service_type: '1', dest: 'X', etas: [{ eta: at(5) }] },
      { route: '272P', stop: 'S1', bound: 'I', service_type: '1', dest: 'X', etas: [{ eta: at(8) }] },
    ])
  })

  it('fills stop, bound and service_type on each row', async () => {
    stubKmb({ etas: { 'S1/272P/2': [{ dir: 'I', eta: at(5) }] }, stopNames: { S1: 'Stop' } })

    const { groups } = await loadBoard([{ stop: 'S1', route: '272P', service_type: '2' }], NOW, 'en')

    expect(groups[0].routes[0]).toMatchObject({ route: '272P', stop: 'S1', bound: 'I', service_type: '2' })
  })

  it('keeps two Stop ids sharing a name and Route as separate rows', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(3) }], 'S2/272P/1': [{ eta: at(6) }] },
      stopNames: { S1: 'Same Name (A)', S2: 'Same Name (B)' },
    })

    const { groups } = await loadBoard(
      [
        { stop: 'S1', route: '272P', service_type: '1' },
        { stop: 'S2', route: '272P', service_type: '1' },
      ],
      NOW,
      'en',
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].routes.map(r => r.stop)).toEqual(['S1', 'S2'])
  })

  it('orders against the given time, not the clock', async () => {
    // At 08:00 the 07:58 bus on A has left, so B (08:10) comes before A (08:30).
    stubKmb({
      etas: {
        'S1/A/1': [{ eta: '2030-06-01T07:58:00Z' }, { eta: '2030-06-01T08:30:00Z' }],
        'S1/B/1': [{ eta: '2030-06-01T08:10:00Z' }],
      },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadBoard(
      ['A', 'B'].map(route => ({ stop: 'S1', route, service_type: '1' })),
      new Date('2030-06-01T08:00:00Z'),
      'en',
    )

    expect(groups[0].routes.map(r => r.route)).toEqual(['B', 'A'])
  })

  it('still shows the other Favorites when one ETA request fails', async () => {
    stubKmb({
      etas: { 'S1/272P/1': 'fail', 'S2/272X/1': [{ eta: at(6) }] },
      stopNames: { S1: 'Broken Stop', S2: 'Working Stop' },
    })

    const { groups } = await loadBoard(
      [fav, { stop: 'S2', route: '272X', service_type: '1' }],
      NOW,
      'en',
    )

    expect(groups).toEqual([
      { stopName: 'Broken Stop', stopIds: ['S1'], routes: [] },
      { stopName: 'Working Stop', stopIds: ['S2'], routes: [{ route: '272X', stop: 'S2', bound: 'O', service_type: '1', dest: 'X', etas: [{ eta: at(6) }] }] },
    ])
  })

  it('takes the generated timestamp from the first response that succeeded', async () => {
    stubKmb({
      etas: { 'S1/272P/1': 'fail', 'S2/272X/1': [] },
      stopNames: { S1: 'A', S2: 'B' },
      generatedTimestamp: '2026-01-01T11:59:30Z',
    })

    const { generatedTimestamp } = await loadBoard(
      [fav, { stop: 'S2', route: '272X', service_type: '1' }],
      NOW,
      'en',
    )

    expect(generatedTimestamp).toBe('2026-01-01T11:59:30Z')
  })
})

describe('loadFavoriteBoard: offline', () => {
  it('rejects when every ETA request fails, so callers can keep their last board', async () => {
    stubKmb({ etas: { 'S1/272P/1': 'fail', 'S2/272X/1': 'fail' }, stopNames: { S1: 'A', S2: 'B' } })

    await expect(
      loadFavoriteBoard(
        [
          { stop: 'S1', route: '272P', service_type: '1' },
          { stop: 'S2', route: '272X', service_type: '1' },
        ],
        NOW,
        'en',
      ),
    ).rejects.toThrow('No ETAs could be loaded')
  })
})

describe('loadFavoriteBoard: Stop lookup', () => {
  const stopRecord = (id: string, name_en: string) => ({ stop: id, name_en })

  it('takes Stop names from the injected Stop lookup, as display names, without asking KMB for a Stop', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] } })
    const getStopsFor = jest.fn(async () => [stopRecord('S1', 'CAUSEWAY BAY (PA1)')])
    const fetchSpy = global.fetch as jest.Mock

    const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en', { getStopsFor })

    expect(groups[0].stopName).toBe('Causeway Bay')
    expect(getStopsFor).toHaveBeenCalledWith(['S1'])
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/stop/'))).toBe(false)
  })

  it('labels groups with the Stop id and still shows the buses when the Stop lookup fails', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] } })
    const getStopsFor = jest.fn(async () => { throw new Error('cache unreadable') })

    const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en', { getStopsFor })

    expect(groups[0].stopName).toBe('S1')
    expect(groups[0].routes).toHaveLength(1)
  })

  describe('through the real Stop lookup', () => {
    const BULK_URL = 'https://data.etabus.gov.hk/v1/transport/kmb/stop'
    const urlsRequested = (): string[] => (global.fetch as jest.Mock).mock.calls.map(([url]) => String(url))

    beforeEach(async () => {
      await AsyncStorage.clear()
    })

    it('makes no Stop request when the Stop cache already has the Stop', async () => {
      stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] } })
      await AsyncStorage.setItem('bus_stops_cache', JSON.stringify({
        data: [{ stop: 'S1', name_en: 'CAUSEWAY BAY (PA1)' }], generatedTimestamp: 'g', cacheTimestamp: NOW.toISOString(),
      }))

      const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en')

      expect(groups[0].stopName).toBe('Causeway Bay')
      expect(urlsRequested().filter(url => url.includes('/stop'))).toEqual([])
    })

    it('with the widget\'s lookup, never downloads the full Stop list and leaves the cache alone', async () => {
      stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] } })

      await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW, 'en', WIDGET_BOARD_DEPS)

      expect(urlsRequested()).not.toContain(BULK_URL)
      expect(await AsyncStorage.getItem('bus_stops_cache')).toBeNull()
    })
  })
})
