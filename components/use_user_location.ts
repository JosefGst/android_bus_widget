import Geolocation from '@react-native-community/geolocation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'
import { pickUserLocation, TimedLocation, toUserLocation, UserLocation } from '../utils/route_stop_map'

export type LocationPermission = 'unknown' | 'granted' | 'denied'

export type UserLocationState = {
  permission: LocationPermission
  location: UserLocation | null
  /** Ask for permission if needed. Resolves true when location may be used. */
  start: () => Promise<boolean>
}

type LocationCoords = { latitude: number; longitude: number; accuracy: number }

const ENABLED = Platform.OS === 'android'
const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
// How often to re-check whether the GPS fix went stale (no event arrives when it does).
const STALE_CHECK_MS = 5000
// GPS one-shot requests: wait this long for a fix, then retry after GPS_RETRY_MS.
const GPS_TIMEOUT_MS = 20_000
const GPS_RETRY_MS = 10_000
const GPS_NEXT_FIX_MS = 2000

// Use Android's own LocationManager, not Google Play Services: some devices
// (e.g. Honor/Huawei) ship without them and would never get a position.
if (ENABLED) Geolocation.setRNConfiguration({ skipPermissionRequests: true, locationProvider: 'android' })

/**
 * The user's position, Android only. Location updates run only while `active`
 * is true and permission is granted. The permission is checked again each time
 * `active` turns true, so a grant made in Android settings is picked up.
 * Uses a GPS fix when there is a recent one (needs precise permission) and
 * falls back to the Wi-Fi/cell position, e.g. indoors; see pickUserLocation().
 * The position is kept in memory only: never stored or logged.
 */
export function useUserLocation(active: boolean): UserLocationState {
  const [permission, setPermission] = useState<LocationPermission>('unknown')
  // Precise (fine) permission: needed for GPS. With only approximate, the network position is used.
  const [precise, setPrecise] = useState(false)
  const [location, setLocation] = useState<UserLocation | null>(null)
  const readings = useRef<{ gps: TimedLocation | null; network: TimedLocation | null }>({ gps: null, network: null })

  useEffect(() => {
    if (!ENABLED || !active) return
    let cancelled = false
    Promise.all([PermissionsAndroid.check(FINE), PermissionsAndroid.check(COARSE)])
      .then(([fine, coarse]) => {
        if (cancelled) return
        setPrecise(fine)
        // A missing grant keeps the current state: "denied" stays hidden until settings change it.
        if (fine || coarse) setPermission('granted')
      })
      .catch(e => console.error('Location permission check failed', e))
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    if (!ENABLED || !active || permission !== 'granted') return
    const onError = (e: { code: number; message: string }): void => {
      console.error('Location update failed', e.code, e.message)
    }
    let stopped = false
    const update = (): void => {
      setLocation(pickUserLocation(readings.current.gps, readings.current.network, Date.now()))
    }
    const onReading = (source: 'gps' | 'network') => (pos: { coords: LocationCoords }): void => {
      if (stopped) return
      const loc = toUserLocation(pos.coords)
      readings.current[source] = loc ? { location: loc, at: Date.now() } : null
      update()
    }
    // A recent Wi-Fi/cell position right away; a fresh fix may take a while.
    Geolocation.getCurrentPosition(onReading('network'), onError, {
      enableHighAccuracy: false,
      maximumAge: 10 * 60 * 1000,
      timeout: 20000,
    })
    // Wi-Fi/cell: one continuous watch. The library runs a single native watch,
    // so GPS uses its own one-shot requests in a loop instead.
    const watchId = Geolocation.watchPosition(onReading('network'), onError, {
      enableHighAccuracy: false,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 2000,
    })
    let gpsTimer: ReturnType<typeof setTimeout> | null = null
    const requestGps = (): void => {
      if (stopped) return
      Geolocation.getCurrentPosition(
        pos => {
          onReading('gps')(pos)
          if (!stopped) gpsTimer = setTimeout(requestGps, GPS_NEXT_FIX_MS)
        },
        // No fix in time (e.g. indoors): the network position is shown; try again later.
        () => {
          if (!stopped) gpsTimer = setTimeout(requestGps, GPS_RETRY_MS)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_TIMEOUT_MS },
      )
    }
    if (precise) requestGps()
    const staleTimer = setInterval(update, STALE_CHECK_MS)
    return () => {
      clearInterval(staleTimer)
      stopped = true
      if (gpsTimer) clearTimeout(gpsTimer)
      Geolocation.clearWatch(watchId)
      readings.current = { gps: null, network: null }
    }
  }, [active, permission, precise])

  const start = useCallback(async (): Promise<boolean> => {
    if (!ENABLED) return false
    try {
      // Ask for both: the user may pick "Approximate", which grants only coarse.
      const result = await PermissionsAndroid.requestMultiple([FINE, COARSE])
      const fine = result[FINE] === PermissionsAndroid.RESULTS.GRANTED
      const coarse = result[COARSE] === PermissionsAndroid.RESULTS.GRANTED
      const next: LocationPermission = fine || coarse ? 'granted' : 'denied'
      setPrecise(fine)
      setPermission(next)
      return next === 'granted'
    } catch (e) {
      console.error('Location permission request failed', e)
      return false
    }
  }, [])

  return { permission, location, start }
}
