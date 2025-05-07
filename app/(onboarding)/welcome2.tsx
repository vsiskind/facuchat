import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/global.styles'; // Import the new global styles

// Removed local screenStyles definition

export default function Welcome2Screen() {
  const router = useRouter();

  const handleNext = () => {
    router.push('/(onboarding)/welcome3');
  };

  return (
    <SafeAreaView style={globalStyles.welcome2Container}>
      <View style={globalStyles.welcome2TextContent}>
        <Text style={globalStyles.welcome2Title}>Share thoughts{'\n'}and ask questions</Text>
      </View>
      
      <Image 
        source={require('../../assets/images/onboarding/welcome-2.png')} 
        style={globalStyles.welcome2Illustration} 
      />

      <View style={globalStyles.welcome2ProgressContainer}>
        <View style={globalStyles.welcome2Dot} />
        <View style={[globalStyles.welcome2Dot, globalStyles.welcome2ActiveDot]} />
        <View style={globalStyles.welcome2Dot} />
        <View style={globalStyles.welcome2Dot} />
      </View>

      <Pressable style={globalStyles.welcome2Button} onPress={handleNext}>
        <Text style={globalStyles.welcome2ButtonText}>Next</Text>
      </Pressable>
    </SafeAreaView>
  );
}
