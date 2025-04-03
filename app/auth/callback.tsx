import { useEffect } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';

export default function AuthCallback() {
  const { error, error_description } = useLocalSearchParams();
  
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      if (error) {
        console.error('Email confirmation error:', error, error_description);
        // Wait for a moment to let the user see the error
        setTimeout(() => {
          router.replace('/auth/sign-in');
        }, 2000);
        return;
      }
      
      try {
        console.log('Processing auth callback...');
        
        // Check if we have a session after the email confirmation
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        console.log('Session check result:', session ? 'Session exists' : 'No session');
        
        if (session) {
          // Log user details for debugging
          console.log('User ID:', session.user.id);
          console.log('Email:', session.user.email);
          console.log('Email confirmed at:', session.user.email_confirmed_at);
          
          // Double-check that the email is actually confirmed before proceeding
          if (!session.user.email_confirmed_at) {
            console.log('Email still not confirmed after callback, redirecting to verification screen');
            router.replace({
              pathname: '/auth/verify',
              params: { email: session.user.email || '' }
            });
            return;
          }
          
          console.log('Email confirmed, redirecting to app');
          // User is authenticated with confirmed email, redirect to app
          router.replace('/(tabs)');
        } else {
          console.log('No session found, redirecting to sign in');
          // No session found, redirect to sign in
          router.replace('/auth/sign-in');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        router.replace('/auth/sign-in');
      }
    };
    
    handleEmailConfirmation();
  }, [error, error_description]);
  
  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.messageContainer}>
          <AppIcon name="alert-circle" size={48} color="#EF4444" outline={false} />
          <Text style={styles.title}>Verification Error</Text>
          <Text style={styles.errorText}>{error_description || 'Failed to verify your email'}</Text>
          <Text style={styles.redirectText}>Redirecting to sign in...</Text>
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <AppIcon name="checkmark-circle" size={48} color="#10B981" outline={false} />
          <Text style={styles.title}>Verifying Your Email</Text>
          <ActivityIndicator color="#7C3AED" size="large" style={styles.spinner} />
          <Text style={styles.message}>
            Please wait while we confirm your email address...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    padding: 20,
  },
  messageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  spinner: {
    marginVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  redirectText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
});