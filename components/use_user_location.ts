import Geolocation from '@react-native-community/geolocation'
import { useCallback, useEffect, useState } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'
import { toUserLocation, UserLocation } from '../utils/route_stop_map'

export type LocationPermission = 'unknown' | 'granted' | 'denied'

export type UserLocationState = {
  permission: LocationPermission
  location: UserLocation | null
  /** Ask for permission if needed. Resolves true when location may be used. */
  start: () => Promise<boolean>
}

const ENABLED = Platform.OS === 'android'
const PERMISSION = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION

// Use Android's own LocationManager, not Google Play Services: some devices
// (e.g. Honor/Huawei) ship without them and would never get a position.
if (ENABLED) Geolocation.setRNConfiguration({ skipPermissionRequests: true, locationProvider: 'android' })

/**
 * The user's position, Android only. Location updates run only while `active`
 * is true and permission is granted. The permission is checked again each time
 * `active` turns true, so a grant made in Android settings is picked up.
 * The position is kept in memory only: never stored or logged.
 */
export function useUserLocation(active: boolean): UserLocationState {
  const [permission, setPermission] = useState<LocationPermission>('unknown')
  const [location, setLocation] = useState<UserLocation | null>(null)

  useEffect(() => {
    if (!ENABLED || !active) return
    let cancelled = false
    PermissionsAndroid.check(PERMISSION)
      .then(granted => {
        // A missing grant keeps the current state: "denied" stays hidden until settings change it.
        if (!cancelled && granted) setPermission('granted')
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
    // Show a recent position right away; the watch may take a while to get a fresh fix.
    Geolocation.getCurrentPosition(
      pos => setLocation(prev => prev ?? toUserLocation(pos.coords)),
      onError,
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 20000 },
    )
    const watchId = Geolocation.watchPosition(
      pos => setLocation(toUserLocation(pos.coords)),
      onError,
      { enableHighAccuracy: false, distanceFilter: 10, interval: 5000, fastestInterval: 2000 },
    )
    return () => Geolocation.clearWatch(watchId)
  }, [active, permission])

  const start = useCallback(async (): Promise<boolean> => {
    if (!ENABLED) return false
    try {
      const result = await PermissionsAndroid.request(PERMISSION)
      const next: LocationPermission = result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'
      setPermission(next)
      return next === 'granted'
    } catch (e) {
      console.error('Location permission request failed', e)
      return false
    }
  }, [])

  return { permission, location, start }
}
