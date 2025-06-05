import React, { useEffect, useState, createContext, useContext, useMemo, useRef } from 'react'; // Added useRef
import { Slot, Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native'; // Import Platform
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { Subscription } from 'expo-notifications'; // Import Subscription type

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
  // Destructure completeOnboarding from the context hook
  const { hasCompletedOnboarding, completeOnboarding } = useOnboarding(); 
  const onboardingChecked = hasCompletedOnboarding !== null;
  const notificationListener = useRef<Subscription>();
  const responseListener = useRef<Subscription>();

  // --- Push Notification Setup ---

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        // Consider alerting the user that they won't receive notifications
        console.log('Failed to get push token for push notification!');
        // alert('Failed to get push token for push notification!');
        return;
      }
      // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      // Note: Need to ensure EAS projectId is set in app.json -> extra -> eas -> projectId
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
        console.log('Expo Push Token:', token);
      } catch (e) {
        console.error("Error getting push token:", e);
        // alert(`Error getting push token: ${e}`);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
      // alert('Must use physical device for Push Notifications');
    }

    return token;
  }

  useEffect(() => {
    if (session?.user) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          // Get current token from profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = No rows found
             console.error('Error fetching profile for push token:', profileError);
             return;
          }

          // Update token if it's missing or different
          if (!profileData?.push_token || profileData.push_token !== token) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ push_token: token })
              .eq('id', session.user.id);

            if (updateError) {
              console.error('Error updating push token:', updateError);
            }
          }
        }
      });

      // This listener is fired whenever a notification is received while the app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification Received:', notification);
        // You could potentially update a badge count here or show an in-app banner
      });

      // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification Response Received:', response);
        const { notificationId, type, postId, commentId } = response.notification.request.content.data as any;
        // Navigate to the relevant content based on the data
        // Example: if (type === 'reply_to_comment' && postId) router.push(`/posts/${postId}?highlightComment=${commentId}`);
        // Add your navigation logic here
      });

      // Cleanup listeners on unmount
      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [session]); // Re-run when session changes

  // --- End Push Notification Setup ---


  // Effect to hide splash screen
  useEffect(() => {
    if (authLoading === false && onboardingChecked) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, onboardingChecked]);

  // Add effect for handling navigation based on auth/onboarding state
  useEffect(() => {
    // Wait until loading is complete and router is ready
    if (authLoading || !onboardingChecked) { // Removed !router check as it might not be needed here
      return;
    }

    // Ensure segments are available (basic check)
    if (!segments) {
      return; 
    }

    const needsOnboarding = hasCompletedOnboarding === false; // Use context state here
    const isAuthGroup = segments[0] === 'auth';
    const isOnboardingGroup = segments[0] === '(onboarding)';
    const isTabsGroup = segments[0] === '(tabs)';
    const isSettingsGroup = segments[0] === 'settings';
    const isOnResetPasswordScreen = isAuthGroup && segments.length > 1 && segments[1] === 'reset-password';

    // --- New Redirect Logic ---
    // Priority 1: Onboarding Flow
    if (needsOnboarding) {
      // If user needs onboarding and isn't already in the onboarding or auth flow, start it.
      if (!isOnboardingGroup && !isAuthGroup) {
        router.replace('/(onboarding)/welcome');
        return;
      }
      // If user is authenticated & verified BUT still marked as needing onboarding,
      // it means they just completed the auth part of onboarding.
      // Mark onboarding complete and redirect to the main app.
      if (session && session.user?.email_confirmed_at) {
        completeOnboarding().then(() => {
          router.replace('/(tabs)');
        });
        return; // Prevent further checks after initiating async completion/redirect
      }
      // Otherwise, let them proceed through the onboarding/auth screens they are currently on.
      return;
    }

    // Priority 2: Post-Onboarding Authentication & Main App Access
    if (!needsOnboarding) {
      // If not authenticated and not in auth or onboarding group, go to auth.
      // Allows navigating to onboarding (e.g., school select for sign-up) even if logged out.
      if (!session && !isAuthGroup && !isOnboardingGroup) {
        router.replace('/auth');
        return;
      }
      // If authenticated but email not verified, and not in auth group, go to verify.
      if (session && !session.user?.email_confirmed_at && !isAuthGroup) {
        router.replace(`/auth/verify?email=${session.user.email || ''}`);
        return;
      }
      // If authenticated, verified, and onboarded, but not in tabs/settings (and not resetting password), go to tabs.
      if (session && session.user?.email_confirmed_at && !isTabsGroup && !isSettingsGroup && !isOnResetPasswordScreen) {
        router.replace('/(tabs)');
        return;
      }
    }
    // --- End New Redirect Logic ---

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
      {/* Wrap the Stack with TouchableWithoutFeedback and add a View in between */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
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
            {/* Add the onboarding stack */}
            <Stack.Screen name="(onboarding)" /> 
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
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