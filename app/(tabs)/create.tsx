import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { generateRandomUsername, getRandomAvatarUrl } from '../utils/anonymous';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postUsername, setPostUsername] = useState('');
  const [postAvatar, setPostAvatar] = useState('');
  
  useEffect(() => {
    // Generate identity once when component mounts
    setPostUsername(generateRandomUsername());
    setPostAvatar(getRandomAvatarUrl());
  }, []);

  const handleCreatePost = async () => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a post');
      }
      
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            content,
            author_id: user.id,
          },
        ])
        .select('id')
        .single();
        
      if (postError) throw postError;
      
      if (!newPost) {
        throw new Error('Failed to create post');
      }
      
      const { error: identityError } = await supabase
        .from('post_identities')
        .insert([
          {
            post_id: newPost.id,
            username: postUsername,
            avatar_url: postAvatar,
          },
        ]);
        
      if (identityError) throw identityError;
      
      setContent('');
      router.push('/(tabs)');
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Post</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.previewCard}>
          <Image source={{ uri: postAvatar }} style={styles.avatar} />
          <View style={styles.previewInfo}>
            <Text style={styles.previewUsername}>{postUsername}</Text>
            <Text style={styles.previewNote}>Your anonymous identity for this post</Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          multiline
          value={content}
          onChangeText={setContent}
          editable={!isSubmitting}
          placeholderTextColor="#666666"
        />
        <Pressable
          style={[styles.button, (!content || isSubmitting) && styles.buttonDisabled]}
          disabled={!content || isSubmitting}
          onPress={handleCreatePost}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, !content && styles.buttonTextDisabled]}>
              Post Anonymously
            </Text>
          )}
        </Pressable>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: HEADER_BG_COLOR,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
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
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3E8FF',
  },
  previewInfo: {
    flex: 1,
  },
  previewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  previewNote: {
    fontSize: 14,
    color: '#666666',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999999',
  },
});