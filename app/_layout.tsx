import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
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
        name="my_routes"
        options={{
          title: 'My Routes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bus" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
