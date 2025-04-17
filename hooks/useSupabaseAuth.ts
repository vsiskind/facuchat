import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { generateRandomUsername, getRandomAvatarUrl } from '../app/utils/anonymous';
import { router, usePathname } from 'expo-router'; // Import usePathname

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname(); // Get current pathname using the hook
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
      // --- Proposed Change Start ---
      // Check for unconfirmed email whenever a session exists, regardless of the event
      if (newSession?.user && !newSession.user.email_confirmed_at && newSession.user.email) {
        // Prevent potential redirect loops if already on verify screen
        // Check if we are not already on the target screen using the pathname from the hook
        if (pathname !== '/auth/verify') { // Check current path
           router.replace({
             pathname: '/auth/verify', // Keep the target pathname
             params: { email: newSession.user.email }, // Keep params
           });
           // Set session to null temporarily to avoid rendering protected routes briefly
           setSession(null); // Clear session while redirecting to verify
           return; // Stop further processing for this event
        } else {
          // Already on the correct path, no need to redirect or log.
        }
      }
      // --- Proposed Change End ---

      // Original logic for setting session (now runs if no redirect happened)
      setSession(newSession);

      // Original SIGNED_IN/TOKEN_REFRESHED logic (now redundant due to the check above, can be removed or kept for logging)
      /*
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
        const { user } = newSession;
        if (!user.email_confirmed_at && user.email) {
          // This block is now handled by the check above
          // console.log('SIGNED_IN/TOKEN_REFRESHED: User signed in but email not confirmed (handled above)');
        }
      }
      */
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
    // 1. Client-side validation first
    if (!validateEmailDomain(email, school)) {
      return {
        error: { message: 'Only allowed university email addresses are permitted for registration' },
        data: null
      };
    }

    // 2. Attempt signIn first to check for existing users
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle signIn results
      if (signInError) {
        // If "Invalid login credentials", it means no account exists (or wrong password). Proceed to signUp.
        if (signInError.message.includes('Invalid login credentials')) {
          // Continue below to the signUp block
        } else {
          // Any other signIn error is unexpected during this check.
          console.error('Unexpected signIn error during pre-check:', signInError);
          throw signInError; // Throw to be caught by the outer catch
        }
      } else if (signInData?.user) {
        // If signIn succeeded, an account exists. Check confirmation status.
        const isConfirmed = !!signInData.user.email_confirmed_at;
        // Sign out immediately as this was just a check
        await supabase.auth.signOut().catch(e => console.error("Error signing out after pre-check signIn:", e));

        if (isConfirmed) {
          // Account exists and is confirmed
          return {
            error: { message: 'An account with this email already exists. Please Sign In.' },
            data: null
          };
        }
          // Account exists but is not confirmed
          // Let the main signUp handle this case - it will resend confirmation
          // Continue below to the signUp block

      } else {
         // signIn succeeded but no user data? Unexpected.
         console.warn('signIn succeeded during pre-check but returned no user data.');
         // Proceed to signUp as a fallback.
      }

    } catch (signInCatchError: any) {
       // Catch errors specifically from the signIn attempt block
       // Allow fallthrough to signUp if the error is "Invalid login credentials" OR "Email not confirmed"
       const isInvalidCredentials = signInCatchError.message?.includes('Invalid login credentials');
       const isEmailNotConfirmed = signInCatchError.message?.includes('Email not confirmed');

       if (!isInvalidCredentials && !isEmailNotConfirmed) {
         // If it's neither of the expected errors for fallthrough, log it as an actual error and return.
         console.error('Unexpected error during signIn pre-check phase:', signInCatchError); // Keep error log ONLY for unexpected errors
         return {
           error: { message: signInCatchError.message || 'An error occurred checking account status.' },
           data: null
         };
       }
       // If it WAS "Invalid login credentials" or "Email not confirmed", log that we are proceeding.
       // No need to log the error itself here as it's expected in these fallthrough cases.
       // console.log(`Caught "${isInvalidCredentials ? 'Invalid login credentials' : 'Email not confirmed'}" during pre-check, proceeding to signUp.`);
    }


    // 3. If signIn failed appropriately (Invalid Credentials), proceed with actual signUp
    try {
      // Generate profile data
      const username = generateRandomUsername();
      const avatarUrl = getRandomAvatarUrl();
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;
      const options: any = {
        emailRedirectTo: redirectTo,
        data: { requested_username: username, requested_avatar: avatarUrl }
      };

      // Call the actual signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options
      });

      if (signUpError) {
        // Handle potential signUp errors (though "already registered" should have been caught by signIn)
        console.error('Supabase signUp error:', signUpError);
        // Return a generic message or the specific one
        return {
          error: { message: signUpError.message || 'Failed to create account.' },
          data: null
        };
      }

      // If signUp succeeds, return its data. The auth listener/layout will handle verification redirect.
      return { data: signUpData, error: null };

    } catch (signUpCatchError: any) {
      // Catch errors specifically from the signUp block
      console.error('Error during actual signUp phase:', signUpCatchError);
      // Return a generic error message, or the specific one if available
      return {
        error: {
          message: signUpCatchError.message || 'An unexpected error occurred during sign up'
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
