import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';
import { formatDistanceToNow } from 'date-fns';
import { generateRandomUsername, getRandomAvatarUrl } from '../utils/anonymous';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';
const UPVOTE_COLOR = '#10B981';
const DOWNVOTE_COLOR = '#EF4444';

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
    content: string;
    created_at: string;
    author_id: string;
    comment_identities: {
      username: string;
      avatar_url: string;
    }[];
    comment_votes: {
      id: string;
      vote_type: 'up' | 'down';
      user_id: string;
    }[];
  }[];
};

function Comment({ comment, postId, onVote }: { 
  comment: Post['comments'][0];
  postId: string;
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
}) {
  const [optimisticVotes, setOptimisticVotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const upvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'up').length || 0;
    const downvotes = comment.comment_votes?.filter(vote => vote.vote_type === 'down').length || 0;
    setOptimisticVotes(upvotes - downvotes);
  }, [comment.comment_votes]);

  const identity = comment.comment_identities[0] || {
    username: 'Anonymous',
    avatar_url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed'
  };

  const handleVote = (voteType: 'up' | 'down') => {
    if (userVote === voteType) {
      setUserVote(null);
      setOptimisticVotes(voteType === 'up' ? optimisticVotes - 1 : optimisticVotes + 1);
    } else {
      const oldVote = userVote;
      setUserVote(voteType);
      if (oldVote) {
        setOptimisticVotes(voteType === 'up' ? optimisticVotes + 2 : optimisticVotes - 2);
      } else {
        setOptimisticVotes(voteType === 'up' ? optimisticVotes + 1 : optimisticVotes - 1);
      }
    }
    onVote(comment.id, voteType);
  };

  return (
    <View style={styles.comment}>
      <View style={styles.commentHeader}>
        <Image 
          source={{ uri: identity.avatar_url }} 
          style={styles.commentAvatar} 
        />
        <View style={styles.commentAuthorInfo}>
          <Text style={styles.commentUsername}>{identity.username}</Text>
          <Text style={styles.commentTimestamp}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
      <View style={styles.commentActions}>
        <Pressable 
          onPress={() => handleVote('up')} 
          style={[styles.voteButton, userVote === 'up' && styles.voteButtonActive]}
        >
          <AppIcon 
            name="arrow-up-circle" 
            size={20} 
            color={userVote === 'up' ? UPVOTE_COLOR : '#666'} 
            outline={userVote !== 'up'} 
          />
        </Pressable>
        <Text style={[
          styles.voteCount,
          optimisticVotes > 0 && styles.upvoteText,
          optimisticVotes < 0 && styles.downvoteText
        ]}>
          {optimisticVotes}
        </Text>
        <Pressable 
          onPress={() => handleVote('down')} 
          style={[styles.voteButton, userVote === 'down' && styles.voteButtonActive]}
        >
          <AppIcon 
            name="arrow-down-circle" 
            size={20} 
            color={userVote === 'down' ? DOWNVOTE_COLOR : '#666'} 
            outline={userVote !== 'down'} 
          />
        </Pressable>
      </View>
    </View>
  );
}

function CommentsFlyout({ 
  post, 
  visible, 
  onClose, 
  onRefresh 
}: { 
  post: Post; 
  visible: boolean; 
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentUsername, setCommentUsername] = useState('');
  const [commentAvatar, setCommentAvatar] = useState('');

  useEffect(() => {
    if (visible) {
      setCommentUsername(generateRandomUsername());
      setCommentAvatar(getRandomAvatarUrl());
    }
  }, [visible]);

  const handleCommentVote = async (commentId: string, voteType: 'up' | 'down') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('comment_votes')
        .upsert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType,
        }, {
          onConflict: 'comment_id,user_id'
        });

      onRefresh();
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newComment, error: commentError } = await supabase
        .from('comments')
        .insert([{
          post_id: post.id,
          author_id: user.id,
          content: commentText,
        }])
        .select('id')
        .single();

      if (commentError) throw commentError;

      if (newComment) {
        const { error: identityError } = await supabase
          .from('comment_identities')
          .insert([{
            comment_id: newComment.id,
            username: commentUsername,
            avatar_url: commentAvatar,
          }]);

        if (identityError) throw identityError;
      }

      setCommentText('');
      onRefresh();
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.flyoutContent}>
          <View style={styles.flyoutHeader}>
            <Text style={styles.flyoutTitle}>Comments</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <AppIcon name="close" size={24} color="#666" outline={true} />
            </Pressable>
          </View>

          <ScrollView style={styles.commentsList}>
            {post.comments?.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              post.comments?.map(comment => (
                <Comment 
                  key={comment.id} 
                  comment={comment} 
                  postId={post.id}
                  onVote={handleCommentVote}
                />
              ))
            )}
          </ScrollView>

          <View style={styles.commentInputContainer}>
            <View style={styles.identityPreview}>
              <Image 
                source={{ uri: commentAvatar }} 
                style={styles.previewAvatar} 
              />
              <Text style={styles.previewUsername}>{commentUsername}</Text>
            </View>
            
            <View style={styles.inputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                editable={!isSubmitting}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <AppIcon name="arrow-up" size={24} color="#FFFFFF" outline={true} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PostCard({ post, onRefresh }: { post: Post; onRefresh: () => void }) {
  const [optimisticVotes, setOptimisticVotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const upvotes = post.votes?.filter(vote => vote.vote_type === 'up').length || 0;
    const downvotes = post.votes?.filter(vote => vote.vote_type === 'down').length || 0;
    setOptimisticVotes(upvotes - downvotes);
  }, [post.votes]);

  const identity = post.post_identities[0] || {
    username: 'Anonymous',
    avatar_url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=default&backgroundColor=7c3aed'
  };

  const handlePostVote = async (voteType: 'up' | 'down') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (userVote === voteType) {
        setUserVote(null);
        setOptimisticVotes(voteType === 'up' ? optimisticVotes - 1 : optimisticVotes + 1);
      } else {
        const oldVote = userVote;
        setUserVote(voteType);
        if (oldVote) {
          setOptimisticVotes(voteType === 'up' ? optimisticVotes + 2 : optimisticVotes - 2);
        } else {
          setOptimisticVotes(voteType === 'up' ? optimisticVotes + 1 : optimisticVotes - 1);
        }
      }

      await supabase
        .from('votes')
        .upsert({
          post_id: post.id,
          user_id: user.id,
          vote_type: voteType,
        }, {
          onConflict: 'post_id,user_id'
        });

    } catch (error) {
      console.error('Error voting on post:', error);
      onRefresh();
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: identity.avatar_url }} 
          style={styles.avatar} 
        />
        <View style={styles.authorInfo}>
          <Text style={styles.username}>{identity.username}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      <View style={styles.actions}>
        <View style={styles.votes}>
          <Pressable 
            onPress={() => handlePostVote('up')} 
            style={[styles.voteButton, userVote === 'up' && styles.voteButtonActive]}
          >
            <AppIcon 
              name="arrow-up-circle" 
              size={24} 
              color={userVote === 'up' ? UPVOTE_COLOR : '#666'} 
              outline={userVote !== 'up'} 
            />
          </Pressable>
          <Text style={[
            styles.voteCount,
            optimisticVotes > 0 && styles.upvoteText,
            optimisticVotes < 0 && styles.downvoteText
          ]}>
            {optimisticVotes}
          </Text>
          <Pressable 
            onPress={() => handlePostVote('down')} 
            style={[styles.voteButton, userVote === 'down' && styles.voteButtonActive]}
          >
            <AppIcon 
              name="arrow-down-circle" 
              size={24} 
              color={userVote === 'down' ? DOWNVOTE_COLOR : '#666'} 
              outline={userVote !== 'down'} 
            />
          </Pressable>
        </View>
        
        <Pressable 
          style={styles.commentCount} 
          onPress={() => setShowComments(true)}
        >
          <AppIcon name="chatbubble" size={20} color="#666" outline={true} />
          <Text style={styles.commentCountText}>
            {post.comments?.length || 0} comments
          </Text>
        </Pressable>
      </View>

      <CommentsFlyout
        post={post}
        visible={showComments}
        onClose={() => setShowComments(false)}
        onRefresh={onRefresh}
      />
    </View>
  );
}

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_identities (*),
          votes (*),
          comments (
            id,
            content,
            created_at,
            author_id,
            comment_identities (*),
            comment_votes (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data as Post[]);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Campus Connect</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Campus Connect</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchPosts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Campus Connect</Text>
      </View>
      
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard post={item} onRefresh={fetchPosts} />
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
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to share something with your campus!
            </Text>
          </View>
        }
      />
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
    paddingTop: Platform.OS === 'web' ? 16 : 60,
    backgroundColor: HEADER_BG_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feed: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
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
    padding: 16,
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
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A1A',
    padding: 16,
    paddingTop: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  votes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  voteButton: {
    padding: 4,
  },
  voteButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  upvoteText: {
    color: UPVOTE_COLOR,
  },
  downvoteText: {
    color: DOWNVOTE_COLOR,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  commentCountText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  flyoutContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  flyoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  flyoutTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 8,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  emptyComments: {
    padding: 24,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyCommentsSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  comment: {
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_COLOR,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666666',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  identityPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  previewUsername: {
    fontSize: 14,
    color: ACCENT_COLOR,
    fontWeight: '500',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: ACCENT_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});