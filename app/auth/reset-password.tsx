import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Note: Supabase handles the session automatically when the user arrives
  // via the password reset link. We don't need to explicitly handle tokens here.
  // The useLocalSearchParams might be useful if the link included extra params,
  // but for Supabase's default flow, it's usually not needed for the reset itself.
  // const { access_token, refresh_token, expires_in, token_type, type } = useLocalSearchParams();

  // useEffect(() => {
  //   // You could potentially use params here if needed for analytics or specific flows
  //   console.log("Reset Password Params:", useLocalSearchParams());
  // }, []);

  const handlePasswordReset = async () => {
    setError(null);

    if (!password) {
      setError('New password is required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    // Add password strength validation if desired

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        // Handle specific errors, e.g., weak password if checks are enabled
        if (updateError.message.includes("Password should be at least 6 characters")) {
           setError("Password should be at least 6 characters long.");
        } else {
           throw updateError;
        }
      } else {
        // Password updated successfully
        Alert.alert(
          'Password Updated',
          'Your password has been successfully reset. Please sign in again.',
          [{ text: 'OK', onPress: () => router.replace('/auth/sign-in') }] // Navigate to sign-in
        );
        // Clear fields
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. The link may have expired or been used already.');
      console.error("Password Update Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>

          {error && (
            <View style={styles.messageContainerError}>
              <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
              <Text style={styles.messageTextError}>{error}</Text>
            </View>
          )}

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <AppIcon name="key" size={20} color="#666" outline={true} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="New Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
              editable={!isLoading}
            />
             <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <AppIcon
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#666"
                outline={true}
              />
            </Pressable>
          </View>

          {/* Confirm New Password Input */}
          <View style={styles.inputContainer}>
             <AppIcon name="key" size={20} color="#666" outline={true} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setError(null);
              }}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor="#999"
              editable={!isLoading}
            />
             <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <AppIcon
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color="#666"
                outline={true}
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePasswordReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reusing styles similar to ForgotPassword/SignIn
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
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
   passwordInput: {
    paddingRight: 40, // Space for the eye icon
  },
  eyeIcon: {
    padding: 8,
    position: 'absolute',
    right: 4,
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
});
