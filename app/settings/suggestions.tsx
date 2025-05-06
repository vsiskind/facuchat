import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Corrected path
import { AppIcon } from '../../components/AppIcon'; // Corrected path
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth'; // Corrected path

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';
const BUTTON_TEXT_COLOR = '#FFFFFF';
const INPUT_BORDER_COLOR = '#D1D5DB';
const INPUT_FOCUS_BORDER_COLOR = '#A78BFA'; // Lighter purple for focus

export default function SuggestionsScreen() {
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useSupabaseAuth(); // Get session to access user ID

  const handleSendSuggestion = async () => {
    if (!suggestion.trim()) {
      Alert.alert('Empty Suggestion', 'Please enter your suggestion before sending.');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const userId = session?.user?.id; // Get user ID if logged in
      const { data, error } = await supabase.functions.invoke('send-suggestion', {
        body: {
          suggestion_text: suggestion,
          user_id: userId || 'Anonymous', // Send user ID or 'Anonymous'
        },
      });

      if (error) throw error;

      // Check function-specific success/error if needed (optional)
      // if (data && data.error) throw new Error(data.error);

      Alert.alert('Suggestion Sent', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => router.back() }, // Go back after sending
      ]);
      setSuggestion(''); // Clear input
    } catch (err: any) {
      console.error('Error sending suggestion:', err);
      Alert.alert(
        'Error',
        `Failed to send suggestion. Please try again. ${err.message || ''}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <AppIcon name="arrow-back" size={24} color="#FFFFFF" outline={true} />
          </Pressable>
          <Text style={styles.title}>Suggestions</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Your Anonymous Suggestion:</Text>
        <TextInput
          style={styles.input}
          placeholder="Tell us how we can improve the app..."
          value={suggestion}
          onChangeText={setSuggestion}
          multiline
          numberOfLines={6}
          textAlignVertical="top" // Align text to the top in multiline
        />

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendSuggestion}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={BUTTON_TEXT_COLOR} />
          ) : (
            <Text style={styles.buttonText}>Send Anonymously</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  header: {
    padding: 16,
    paddingTop: 60,
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
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 40, // Add padding to avoid keyboard overlap issues
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: INPUT_BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 120, // Make input taller for multiline
    marginBottom: 20,
    // Add focus styles if needed (requires state management)
    // borderColor: isFocused ? INPUT_FOCUS_BORDER_COLOR : INPUT_BORDER_COLOR,
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Ensure consistent height with ActivityIndicator
  },
  buttonDisabled: {
    backgroundColor: '#A78BFA', // Lighter purple when disabled
  },
  buttonText: {
    color: BUTTON_TEXT_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});
