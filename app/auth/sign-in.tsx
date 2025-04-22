import React, { useState } from 'react'; // Added React import
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { router } from 'expo-router'; // Removed Link import
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { AppIcon } from '../../components/AppIcon';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8'; // Deeper purple for header

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Removed needsVerification state as resend logic is removed
  const { signIn } = useSupabaseAuth(); // Only import signIn

  // Removed validateEmail function as domain validation is removed from sign-in
  /*
  const validateEmail = (email: string) => {
    if (!email.trim()) return 'Email is required';
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';

    // Domain validation removed
    // if (!validateEmailDomain(email)) {
    //   return 'Only @mail.utdt.edu email addresses are allowed';
    // }

    return null;
  };
  */

  const handleSignIn = async () => {
    // Reset states
    setError(null);
    // Removed setNeedsVerification(false);

    // Basic email/password presence check
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setIsLoading(true);
    try {
      // Call signIn without school parameter
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        // Verification error is handled by the hook redirecting to /auth/verify
        // No need for needsVerification state here anymore
        throw signInError;
      }
      
      // If we get here, signIn was successful and should redirect
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleResendVerification function

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <AppIcon name="chatbubble-ellipses" size={48} color="#FFFFFF" outline={false} />
          </View>
          <Text style={styles.appName}>Campus Connect</Text>
          <Text style={styles.tagline}>Share anonymously with your campus community</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {error && (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <AppIcon name="mail" size={20} color="#666" outline={true} />
            <TextInput
              style={styles.input}
              placeholder="Email (@mail.utdt.edu)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
                // Removed setNeedsVerification(false);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
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

          <Pressable 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Removed Resend Verification Button */}

          {/* Forgot Password Link */}
          <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.link}>
            <Text style={styles.linkText}><Text style={styles.linkTextBold}>Forgot Password?</Text></Text>
          </Pressable>

          {/* Sign Up Link (Moved Down) */}
          <Pressable onPress={() => router.push('/(onboarding)')} style={[styles.link, { marginTop: 24 }]}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: HEADER_BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  error: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    color: '#666666',
    fontSize: 14,
  },
  linkTextBold: {
    color: ACCENT_COLOR,
    fontWeight: '600',
  },
  // Removed verificationButton styles
});
