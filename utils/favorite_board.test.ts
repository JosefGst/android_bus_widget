import { loadFavoriteBoard } from './favorite_board'

// A fake KMB API keyed by URL. Anything not listed fails like a network error.
type FakeKmb = {
  // key: `${stop}/${route}/${service_type}` -> ETA rows, or 'fail'
  etas?: Record<string, { route?: string; dir?: string; eta: string }[] | 'fail'>
  // key: stop id -> English name, or 'fail'
  stopNames?: Record<string, string | 'fail'>
  generatedTimestamp?: string
}

const respond = (body: unknown): Response =>
  ({ status: 200, text: async () => JSON.stringify(body) }) as Response

function stubKmb({ etas = {}, stopNames = {}, generatedTimestamp = '2026-01-01T12:00:00Z' }: FakeKmb) {
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
          dest_en: 'X',
          eta: r.eta,
          data_timestamp: generatedTimestamp,
        })),
      })
    }
    const stopMatch = path.match(/\/stop\/([^/]+)$/)
    if (stopMatch) {
      const name = stopNames[stopMatch[1]]
      if (!name || name === 'fail') throw new Error('network down')
      return respond({ data: { stop: stopMatch[1], name_en: name } })
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

    const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW)

    expect(groups).toEqual([
      { stopName: 'Tuen Mun Station', stopIds: ['S1'], routes: [{ route: '272P', arrivals: [{ eta: at(5), minutes: 5 }] }] },
    ])
  })

  it('merges two Stop ids whose names differ only by suffix into one group', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(3) }], 'S2/272X/1': [{ eta: at(7) }] },
      stopNames: { S1: 'Causeway Bay (PA1)', S2: 'Causeway Bay (PA2)' },
    })

    const { groups } = await loadFavoriteBoard(
      [
        { stop: 'S1', route: '272P', service_type: '1' },
        { stop: 'S2', route: '272X', service_type: '1' },
      ],
      NOW,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].stopName).toBe('Causeway Bay')
    expect(groups[0].stopIds).toEqual(['S1', 'S2'])
    expect(groups[0].routes.map(r => r.route)).toEqual(['272P', '272X'])
  })

  it('keeps a group for a Favorite whose Stop has no upcoming ETAs', async () => {
    stubKmb({ etas: { 'S1/272P/1': [] }, stopNames: { S1: 'Quiet Stop' } })

    const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW)

    expect(groups).toEqual([{ stopName: 'Quiet Stop', stopIds: ['S1'], routes: [] }])
  })

  it('labels a group with the Stop id when the Stop name cannot be loaded', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: at(5) }] }, stopNames: { S1: 'fail' } })

    const { groups } = await loadFavoriteBoard([{ stop: 'S1', route: '272P', service_type: '1' }], NOW)

    expect(groups[0].stopName).toBe('S1')
    expect(groups[0].routes).toHaveLength(1)
  })

  it('orders groups by the order of the Favorites', async () => {
    stubKmb({
      etas: { 'S2/1/1': [], 'S1/2/1': [] },
      stopNames: { S1: 'Alpha', S2: 'Bravo' },
    })

    const { groups } = await loadFavoriteBoard(
      [
        { stop: 'S2', route: '1', service_type: '1' },
        { stop: 'S1', route: '2', service_type: '1' },
      ],
      NOW,
    )

    expect(groups.map(g => g.stopName)).toEqual(['Bravo', 'Alpha'])
  })

  it('returns no groups for no Favorites', async () => {
    stubKmb({})
    expect(await loadFavoriteBoard([], NOW)).toEqual({ groups: [], generatedTimestamp: '' })
  })
})

describe('loadFavoriteBoard: arrivals', () => {
  const fav = { stop: 'S1', route: '272P', service_type: '1' }

  it('sorts a Route\'s arrivals soonest first, with unknown times last', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ eta: at(20) }, { eta: '' }, { eta: at(4) }] },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadFavoriteBoard([fav], NOW)

    expect(groups[0].routes[0].arrivals.map(a => a.minutes)).toEqual([4, 20, null])
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

    const { groups } = await loadFavoriteBoard(
      ['A', 'B', 'C'].map(route => ({ stop: 'S1', route, service_type: '1' })),
      NOW,
    )

    expect(groups[0].routes.map(r => r.route)).toEqual(['C', 'B', 'A'])
  })

  it('keeps the same Route in two directions as separate entries', async () => {
    stubKmb({
      etas: { 'S1/272P/1': [{ dir: 'O', eta: at(5) }, { dir: 'I', eta: at(8) }] },
      stopNames: { S1: 'Stop' },
    })

    const { groups } = await loadFavoriteBoard([fav], NOW)

    expect(groups[0].routes).toEqual([
      { route: '272P', arrivals: [{ eta: at(5), minutes: 5 }] },
      { route: '272P', arrivals: [{ eta: at(8), minutes: 8 }] },
    ])
  })

  it('computes minutes against the given time, not the clock', async () => {
    stubKmb({ etas: { 'S1/272P/1': [{ eta: '2030-06-01T08:30:00Z' }] }, stopNames: { S1: 'Stop' } })

    const { groups } = await loadFavoriteBoard([fav], new Date('2030-06-01T08:00:00Z'))

    expect(groups[0].routes[0].arrivals[0].minutes).toBe(30)
  })

  it('still shows the other Favorites when one ETA request fails', async () => {
    stubKmb({
      etas: { 'S1/272P/1': 'fail', 'S2/272X/1': [{ eta: at(6) }] },
      stopNames: { S1: 'Broken Stop', S2: 'Working Stop' },
    })

    const { groups } = await loadFavoriteBoard(
      [fav, { stop: 'S2', route: '272X', service_type: '1' }],
      NOW,
    )

    expect(groups).toEqual([
      { stopName: 'Broken Stop', stopIds: ['S1'], routes: [] },
      { stopName: 'Working Stop', stopIds: ['S2'], routes: [{ route: '272X', arrivals: [{ eta: at(6), minutes: 6 }] }] },
    ])
  })

  it('takes the generated timestamp from the first response that succeeded', async () => {
    stubKmb({
      etas: { 'S1/272P/1': 'fail', 'S2/272X/1': [] },
      stopNames: { S1: 'A', S2: 'B' },
      generatedTimestamp: '2026-01-01T11:59:30Z',
    })

    const { generatedTimestamp } = await loadFavoriteBoard(
      [fav, { stop: 'S2', route: '272X', service_type: '1' }],
      NOW,
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
      ),
    ).rejects.toThrow('No ETAs could be loaded')
  })
})
