import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/global.styles'; // Import the new global styles

// Removed local screenStyles definition

export default function Welcome5Screen() {
  const router = useRouter();

  const handleCreateAccount = () => {
    // Navigate to the school selection screen which is the current (onboarding)/index.tsx
    // This will likely be refactored to a specific named route like '/(onboarding)/school-select' later
    router.push('/(onboarding)'); 
  };

  const handleLogin = () => {
    router.push('/auth/sign-in');
  };

  return (
    <SafeAreaView style={globalStyles.welcome5Container}>
      <View style={globalStyles.welcome5TextContent}>
        <Text style={globalStyles.welcome5Title}>Let’s get started!</Text>
      </View>
      
      <Image 
        source={require('../../assets/images/onboarding/welcome-5.png')} 
        style={globalStyles.welcome5Illustration} 
      />

      <View style={globalStyles.welcome5ButtonContainer}>
        <Pressable style={globalStyles.welcome5Button} onPress={handleCreateAccount}>
          <Text style={globalStyles.welcome5ButtonText}>Create account</Text>
        </Pressable>
        <Pressable 
          style={[globalStyles.welcome5Button, globalStyles.welcome5LoginButton]} 
          onPress={handleLogin}
        >
          <Text 
            style={[globalStyles.welcome5ButtonText, globalStyles.welcome5LoginButtonText]}
          >
            Log in
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
