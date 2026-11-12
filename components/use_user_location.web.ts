import type { UserLocationState } from './use_user_location'

const start = async (): Promise<boolean> => false

/** Web: no user location (Android only). The native geolocation module is never loaded here. */
export function useUserLocation(_active: boolean): UserLocationState {
  return { permission: 'denied', location: null, start }
}
