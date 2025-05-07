import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/global.styles'; // Import the new global styles

// StyleSheet import is still needed if there are any truly local-only styles,
// but for now, we assume all styles are moved or will be moved.
// If StyleSheet is not used, it can be removed.
// For this refactor, we remove the local screenStyles definition.

export default function Welcome1Screen() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/(onboarding)/welcome2');
  };

  return (
    <SafeAreaView style={globalStyles.welcome1Container}>
      <View style={globalStyles.welcome1TextContent}>
        <Text style={globalStyles.welcome1TitlePart1}>Welcome to</Text>
        <Text style={globalStyles.welcome1TitlePart2}>FacuChat</Text>
      </View>
      
      <Image 
        source={require('../../assets/images/onboarding/welcome-1.png')} 
        style={globalStyles.welcome1Illustration} 
      />

      <View style={globalStyles.welcome1ProgressContainer}>
        <View style={[globalStyles.welcome1Dot, globalStyles.welcome1ActiveDot]} />
        <View style={globalStyles.welcome1Dot} />
        <View style={globalStyles.welcome1Dot} />
        <View style={globalStyles.welcome1Dot} />
      </View>

      <Pressable style={globalStyles.welcome1Button} onPress={handleNext}>
        <Text style={globalStyles.welcome1ButtonText}>Next</Text>
      </Pressable>
    </SafeAreaView>
  );
}
