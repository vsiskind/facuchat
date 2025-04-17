import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import React, { useEffect } from 'react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { router } from 'expo-router';

const ACCENT_COLOR = '#7C3AED';

export default function TabLayout() {
  const { session } = useSupabaseAuth();
  
  // Add verification check when tab layout is mounted
  useEffect(() => {
    // Ensure the user is authenticated and has a confirmed email
    if (session?.user && !session.user.email_confirmed_at) {
      router.replace({
        pathname: '/auth/verify',
        params: { email: session.user.email || '' }
      });
    }
  }, [session]);

  // If user isn't authenticated or email isn't verified, don't render tabs
  if (!session?.user || !session.user.email_confirmed_at) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          ...Platform.select({
            ios: {
              height: 84,
              paddingBottom: 30,
              paddingTop: 12,
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
        tabBarIconStyle: {
          ...Platform.select({
            ios: {
              marginBottom: 0,
            },
          }),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ size, color }: { size: number; color: string }) => (
            <AppIcon name="home" size={size} color={color} outline={true} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: ({ size, color }: { size: number; color: string }) => (
            <AppIcon
              name="add-circle"
              size={Platform.OS === 'ios' ? size + 6 : size + 8}
              color={color} 
              outline={true} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ size, color }: { size: number; color: string }) => (
            <AppIcon name="person" size={size} color={color} outline={true} />
          ),
        }}
      />
    </Tabs>
  );
}
