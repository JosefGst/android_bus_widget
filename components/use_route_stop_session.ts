import { useEffect, useState, useSyncExternalStore } from 'react'
import { createRouteStopSession, OpenParams, RouteStopSession, RouteStopState } from '../utils/route_stop_session'

/**
 * The Route page session for one mount of Routes Stop: opened with the page's params, focused while
 * the page has focus. All loading, preselecting and ETA refresh rules live in utils/route_stop_session.
 */
export function useRouteStopSession(
  { route, bound, service_type, stop }: OpenParams,
  focused: boolean,
): { state: RouteStopState; session: RouteStopSession } {
  const [session] = useState(() => createRouteStopSession())
  useEffect(() => () => session.dispose(), [session])
  useEffect(() => {
    session.open({ route, bound, service_type, stop })
  }, [session, route, bound, service_type, stop])
  useEffect(() => {
    if (focused) session.focus()
    else session.blur()
  }, [session, focused])
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState)
  return { state, session }
}
