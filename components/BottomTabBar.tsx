import { MaterialIcons } from '@expo/vector-icons'
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { selectedTab, TAB_ROUTES, TabRoute } from '../utils/tabs'
import { useLanguage } from './language_context'
import { COLORS, FONT_SIZES, FONTS } from './theme'

const ICONS: Record<TabRoute, React.ComponentProps<typeof MaterialIcons>['name']> = {
  index: 'star',
  find_route: 'search',
}

/** Two large labelled tabs. Pages that are not tabs (Routes Stop) keep the tab they were opened from highlighted. */
export function BottomTabBar({ state, navigation }: MaterialTopTabBarProps): React.JSX.Element {
  const { strings } = useLanguage()
  const labels: Record<TabRoute, string> = { index: strings.myBuses, find_route: strings.findARoute }
  const visited = state.history.flatMap(entry => {
    const route = state.routes.find(r => r.key === entry.key)
    return route ? [route.name] : []
  })
  const selected = selectedTab([...visited, state.routes[state.index].name])

  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TAB_ROUTES.map(name => {
        const isSelected = name === selected
        const color = isSelected ? COLORS.accent : COLORS.inkMuted
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            aria-selected={isSelected}
            testID={`tab-${name}`}
            onPress={() => navigation.navigate(name)}
            style={({ pressed }) => [styles.tab, isSelected && styles.tabSelected, pressed && styles.pressed]}
          >
            <MaterialIcons name={ICONS[name]} size={28} color={color} />
            <Text style={[styles.label, { color }]}>{labels[name]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  tab: {
    flex: 1,
    minHeight: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabSelected: { backgroundColor: COLORS.accentSoft },
  label: { fontSize: FONT_SIZES.label + 2, fontFamily: FONTS.bold, fontWeight: '700' },
  pressed: { opacity: 0.6 },
})
