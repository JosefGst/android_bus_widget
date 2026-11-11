import React, { useMemo, useRef } from 'react'
import { PanResponder, StyleSheet, View } from 'react-native'
import { mapSizeName } from '../utils/map_size'

interface MapResizeHandleProps {
  /** Current map height as a fraction of areaHeight. */
  fraction: number
  /** Height of the area the map shares with the handle and the Stop list. */
  areaHeight: number
  /** Called continuously while dragging with the unsnapped fraction. */
  onDrag: (fraction: number) => void
  /** Called once when the finger lifts, with the unsnapped fraction. */
  onRelease: (fraction: number) => void
}

const MIN_FRACTION = 0.2
const MAX_FRACTION = 0.9
const clamp = (f: number): number => Math.min(MAX_FRACTION, Math.max(MIN_FRACTION, f))

/** Grip bar under the Route map; drag it to resize the map. */
export function MapResizeHandle({ fraction, areaHeight, onDrag, onRelease }: MapResizeHandleProps): React.JSX.Element {
  // Latest props, read inside the PanResponder (created once).
  const latest = useRef({ fraction, areaHeight, onDrag, onRelease })
  latest.current = { fraction, areaHeight, onDrag, onRelease }
  const startFraction = useRef(fraction)

  const responder = useMemo(() => {
    const at = (dy: number): number => clamp(startFraction.current + dy / latest.current.areaHeight)
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture away from the tab pager and the Stop list.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startFraction.current = latest.current.fraction
      },
      onPanResponderMove: (_e, g) => latest.current.onDrag(at(g.dy)),
      onPanResponderRelease: (_e, g) => latest.current.onRelease(at(g.dy)),
      onPanResponderTerminate: (_e, g) => latest.current.onRelease(at(g.dy)),
    })
  }, [])

  return (
    <View
      {...responder.panHandlers}
      style={styles.handle}
      testID="map-resize-handle"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Resize map, ${mapSizeName(fraction)}`}
    >
      <View style={styles.grip} />
    </View>
  )
}

const styles = StyleSheet.create({
  handle: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f7',
  },
  grip: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#c7c7cc',
  },
})
