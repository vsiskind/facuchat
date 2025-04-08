import React, { useState, useCallback } from 'react'; // Removed useRef, Added useCallback
import { View, Text, Pressable, StyleSheet } from 'react-native'; // Removed Platform
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SchoolPicker, SchoolOption } from '@/components/SchoolPicker'; // Import the new SchoolPicker and its type

// Define school options (initially just one) - Use SchoolOption type
const schoolOptions: SchoolOption[] = [
  { label: 'Universidad Torcuato Di Tella', value: 'utdt' },
  // Add more schools here in the future
];

export default function WelcomeScreen() {
  const router = useRouter();
  // Set initial state to null to match SchoolPicker expectation
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // Reset selected school when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset the state to null
      setSelectedSchool(null);
      // Return a cleanup function if needed, but not necessary here
      return () => {}; 
    }, []) // Empty dependency array ensures this runs only on focus/blur, not state change
  );

  const handleSignUp = async () => {
    if (!selectedSchool) {
      // Optionally show an error if no school is selected
      console.error('No school selected');
      return;
    }
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      // Pass selected school as a query parameter to the sign-up page
      router.push({ pathname: '/auth/sign-up', params: { school: selectedSchool } });
    } catch (error) {
      console.error('Failed to save onboarding status or navigate:', error);
      // Handle error
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Campus Connect!</Text>
      <Text style={styles.subtitle}>Select your school to get started:</Text>

      {/* Use the new SchoolPicker component */}
      <SchoolPicker
        options={schoolOptions}
        selectedSchool={selectedSchool}
        onSelect={setSelectedSchool}
        placeholder="Select your university..." // Optional: customize placeholder
      />

      <Pressable
        style={[styles.button, !selectedSchool && styles.buttonDisabled]} // Logic remains the same
        onPress={handleSignUp} // Updated onPress handler
        disabled={!selectedSchool} // Disable button if no school selected
      >
        <Text style={styles.buttonText}>Sign Up</Text> {/* Updated button text */}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F6F8FA', // Match root layout background
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 30,
    textAlign: 'center',
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '100%',
  },
  schoolLabel: {
    fontSize: 16,
    color: '#333333',
    marginRight: 10,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  infoText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#7C3AED', // Primary color
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB', // Style for disabled button
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// Removed pickerSelectStyles StyleSheet
