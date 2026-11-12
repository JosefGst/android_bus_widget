import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { toUserLocation, UserLocation } from '../utils/route_stop_map'

export type LocationPermission = 'unknown' | 'granted' | 'denied'

export type UserLocationState = {
  permission: LocationPermission
  location: UserLocation | null
  /** Ask for permission if needed. Resolves true when location may be used. */
  start: () => Promise<boolean>
}

const ENABLED = Platform.OS === 'android'

const toPermission = (status: Location.PermissionStatus): LocationPermission => {
  if (status === Location.PermissionStatus.GRANTED) return 'granted'
  if (status === Location.PermissionStatus.DENIED) return 'denied'
  return 'unknown'
}

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
    Location.getForegroundPermissionsAsync()
      .then(res => {
        if (!cancelled) setPermission(toPermission(res.status))
      })
      .catch(e => console.error('Location permission check failed', e))
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    if (!ENABLED || !active || permission !== 'granted') return
    let cancelled = false
    let subscription: Location.LocationSubscription | null = null
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
      reading => setLocation(toUserLocation(reading.coords)),
    )
      .then(sub => {
        if (cancelled) sub.remove()
        else subscription = sub
      })
      .catch(e => {
        console.error('Location watch failed', e)
        setLocation(null)
      })
    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [active, permission])

  const start = useCallback(async (): Promise<boolean> => {
    if (!ENABLED) return false
    try {
      const res = await Location.requestForegroundPermissionsAsync()
      const next = toPermission(res.status)
      setPermission(next)
      return next === 'granted'
    } catch (e) {
      console.error('Location permission request failed', e)
      return false
    }
  }, [])

  return { permission, location, start }
}
