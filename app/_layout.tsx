import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold, useFonts } from '@expo-google-fonts/atkinson-hyperlegible'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { withLayoutContext } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomTabBar } from '../components/BottomTabBar'
import { LANGUAGE_BUTTON_TOP, LanguageButton } from '../components/LanguageButton'
import { LanguageProvider, useLanguage } from '../components/language_context'
import { COLORS } from '../components/theme'

const MaterialTopTabs = createMaterialTopTabNavigator()
const Tabs = withLayoutContext(MaterialTopTabs.Navigator)

export default function TabLayout(): React.JSX.Element {
  // Not awaited: until the font arrives, text shows in the system font rather than a blank screen.
  useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold })
  return (
    <LanguageProvider>
      <LocalizedTabs />
    </LanguageProvider>
  )
}

function LocalizedTabs(): React.JSX.Element {
  const { strings } = useLanguage()
  const insets = useSafeAreaInsets()
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Tabs
          tabBarPosition="bottom"
          tabBar={props => <BottomTabBar {...props} />}
          // Back returns to the screen before (e.g. Find a Route → Routes Stop → back).
          backBehavior="history"
          screenOptions={{
            // Tabs switch by tapping only: swiping would fight panning the Route map.
            swipeEnabled: false,
            animationEnabled: true,
          }}
        >
          <Tabs.Screen name="index" options={{ title: strings.myBuses }} />
          <Tabs.Screen name="find_route" options={{ title: strings.findARoute }} />
          {/* Not in the tab bar: opened as a page from either tab. */}
          <Tabs.Screen name="routes_stop" options={{ title: strings.routeHeaderEmpty }} />
        </Tabs>
        {/* Over every screen, top right, so the language is one tap away anywhere. */}
        <View style={[styles.languageButton, { top: insets.top + LANGUAGE_BUTTON_TOP }]}>
          <LanguageButton />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  content: { flex: 1 },
  languageButton: { position: 'absolute', right: 12 },
})
