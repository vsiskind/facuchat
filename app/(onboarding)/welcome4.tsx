import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/global.styles'; // Import the new global styles

// Removed local screenStyles definition

export default function Welcome4Screen() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/(onboarding)/welcome5');
  };

  return (
    <SafeAreaView style={globalStyles.welcome4Container}>
      <View style={globalStyles.welcome4TextContent}>
        <Text style={globalStyles.welcome4Title}>Your identity and{'\n'}data are protected</Text>
      </View>
      
      <Image 
        source={require('../../assets/images/onboarding/welcome-4.png')} 
        style={globalStyles.welcome4Illustration} 
      />

      <View style={globalStyles.welcome4ProgressContainer}>
        <View style={globalStyles.welcome4Dot} />
        <View style={globalStyles.welcome4Dot} />
        <View style={globalStyles.welcome4Dot} />
        <View style={[globalStyles.welcome4Dot, globalStyles.welcome4ActiveDot]} />
      </View>

      <Pressable style={globalStyles.welcome4Button} onPress={handleNext}>
        <Text style={globalStyles.welcome4ButtonText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}
