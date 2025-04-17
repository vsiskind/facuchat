import React, { useEffect, useState, createContext, useContext, useMemo } from 'react'; // Added createContext, useContext, useMemo
import { Slot, Stack, SplashScreen, useRouter, useSegments } from 'expo-router'; // Import useSegments
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

// --- Onboarding Context ---
interface OnboardingContextType {
  hasCompletedOnboarding: boolean | null;
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
// --- End Onboarding Context ---

// Keep the splash screen visible until we are ready to render the first screen.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() { // Renamed component to RootLayoutNav
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: authLoading } = useSupabaseAuth();
  const { hasCompletedOnboarding } = useOnboarding(); // Use context state
  const onboardingChecked = hasCompletedOnboarding !== null; // Determine if checked based on context state

  // Effect to hide splash screen remains similar, depends on auth and onboarding check
  useEffect(() => {
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

    // Ensure segments are available (basic check)
    if (!segments) {
      return; 
    }

    const needsOnboarding = hasCompletedOnboarding === false; // Use context state here
    // Determine the target route
    let targetRoute: string;
    if (!session) {
      targetRoute = '/auth';
    } else if (!session.user?.email_confirmed_at) {
      // Redirect to verify screen if email not confirmed
      // Ensure email is passed as param if possible
      targetRoute = `/auth/verify?email=${session.user.email || ''}`; 
    } else if (needsOnboarding) {
      targetRoute = '/(onboarding)/welcome'; // Direct to the new welcome screen
    } else {
      targetRoute = '/(tabs)';
    }

    // Cast currentGroup to string to potentially bypass strict type checking issues
    const currentGroup = segments[0] as string; 

    // Redirect logic based on auth state and current location
    // Allow navigation to onboarding even without session
    if (!session && currentGroup !== 'auth' && currentGroup !== '(onboarding)') { 
      router.replace(targetRoute as any);
    } else if (session && !session.user?.email_confirmed_at && currentGroup !== 'auth') {
      // Redirect to verify if email not confirmed and not already in auth group
      router.replace(targetRoute as any);
    } else if (session && session.user?.email_confirmed_at && needsOnboarding && currentGroup !== '(onboarding)') {
      // Redirect to onboarding if needed and not already there
      router.replace(targetRoute as any);
    } else if (session && session.user?.email_confirmed_at && !needsOnboarding && currentGroup !== '(tabs)' && currentGroup !== 'settings' && segments[1] !== 'sign-up') { // Add check to prevent redirect from sign-up page during pre-check
      // Redirect to main app tabs if authenticated, onboarded, and not already in tabs or settings AND NOT on sign-up page
      router.replace(targetRoute as any);
    }
    // Dependency array now uses context state
  }, [router, segments, session, authLoading, onboardingChecked, hasCompletedOnboarding]);


  // Check for Supabase environment variables
  const missingEnvVars = !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Show loading state while auth is loading OR onboarding status is null (not yet checked)
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
          name="(tabs)"
          options={{ gestureEnabled: false }} // Disable swipe back from tabs
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

// --- Onboarding Provider Component ---
function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  // Load initial status from AsyncStorage
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        setHasCompletedOnboarding(value === 'true');
      } catch (e) {
        console.error('Failed to load onboarding status', e);
        setHasCompletedOnboarding(false); // Default to needing onboarding on error
      }
    };
    checkOnboardingStatus();
  }, []);

  // Function to mark onboarding as complete
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true); // Update state immediately
    } catch (error) {
      console.error('Failed to save onboarding status', error);
      // Handle error appropriately
    }
  };

  // Memoize context value
  const contextValue = useMemo(() => ({
    hasCompletedOnboarding,
    completeOnboarding,
  }), [hasCompletedOnboarding]);

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
// --- End Onboarding Provider ---

// --- Main Export ---
export default function RootLayout() {
  useFrameworkReady(); // Keep framework ready hook here

  // Initialize framework ready listener if on web
  useEffect(() => {
    if (typeof window !== 'undefined' && window.frameworkReady) {
      window.frameworkReady();
    }
  }, []);


  return (
    <OnboardingProvider>
      <RootLayoutNav />
    </OnboardingProvider>
  );
}
// --- End Main Export ---


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
