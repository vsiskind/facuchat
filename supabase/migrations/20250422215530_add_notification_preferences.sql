-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN notify_like_milestone_post BOOLEAN DEFAULT true,
ADD COLUMN notify_like_milestone_comment BOOLEAN DEFAULT true,
ADD COLUMN notify_comment_milestone_post BOOLEAN DEFAULT true,
ADD COLUMN notify_reply_to_comment BOOLEAN DEFAULT true;

-- Note: Ensure RLS policies allow users to update their own profiles.
-- Example policy (if needed, check existing policies first):
-- CREATE POLICY "Allow users to update their own notification settings"
-- ON public.profiles FOR UPDATE USING (auth.uid() = id)
-- WITH CHECK (auth.uid() = id);
