-- Consolidated Schema Migration
-- Timestamp: 20250423160000

-- Phase 1: Create Tables

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  push_token TEXT, -- Added in 20250422175300
  notify_like_milestone_post BOOLEAN DEFAULT true, -- Added in 20250422215530
  notify_like_milestone_comment BOOLEAN DEFAULT true, -- Added in 20250422215530
  notify_comment_milestone_post BOOLEAN DEFAULT true, -- Added in 20250422215530
  notify_reply_to_comment BOOLEAN DEFAULT true, -- Added in 20250422215530
  karma INTEGER NOT NULL DEFAULT 0 -- Added in 20250423114300
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create votes table (for posts)
CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL, -- Cascade added 20250319215620
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type text CHECK (vote_type IN ('up', 'down')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL, -- Cascade added/validated 20250423150816
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE, -- Added 20250321004645
  depth integer NOT NULL DEFAULT 0, -- Added 20250321004645
  CONSTRAINT max_reply_depth CHECK (depth <= 3) -- Added 20250321004645
);

-- Create post_identities table
CREATE TABLE IF NOT EXISTS public.post_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL, -- Cascade added 20250319215620
  username text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create comment_identities table
CREATE TABLE IF NOT EXISTS public.comment_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL, -- Added 20250325140103
  username text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS public.comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL, -- Added 20250325140103
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Added 20250325140103
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Recipient
    type TEXT NOT NULL CHECK (type IN ('like_milestone_post', 'like_milestone_comment', 'comment_milestone_post', 'reply_to_comment')),
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    triggering_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who caused the event
    metadata jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    push_sent_at timestamptz,
    CONSTRAINT chk_notification_target CHECK (num_nonnulls(post_id, comment_id) <= 1)
);

-- Phase 2: Create Indexes
CREATE INDEX IF NOT EXISTS idx_auth_users_email_verification ON auth.users (email, email_confirmed_at) WHERE email_confirmed_at IS NULL; -- Added 20250403043516
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_comment_id); -- Added 20250321004645
CREATE INDEX IF NOT EXISTS comments_depth_idx ON public.comments(depth); -- Added 20250321004645
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id); -- Added 20250422175300
CREATE INDEX IF NOT EXISTS comments_author_created_idx ON public.comments USING btree (author_id, created_at DESC); -- Added 20250423150816

-- Phase 3: Create Functions

-- Function to update 'updated_at' column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate comment depth
CREATE OR REPLACE FUNCTION public.calculate_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth
    FROM public.comments
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check email domain
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email NOT LIKE '%@mail.utdt.edu' THEN
    RAISE EXCEPTION 'Only email addresses with @mail.utdt.edu domain are allowed to register';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce email verification (in auth schema)
CREATE OR REPLACE FUNCTION auth.enforce_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  NEW.raw_app_meta_data :=
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('requires_email_confirmation', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'requested_username', 'user_' || substr(NEW.id::text, 0, 8)),
    COALESCE(NEW.raw_app_meta_data->>'requested_avatar', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Ensure function has proper permissions
ALTER FUNCTION public.create_user_profile() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO service_role;

-- Function to handle complete account deletion
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  auth_user_id uuid;
BEGIN
  auth_user_id := auth.uid();
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Delete posts first (cascades to votes, comments, post_identities, comment_votes, comment_identities, notifications via FKs)
  DELETE FROM public.posts WHERE author_id = auth_user_id;
  -- Delete profile (cascades notifications via FK)
  DELETE FROM public.profiles WHERE id = auth_user_id;
  -- Delete auth user
  DELETE FROM auth.users WHERE id = auth_user_id;
END;
$$;
-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Function to handle new votes on POSTS (for notifications)
CREATE OR REPLACE FUNCTION public.handle_new_post_vote()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  vote_count integer;
  milestone integer;
  notification_exists boolean;
  author_notify_pref boolean;
BEGIN
  IF NEW.vote_type = 'up' THEN
    SELECT p.author_id, pr.notify_like_milestone_post INTO post_author_id, author_notify_pref
    FROM public.posts p JOIN public.profiles pr ON p.author_id = pr.id
    WHERE p.id = NEW.post_id;

    IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id AND author_notify_pref THEN
      SELECT count(*) INTO vote_count FROM public.votes WHERE post_id = NEW.post_id AND vote_type = 'up';
      IF vote_count IN (10, 20, 50) THEN
        milestone := vote_count;
        SELECT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = post_author_id
            AND post_id = NEW.post_id
            AND type = 'like_milestone_post'
            AND (metadata->>'likes')::int = milestone
        ) INTO notification_exists;
        IF NOT notification_exists THEN
          INSERT INTO public.notifications (user_id, type, post_id, triggering_user_id, metadata)
          VALUES (post_author_id, 'like_milestone_post', NEW.post_id, NEW.user_id, jsonb_build_object('likes', milestone));
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new votes on COMMENTS (for notifications)
CREATE OR REPLACE FUNCTION public.handle_new_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id uuid;
  vote_count integer;
  milestone integer;
  notification_exists boolean;
  author_notify_pref boolean;
BEGIN
  IF NEW.vote_type = 'up' THEN
    SELECT c.author_id, pr.notify_like_milestone_comment INTO comment_author_id, author_notify_pref
    FROM public.comments c JOIN public.profiles pr ON c.author_id = pr.id
    WHERE c.id = NEW.comment_id;

    IF comment_author_id IS NOT NULL AND comment_author_id != NEW.user_id AND author_notify_pref THEN
      SELECT count(*) INTO vote_count FROM public.comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'up';
      IF vote_count IN (10, 20, 50) THEN
        milestone := vote_count;
        SELECT EXISTS (
          SELECT 1 FROM public.notifications
          WHERE user_id = comment_author_id
            AND comment_id = NEW.comment_id
            AND type = 'like_milestone_comment'
            AND (metadata->>'likes')::int = milestone
        ) INTO notification_exists;
        IF NOT notification_exists THEN
          INSERT INTO public.notifications (user_id, type, comment_id, triggering_user_id, metadata)
          VALUES (comment_author_id, 'like_milestone_comment', NEW.comment_id, NEW.user_id, jsonb_build_object('likes', milestone));
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new COMMENTS (for replies and post comment notifications)
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  post_author_id uuid;
  comment_count integer;
  parent_author_notify_pref boolean;
  post_author_notify_pref boolean;
BEGIN
  -- 1. Handle Replies
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT c.author_id, pr.notify_reply_to_comment INTO parent_comment_author_id, parent_author_notify_pref
    FROM public.comments c JOIN public.profiles pr ON c.author_id = pr.id
    WHERE c.id = NEW.parent_comment_id;

    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id AND parent_author_notify_pref THEN
      INSERT INTO public.notifications (user_id, type, comment_id, triggering_user_id, metadata)
      VALUES (
        parent_comment_author_id, 'reply_to_comment', NEW.parent_comment_id, NEW.author_id,
        jsonb_build_object('parent_comment_id', NEW.parent_comment_id, 'reply_id', NEW.id)
      );
    END IF;
  END IF;

  -- 2. Handle Post Comment Notifications (No longer milestone based per 20250422175300 logic)
  SELECT p.author_id, pr.notify_comment_milestone_post INTO post_author_id, post_author_notify_pref
  FROM public.posts p JOIN public.profiles pr ON p.author_id = pr.id
  WHERE p.id = NEW.post_id;

  IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id AND post_author_notify_pref THEN
     SELECT count(*) INTO comment_count FROM public.comments WHERE post_id = NEW.post_id;
     INSERT INTO public.notifications (user_id, type, post_id, triggering_user_id, metadata)
     VALUES (post_author_id, 'comment_milestone_post', NEW.post_id, NEW.author_id, jsonb_build_object('comments', comment_count));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Phase 4: Create Triggers

-- Drop existing triggers first to ensure idempotency
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
DROP TRIGGER IF EXISTS set_comment_depth ON public.comments;
DROP TRIGGER IF EXISTS enforce_email_domain_restriction ON auth.users;
DROP TRIGGER IF EXISTS ensure_email_verification ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_post_vote_inserted ON public.votes;
DROP TRIGGER IF EXISTS on_comment_vote_inserted ON public.comment_votes;
DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;
DROP TRIGGER IF EXISTS "SendPushNotificationsTrigger" ON public.notifications;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Create trigger to set comment depth
CREATE TRIGGER set_comment_depth BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.calculate_comment_depth();

-- Create trigger to enforce domain restriction on user creation
CREATE TRIGGER enforce_email_domain_restriction BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.check_email_domain();

-- Create trigger to enforce email verification on user creation
CREATE TRIGGER ensure_email_verification AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.enforce_email_verification();

-- Create trigger to automatically create profile on user creation
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.create_user_profile();

-- Create triggers for notification generation
CREATE TRIGGER on_post_vote_inserted AFTER INSERT ON public.votes FOR EACH ROW EXECUTE FUNCTION public.handle_new_post_vote();
CREATE TRIGGER on_comment_vote_inserted AFTER INSERT ON public.comment_votes FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_vote();
CREATE TRIGGER on_comment_inserted AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- Create trigger to call push notification function
CREATE TRIGGER "SendPushNotificationsTrigger" AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://rijrjhhctaeyiqbzktmf.supabase.co/functions/v1/send-push-notifications', 'POST', '{"Content-type":"application/json"}', '{}', '5000');


-- Phase 5: Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Phase 6: Define RLS Policies (Drop existing before creating)

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Note: Insert policies removed due to automatic creation trigger (in 20250405042522)

DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies for posts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Policies for votes (post votes)
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
CREATE POLICY "Users can update own votes" ON public.votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;
CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Policies for post_identities
DROP POLICY IF EXISTS "Post identities are viewable by everyone" ON public.post_identities;
CREATE POLICY "Post identities are viewable by everyone" ON public.post_identities FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can create post identities for their own posts" ON public.post_identities;
CREATE POLICY "Users can create post identities for their own posts" ON public.post_identities FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own post identities" ON public.post_identities;
CREATE POLICY "Users can update their own post identities" ON public.post_identities FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.author_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own post identities" ON public.post_identities;
CREATE POLICY "Users can delete their own post identities" ON public.post_identities FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.author_id = auth.uid()));

-- Policies for comment_identities
DROP POLICY IF EXISTS "Comment identities are viewable by everyone" ON public.comment_identities;
CREATE POLICY "Comment identities are viewable by everyone" ON public.comment_identities FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can create identities for their own comments" ON public.comment_identities;
CREATE POLICY "Users can create identities for their own comments" ON public.comment_identities FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.comments WHERE comments.id = comment_id AND comments.author_id = auth.uid()));

-- Policies for comment_votes
DROP POLICY IF EXISTS "Comment votes are viewable by everyone" ON public.comment_votes;
CREATE POLICY "Comment votes are viewable by everyone" ON public.comment_votes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can vote on comments" ON public.comment_votes;
CREATE POLICY "Users can vote on comments" ON public.comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON public.comment_votes;
CREATE POLICY "Users can update their own votes" ON public.comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON public.comment_votes;
CREATE POLICY "Users can delete their own votes" ON public.comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to notifications" ON public.notifications;
CREATE POLICY "Service role has full access to notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
