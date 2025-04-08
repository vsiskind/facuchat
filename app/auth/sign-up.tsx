import React, { useState } from 'react'; // Added React import
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, // Keep Platform import
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router'; // Import useLocalSearchParams
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { AppIcon } from '../../components/AppIcon';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Re-add SafeAreaView and add useSafeAreaInsets

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8'; // Deeper purple for header (Keep for logo)

export default function SignUp() {
  const insets = useSafeAreaInsets(); // Get safe area insets
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp, validateEmailDomain } = useSupabaseAuth();
  const { school } = useLocalSearchParams<{ school: string }>(); // Get school param

  // Validate email format with domain restriction using the school param
  const validateEmail = (email: string) => {
    if (!email.trim()) return 'Email is required';
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';

    // Domain validation using the school parameter
    if (!validateEmailDomain(email, school || null)) { // Pass school to validation
      // Make error message dynamic or more general if needed
      return `Only emails from the selected university are allowed`;
    }
    
    return null;
  };

  // Validate password
  const validatePassword = (password: string, confirmPassword: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSignUp = async () => {
    // Reset previous states
    setError(null);
    
    // Validate email and password
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    
    const passwordError = validatePassword(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    setIsLoading(true);

    try {
      // Pass school to signUp function
      const { error: signUpError } = await signUp(email, password, school || ''); // Pass school

      if (signUpError) {
        throw signUpError;
      }
      
      // The signUp function will handle the redirection to verification page
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Use SafeAreaView for inset handling */}
      <SafeAreaView style={styles.safeArea}> 
        {/* Simple Back Button positioned using insets */}
        <Pressable 
          onPress={() => router.back()} // Use router.back() for correct animation
          // Apply top inset to position button correctly
          style={[styles.backButton, { top: insets.top + 10 }]} 
        >
          {/* Use a visible color against the background */}
          <AppIcon name="arrow-back" size={24} color="#333" outline={true} /> 
        </Pressable>

        {/* ScrollView remains inside SafeAreaView */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo section remains */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <AppIcon name="chatbubble-ellipses" size={48} color="#FFFFFF" outline={false} />
            </View>
            <Text style={styles.appName}>Campus Connect</Text>
            <Text style={styles.tagline}>Share anonymously with your campus community</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the campus community</Text>

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
              placeholder="Email (must be @mail.utdt.edu)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
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

          <View style={styles.inputContainer}>
            <AppIcon name="lock-closed" size={20} color="#666" outline={true} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setError(null);
              }}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
              editable={!isLoading}
            />
          </View>

          <Pressable 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </Pressable>

          <Link href="/auth/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign in</Text></Text>
          </Link>
          </View>
        </ScrollView>
      </SafeAreaView> 
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  safeArea: { // Re-add SafeArea style
    flex: 1,
  },
  // Removed header, headerContent, headerTitle styles
  backButton: { // Simple absolute positioned back button
    position: 'absolute',
    // top is now set dynamically using insets
    left: 16,
    zIndex: 10, // Ensure it's above scroll content
    padding: 8, 
  },
  scrollContent: { // Reset padding top
    flexGrow: 1,
    // paddingTop: 16, // Remove padding added for header
    justifyContent: 'center',
    padding: 16, // Keep overall padding
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
});
