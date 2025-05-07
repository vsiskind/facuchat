import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome1">
      <Stack.Screen name="index" /> {/* School selection, will be navigated to */}
      <Stack.Screen name="welcome1" />
      <Stack.Screen name="welcome2" />
      <Stack.Screen name="welcome3" />
      <Stack.Screen name="welcome4" />
      <Stack.Screen name="welcome5" />
    </Stack>
  );
}
