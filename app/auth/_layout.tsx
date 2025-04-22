import React from 'react'; // Add React import
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Disable swipe back gesture on sign-in screen */}
      {/* Disable swipe back gesture on sign-in screen */}
      <Stack.Screen name="sign-in" options={{ gestureEnabled: false }} /> 
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify" />
      {/* Add forgot and reset password screens */}
      <Stack.Screen name="forgot-password" options={{ gestureEnabled: false }} />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="index" options={{ redirect: true }} />
    </Stack>
  );
}
