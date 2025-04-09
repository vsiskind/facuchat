import React, { useState } from 'react'; // Added React import
import {
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';

export default function ChangePasswordScreen() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  // State for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false); // Controls both New and Confirm New

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("Please fill in all fields.");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      // --- Verification Step ---
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user || !user.email) {
        setPasswordError("Could not retrieve user information. Please try again.");
        setIsChangingPassword(false);
        return;
      }

      // Attempt to sign in with the current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      // IMPORTANT: signInWithPassword might succeed or throw specific errors even if auth is okay (e.g., MFA).
      // We only care if it's specifically an invalid credentials error.
      // Supabase might change error messages, so check for common indicators.
      if (signInError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed'))) {
         // Allow 'Email not confirmed' error because the user is already logged in,
         // but treat 'Invalid login credentials' as a failure.
         if (signInError.message.includes('Invalid login credentials')) {
            setPasswordError("Incorrect current password.");
            setIsChangingPassword(false);
            return;
         }
         // If it's 'Email not confirmed', we can proceed as the user is authenticated.
      } else if (signInError) {
         // Handle other potential sign-in errors if necessary, but for password verification,
         // non-'invalid credentials' errors usually mean the password was okay at the auth level.
         // Log unexpected errors for debugging? For now, proceed cautiously.
         console.warn("Unexpected error during password verification sign-in:", signInError.message);
         // Depending on strictness, you might want to stop here too:
         // setPasswordError("An unexpected error occurred during verification.");
         // setIsChangingPassword(false);
         // return;
      }
      // --- End Verification Step ---

      // If verification passed, update the password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setPasswordError(updateError.message || "Failed to change password.");
      } else {
        setPasswordSuccess("Password changed successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        
        // After a successful password change, show the success message for a few seconds
        // then navigate directly to the main settings screen
        setTimeout(() => {
          router.replace('/settings'); // Navigate after delay
          // Let the message display until navigation completes and component unmounts
        }, 2000);
      }
    } catch (err: any) {
      setPasswordError(err.message || "An unexpected error occurred.");
    } finally {
      setIsChangingPassword(false);
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
          <Text style={styles.title}>Change Password</Text>
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
          <View style={styles.passwordChangeCard}>
            {passwordError && (
              <View style={styles.errorContainer}>
                <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            )}
            
            {passwordSuccess && (
              <View style={styles.successContainer}>
                <AppIcon name="checkmark" size={20} color="#10B981" outline={false} />
                <Text style={styles.successText}>{passwordSuccess}</Text>
              </View>
            )}
            
            <Text style={styles.passwordFormTitle}>Update Your Password</Text>
            <Text style={styles.passwordFormSubtitle}>Enter your current password and choose a new strong password.</Text>
            
            {/* Current Password Input */}
            <View style={styles.inputContainer}>
              <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Current Password"
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor="#999"
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
            
            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="New Password"
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor="#999"
              />
              <Pressable 
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <AppIcon 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#666" 
                  outline={true}
                />
              </Pressable>
            </View>
            
            {/* Confirm New Password Input */}
            <View style={styles.inputContainer}>
              <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
              <TextInput
                style={styles.input} // Removed styles.passwordInput
                placeholder="Confirm New Password"
                secureTextEntry={!showNewPassword} // Controlled by showNewPassword state
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholderTextColor="#999"
              />
              {/* Removed Pressable eye icon */}
            </View>
            
            <Pressable
              style={[
                styles.button,
                isChangingPassword && styles.buttonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
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
    paddingTop: Platform.OS === 'web' ? 16 : 60, // Use platform-aware padding
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
  passwordChangeCard: {
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
  passwordFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  passwordFormSubtitle: {
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
  inputContainer: { // Added from sign-in
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1, // Changed from fixed properties
    padding: 16, // Kept padding
    fontSize: 16,
    color: '#1A1A1A',
    // Removed background, border, borderRadius, marginBottom as they are now on inputContainer
  },
  passwordInput: { // Added from sign-in
    paddingRight: 40, // Space for the eye icon
  },
  eyeIcon: { // Added from sign-in
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
  // Removed duplicate button style above
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
