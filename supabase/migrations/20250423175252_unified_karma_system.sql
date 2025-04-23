-- Migration: Unified Karma System
-- Timestamp: 20250423175252 (Adjusted for UTC)

-- Function to update karma based on post votes
CREATE OR REPLACE FUNCTION public.update_post_vote_karma()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  karma_change integer := 0;
BEGIN
  -- Get the author of the post
  SELECT author_id INTO post_author_id FROM public.posts WHERE id = COALESCE(NEW.post_id, OLD.post_id);

  -- Ensure the voter is not the author
  IF post_author_id IS NOT NULL AND post_author_id != COALESCE(NEW.user_id, OLD.user_id) THEN
    IF TG_OP = 'INSERT' THEN
      -- Vote inserted
      IF NEW.vote_type = 'up' THEN
        karma_change := 1;
      ELSIF NEW.vote_type = 'down' THEN
        karma_change := -1;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Vote updated (e.g., up -> down or down -> up)
      IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
        karma_change := -2; -- Lost upvote (-1), gained downvote (-1)
      ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
        karma_change := 2; -- Lost downvote (+1), gained upvote (+1)
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      -- Vote deleted
      IF OLD.vote_type = 'up' THEN
        karma_change := -1; -- Lost upvote
      ELSIF OLD.vote_type = 'down' THEN
        karma_change := 1; -- Lost downvote
      END IF;
    END IF;

    -- Apply the karma change
    IF karma_change != 0 THEN
      UPDATE public.profiles
      SET karma = karma + karma_change
      WHERE id = post_author_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD); -- Return the new or old row depending on operation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update karma based on comment votes
CREATE OR REPLACE FUNCTION public.update_comment_vote_karma()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id uuid;
  karma_change integer := 0;
BEGIN
  -- Get the author of the comment
  SELECT author_id INTO comment_author_id FROM public.comments WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);

  -- Ensure the voter is not the author
  IF comment_author_id IS NOT NULL AND comment_author_id != COALESCE(NEW.user_id, OLD.user_id) THEN
    IF TG_OP = 'INSERT' THEN
      -- Vote inserted
      IF NEW.vote_type = 'up' THEN
        karma_change := 1;
      ELSIF NEW.vote_type = 'down' THEN
        karma_change := -1;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Vote updated
      IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
        karma_change := -2;
      ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
        karma_change := 2;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      -- Vote deleted
      IF OLD.vote_type = 'up' THEN
        karma_change := -1;
      ELSIF OLD.vote_type = 'down' THEN
        karma_change := 1;
      END IF;
    END IF;

    -- Apply the karma change
    IF karma_change != 0 THEN
      UPDATE public.profiles
      SET karma = karma + karma_change
      WHERE id = comment_author_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the existing handle_new_comment function to include karma logic
-- Renaming it for clarity
CREATE OR REPLACE FUNCTION public.handle_new_comment_karma_and_notify()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_author_id uuid;
  post_author_id uuid;
  comment_count integer;
  parent_author_notify_pref boolean;
  post_author_notify_pref boolean;
BEGIN
  -- Fetch the post author ID early, needed for both replies and direct comments
  SELECT p.author_id INTO post_author_id
  FROM public.posts p
  WHERE p.id = NEW.post_id;

  -- 1. Handle Replies (Notification + Karma)
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT c.author_id, pr.notify_reply_to_comment INTO parent_comment_author_id, parent_author_notify_pref
    FROM public.comments c JOIN public.profiles pr ON c.author_id = pr.id
    WHERE c.id = NEW.parent_comment_id;

    -- Send notification if applicable
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id AND parent_author_notify_pref THEN
      INSERT INTO public.notifications (user_id, type, comment_id, triggering_user_id, metadata)
      VALUES (
        parent_comment_author_id, 'reply_to_comment', NEW.parent_comment_id, NEW.author_id,
        jsonb_build_object('parent_comment_id', NEW.parent_comment_id, 'reply_id', NEW.id)
      );
    END IF;

    -- Award karma for reply to parent comment author
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
       UPDATE public.profiles SET karma = karma + 1 WHERE id = parent_comment_author_id;
    END IF;

    -- Award karma for reply to the original post author
    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
       UPDATE public.profiles SET karma = karma + 1 WHERE id = post_author_id;
    END IF;

  ELSE
    -- 2. Handle Direct Post Comments (Notification + Karma)
    -- post_author_id is already fetched above
    -- Fetch notification preference separately
    SELECT pr.notify_comment_milestone_post INTO post_author_notify_pref
    FROM public.profiles pr
    WHERE pr.id = post_author_id; -- Assuming post_author_id is not null if we reach here

    -- Send notification if applicable
    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id AND post_author_notify_pref THEN
       SELECT count(*) INTO comment_count FROM public.comments WHERE post_id = NEW.post_id;
       INSERT INTO public.notifications (user_id, type, post_id, triggering_user_id, metadata)
       VALUES (post_author_id, 'comment_milestone_post', NEW.post_id, NEW.author_id, jsonb_build_object('comments', comment_count));
    END IF;

    -- Award karma for direct comment to the post author
    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
        UPDATE public.profiles SET karma = karma + 1 WHERE id = post_author_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists (using the old function name)
DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;

-- Create the trigger for new comments using the updated function
CREATE TRIGGER on_comment_inserted_karma_notify
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_karma_and_notify();

-- Create trigger for post votes
DROP TRIGGER IF EXISTS karma_on_post_vote ON public.votes; -- Drop if exists from previous attempts
CREATE TRIGGER karma_on_post_vote
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.update_post_vote_karma();

-- Create trigger for comment votes
DROP TRIGGER IF EXISTS karma_on_comment_vote ON public.comment_votes; -- Drop if exists
CREATE TRIGGER karma_on_comment_vote
AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_vote_karma();

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.update_post_vote_karma() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.update_comment_vote_karma() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_comment_karma_and_notify() TO service_role, authenticated; -- Grant on renamed function
