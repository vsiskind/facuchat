import React, { useState } from 'react'; // Added React import
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';

export default function ChangeEmailScreen() {
  const [currentPassword, setCurrentPassword] = useState(''); // Changed from currentEmail
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false); // Added for password visibility
  const { validateEmailDomain } = useSupabaseAuth();

  const handleChangeEmail = async () => {
    setEmailError(null);
    setEmailSuccess(null);

    if (!currentPassword || !newEmail || !confirmNewEmail) { // Changed from currentEmail
      setEmailError("Please fill in all fields.");
      return;
    }

    if (newEmail !== confirmNewEmail) {
      setEmailError("New emails do not match.");
      return;
    }

    // Validate the email domain
    if (!validateEmailDomain(newEmail, 'utdt')) { // Added 'utdt' school argument
      setEmailError("Only @mail.utdt.edu email addresses are allowed.");
      return;
    }

    setIsChangingEmail(true);
    try {
      // --- Verification Step ---
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user || !user.email) {
        setEmailError("Could not retrieve user information. Please try again.");
        setIsChangingEmail(false);
        return;
      }

      // Attempt to sign in with the current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword, // Use the entered password
      });

      // Handle verification result (similar to change-password)
      if (signInError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed'))) {
         if (signInError.message.includes('Invalid login credentials')) {
            setEmailError("Incorrect current password.");
            setIsChangingEmail(false);
            return;
         }
         // Allow 'Email not confirmed' to proceed
      } else if (signInError) {
         console.warn("Unexpected error during password verification sign-in:", signInError.message);
         // Optionally stop here for unexpected errors
         // setEmailError("An unexpected error occurred during verification.");
         // setIsChangingEmail(false);
         // return;
      }
      // --- End Verification Step ---

      // If verification passed, update the email
      const { data, error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        setEmailError(updateError.message || "Failed to change email.");
      } else {
        setEmailSuccess("Email change initiated! Please verify your new email.");
        setCurrentPassword(''); // Clear password field
        setNewEmail('');
        setConfirmNewEmail('');

        // After a successful email change, show the success message for a few seconds
        // then redirect to the verification screen
        setTimeout(() => {
          router.replace({
            pathname: '/auth/verify',
            params: { email: newEmail } // Pass the new email for verification screen
          });
          // Keep success message until navigation
        }, 2000);
      }
    } catch (err: any) {
      setEmailError(err.message || "An unexpected error occurred.");
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <AppIcon name="arrow-back" size={24} color="#FFFFFF" outline={true} />
          </Pressable>
          <Text style={styles.title}>Change Email</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emailChangeCard}>
            {emailError && (
              <View style={styles.errorContainer}>
                <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            )}

            {emailSuccess && (
              <View style={styles.successContainer}>
                <AppIcon name="checkmark" size={20} color="#10B981" outline={false} /> 
                <Text style={styles.successText}>{emailSuccess}</Text>
              </View>
            )}

            <Text style={styles.emailFormTitle}>Update Your Email</Text>
            <Text style={styles.emailFormSubtitle}>Enter your current password and choose a new email address with the @mail.utdt.edu domain.</Text>

            {/* Current Password Input */}
            <View style={styles.inputContainer}>
              <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
              <TextInput
                style={[styles.input, styles.passwordInput]} // Use password specific styles
                placeholder="Current Password"
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor="#999"
                autoCapitalize="none" // Keep this
              />
              <Pressable
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                <AppIcon
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                  outline={true}
                />
              </Pressable>
            </View>

            {/* New Email Input */}
            <TextInput
              style={styles.inputField} // Use a generic input field style
              placeholder="New Email (@mail.utdt.edu)"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Confirm New Email Input */}
            <TextInput
              style={styles.inputField} // Use a generic input field style
              placeholder="Confirm New Email" // Corrected placeholder
              value={confirmNewEmail} // Corrected value
              onChangeText={setConfirmNewEmail} // Corrected handler
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Pressable
              style={[
                styles.button,
                isChangingEmail && styles.buttonDisabled,
              ]}
              onPress={handleChangeEmail}
              disabled={isChangingEmail}
            >
              {isChangingEmail ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Change Email</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  header: {
    padding: 16,
    paddingTop: 60, // Use platform-aware padding
    backgroundColor: HEADER_BG_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emailChangeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emailFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailFormSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#10B981',
    marginLeft: 8,
    flex: 1,
  },
  // Added from change-password for password input structure
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FA', // Match background
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: { // Style for the TextInput within the container
    flex: 1,
    paddingVertical: 16, // Adjusted padding
    paddingHorizontal: 8, // Added horizontal padding
    fontSize: 16,
    color: '#1A1A1A',
  },
  passwordInput: { // Specific style for password input to make space for icon
    paddingRight: 40,
  },
  eyeIcon: { // Style for the eye icon Pressable
    padding: 8,
    position: 'absolute',
    right: 4,
  },
  // Renamed original 'input' style to 'inputField' for non-password fields
  inputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
});
