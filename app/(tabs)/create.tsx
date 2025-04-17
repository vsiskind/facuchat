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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { generateRandomUsername, getRandomAvatarUrl } from '../utils/anonymous';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { createStyles } from '../../styles/app.styles';
import React from 'react';

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Added missing semicolon
  const [postUsername, setPostUsername] = useState('');
  const [postAvatar, setPostAvatar] = useState('');

  useEffect(() => { // Added missing semicolon
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
        throw new Error('You must be logged in to create a post'); // Added missing semicolon
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
        throw new Error('Failed to create post'); // Added missing semicolon
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

      // Regenerate identity for the next post
      setPostUsername(generateRandomUsername());
      setPostAvatar(getRandomAvatarUrl());

      setContent(''); // Added missing semicolon
      router.push('/(tabs)');

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the button should be disabled
  const isDisabled = !content.trim() || isSubmitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={createStyles.container}
    >
      {/* Wrap everything in TouchableWithoutFeedback */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {/* Single child View with flex: 1 and collapsable={false} */}
        <View style={{ flex: 1 }} collapsable={false}> 
          {/* Header inside the touchable area */}
          <View style={createStyles.header}>
            <Text style={createStyles.title}>Create Post</Text>
          </View>
          {/* Content area */}
          <View style={createStyles.content}>
            <View style={createStyles.previewCard}>
              <Image source={{ uri: postAvatar || 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' }} style={createStyles.avatar} />
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
            {/* Conditionally render disabled View or active Pressable */}
             {isDisabled ? (
              <View style={[createStyles.button, createStyles.buttonDisabled]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[createStyles.buttonText, createStyles.buttonTextDisabled]}>Post Anonymously</Text>
                )}
              </View>
            ) : (
              <Pressable
                style={createStyles.button}
                onPress={handleCreatePost}
              >
                {/* Content is always enabled text when Pressable is rendered */}
                <Text style={createStyles.buttonText}>Post Anonymously</Text>
              </Pressable>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
