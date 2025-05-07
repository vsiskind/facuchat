import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/global.styles'; // Import the new global styles

// Removed local screenStyles definition

export default function Welcome3Screen() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/(onboarding)/welcome4');
  };

  return (
    <SafeAreaView style={globalStyles.welcome3Container}>
      <View style={globalStyles.welcome3TextContent}>
        <Text style={globalStyles.welcome3Title}>Connect with your{'\n'}peers anonymously</Text>
      </View>
      
      <Image 
        source={require('../../assets/images/onboarding/welcome-3.png')} 
        style={globalStyles.welcome3Illustration} 
      />

      <View style={globalStyles.welcome3ProgressContainer}>
        <View style={globalStyles.welcome3Dot} />
        <View style={globalStyles.welcome3Dot} />
        <View style={[globalStyles.welcome3Dot, globalStyles.welcome3ActiveDot]} />
        <View style={globalStyles.welcome3Dot} />
      </View>

      <Pressable style={globalStyles.welcome3Button} onPress={handleNext}>
        <Text style={globalStyles.welcome3ButtonText}>Next</Text>
      </Pressable>
    </SafeAreaView>
  );
}
