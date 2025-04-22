import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router'; // Ensure router is imported
import { AppIcon } from '../../components/AppIcon';
import { formatDistanceToNow } from 'date-fns';
import { SortDropdown, SortOption } from '../../components/SortDropdown';
import { profileStyles, commonStyles, feedStyles } from '../../styles/app.styles';
// Removed unused Swipeable and RNAnimated imports
// Removed redundant React import

const sortOptions: SortOption[] = [
  {
    id: 'recent',
    label: 'Most Recent',
    icon: 'time',
    description: 'Show newest posts first'
  },
  {
    id: 'popular',
    label: 'Most Popular',
    icon: 'trending-up',
    description: 'Sort by highest number of upvotes'
  },
  {
    id: 'controversial',
    label: 'Controversial',
    icon: 'flame',
    description: 'Posts with most downvotes'
  }
];

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

type Comment = {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  comment_identities: {
    username: string;
    avatar_url: string;
  }[];
  comment_votes: {
    id: string;
    vote_type: 'up' | 'down';
    user_id: string;
  }[];
  posts: {
    content: string;
  };
};

// Removed onRefresh from destructuring parameters
function PostCard({ post, onDelete }: {
  post: Post;
  onDelete: (postId: string) => void;
}) {
  const identity = post.post_identities[0] || {
    username: 'Anonymous', 
    avatar_url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' 
  };

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
    <View style={profileStyles.postCard}>
      <View style={profileStyles.postHeader}>
        <Image 
          source={{ uri: identity.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' }} 
          style={profileStyles.avatar} 
        />
        <View style={profileStyles.authorInfo}>
          <Text style={profileStyles.username}>{identity.username}</Text>
          <Text style={profileStyles.timestamp}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>
        <Pressable 
          onPress={handleDelete}
          style={({ pressed }) => [
            profileStyles.deleteButton,
            pressed && profileStyles.deleteButtonPressed
          ]}
        >
          <AppIcon name="trash" size={20} color="#EF4444" outline={true} />
        </Pressable>
      </View>
      <Text style={profileStyles.content}>{post.content}</Text>
      <View style={profileStyles.stats}>
        <View style={profileStyles.statItem}>
          <AppIcon name="arrow-up-circle" size={16} color="#666" outline={true} />
          <Text style={profileStyles.statText}>{votes} votes</Text>
        </View>
        <View style={profileStyles.statItem}>
          <AppIcon name="chatbubble" size={16} color="#666" outline={true} />
          <Text style={profileStyles.statText}>{post.comments?.length || 0} comments</Text>
        </View>
        {/* Add View Post Link */}
        <Pressable
          style={profileStyles.viewLink}
          onPress={() => router.push({ pathname: '/', params: { postId: post.id } })}
        >
          <Text style={profileStyles.viewLinkText}>View Post</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CommentCard({ comment, onDelete }: { 
  comment: Comment;
  onDelete: (commentId: string) => void;
}) {
  const identity = comment.comment_identities[0] || { 
    username: 'Anonymous', 
    avatar_url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' 
  };

  const upvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'up').length || 0;
  const downvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'down').length || 0;
  const votes = upvotes - downvotes;

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id)
        }
      ]
    );
  };

  return (
    <View style={profileStyles.commentCard}>
      <View style={profileStyles.postHeader}>
        <Image 
          source={{ uri: identity.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed' }} 
          style={profileStyles.avatar} 
        />
        <View style={profileStyles.authorInfo}>
          <Text style={profileStyles.username}>{identity.username}</Text>
          <Text style={profileStyles.timestamp}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </Text>
        </View>
        <Pressable 
          onPress={handleDelete}
          style={({ pressed }) => [
            profileStyles.deleteButton,
            pressed && profileStyles.deleteButtonPressed
          ]}
        >
          <AppIcon name="trash" size={20} color="#EF4444" outline={true} />
        </Pressable>
      </View>
      <Text style={profileStyles.content}>{comment.content}</Text>
      <View style={profileStyles.stats}>
        <View style={profileStyles.statItem}>
          <AppIcon name="arrow-up-circle" size={16} color="#666" outline={true} />
          <Text style={profileStyles.statText}>{votes} votes</Text>
        </View>
        {/* Add View Thread Link */}
        <Pressable
          style={profileStyles.viewLink}
          onPress={() => router.push({ pathname: '/', params: { postId: comment.post_id, commentId: comment.id } })}
        >
          <Text style={profileStyles.viewLinkText}>View Thread</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
  
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [rawComments, setRawComments] = useState<Comment[]>([]);
  
  // Karma state
  const [karma, setKarma] = useState(0);
  
  // Shared state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);

  // Calculate karma from posts and comments
  const calculateKarma = useCallback(() => {
    // Calculate karma from posts
    const postKarma = rawPosts.reduce((total, post) => {
      const upvotes = post.votes?.filter(vote => vote.vote_type === 'up').length || 0;
      const downvotes = post.votes?.filter(vote => vote.vote_type === 'down').length || 0;
      return total + upvotes - downvotes;
    }, 0);

    // Calculate karma from comments
    const commentKarma = rawComments.reduce((total, comment) => {
      const upvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'up').length || 0;
      const downvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'down').length || 0;
      return total + upvotes - downvotes;
    }, 0);

    // Total karma
    return postKarma + commentKarma;
  }, [rawPosts, rawComments]);

  // Update karma whenever posts or comments change
  useEffect(() => {
    const newKarma = calculateKarma();
    setKarma(newKarma);
  }, [rawPosts, rawComments, calculateKarma]);

  const sortedPosts = useMemo(() => {
    return [...rawPosts].sort((a, b) => {
      const getVoteCount = (post: Post) => {
        const upvotes = post.votes?.filter(v => v.vote_type === 'up').length || 0;
        const downvotes = post.votes?.filter(v => v.vote_type === 'down').length || 0;
        return upvotes - downvotes;
      };

      switch (selectedSort.id) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case 'popular':
          // Simplified sorting: Higher votes first
          return getVoteCount(b) - getVoteCount(a);

        case 'controversial':
          // Simplified sorting: Lower votes first (more negative)
          return getVoteCount(a) - getVoteCount(b);

        default:
          return 0;
      }
    });
  }, [rawPosts, selectedSort.id]);

  const sortedComments = useMemo(() => {
    return [...rawComments].sort((a, b) => {
      const getVoteCount = (comment: Comment) => {
        const upvotes = comment.comment_votes?.filter(v => v.vote_type === 'up').length || 0;
        const downvotes = comment.comment_votes?.filter(v => v.vote_type === 'down').length || 0;
        return upvotes - downvotes;
      };

      switch (selectedSort.id) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case 'popular':
          // Simplified sorting: Higher votes first
          return getVoteCount(b) - getVoteCount(a);

        case 'controversial':
           // Simplified sorting: Lower votes first (more negative)
          return getVoteCount(a) - getVoteCount(b);

        default:
          return 0;
      }
    });
  }, [rawComments, selectedSort.id]);

  useEffect(() => {
    setPosts(sortedPosts);
  }, [sortedPosts]);

  useEffect(() => {
    setComments(sortedComments);
  }, [sortedComments]);

  async function fetchUserPosts() {
    try {
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
        .eq('author_id', user.id);

      if (error) throw error;
      setRawPosts(data as Post[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user posts:', err);
    }
  }

  async function fetchUserComments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          post_id,
          posts (
            content
          ),
          comment_identities (
            username,
            avatar_url
          ),
          comment_votes (
            id,
            vote_type,
            user_id
          )
        `)
        .eq('author_id', user.id);

      if (error) throw error;
      // Adjust type assertion to fix TS error
      setRawComments(data as unknown as Comment[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching user comments:', err);
    }
  }

  async function fetchUserData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserPosts(),
        fetchUserComments()
      ]);
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      // Refresh the posts list after deletion
      await fetchUserPosts();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
      console.error('Error deleting post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      // Refresh the comments list after deletion
      await fetchUserComments();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
      console.error('Error deleting comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  if (loading && !refreshing) {
    return (
      <View style={profileStyles.container}>
        <View style={profileStyles.header}>
          <View style={profileStyles.headerContent}>
            <Text style={profileStyles.title}>Your Activity</Text>
            <Pressable 
              onPress={navigateToSettings} 
              style={profileStyles.settingsButton}
            >
              <AppIcon name="menu" size={24} color="#FFFFFF" outline={true} />
            </Pressable>
          </View>
        </View>
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={commonStyles.loadingText}>Loading your activity...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={profileStyles.container}>
        <View style={profileStyles.header}>
          <View style={profileStyles.headerContent}>
            <Text style={profileStyles.title}>Your Activity</Text>
            <Pressable 
              onPress={navigateToSettings} 
              style={profileStyles.settingsButton}
            >
              <AppIcon name="menu" size={24} color="#FFFFFF" outline={true} />
            </Pressable>
          </View>
        </View>
        <View style={commonStyles.errorContainer}>
          <Text style={commonStyles.errorText}>Error: {error}</Text>
          <Pressable style={commonStyles.retryButton} onPress={fetchUserData}>
            <Text style={commonStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <View style={profileStyles.headerContent}>
          <Text style={profileStyles.title}>Your Activity</Text>
          <Pressable 
            onPress={navigateToSettings} 
            style={profileStyles.settingsButton}
          >
            <AppIcon name="menu" size={24} color="#FFFFFF" outline={true} />
          </Pressable>
        </View>
        <View style={profileStyles.karmaContainer}>
          <AppIcon name="star" size={18} color="#F3E8FF" outline={true} />
          <Text style={profileStyles.karmaText}>
            {karma} karma points
          </Text>
        </View>
      </View>
      
      <View style={profileStyles.contentContainer}>
        <View style={profileStyles.tabsContainer}>
          <Pressable
            style={[
              profileStyles.tabButton,
              activeTab === 'posts' && profileStyles.activeTabButton
            ]}
            onPress={() => setActiveTab('posts')}
          >
            <Text 
              style={[
                profileStyles.tabButtonText,
                activeTab === 'posts' && profileStyles.activeTabButtonText
              ]}
            >
              Posts
            </Text>
          </Pressable>
          <Pressable
            style={[
              profileStyles.tabButton,
              activeTab === 'comments' && profileStyles.activeTabButton
            ]}
            onPress={() => setActiveTab('comments')}
          >
            <Text 
              style={[
                profileStyles.tabButtonText,
                activeTab === 'comments' && profileStyles.activeTabButtonText
              ]}
            >
              Comments
            </Text>
          </Pressable>
        </View>
        
        <View style={profileStyles.sortContainer}>
          <SortDropdown
            options={sortOptions}
            selectedOption={selectedSort}
            onSelect={setSelectedSort}
          />
        </View>
      </View>
      
      {activeTab === 'posts' ? (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onDelete={handleDeletePost}
              // Removed unused onRefresh prop from usage
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={profileStyles.feed}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#7C3AED']}
              tintColor="#7C3AED"
            />
          }
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <Text style={commonStyles.emptyText}>You haven't posted anything yet</Text>
              <Text style={commonStyles.emptySubtext}>Your posts will appear here</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={comments}
          renderItem={({ item }) => (
            <CommentCard 
              comment={item}
              onDelete={handleDeleteComment}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={profileStyles.feed}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#7C3AED']}
              tintColor="#7C3AED"
            />
          }
          ListEmptyComponent={
            <View style={commonStyles.emptyContainer}>
              <Text style={commonStyles.emptyText}>You haven't commented on any posts yet</Text>
              <Text style={commonStyles.emptySubtext}>Your comments will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
