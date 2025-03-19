import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { AppIcon } from '../../components/AppIcon';
import { formatDistanceToNow } from 'date-fns';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8'; // Deeper purple for header
const DANGER_COLOR = '#EF4444'; // Red for delete actions

type Post = {
  id: string;
  content: string;
  created_at: string;
  post_identities: {
    username: string;
    avatar_url: string;
  }[];
  votes: {
    id: string;
    vote_type: 'up' | 'down';
    user_id: string;
  }[];
  comments: {
    id: string;
  }[];
};

function PostCard({ post, onDelete, onRefresh }: { 
  post: Post; 
  onDelete: (postId: string) => void;
  onRefresh: () => void;
}) {
  // Get the post identity (username and avatar)
  const identity = post.post_identities[0] || { 
    username: 'Anonymous', 
    avatar_url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' 
  };

  // Calculate vote count
  const upvotes = post.votes?.filter(vote => vote.vote_type === 'up').length || 0;
  const downvotes = post.votes?.filter(vote => vote.vote_type === 'down').length || 0;
  const votes = upvotes - downvotes;

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(post.id)
        }
      ]
    );
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: identity.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' }} 
          style={styles.avatar} 
        />
        <View style={styles.authorInfo}>
          <Text style={styles.username}>{identity.username}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>
        <Pressable 
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed
          ]}
        >
          <AppIcon name="trash" size={20} color={DANGER_COLOR} outline={true} />
        </Pressable>
      </View>
      <Text style={styles.content}>{post.content}</Text>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <AppIcon name="arrow-up-circle" size={16} color="#666" outline={true} />
          <Text style={styles.statText}>{votes} votes</Text>
        </View>
        <View style={styles.statItem}>
          <AppIcon name="chatbubble" size={16} color="#666" outline={true} />
          <Text style={styles.statText}>{post.comments?.length || 0} comments</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPosts();
  }, []);

  async function fetchUserPosts() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          post_identities (
            username,
            avatar_url
          ),
          votes (
            id,
            vote_type,
            user_id
          ),
          comments (
            id
          )
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data as Post[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserPosts();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Update local state to remove the deleted post
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
      console.error('Error deleting post:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth/sign-in');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Posts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text style={styles.loadingText}>Loading your posts...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Posts</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchUserPosts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Posts</Text>
        <Text style={styles.subtitle}>
          Each post uses a unique anonymous identity
        </Text>
      </View>
      
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onDelete={handleDeletePost}
            onRefresh={fetchUserPosts}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feed}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[ACCENT_COLOR]}
            tintColor={ACCENT_COLOR}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't posted anything yet</Text>
            <Text style={styles.emptySubtext}>Your posts will appear here</Text>
          </View>
        }
      />
      
      <View style={styles.footer}>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
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
  subtitle: {
    fontSize: 14,
    color: '#F3E8FF',
    marginTop: 4,
  },
  feed: {
    padding: 16,
    paddingBottom: 80, // Extra padding for footer
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3E8FF',
  },
  authorInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  timestamp: {
    fontSize: 14,
    color: '#666666',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
  deleteButtonPressed: {
    opacity: 0.7,
    backgroundColor: '#FEE2E2',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  signOutButton: {
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});