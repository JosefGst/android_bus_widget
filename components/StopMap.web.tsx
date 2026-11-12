import React, { useCallback, useEffect, useRef, useState } from 'react'
import { parseFromMapMessage, ToMapMessage } from '../utils/route_stop_map'
import { STOP_MAP_HTML, StopMapProps } from './stop_map_html'

/** Web host: the Leaflet page in an iframe. Android uses StopMap.tsx. */
export function StopMap({ markers, selectedStop, onMarkerPress, fitRouteToken = 0 }: StopMapProps): React.JSX.Element | null {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  // Latest props, read when the page reports ready.
  const latest = useRef({ markers, selectedStop, onMarkerPress })
  useEffect(() => {
    latest.current = { markers, selectedStop, onMarkerPress }
  })
  // Render the iframe only in the browser, never in the static pre-render.
  const [mounted, setMounted] = useState(false)

  const send = useCallback((msg: ToMapMessage) => {
    if (!readyRef.current) return
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*')
  }, [])

  // setMarkers resets the page's selection, so always follow it with the current one.
  const syncAll = useCallback(() => {
    send({ type: 'setMarkers', markers: latest.current.markers })
    send({ type: 'select', stop: latest.current.selectedStop })
  }, [send])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const msg = parseFromMapMessage(event.data)
      if (msg?.type === 'ready') {
        readyRef.current = true
        syncAll()
      } else if (msg?.type === 'markerPress') {
        latest.current.onMarkerPress(msg.stop)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [syncAll])

  useEffect(() => {
    syncAll()
  }, [markers, syncAll])

  useEffect(() => {
    send({ type: 'select', stop: selectedStop })
  }, [selectedStop, send])

  // Fit only on a new tap (token > 0), never on mount.
  useEffect(() => {
    if (fitRouteToken > 0) send({ type: 'fitRoute' })
  }, [fitRouteToken, send])

  if (!mounted) return null
  return (
    <iframe
      ref={iframeRef}
      srcDoc={STOP_MAP_HTML}
      title="Route map"
      style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
