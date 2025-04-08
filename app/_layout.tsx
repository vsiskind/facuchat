import React, { useEffect, useState } from 'react';
import { Slot, Stack, SplashScreen, useRouter } from 'expo-router'; // Import useRouter
import { StatusBar } from 'expo-status-bar';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native'; // Import TouchableWithoutFeedback and Keyboard
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

// Keep the splash screen visible until we are ready to render the first screen.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter(); // Initialize router
  const { session, loading: authLoading } = useSupabaseAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        setHasCompletedOnboarding(value === 'true');
      } catch (e) {
        console.error('Failed to load onboarding status', e);
        setHasCompletedOnboarding(false); // Default to needing onboarding on error
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboardingStatus();

    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);

  useEffect(() => {
    // Hide splash screen once all checks are done
    if (authLoading === false && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, onboardingChecked]);

  // Add effect for handling navigation based on auth/onboarding state
  useEffect(() => {
    // Wait until loading is complete and router is ready
    if (authLoading || !onboardingChecked || !router) {
      return;
    }

    const needsOnboarding = hasCompletedOnboarding === false;

    // Determine the target route
    let targetRoute: string;
    if (!session) {
      targetRoute = '/auth';
    } else if (!session.user?.email_confirmed_at) {
      // Redirect to verify screen if email not confirmed
      // Ensure email is passed as param if possible
      targetRoute = `/auth/verify?email=${session.user.email || ''}`; 
    } else if (needsOnboarding) {
      targetRoute = '/(onboarding)';
    } else {
      targetRoute = '/(tabs)';
    }

    // Use replace to navigate, preventing back navigation to previous state
    console.log(`Navigating to: ${targetRoute}`);
    // Cast targetRoute to any to satisfy typed routes
    router.replace(targetRoute as any); 

  }, [router, session, authLoading, onboardingChecked, hasCompletedOnboarding]);


  // Check for Supabase environment variables
  const missingEnvVars = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Show loading state while auth and onboarding status are being checked
  // OR while navigation effect is determining the route
  if (authLoading || !onboardingChecked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  // If environment variables are missing, show setup screen
  if (missingEnvVars) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Setup Required</Text>
          <Text style={styles.message}>
            Please connect your Supabase project by clicking the "Connect to Supabase" button in the top right.
          </Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  // Render the stack navigator. Navigation is handled by the useEffect hook.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Wrap the Stack with TouchableWithoutFeedback */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="(onboarding)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(tabs)"
        />
        <Stack.Screen
          name="auth" // Includes /auth and /auth/verify
          options={{ 
            headerShown: false,
            gestureEnabled: false // Disable gesture for the entire auth stack group
          }} 
        />
          <Stack.Screen name="+not-found" />
        </Stack>
      </TouchableWithoutFeedback>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F6F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
