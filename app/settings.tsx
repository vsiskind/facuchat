import React, { useState, useEffect } from 'react'; // Added React import
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform // Added Platform import
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { AppIcon } from '../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';
const DANGER_COLOR = '#EF4444';

export default function SettingsScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false); // Added state for reset password
  const [signOutTriggered, setSignOutTriggered] = useState(false);

  // Effect for handling sign out navigation
  useEffect(() => {
    if (signOutTriggered) {
      // Navigate immediately when sign out is triggered
      router.replace('/auth/sign-in');
      setSignOutTriggered(false);
    }
  }, [signOutTriggered]);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks

    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Set the trigger for navigation instead of navigating directly
      setSignOutTriggered(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sign out');
      setIsSigningOut(false);
    }
    // We don't reset isSigningOut in the finally block because we want
    // to keep the button disabled until navigation completes
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action CANNOT be undone and all your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Call the stored procedure we created to handle account deletion
      const { error } = await supabase.rpc('delete_user_account');

      if (error) throw error;

      // Sign out after successful deletion
      await supabase.auth.signOut();

      // Show success message
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [
          {
            text: 'OK',
            // Redirect to the school select/onboarding start page
            onPress: () => router.replace('/(onboarding)') // Corrected path format
          }
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.' +
        (err.message ? `\n\nError: ${err.message}` : '')
      );
      console.error('Error deleting account:', err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Handler for Reset Password button
  const handleResetPasswordRequest = async () => {
    if (isRequestingPasswordReset) return; // Prevent multiple clicks

    setIsRequestingPasswordReset(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      // Navigate to forgot password screen after successful sign out
      router.replace('/auth/forgot-password');

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initiate password reset.');
      // Only reset loading state on error, as navigation will occur on success
      setIsRequestingPasswordReset(false);
    }
    // Don't reset loading state in finally here, navigation handles the transition
  };

  // Main settings view
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
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <View style={styles.card}>
          <Pressable
            style={styles.settingRow}
            onPress={() => router.push('/settings/notifications')} // Navigate to notifications screen
          >
            <AppIcon name="notifications" size={22} color={ACCENT_COLOR} outline={true} />
            <Text style={styles.settingText}>Notification Settings</Text>
            <AppIcon name="chevron-forward" size={20} color="#666" outline={true} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={() => router.push('/settings/change-email')}
          >
            <AppIcon name="mail" size={22} color={ACCENT_COLOR} outline={true} />
            <Text style={styles.settingText}>Change Email</Text>
            <AppIcon name="chevron-forward" size={20} color="#666" outline={true} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={handleResetPasswordRequest} // Use the new handler
            disabled={isRequestingPasswordReset} // Disable when loading
          >
            {isRequestingPasswordReset ? (
              <ActivityIndicator color={ACCENT_COLOR} size="small" />
            ) : (
              <AppIcon name="key" size={22} color={ACCENT_COLOR} outline={true} />
            )}
            <Text style={styles.settingText}>Reset Password</Text>
            <AppIcon name="chevron-forward" size={20} color="#666" outline={true} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color={ACCENT_COLOR} size="small" />
            ) : (
              <AppIcon name="log-out" size={22} color={ACCENT_COLOR} outline={true} />
            )}
            <Text style={styles.settingText}>Sign Out</Text>
            <AppIcon name="chevron-forward" size={20} color="#666" outline={true} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.settingRow}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <ActivityIndicator color={DANGER_COLOR} size="small" />
            ) : (
              <AppIcon name="trash" size={22} color={DANGER_COLOR} outline={true} />
            )}
            <Text style={styles.dangerText}>Delete Account</Text>
            <AppIcon name="chevron-forward" size={20} color="#666" outline={true} />
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Deleting your account will permanently remove all your posts, comments, votes,
          and profile information. This action cannot be undone.
        </Text>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Add width constraints
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    marginLeft: 12,
  },
  dangerText: {
    fontSize: 16,
    color: DANGER_COLOR,
    flex: 1,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  disclaimer: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  }
});
