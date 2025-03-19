import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: {
    username: string;
    avatar_url: string;
  };
  votes: {
    vote_type: string;
  }[];
  comments: {
    id: string;
  }[];
};

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();

    const postsSubscription = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      postsSubscription.unsubscribe();
    };
  }, []);

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          ),
          votes (
            vote_type
          ),
          comments (
            id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const createPost = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posts')
        .insert([
          {
            content,
            author_id: user.id,
          },
        ]);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  const vote = async (postId: string, voteType: 'up' | 'down') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('votes')
        .upsert(
          {
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          },
          {
            onConflict: 'post_id,user_id',
          }
        );

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    vote,
  };
}