import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase'; // Adjusted path
import { AppIcon } from '../../components/AppIcon'; // Adjusted path
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth'; // Import the auth hook

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';
const CARD_BG_COLOR = '#FFFFFF';
const TEXT_COLOR = '#1A1A1A';
const SUBTLE_TEXT_COLOR = '#666';
const DIVIDER_COLOR = '#F0F0F0';
const BG_COLOR = '#F6F8FA';

// Define the structure for notification settings
interface NotificationSettings {
  notify_like_milestone_post: boolean;
  notify_like_milestone_comment: boolean;
  notify_comment_milestone_post: boolean;
  notify_reply_to_comment: boolean;
}

// Define keys for easier mapping
const settingKeys: (keyof NotificationSettings)[] = [
  'notify_like_milestone_post',
  'notify_like_milestone_comment',
  'notify_comment_milestone_post',
  'notify_reply_to_comment',
];

// Define user-friendly labels for each setting
const settingLabels: Record<keyof NotificationSettings, string> = {
  notify_like_milestone_post: 'Post Likes',
  notify_like_milestone_comment: 'Comment Likes',
  notify_comment_milestone_post: 'Post Comments',
  notify_reply_to_comment: 'Replies',
};

export default function NotificationSettingsScreen() {
  const { session } = useSupabaseAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Partial<Record<keyof NotificationSettings | 'all', boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.user?.id) {
        setError('User not logged in.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('notify_like_milestone_post, notify_like_milestone_comment, notify_comment_milestone_post, notify_reply_to_comment')
          .eq('id', session.user.id)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          // Ensure all keys exist, defaulting to true if missing (though migration sets default)
          const fetchedSettings: NotificationSettings = {
            notify_like_milestone_post: data.notify_like_milestone_post ?? true,
            notify_like_milestone_comment: data.notify_like_milestone_comment ?? true,
            notify_comment_milestone_post: data.notify_comment_milestone_post ?? true,
            notify_reply_to_comment: data.notify_reply_to_comment ?? true,
          };
          setSettings(fetchedSettings);
        } else {
          // Should not happen if profile exists, but handle defensively
          setSettings({
            notify_like_milestone_post: true,
            notify_like_milestone_comment: true,
            notify_comment_milestone_post: true,
            notify_reply_to_comment: true,
          });
        }
      } catch (err: any) {
        console.error('Error fetching notification settings:', err);
        setError('Failed to load settings. Please try again.');
        Alert.alert('Error', 'Could not load your notification settings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [session]);

  // Update a specific setting
  const updateSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    if (!session?.user?.id || !settings) return;

    setIsUpdating(prev => ({ ...prev, [key]: true }));
    const originalValue = settings[key];
    // Optimistic UI update
    setSettings(prev => prev ? { ...prev, [key]: value } : null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', session.user.id);

      if (updateError) {
        // Revert optimistic update on error
        setSettings(prev => prev ? { ...prev, [key]: originalValue } : null);
        throw updateError;
      }
      // Keep optimistic update on success
    } catch (err: any) {
      console.error(`Error updating setting ${key}:`, err);
      Alert.alert('Error', `Failed to update setting: ${settingLabels[key]}`);
    } finally {
      setIsUpdating(prev => ({ ...prev, [key]: false }));
    }
  }, [session, settings]);

  // Update all settings (master toggle)
  const updateAllSettings = useCallback(async (value: boolean) => {
    if (!session?.user?.id || !settings) return;

    setIsUpdating(prev => ({ ...prev, all: true }));
    const originalSettings = { ...settings };
    // Optimistic UI update
    const newSettings = { ...settings };
    settingKeys.forEach(key => { newSettings[key] = value; });
    setSettings(newSettings);

    try {
      const updatePayload: Partial<NotificationSettings> = {};
      settingKeys.forEach(key => { updatePayload[key] = value; });

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', session.user.id);

      if (updateError) {
        // Revert optimistic update on error
        setSettings(originalSettings);
        throw updateError;
      }
      // Keep optimistic update on success
    } catch (err: any) {
      console.error('Error updating all settings:', err);
      Alert.alert('Error', 'Failed to update all notification settings.');
    } finally {
      setIsUpdating(prev => ({ ...prev, all: false }));
    }
  }, [session, settings]);

  const allEnabled = settings ? settingKeys.every(key => settings[key]) : false;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Optionally add a retry button */}
      </View>
    );
  }

  if (!settings) {
     return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <AppIcon name="arrow-back" size={24} color="#FFFFFF" outline={true} />
          </Pressable>
          <Text style={styles.title}>Notification Settings</Text>
          {/* Add placeholder view for centering */}
          <View style={{ width: 40 }} /> 
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Combined Card for all settings */}
        <View style={styles.card}>
          {/* Master Toggle Row */}
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, styles.masterLabel]}>Enable All Notifications</Text>
            <Switch
              trackColor={{ false: '#767577', true: ACCENT_COLOR }}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={updateAllSettings} // Directly call update function
              value={allEnabled}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Individual Settings Rows */}
          {settingKeys.map((key, index) => (
            <React.Fragment key={key}>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>{settingLabels[key]}</Text>
                <Switch
                  trackColor={{ false: '#767577', true: ACCENT_COLOR }}
                  thumbColor={'#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={(value) => updateSetting(key, value)} // Directly call update function
                  value={settings[key]}
                />
              </View>
              {/* Restore original divider logic */}
              {index < settingKeys.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SUBTLE_TEXT_COLOR,
    marginTop: 24, // More space before this section
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: CARD_BG_COLOR,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    maxWidth: 500, // Max width for larger screens
    alignSelf: 'center',
    width: '100%',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Ensure switch is pushed to the right
    paddingVertical: 14, // Slightly adjust padding
    paddingHorizontal: 16,
  },
  settingText: {
    fontSize: 16,
    color: TEXT_COLOR,
    flexShrink: 1, // Allow text to shrink if needed
    marginRight: 10, // Add space between text and switch
  },
  masterLabel: {
    fontWeight: '600', // Make master label bold
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER_COLOR,
    marginHorizontal: 16,
  },
  // Removed switchContainer styles
});
