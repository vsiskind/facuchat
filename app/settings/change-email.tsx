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
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const { validateEmailDomain } = useSupabaseAuth();

  const handleChangeEmail = async () => {
    setEmailError(null);
    setEmailSuccess(null);

    if (!currentEmail || !newEmail || !confirmNewEmail) {
      setEmailError("Please fill in all fields.");
      return;
    }

    if (newEmail !== confirmNewEmail) {
      setEmailError("New emails do not match.");
      return;
    }

    // Validate the email domain
    if (!validateEmailDomain(newEmail)) {
      setEmailError("Only @mail.utdt.edu email addresses are allowed.");
      return;
    }

    setIsChangingEmail(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        setEmailError(error.message || "Failed to change email.");
      } else {
        setEmailSuccess("Email change initiated! Please verify your new email.");
        setCurrentEmail('');
        setNewEmail('');
        setConfirmNewEmail('');

        // After a successful email change, show the success message for a few seconds
        // then redirect to the verification screen
        setTimeout(() => {
          router.replace({
            pathname: '/auth/verify',
            params: { email: newEmail }
          });
          setEmailSuccess(null);
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
                <AppIcon name="checkmark-circle" size={20} color="#10B981" outline={false} />
                <Text style={styles.successText}>{emailSuccess}</Text>
              </View>
            )}

            <Text style={styles.emailFormTitle}>Update Your Email</Text>
            <Text style={styles.emailFormSubtitle}>Enter your current email and choose a new email address with the @mail.utdt.edu domain.</Text>

            <TextInput
              style={styles.input}
              placeholder="Current Email"
              value={currentEmail}
              onChangeText={setCurrentEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="New Email (@mail.utdt.edu)"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Email"
              value={confirmNewEmail}
              onChangeText={setConfirmNewEmail}
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
  input: {
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
