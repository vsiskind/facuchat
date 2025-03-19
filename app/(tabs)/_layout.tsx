import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          ...Platform.select({
            ios: {
              height: 88,
              paddingBottom: 30,
              paddingTop: 10,
            },
            android: {
              height: 64,
              paddingBottom: 12,
              paddingTop: 8,
            },
            web: {
              height: 64,
              paddingBottom: 12,
              paddingTop: 8,
            },
          }),
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.1)',
        },
        tabBarActiveTintColor: ACCENT_COLOR,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
          ...Platform.select({
            ios: {
              paddingBottom: 0,
            },
          }),
        },
        tabBarIconStyle: {
          ...Platform.select({
            ios: {
              marginBottom: -4,
            },
          }),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ size, color }) => (
            <AppIcon name="home" size={size} color={color} outline={true} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ size, color }) => (
            <AppIcon name="add-circle" size={size + 8} color={color} outline={true} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ size, color }) => (
            <AppIcon name="person" size={size} color={color} outline={true} />
          ),
        }}
      />
    </Tabs>
  );
}