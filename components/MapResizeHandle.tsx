import React, { useMemo, useRef } from 'react'
import { PanResponder, StyleSheet, View } from 'react-native'
import { COLORS, TOUCH_TARGET } from './theme'

interface MapResizeHandleProps {
  /** Current map height as a fraction of areaHeight. */
  fraction: number
  /** Height of the area the map shares with the handle and the Stop list. */
  areaHeight: number
  /** Spoken label, e.g. "Map size: a third. Tap or drag to change." */
  label: string
  /** Called continuously while dragging with the unsnapped fraction. */
  onDrag: (fraction: number) => void
  /** Called once when the finger lifts after a drag, with the unsnapped fraction. */
  onRelease: (fraction: number) => void
  /** Called for a tap (no real movement): step to the next size. */
  onTap: () => void
}

const MIN_FRACTION = 0.2
const MAX_FRACTION = 0.9
// Movement below this many points counts as a tap, not a drag.
const TAP_SLOP = 6
const clamp = (f: number): number => Math.min(MAX_FRACTION, Math.max(MIN_FRACTION, f))

/** Grip bar under the Route map: drag it to resize the map, or tap it to step through the sizes. */
export function MapResizeHandle({ fraction, areaHeight, label, onDrag, onRelease, onTap }: MapResizeHandleProps): React.JSX.Element {
  // Latest props, read inside the PanResponder (created once).
  const latest = useRef({ fraction, areaHeight, onDrag, onRelease, onTap })
  latest.current = { fraction, areaHeight, onDrag, onRelease, onTap }
  const startFraction = useRef(fraction)

  const responder = useMemo(() => {
    const at = (dy: number): number => clamp(startFraction.current + dy / latest.current.areaHeight)
    const finish = (dy: number): void => {
      if (Math.abs(dy) < TAP_SLOP) latest.current.onTap()
      else latest.current.onRelease(at(dy))
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture away from the tab pager and the Stop list.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startFraction.current = latest.current.fraction
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dy) >= TAP_SLOP) latest.current.onDrag(at(g.dy))
      },
      onPanResponderRelease: (_e, g) => finish(g.dy),
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
      accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={() => onTap()}
    >
      <View style={styles.grip} />
    </View>
  )
}

const styles = StyleSheet.create({
  handle: {
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
  },
  grip: {
    width: 64,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.outline,
  },
})
