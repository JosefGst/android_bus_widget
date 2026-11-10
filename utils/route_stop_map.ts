import type { ROUTS, Stop } from './fetch'

/** One Stop of a Route, placed on the map. */
export type RouteMarker = {
  stop: string
  seq: number
  name: string
  lat: number
  lng: number
}

/** Messages the app sends to the map page. */
export type ToMapMessage =
  | { type: 'setMarkers'; markers: RouteMarker[] }
  | { type: 'select'; stop: string | null }

/** Messages the map page sends to the app. Always parse with parseFromMapMessage(). */
export type FromMapMessage =
  | { type: 'ready' }
  | { type: 'markerPress'; stop: string }

// Rough bounding box of Hong Kong; anything outside is bad data.
const HK_BOUNDS = { minLat: 22.1, maxLat: 22.6, minLng: 113.8, maxLng: 114.5 }

const parseCoord = (value: string | undefined): number | null => {
  if (!value || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const toMarker = (routeStop: ROUTS, stop: Stop | undefined): RouteMarker | null => {
  if (!stop) return null
  const lat = parseCoord(stop.lat)
  const lng = parseCoord(stop.long)
  if (lat === null || lng === null) return null
  if (lat < HK_BOUNDS.minLat || lat > HK_BOUNDS.maxLat || lng < HK_BOUNDS.minLng || lng > HK_BOUNDS.maxLng) {
    return null
  }
  return { stop: routeStop.stop, seq: Number(routeStop.seq), name: stop.name_en || routeStop.stop, lat, lng }
}

/** Markers for a Route's Stops, ordered by seq. Stops without usable coordinates are left out. */
export function buildRouteMarkers(routeStops: ROUTS[], stops: Stop[]): RouteMarker[] {
  const byId = new Map(stops.map(s => [s.stop, s]))
  return routeStops
    .map(rs => toMarker(rs, byId.get(rs.stop)))
    .filter((m): m is RouteMarker => m !== null)
    .sort((a, b) => a.seq - b.seq)
}

/** Validate a raw message from the map page. Returns null for anything unexpected. */
export function parseFromMapMessage(raw: unknown): FromMapMessage | null {
  if (typeof raw !== 'string') return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || !('type' in data)) return null
  if (data.type === 'ready') return { type: 'ready' }
  if (data.type === 'markerPress' && 'stop' in data && typeof data.stop === 'string' && data.stop !== '') {
    return { type: 'markerPress', stop: data.stop }
  }
  return null
}
