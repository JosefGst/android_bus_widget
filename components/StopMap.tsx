import React, { useCallback, useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { parseFromMapMessage, ToMapMessage } from '../utils/route_stop_map'
import { STOP_MAP_HTML, StopMapProps } from './stop_map_html'

const SOURCE = { html: STOP_MAP_HTML }

/** Android host: the Leaflet page in a WebView. Web uses StopMap.web.tsx. */
export function StopMap({ markers, selectedStop, onMarkerPress, onTouchActiveChange }: StopMapProps): React.JSX.Element {
  const webViewRef = useRef<WebView>(null)
  const readyRef = useRef(false)
  // Latest props, read when the page reports ready.
  const latest = useRef({ markers, selectedStop, onMarkerPress, onTouchActiveChange })
  useEffect(() => {
    latest.current = { markers, selectedStop, onMarkerPress, onTouchActiveChange }
  })

  const send = useCallback((msg: ToMapMessage) => {
    if (!readyRef.current) return
    webViewRef.current?.injectJavaScript(`window.receive(${JSON.stringify(msg)});true;`)
  }, [])

  // setMarkers resets the page's selection, so always follow it with the current one.
  const syncAll = useCallback(() => {
    send({ type: 'setMarkers', markers: latest.current.markers })
    send({ type: 'select', stop: latest.current.selectedStop })
  }, [send])

  useEffect(() => {
    syncAll()
  }, [markers, syncAll])

  useEffect(() => {
    send({ type: 'select', stop: selectedStop })
  }, [selectedStop, send])

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = parseFromMapMessage(event.nativeEvent.data)
    if (msg?.type === 'ready') {
      readyRef.current = true
      syncAll()
    } else if (msg?.type === 'markerPress') {
      latest.current.onMarkerPress(msg.stop)
    } else if (msg?.type === 'touchStart' || msg?.type === 'touchEnd') {
      latest.current.onTouchActiveChange?.(msg.type === 'touchStart')
    }
  }, [syncAll])

  return (
    <WebView
      ref={webViewRef}
      source={SOURCE}
      originWhitelist={['*']}
      onMessage={onMessage}
      style={styles.map}
      setSupportMultipleWindows={false}
    />
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
})
