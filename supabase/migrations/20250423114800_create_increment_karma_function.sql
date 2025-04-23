-- Migration: Create function to atomically increment user karma
-- Timestamp: 20250423114800 (approx UTC)

CREATE OR REPLACE FUNCTION public.increment_karma (user_id_to_update uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER -- Important for allowing updates based on row-level security
AS $$
  UPDATE public.profiles
  SET karma = karma + 1
  WHERE id = user_id_to_update;
$$;

-- Grant execute permission to the authenticated role
-- Adjust the role name if you use a different one for authenticated users
GRANT EXECUTE
  ON FUNCTION public.increment_karma(uuid)
  TO authenticated;
