-- Migration: Add Push Token, Notifications Table, and Triggers
-- Timestamp: 20250422175300 (approx UTC)

-- Phase 1.1: Add push_token column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Phase 1.2: Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Recipient
    type TEXT NOT NULL CHECK (type IN ('like_milestone_post', 'like_milestone_comment', 'comment_milestone_post', 'reply_to_comment')),
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    triggering_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who caused the event
    metadata jsonb, -- e.g., {"likes": 10}, {"comments": 5}, {"parent_comment_id": "...", "reply_id": "..."}
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    push_sent_at timestamptz, -- Timestamp when the push notification was attempted/sent
    CONSTRAINT chk_notification_target CHECK (num_nonnulls(post_id, comment_id) <= 1) -- Can be related to a post OR a comment OR neither (future use)
);

-- Add index for querying notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Enable RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications table
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (or other updates)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role has full access (needed for triggers/functions potentially)
DROP POLICY IF EXISTS "Service role has full access to notifications" ON public.notifications;
CREATE POLICY "Service role has full access to notifications"
    ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- Phase 1.3: Create Trigger Functions and Triggers

-- Function to handle new votes on POSTS
CREATE OR REPLACE FUNCTION public.handle_new_post_vote()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  vote_count integer;
  milestone integer;
  notification_exists boolean;
BEGIN
  -- Only proceed for 'up' votes
  IF NEW.vote_type = 'up' THEN
    -- Get the author of the post
    SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;

    -- Count the total 'up' votes for this post
    SELECT count(*) INTO vote_count FROM public.votes WHERE post_id = NEW.post_id AND vote_type = 'up';

    -- Check for milestones (10, 20, 50)
    IF vote_count IN (10, 20, 50) THEN
      milestone := vote_count;

      -- Check if a notification for this specific milestone already exists for this post/author
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = post_author_id
          AND post_id = NEW.post_id
          AND type = 'like_milestone_post'
          AND (metadata->>'likes')::int = milestone
      ) INTO notification_exists;

      -- Insert notification if it doesn't exist and the voter is not the author
      IF NOT notification_exists AND post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, post_id, triggering_user_id, metadata)
        VALUES (post_author_id, 'like_milestone_post', NEW.post_id, NEW.user_id, jsonb_build_object('likes', milestone));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on votes table
DROP TRIGGER IF EXISTS on_post_vote_inserted ON public.votes;
CREATE TRIGGER on_post_vote_inserted
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_post_vote();


-- Function to handle new votes on COMMENTS
CREATE OR REPLACE FUNCTION public.handle_new_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id uuid;
  vote_count integer;
  milestone integer;
  notification_exists boolean;
BEGIN
  -- Only proceed for 'up' votes
  IF NEW.vote_type = 'up' THEN
    -- Get the author of the comment
    SELECT author_id INTO comment_author_id FROM public.comments WHERE id = NEW.comment_id;

    -- Count the total 'up' votes for this comment
    SELECT count(*) INTO vote_count FROM public.comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'up';

    -- Check for milestones (10, 20, 50)
    IF vote_count IN (10, 20, 50) THEN
      milestone := vote_count;

      -- Check if a notification for this specific milestone already exists for this comment/author
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = comment_author_id
          AND comment_id = NEW.comment_id
          AND type = 'like_milestone_comment'
          AND (metadata->>'likes')::int = milestone
      ) INTO notification_exists;

      -- Insert notification if it doesn't exist and the voter is not the author
      IF NOT notification_exists AND comment_author_id IS NOT NULL AND comment_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, type, comment_id, triggering_user_id, metadata)
        VALUES (comment_author_id, 'like_milestone_comment', NEW.comment_id, NEW.user_id, jsonb_build_object('likes', milestone));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on comment_votes table
DROP TRIGGER IF EXISTS on_comment_vote_inserted ON public.comment_votes;
CREATE TRIGGER on_comment_vote_inserted
  AFTER INSERT ON public.comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_vote();


-- Function to handle new COMMENTS (for replies and post comment milestones)
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  post_author_id uuid;
  comment_count integer;
  milestone integer;
  notification_exists boolean;
BEGIN
  -- 1. Handle Replies
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- Get the author of the parent comment
    SELECT author_id INTO parent_comment_author_id FROM public.comments WHERE id = NEW.parent_comment_id;

    -- Insert notification for the parent comment author, if they are not the one replying
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      INSERT INTO public.notifications (user_id, type, comment_id, post_id, triggering_user_id, metadata)
      VALUES (
        parent_comment_author_id,
        'reply_to_comment',
        NEW.parent_comment_id, -- The comment being replied to
        NEW.post_id,           -- Context: the post the comment belongs to
        NEW.author_id,         -- User who made the reply
        jsonb_build_object('parent_comment_id', NEW.parent_comment_id, 'reply_id', NEW.id)
      );
    END IF;
  END IF;

  -- 2. Handle Post Comment Milestones
  -- Get the author of the post
  SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;

  -- Count the total comments for this post
  SELECT count(*) INTO comment_count FROM public.comments WHERE post_id = NEW.post_id;

    -- Check if the commenter is not the post author before inserting notification
    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
      -- Insert notification for the post author about the new comment
      -- We no longer check for milestones or existing notifications for *every* comment
      INSERT INTO public.notifications (user_id, type, post_id, triggering_user_id, metadata)
      VALUES (post_author_id, 'comment_milestone_post', NEW.post_id, NEW.author_id, jsonb_build_object('comments', comment_count)); -- Store current count in metadata
    END IF;
  END IF; -- This closes the "IF NEW.parent_comment_id IS NOT NULL THEN" block from replies section

  -- Note: The previous milestone logic (IF comment_count IN ...) has been removed.
  -- Now, a notification is potentially created for *every* comment if the author is different.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on comments table
DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;
CREATE TRIGGER on_comment_inserted
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();
