import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { COLORS, FONT_SIZES } from './theme'

interface RouteBadgeProps {
  route: string
}

/** The Route code on a dark tile, the way it reads on the front of the bus. */
export function RouteBadge({ route }: RouteBadgeProps): React.JSX.Element {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{route}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 76,
    height: 52,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: COLORS.onAccent, fontSize: FONT_SIZES.badge, fontWeight: '700' },
})
