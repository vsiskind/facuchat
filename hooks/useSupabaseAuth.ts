import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { generateRandomUsername, getRandomAvatarUrl } from '../app/utils/anonymous';
import { router } from 'expo-router';

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase environment variables are available
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }

    // Get the current session
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        // If we have a session but email is not confirmed, redirect to verification screen
        if (data.session?.user && !data.session.user.email_confirmed_at) {
          console.log('Session exists but email not confirmed, redirecting to verification');
          router.replace({
            pathname: '/auth/verify',
            params: { email: data.session.user.email || '' }
          });
        } else {
          setSession(data.session);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'Failed to get authentication session');
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth event:', event);
      
      // If a user signed in or updated their session
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
        const { user } = newSession;
        
        // Check if email is confirmed
        if (!user.email_confirmed_at && user.email) {
          console.log('User signed in but email not confirmed, redirecting to verification');
          router.replace({
            pathname: '/auth/verify',
            params: { email: user.email || '' }
          });
          return;
        }
      }
      
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Validates if an email is from the allowed domain for a given school.
   * @param email Email address to validate
   * @param school School identifier (e.g., 'utdt')
   * @returns Boolean indicating if email is valid for the school
   */
  const validateEmailDomain = (email: string, school: string | null): boolean => {
    if (!email || !school) return false;
    // Simple mapping for now, can be expanded later
    if (school === 'utdt') {
      return email.toLowerCase().endsWith('@mail.utdt.edu');
    }
    // Add other schools here
    // else if (school === 'another_school') {
    //   return email.toLowerCase().endsWith('@mail.another_school.edu');
    // }
    return false; // Default to false if school not recognized
  };

  // Add 'school' parameter
  const signUp = async (email: string, password: string, school: string) => {
    try {
      // Client-side validation of email domain using the school parameter
      if (!validateEmailDomain(email, school)) {
        // Make error message slightly more generic if needed, or keep specific for now
        return {
          error: {
            message: 'Only allowed university email addresses are permitted for registration' // Updated message
          },
          data: null
        };
      }

      // Generate profile data (will be stored in metadata)
      const username = generateRandomUsername();
      const avatarUrl = getRandomAvatarUrl();

      // Create options object with emailRedirectTo
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const options: any = {
        emailRedirectTo: redirectTo,
        data: {
          // Store profile data in metadata for server-side profile creation
          requested_username: username,
          requested_avatar: avatarUrl
        }
      };

      console.log('Sign up with redirect to:', redirectTo);

      // Sign up the user with email confirmation enabled
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Sign up response:', data);

      // Redirect to verification screen if signup was successful
      console.log('Redirecting to verification screen with email:', email);
      router.replace({
        pathname: '/auth/verify',
        params: { email }
      });
      
      return { 
        data: {
          user: data.user,
          emailVerificationStatus: 'pending'
        },
        error: null 
      };
    } catch (err: any) {
      console.error('Sign up error:', err);
      return { 
        error: { 
          message: err.message || 'An unexpected error occurred during sign up' 
        },
        data: null
      };
    }
  };

  // Add 'school' parameter (but validation removed from this specific function)
  const signIn = async (email: string, password: string, school: string | null = null) => { // Made school optional, default null
    try {
      // Removed client-side domain validation for sign-in.
      // Validation primarily happens during sign-up.
      // The 'school' parameter is kept for potential future use but not used for validation here.

      // Basic check if email is provided
      if (!email) {
        return {
          error: { message: 'Email is required' },
          data: null
        };
      }
      // Basic check if password is provided
      if (!password) {
        return {
          error: { message: 'Password is required' },
          data: null
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          console.log('Email not confirmed during sign in, redirecting to verification');
          router.replace({
            pathname: '/auth/verify',
            params: { email }
          });
          return { 
            error: { 
              message: 'Email not confirmed. Please verify your email address.' 
            },
            data: null
          };
        }
        throw error;
      }

      // ALWAYS check if email is verified and redirect accordingly
      if (data?.user && !data.user.email_confirmed_at) {
        console.log('Email not confirmed during sign in, redirecting to verification');
        router.replace({
          pathname: '/auth/verify',
          params: { email }
        });
        
        return { 
          error: { 
            message: 'Email not confirmed. Please verify your email address.' 
          },
          data: null
        };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('Sign in error:', err);
      return { 
        error: { 
          message: err.message || 'An unexpected error occurred during sign in' 
        },
        data: null
      };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      console.log(`Verifying OTP for email: ${email}, token length: ${token.length}`);
      
      // Explicitly use verifyOtp with type: 'email' according to Supabase docs
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });
      
      if (error) {
        console.error('OTP verification error:', error);
        throw error;
      }
      
      console.log('OTP verification successful:', data);
      
      // If verification is successful, update the session
      if (data?.session) {
        setSession(data.session);
      }
      
      return { data, error: null };
    } catch (err: any) {
      console.error('OTP verification error details:', err);
      
      // More specific error messages based on error type
      let errorMessage = 'Failed to verify code';
      
      if (err.message.includes('Invalid')) {
        errorMessage = 'Invalid verification code. Please try again.';
      } else if (err.message.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      }
      
      return {
        error: {
          message: errorMessage,
          originalError: err.message
        },
        data: null
      };
    }
  };

  // Add 'school' parameter
  const resendVerificationEmail = async (email: string, school: string) => {
    try {
      if (!validateEmailDomain(email, school)) {
        return {
          error: {
            message: 'Only allowed university email addresses are permitted' // Updated message
          }
        };
      }

      // Determine the redirectTo URL based on platform
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      console.log('Resending verification email with redirect to:', redirectTo);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo,
        }
      });

      if (error) throw error;
      
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      return { 
        success: false,
        error: { 
          message: err.message || 'Failed to resend verification email' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      console.error('Sign out error:', err);
      return { 
        error: { 
          message: err.message || 'An unexpected error occurred during sign out' 
        } 
      };
    }
  };

  return {
    session,
    loading,
    signUp,
    signIn,
    signOut,
    verifyOTP,
    resendVerificationEmail,
    validateEmailDomain,
  };
}
