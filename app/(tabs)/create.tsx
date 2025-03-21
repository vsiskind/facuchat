import { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { createStyles } from '../../styles/app.styles';
import React from 'react';

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
      style={createStyles.container}>
      <View style={createStyles.header}>
        <Text style={createStyles.title}>Create Post</Text>
      </View>
      <View style={createStyles.content}>
        <View style={createStyles.previewCard}>
          <Image source={{ uri: postAvatar }} style={createStyles.avatar} />
          <View style={createStyles.previewInfo}>
            <Text style={createStyles.previewUsername}>{postUsername}</Text>
            <Text style={createStyles.previewNote}>Your anonymous identity for this post</Text>
          </View>
        </View>
        <TextInput
          style={createStyles.input}
          placeholder="What's on your mind?"
          multiline
          value={content}
          onChangeText={setContent}
          editable={!isSubmitting}
          placeholderTextColor="#666666"
        />
        <Pressable
          style={[createStyles.button, (!content || isSubmitting) && createStyles.buttonDisabled]}
          disabled={!content || isSubmitting}
          onPress={handleCreatePost}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[createStyles.buttonText, !content && createStyles.buttonTextDisabled]}>
              Post Anonymously
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}