import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Import SafeAreaView and hook
import { supabase } from '../../lib/supabase'; // Assuming supabase client is exported from here
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';

export default function ForgotPassword() {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordResetRequest = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    try {
      // Use the deep link scheme we configured
      const redirectUrl = 'facuchat://auth/reset-password'; 
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage('If an account exists for this email, password reset instructions have been sent.');
      setEmail(''); // Clear email field on success
      // Optionally navigate back or show success message prominently
      // Alert.alert('Check your email', 'Password reset instructions sent.');
      // router.back(); 

    } catch (err: any) {
      setError(err.message || 'Failed to send reset instructions. Please try again.');
      console.error("Password Reset Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back button positioned absolutely using insets */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 10 }]} // Apply dynamic top position
      >
        <AppIcon name="arrow-back" size={24} color="#1A1A1A" outline={false} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* Back button removed from here */}
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email address below and we'll send you instructions to reset your password.</Text>

          {error && (
            <View style={styles.messageContainerError}>
              <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
              <Text style={styles.messageTextError}>{error}</Text>
            </View>
          )}
           {message && (
              <View style={styles.messageContainerSuccess}>
               <AppIcon name="checkmark" size={20} color="#10B981" outline={false} />
               <Text style={styles.messageTextSuccess}>{message}</Text>
             </View>
          )}

          <View style={styles.inputContainer}>
            <AppIcon name="mail" size={20} color="#666" outline={true} />
            <TextInput
              style={styles.input}
              placeholder="Your Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
                setMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
              editable={!isLoading}
            />
          </View>

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePasswordResetRequest}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Instructions</Text>
            )}
          </Pressable>
          {/* Card View ends */}
        </View>
        {/* ScrollView ends */}
      </ScrollView>
      {/* KeyboardAvoidingView ends */}
    </KeyboardAvoidingView>
    {/* SafeAreaView ends */}
    </SafeAreaView>
  );
}

// Reusing styles similar to SignIn for consistency, adjust as needed
const styles = StyleSheet.create({
  safeArea: { // Style for SafeAreaView
    flex: 1,
    backgroundColor: '#F6F8FA', // Match container background
  },
  container: {
    flex: 1,
    // backgroundColor removed, handled by safeArea
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    position: 'absolute', // Keep absolute positioning
    // top is now set dynamically using insets
    left: 16,
    padding: 8,
    zIndex: 10, // Ensure it's above other content
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
    // marginTop removed, no longer needed as button is outside the card
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainerError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageTextError: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
   messageContainerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5', // Light green background
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageTextSuccess: {
    color: '#065F46', // Darker green text
    marginLeft: 8,
    flex: 1,
  },
});
