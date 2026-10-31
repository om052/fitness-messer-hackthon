import { Tabs } from 'expo-router';
import { colors } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';

/**
 * Tabs layout
 *
 * Single source of truth for the five main screens. Every screen listed here
 * must have exactly one matching file inside `app/(tabs)/`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: colors.bg.dark }}
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.accent.cyan,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.bg.darker,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.bg.darker,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
          headerTitle: '🏰 Fitness Messer',
        }}
      />

      <Tabs.Screen
        name="exercise"
        options={{
          title: 'Exercise',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'fitness' : 'fitness-outline'} size={24} color={color} />
          ),
          headerTitle: '💪 Log Exercise',
        }}
      />

      <Tabs.Screen
        name="empire"
        options={{
          title: 'Empire',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield' : 'shield-outline'} size={24} color={color} />
          ),
          headerTitle: '⚔️ Your Empire',
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
          headerTitle: '🗺️ Map',
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
          headerTitle: '👤 Profile',
        }}
      />
    </Tabs>
  );
}
