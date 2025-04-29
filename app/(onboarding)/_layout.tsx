import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Define welcome as the initial route for this stack */}
      <Stack.Screen name="welcome" />
      {/* The index screen (school selection) is implicitly included */}
      {/* Add other onboarding screens here if needed in the future */}
    </Stack>
  );
}
