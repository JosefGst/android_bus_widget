import { Ionicons } from '@expo/vector-icons'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { withLayoutContext } from 'expo-router'
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LanguageButton } from '../components/LanguageButton'
import { LanguageProvider, useLanguage } from '../components/language_context'

const MaterialTopTabs = createMaterialTopTabNavigator()
const Tabs = withLayoutContext(MaterialTopTabs.Navigator)

export default function TabLayout() {
  return (
    <LanguageProvider>
      <LocalizedTabs />
    </LanguageProvider>
  )
}

function LocalizedTabs() {
  const { strings } = useLanguage()
  const insets = useSafeAreaInsets()
  // On Android, add bottom padding to avoid overlap with OS navigation bar
  const androidNavBarPadding = Platform.OS === 'android' ? 0 : 0
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1, paddingBottom: androidNavBarPadding }}>
        <Tabs
          tabBarPosition="bottom"
          // Back returns to the previous tab (e.g. My Favorites → Routes Stop → back).
          backBehavior="history"
          screenOptions={{
            // Tabs switch by tapping only: swiping would fight panning the Route map.
            swipeEnabled: false,
            animationEnabled: true,
            tabBarIndicatorStyle: { height: 0 },
            tabBarActiveTintColor: '#0a84ff',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarStyle: {
              borderTopWidth: 0.5,
              borderTopColor: '#d1d1d6',
              backgroundColor: '#fff',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: strings.tabHome,
              tabBarIcon: ({ color }: { color: string }) => (
                <Ionicons name="home" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="routes_stop"
            options={{
              title: strings.tabRoutesStop,
              tabBarIcon: ({ color }: { color: string }) => (
                <Ionicons name="bus" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="my_favorites"
            options={{
              title: strings.tabFavorites,
              tabBarIcon: ({ color }: { color: string }) => (
                <Ionicons name="heart" color={color} size={22} />
              ),
            }}
          />
        </Tabs>
        {/* Over every tab, top right, so the language is one tap away anywhere. */}
        <View style={[styles.languageButton, { top: insets.top + 4 }]}>
          <LanguageButton />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  languageButton: { position: 'absolute', right: 12 },
})
