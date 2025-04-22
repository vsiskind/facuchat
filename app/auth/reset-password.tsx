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
import { router, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false); // Single state for both fields
  const [isVerifying, setIsVerifying] = useState(false); // State for code exchange

  // We need to capture the code from the URL params to exchange for a session
  const params = useGlobalSearchParams(); // Use global search params for deep links

  useEffect(() => {
    const code = params.code as string | undefined;

    if (code) {
      const exchangeCode = async () => {
        setIsVerifying(true);
        setError(null);
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Handle specific errors like invalid code or expired link
            if (exchangeError.message.includes("invalid") || exchangeError.message.includes("expired")) {
               setError("The password reset link is invalid or has expired. Please request a new one.");
            } else {
               throw exchangeError; // Rethrow other errors
            }
            console.error("Code Exchange Error:", exchangeError);
          } else {
            // Session established successfully, user can now update password
            console.log("Session established via code exchange.");
          }
        } catch (err: any) {
          setError(err.message || 'Failed to verify password reset link.');
          console.error("Code Exchange Exception:", err);
        } finally {
          setIsVerifying(false);
        }
      };
      exchangeCode();
    } else {
       // Optional: Check if there's already a session? Usually not needed for reset flow.
       // If no code, maybe show a message? Or rely on updateUser error.
       console.log("No code found in params for password reset.");
    }
  }, [params.code]); // Re-run if the code param changes


  // Note: Supabase requires exchanging the code from the reset link for a session
  // before updateUser can be called successfully.
  // The useGlobalSearchParams is used to get params from deep links.
  const handlePasswordReset = async () => {
    setError(null);

    // Prevent update if code exchange is happening or failed implicitly
    if (isVerifying) {
        setError("Verifying reset link...");
        return;
    }
    // Consider adding a check here if session is truly established if needed,
    // but updateUser error handling should catch session issues.

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
         // Sign out the user *before* showing the alert and navigating
         // This ensures the session is cleared, preventing immediate redirection back into the app
         const { error: signOutError } = await supabase.auth.signOut();
         if (signOutError) {
           console.error("Error signing out after password reset:", signOutError);
           // Optionally show a different message or handle the error
           // For now, we'll proceed to the alert anyway
         }

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
              secureTextEntry={!showPasswords} // Use single state
              placeholderTextColor="#999"
              editable={!isLoading && !isVerifying} // Disable while verifying code
            />
             <Pressable
              onPress={() => setShowPasswords(!showPasswords)} // Toggle single state
              style={styles.eyeIcon}
            >
              <AppIcon
                name={showPasswords ? "eye-off" : "eye"} // Use single state
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
              secureTextEntry={!showPasswords} // Use single state
              placeholderTextColor="#999"
              editable={!isLoading && !isVerifying} // Disable while verifying code
            />
            {/* Remove the second eye icon Pressable */}
          </View>

          <Pressable
            style={[styles.button, (isLoading || isVerifying) && styles.buttonDisabled]}
            onPress={handlePasswordReset}
            disabled={isLoading || isVerifying} // Disable while loading or verifying
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isVerifying ? (
               <ActivityIndicator color="#FFFFFF" /> // Show indicator during code exchange too
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
