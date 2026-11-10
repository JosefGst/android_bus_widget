import React, { useCallback, useEffect, useRef, useState } from 'react'
import { parseFromMapMessage, ToMapMessage } from '../utils/route_stop_map'
import { STOP_MAP_HTML, StopMapProps } from './stop_map_html'

/** Web host: the Leaflet page in an iframe. Android uses StopMap.tsx. */
export function StopMap({ markers }: StopMapProps): React.JSX.Element | null {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const markersRef = useRef(markers)
  markersRef.current = markers
  // Render the iframe only in the browser, never in the static pre-render.
  const [mounted, setMounted] = useState(false)

  const send = useCallback((msg: ToMapMessage) => {
    if (!readyRef.current) return
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*')
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const msg = parseFromMapMessage(event.data)
      if (msg?.type === 'ready') {
        readyRef.current = true
        send({ type: 'setMarkers', markers: markersRef.current })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [send])

  useEffect(() => {
    send({ type: 'setMarkers', markers })
  }, [markers, send])

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
