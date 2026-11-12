import type { ROUTS, Stop } from './fetch'
import { buildRouteMarkers, parseFromMapMessage, pickUserLocation, TimedLocation, toUserLocation } from './route_stop_map'

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

describe('toUserLocation', () => {
  it('keeps a valid reading', () => {
    expect(toUserLocation({ latitude: 22.3, longitude: 114.17, accuracy: 15 })).toEqual({
      lat: 22.3,
      lng: 114.17,
      accuracy: 15,
    })
  })

  it('treats a missing accuracy as 0', () => {
    expect(toUserLocation({ latitude: 22.3, longitude: 114.17, accuracy: null })).toEqual({
      lat: 22.3,
      lng: 114.17,
      accuracy: 0,
    })
  })

  it('rejects non-finite coordinates', () => {
    expect(toUserLocation({ latitude: NaN, longitude: 114.17, accuracy: 5 })).toBeNull()
    expect(toUserLocation({ latitude: 22.3, longitude: Infinity, accuracy: 5 })).toBeNull()
  })

  it('rejects latitude outside ±90', () => {
    expect(toUserLocation({ latitude: 91, longitude: 114.17, accuracy: 5 })).toBeNull()
  })

  it('rejects longitude outside ±180', () => {
    expect(toUserLocation({ latitude: 22.3, longitude: -181, accuracy: 5 })).toBeNull()
  })

  it('rejects a negative or non-finite accuracy', () => {
    expect(toUserLocation({ latitude: 22.3, longitude: 114.17, accuracy: -1 })).toBeNull()
    expect(toUserLocation({ latitude: 22.3, longitude: 114.17, accuracy: NaN })).toBeNull()
  })

  it('keeps a location outside Hong Kong (the user may be anywhere)', () => {
    expect(toUserLocation({ latitude: 51.5, longitude: -0.12, accuracy: 10 })).not.toBeNull()
  })
})

describe('pickUserLocation', () => {
  const gps = (at: number): TimedLocation => ({ location: { lat: 22.3, lng: 114.17, accuracy: 5 }, at })
  const network = (at: number): TimedLocation => ({ location: { lat: 22.31, lng: 114.18, accuracy: 60 }, at })

  it('uses a recent GPS fix over the network position', () => {
    expect(pickUserLocation(gps(100_000), network(100_000), 110_000)).toEqual(gps(0).location)
  })

  it('falls back to the network position when the GPS fix is stale', () => {
    expect(pickUserLocation(gps(0), network(100_000), 100_000)).toEqual(network(0).location)
  })

  it('falls back to the network position when there is no GPS fix', () => {
    expect(pickUserLocation(null, network(100_000), 100_000)).toEqual(network(0).location)
  })

  it('keeps a stale GPS fix when there is no network position', () => {
    expect(pickUserLocation(gps(0), null, 100_000)).toEqual(gps(0).location)
  })

  it('returns null without any reading', () => {
    expect(pickUserLocation(null, null, 0)).toBeNull()
  })
})
