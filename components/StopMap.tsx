import React, { useCallback, useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { parseFromMapMessage, ToMapMessage } from '../utils/route_stop_map'
import { STOP_MAP_HTML, StopMapProps } from './stop_map_html'

const SOURCE = { html: STOP_MAP_HTML }

/** Android host: the Leaflet page in a WebView. Web uses StopMap.web.tsx. */
export function StopMap({ markers }: StopMapProps): React.JSX.Element {
  const webViewRef = useRef<WebView>(null)
  const readyRef = useRef(false)
  const markersRef = useRef(markers)
  markersRef.current = markers

  const send = useCallback((msg: ToMapMessage) => {
    if (!readyRef.current) return
    webViewRef.current?.injectJavaScript(`window.receive(${JSON.stringify(msg)});true;`)
  }, [])

  useEffect(() => {
    send({ type: 'setMarkers', markers })
  }, [markers, send])

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const msg = parseFromMapMessage(event.nativeEvent.data)
    if (msg?.type === 'ready') {
      readyRef.current = true
      send({ type: 'setMarkers', markers: markersRef.current })
    }
  }, [send])

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
