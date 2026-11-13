import type { ROUTS, Stop } from './fetch'
import { Language, localized } from './language'

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
  | { type: 'setUserLocation'; location: UserLocation | null }
  | { type: 'centerOnUser' }
  | { type: 'fitRoute' }
  | { type: 'setLanguage'; language: Language; attribution: string }

/** The user's position for the map. accuracy is a radius in metres. Never stored or logged. */
export type UserLocation = {
  lat: number
  lng: number
  accuracy: number
}

/** A position reading, shaped like expo-location's LocationObjectCoords. */
export type LocationReading = {
  latitude: number
  longitude: number
  accuracy: number | null
}

/** Turn a position reading into a UserLocation. Returns null for unusable readings. */
export function toUserLocation(reading: LocationReading): UserLocation | null {
  const { latitude, longitude } = reading
  const accuracy = reading.accuracy ?? 0
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) return null
  return { lat: latitude, lng: longitude, accuracy }
}

/** A UserLocation with the time (ms) it was received. */
export type TimedLocation = { location: UserLocation; at: number }

/** A GPS fix older than this counts as lost (e.g. indoors), and the network position is used. */
export const GPS_STALE_MS = 30_000

/**
 * The position to show: a recent GPS fix if there is one, otherwise the
 * Wi-Fi/cell (network) position, otherwise whatever GPS fix is left.
 */
export function pickUserLocation(
  gps: TimedLocation | null,
  network: TimedLocation | null,
  now: number,
): UserLocation | null {
  if (gps && now - gps.at < GPS_STALE_MS) return gps.location
  return network?.location ?? gps?.location ?? null
}

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

const toMarker = (routeStop: ROUTS, stop: Stop | undefined, language: Language): RouteMarker | null => {
  if (!stop) return null
  const lat = parseCoord(stop.lat)
  const lng = parseCoord(stop.long)
  if (lat === null || lng === null) return null
  if (lat < HK_BOUNDS.minLat || lat > HK_BOUNDS.maxLat || lng < HK_BOUNDS.minLng || lng > HK_BOUNDS.maxLng) {
    return null
  }
  return { stop: routeStop.stop, seq: Number(routeStop.seq), name: localized(stop, 'name', language) || routeStop.stop, lat, lng }
}

/** Markers for a Route's Stops, ordered by seq. Stops without usable coordinates are left out. */
export function buildRouteMarkers(routeStops: ROUTS[], stops: Stop[], language: Language): RouteMarker[] {
  const byId = new Map(stops.map(s => [s.stop, s]))
  return routeStops
    .map(rs => toMarker(rs, byId.get(rs.stop), language))
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
