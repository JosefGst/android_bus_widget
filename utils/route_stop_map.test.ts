import type { ROUTS, Stop } from './fetch'
import { buildRouteMarkers, parseFromMapMessage } from './route_stop_map'

const routeStop = (stop: string, seq: string): ROUTS => ({
  route: '272P',
  bound: 'O',
  service_type: '1',
  orig_en: 'TUEN MUN',
  dest_en: 'CAUSEWAY BAY',
  seq,
  stop,
})

const stop = (id: string, lat?: string, long?: string, name_en = `Name ${id}`): Stop => ({
  stop: id,
  name_en,
  lat,
  long,
})

describe('buildRouteMarkers', () => {
  it('joins Route Stops with Stop coordinates and orders them by numeric seq', () => {
    const markers = buildRouteMarkers(
      [routeStop('B', '10'), routeStop('A', '2')],
      [stop('A', '22.3', '114.1'), stop('B', '22.4', '114.2')],
    )
    expect(markers).toEqual([
      { stop: 'A', seq: 2, name: 'Name A', lat: 22.3, lng: 114.1 },
      { stop: 'B', seq: 10, name: 'Name B', lat: 22.4, lng: 114.2 },
    ])
  })

  it('skips Stops that are not in the Stop list', () => {
    expect(buildRouteMarkers([routeStop('X', '1')], [])).toEqual([])
  })

  it('skips Stops with missing, empty or non-numeric coordinates', () => {
    const markers = buildRouteMarkers(
      [routeStop('A', '1'), routeStop('B', '2'), routeStop('C', '3')],
      [stop('A'), stop('B', '', ''), stop('C', 'abc', '114.1')],
    )
    expect(markers).toEqual([])
  })

  it('skips Stops outside Hong Kong', () => {
    const markers = buildRouteMarkers(
      [routeStop('A', '1'), routeStop('B', '2')],
      [stop('A', '0', '0'), stop('B', '22.3', '120')],
    )
    expect(markers).toEqual([])
  })

  it('falls back to the Stop id when there is no name', () => {
    const markers = buildRouteMarkers([routeStop('A', '1')], [stop('A', '22.3', '114.1', '')])
    expect(markers[0].name).toBe('A')
  })
})

describe('parseFromMapMessage', () => {
  it('accepts a ready message', () => {
    expect(parseFromMapMessage('{"type":"ready"}')).toEqual({ type: 'ready' })
  })

  it('accepts a markerPress message with a Stop id', () => {
    expect(parseFromMapMessage('{"type":"markerPress","stop":"A1"}')).toEqual({ type: 'markerPress', stop: 'A1' })
  })

  it.each([
    ['a non-string', 42],
    ['bad JSON', '{nope'],
    ['JSON null', 'null'],
    ['an unknown type', '{"type":"hack"}'],
    ['a missing stop', '{"type":"markerPress"}'],
    ['an empty stop', '{"type":"markerPress","stop":""}'],
    ['a non-string stop', '{"type":"markerPress","stop":5}'],
  ])('rejects %s', (_label, raw) => {
    expect(parseFromMapMessage(raw)).toBeNull()
  })
})
