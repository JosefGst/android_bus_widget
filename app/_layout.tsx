import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
      name="index"
      options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => (
        <Ionicons name="home" color={color} size={size} />
        ),
      }}
      />
      <Tabs.Screen
      name="routes_stop"
      options={{
        title: 'Routes Stop',
        tabBarIcon: ({ color, size }) => (
        <Ionicons name="bus" color={color} size={size} />
        ),
      }}
      />
      <Tabs.Screen
      name="my_favorites"
      options={{
        title: 'My Favorites',
        tabBarIcon: ({ color, size }) => (
        <Ionicons name="heart" color={color} size={size} />
        ),
      }}
      />
    </Tabs>
  );
}
