import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
  Alert,
  Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';
import { formatDistanceToNow } from 'date-fns';
import { generateRandomUsername, getRandomAvatarUrl } from '../utils/anonymous';
import { SortDropdown, SortOption } from '../../components/SortDropdown';
import { feedStyles, commonStyles } from '../../styles/app.styles';
import { Swipeable } from 'react-native-gesture-handler';
import React from 'react';

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

type Comment = Post['comments'][0] & {
  parent_comment_id?: string | null;
  depth?: number;
  replies?: Comment[];
};

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
  comments: Comment[];
};

function Comment({ 
  comment, 
  postId, 
  onVote,
  onReply,
  onDelete,
  depth = 0 
}: { 
  comment: Comment;
  postId: string;
  onVote: (commentId: string, voteType: 'up' | 'down') => void;
  onReply: (parentCommentId: string) => void;
  onDelete: (commentId: string) => void;
  depth?: number;
}) {
  const [optimisticVotes, setOptimisticVotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [showReplies, setShowReplies] = useState(false);
  const swipeableRef = React.useRef<Swipeable>(null);

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close()
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(comment.id);
            swipeableRef.current?.close();
          }
        }
      ]
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });
    
    return (
      <Animated.View 
        style={[
          feedStyles.swipeDeleteContainer,
          {
            transform: [{ translateX: trans }],
          }
        ]}
      >
        <Pressable
          onPress={handleDelete}
          style={feedStyles.swipeDeleteButton}
        >
          <AppIcon 
            name="trash" 
            size={24} 
            color="#FFFFFF" 
            outline={true} 
          />
        </Pressable>
      </Animated.View>
    );
  };

  const canReply = depth < 3; // Limit nesting to 3 levels
  const hasReplies = comment.replies && comment.replies.length > 0;
  const replyCount = comment.replies?.length || 0;
  
  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <View style={[feedStyles.comment, { marginLeft: depth * 16 }]}>
        <View style={feedStyles.commentHeader}>
          <Image 
            source={{ uri: identity.avatar_url }} 
            style={feedStyles.commentAvatar} 
          />
          <View style={feedStyles.commentAuthorInfo}>
            <Text style={feedStyles.commentUsername}>{identity.username}</Text>
            <Text style={feedStyles.commentTimestamp}>
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </Text>
          </View>
        </View>
        <Text style={feedStyles.commentContent}>{comment.content}</Text>
        <View style={feedStyles.commentActions}>
          <View style={feedStyles.commentVotes}>
            <Pressable 
              onPress={() => handleVote('up')} 
              style={[feedStyles.voteButton, userVote === 'up' && feedStyles.voteButtonActive]}
            >
              <AppIcon 
                name="arrow-up-circle" 
                size={20} 
                color={userVote === 'up' ? '#10B981' : '#666'} 
                outline={userVote !== 'up'} 
              />
            </Pressable>
            <Text style={[
              feedStyles.voteCount,
              optimisticVotes > 0 && feedStyles.upvoteText,
              optimisticVotes < 0 && feedStyles.downvoteText
            ]}>
              {optimisticVotes}
            </Text>
            <Pressable 
              onPress={() => handleVote('down')} 
              style={[feedStyles.voteButton, userVote === 'down' && feedStyles.voteButtonActive]}
            >
              <AppIcon 
                name="arrow-down-circle" 
                size={20} 
                color={userVote === 'down' ? '#EF4444' : '#666'} 
                outline={userVote !== 'down'} 
              />
            </Pressable>
          </View>
          
          {canReply && (
            <Pressable 
              style={feedStyles.replyButton} 
              onPress={() => onReply(comment.id)}
            >
              <AppIcon name="chatbubble" size={16} color="#666" outline={true} />
              <Text style={feedStyles.replyButtonText}>Reply</Text>
            </Pressable>
          )}
          
          {hasReplies && (
            <Pressable 
              style={feedStyles.toggleRepliesButton} 
              onPress={() => setShowReplies(!showReplies)}
            >
              <AppIcon 
                name={showReplies ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#666" 
                outline={true} 
              />
              <Text style={feedStyles.toggleRepliesText}>
                {showReplies ? "Hide replies" : `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </Pressable>
          )}
        </View>

        {hasReplies && showReplies && (
          comment.replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              onVote={onVote}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))
        )}
      </View>
    </Swipeable>
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const generateNewIdentity = () => {
    setCommentUsername(generateRandomUsername());
    setCommentAvatar(getRandomAvatarUrl());
  };

  useEffect(() => {
    if (visible) {
      generateNewIdentity();
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting comment:', error);
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
          parent_comment_id: replyingTo,
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
      setReplyingTo(null);
      // Generate a new identity after successful comment submission
      generateNewIdentity();
      onRefresh();
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId);
    // Generate a new identity when starting a reply
    generateNewIdentity();
  };

  const organizedComments = useMemo(() => {
    const commentMap = new Map<string, Comment>();
    const topLevelComments: Comment[] = [];
    
    // First pass: create a map of all comments
    post.comments?.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    // Second pass: organize into tree structure
    post.comments?.forEach(comment => {
      const currentComment = commentMap.get(comment.id)!;
      if (comment.parent_comment_id) {
        const parentComment = commentMap.get(comment.parent_comment_id);
        if (parentComment) {
          parentComment.replies = parentComment.replies || [];
          parentComment.replies.push(currentComment);
        } else {
          // If parent doesn't exist (perhaps deleted), add as top-level
          topLevelComments.push(currentComment);
        }
      } else {
        topLevelComments.push(currentComment);
      }
    });
    
    // Sort top-level comments by creation date (newest first)
    return topLevelComments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [post.comments]);

  const replyingToComment = replyingTo ? post.comments.find(c => c.id === replyingTo) : null;
  const replyingToIdentity = replyingToComment?.comment_identities?.[0]?.username || 'Anonymous';

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={feedStyles.modalContainer}
      >
        <View style={feedStyles.flyoutContent}>
          <View style={feedStyles.flyoutHeader}>
            <Text style={feedStyles.flyoutTitle}>Comments</Text>
            <Pressable onPress={onClose} style={feedStyles.closeButton}>
              <AppIcon name="close" size={24} color="#666" outline={true} />
            </Pressable>
          </View>

          <ScrollView style={feedStyles.commentsList}>
            {organizedComments.length === 0 ? (
              <View style={feedStyles.emptyContainer}>
                <Text style={feedStyles.emptyText}>No comments yet</Text>
                <Text style={feedStyles.emptySubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              organizedComments.map(comment => (
                <Comment 
                  key={comment.id} 
                  comment={comment} 
                  postId={post.id}
                  onVote={handleCommentVote}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  depth={0}
                />
              ))
            )}
          </ScrollView>

          <View style={feedStyles.commentInputContainer}>
            {replyingTo && (
              <View style={feedStyles.replyingToContainer}>
                <Text style={feedStyles.replyingToText}>
                  Replying to {replyingToIdentity}
                </Text>
                <Pressable
                  style={feedStyles.cancelReplyButton}
                  onPress={() => setReplyingTo(null)}
                >
                  <AppIcon name="close" size={16} color="#666" outline={true} />
                </Pressable>
              </View>
            )}
            
            <View style={feedStyles.identityPreview}>
              <Image 
                source={{ uri: commentAvatar }} 
                style={feedStyles.previewAvatar} 
              />
              <Text style={feedStyles.previewUsername}>{commentUsername}</Text>
            </View>
            
            <View style={feedStyles.inputRow}>
              <TextInput
                style={feedStyles.commentInput}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                editable={!isSubmitting}
              />
              <Pressable
                style={[
                  feedStyles.sendButton,
                  (!commentText.trim() || isSubmitting) && feedStyles.sendButtonDisabled
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
    <View style={feedStyles.postCard}>
      <View style={feedStyles.postHeader}>
        <Image 
          source={{ uri: identity.avatar_url }} 
          style={feedStyles.avatar} 
        />
        <View style={feedStyles.authorInfo}>
          <Text style={feedStyles.username}>{identity.username}</Text>
          <Text style={feedStyles.timestamp}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>
      
      <Text style={feedStyles.content}>{post.content}</Text>
      
      <View style={feedStyles.actions}>
        <View style={feedStyles.votes}>
          <Pressable 
            onPress={() => handlePostVote('up')} 
            style={[feedStyles.voteButton, userVote === 'up' && feedStyles.voteButtonActive]}
          >
            <AppIcon 
              name="arrow-up-circle" 
              size={24} 
              color={userVote === 'up' ? '#10B981' : '#666'} 
              outline={userVote !== 'up'} 
            />
          </Pressable>
          <Text style={[
            feedStyles.voteCount,
            optimisticVotes > 0 && feedStyles.upvoteText,
            optimisticVotes < 0 && feedStyles.downvoteText
          ]}>
            {optimisticVotes}
          </Text>
          <Pressable 
            onPress={() => handlePostVote('down')} 
            style={[feedStyles.voteButton, userVote === 'down' && feedStyles.voteButtonActive]}
          >
            <AppIcon 
              name="arrow-down-circle" 
              size={24} 
              color={userVote === 'down' ? '#EF4444' : '#666'} 
              outline={userVote !== 'down'} 
            />
          </Pressable>
        </View>
        
        <Pressable 
          style={feedStyles.commentCount} 
          onPress={() => setShowComments(true)}
        >
          <AppIcon name="chatbubble" size={20} color="#666" outline={true} />
          <Text style={feedStyles.commentCountText}>
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
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);
  const [rawPosts, setRawPosts] = useState<Post[]>([]);

  const fetchPosts = useCallback(async () => {
    try {
      let query = supabase
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
            parent_comment_id,
            depth,
            comment_identities (*),
            comment_votes (*)
          )
        `);

      const { data, error } = await query;
      if (error) throw error;
      setRawPosts(data as Post[]);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
        
        case 'popular': {
          const aVotes = getVoteCount(a);
          const bVotes = getVoteCount(b);
          
          // If both posts have the same sign (both positive, both negative, or both zero)
          if ((aVotes >= 0 && bVotes >= 0) || (aVotes <= 0 && bVotes <= 0)) {
            return bVotes - aVotes; // Higher votes first
          }
          // If signs are different, positive goes first
          return bVotes > 0 ? 1 : -1;
        }
        
        case 'controversial': {
          const aVotes = getVoteCount(a);
          const bVotes = getVoteCount(b);
          
          // If both posts have the same sign (both positive, both negative, or both zero)
          if ((aVotes >= 0 && bVotes >= 0) || (aVotes <= 0 && bVotes <= 0)) {
            return aVotes - bVotes; // Lower votes first
          }
          // If signs are different, negative goes first
          return aVotes < 0 ? -1 : 1;
        }
        
        default:
          return 0;
      }
    });
  }, [rawPosts, selectedSort.id]);

  useEffect(() => {
    setPosts(sortedPosts);
  }, [sortedPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  if (loading && !refreshing) {
    return (
      <View style={feedStyles.container}>
        <View style={feedStyles.header}>
          <Text style={feedStyles.title}>Campus Connect</Text>
        </View>
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={feedStyles.container}>
        <View style={feedStyles.header}>
          <Text style={feedStyles.title}>Campus Connect</Text>
        </View>
        <View style={commonStyles.errorContainer}>
          <Text style={commonStyles.errorText}>Error: {error}</Text>
          <Pressable style={commonStyles.retryButton} onPress={fetchPosts}>
            <Text style={commonStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={feedStyles.container}>
      <View style={feedStyles.header}>
        <Text style={feedStyles.title}>Campus Connect</Text>
      </View>
      
      <View style={feedStyles.sortContainer}>
        <SortDropdown
          options={sortOptions}
          selectedOption={selectedSort}
          onSelect={setSelectedSort}
        />
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard post={item} onRefresh={fetchPosts} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={feedStyles.feed}
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
            <Text style={commonStyles.emptyText}>No posts yet</Text>
            <Text style={commonStyles.emptySubtext}>
              Be the first to share something with your campus!
            </Text>
          </View>
        }
      />
    </View>
  );
}