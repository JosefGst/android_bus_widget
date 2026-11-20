const { buildFareTable } = require('./fare_table')

// A trimmed hk-bus-crawling routeFareList: only the fields the builder reads.
const kmbRoute = (route, bound, serviceType, stops, fares, co = ['kmb']) => ({
  route,
  co,
  bound: { kmb: bound },
  serviceType,
  stops: { kmb: stops },
  fares,
})

const raw = (routes) => ({
  holidays: [],
  serviceDayMap: {},
  stopList: {},
  stopMap: {},
  routeList: Object.fromEntries(routes.map((r, i) => [`id${i}`, r])),
})

describe('buildFareTable', () => {
  it('keys a KMB Route by route|bound|service_type and keeps its section fares as numbers', () => {
    const table = buildFareTable(
      raw([kmbRoute('1', 'O', '1', ['a', 'b', 'c'], ['6.7', '5.8'])]),
    )
    expect(table).toEqual({ '1|O|1': [6.7, 5.8] })
  })

  it('leaves out Routes that have no KMB stops, such as Citybus-only Routes', () => {
    const ctbOnly = { route: '101', co: ['ctb'], bound: { ctb: 'O' }, serviceType: '1', stops: { ctb: ['x', 'y'] }, fares: ['10.0'] }
    const table = buildFareTable(raw([ctbOnly, kmbRoute('1', 'O', '1', ['a', 'b'], ['6.7'])]))
    expect(Object.keys(table)).toEqual(['1|O|1'])
  })

  it('leaves out KMB Routes that have no fare data', () => {
    const noFares = kmbRoute('2', 'O', '1', ['a', 'b'], null)
    const table = buildFareTable(raw([noFares, kmbRoute('1', 'O', '1', ['a', 'b'], ['6.7'])]))
    expect(Object.keys(table)).toEqual(['1|O|1'])
  })

  it('throws when a Route has other than one fare per Stop except the last', () => {
    const bad = kmbRoute('1', 'O', '1', ['a', 'b', 'c'], ['6.7'])
    expect(() => buildFareTable(raw([bad]))).toThrow(/1\|O\|1/)
  })

  it('throws when the KMB Route count drops more than 10% against the previous table', () => {
    const previous = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`${i}|O|1`, [1]]))
    const nine = Array.from({ length: 8 }, (_, i) => kmbRoute(`${i}`, 'O', '1', ['a', 'b'], ['1']))
    expect(() => buildFareTable(raw(nine), previous)).toThrow(/dropped/)
    const ten = Array.from({ length: 9 }, (_, i) => kmbRoute(`${i}`, 'O', '1', ['a', 'b'], ['1']))
    expect(() => buildFareTable(raw(ten), previous)).not.toThrow()
  })

  it('throws when the input lacks the expected top-level keys', () => {
    const { stopList, ...withoutStopList } = raw([])
    expect(() => buildFareTable(withoutStopList)).toThrow(/stopList/)
  })
})
