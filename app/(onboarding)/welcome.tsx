import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
// Removed AsyncStorage import
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon'; // Assuming AppIcon is reusable
import { useOnboarding } from '@/app/_layout'; // Import the context hook

const ACCENT_COLOR = '#7C3AED'; // Use consistent accent color

export default function WelcomeOnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding(); // Get the function from context

  const handleGetStarted = async () => {
    try {
      await completeOnboarding(); // Call the context function
      router.replace('/(tabs)'); // Navigate to the main tab navigator
    } catch (error) {
      console.error('Failed to complete onboarding or navigate:', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <AppIcon name="chatbubble-ellipses" size={64} color={ACCENT_COLOR} outline={false} />
        </View>
        <Text style={styles.title}>Welcome to FacuChat!</Text>
        <Text style={styles.description}>
          Share thoughts, ask questions, and connect anonymously with your university community. Your identity is always protected.
        </Text>
        <Pressable style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FA', // Match background
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#EDE9FE', // Light purple background for icon
    borderRadius: 50, // Make it circular
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17, // Slightly larger for readability
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24, // Improve line spacing
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 12, // Consistent border radius
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
