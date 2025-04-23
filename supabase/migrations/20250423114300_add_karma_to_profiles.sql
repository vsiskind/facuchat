-- Migration: Add karma column to profiles table
-- Timestamp: 20250423114300 (approx UTC)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS karma INTEGER NOT NULL DEFAULT 0;

-- Optional: Add an index if you plan to query/sort by karma frequently
-- CREATE INDEX IF NOT EXISTS idx_profiles_karma ON public.profiles(karma);

-- Backfill existing users with 0 karma if needed (though DEFAULT 0 should handle new rows)
-- UPDATE public.profiles SET karma = 0 WHERE karma IS NULL;
-- Note: The above UPDATE is likely redundant due to NOT NULL DEFAULT 0,
-- but included for completeness in case of edge scenarios during ALTER.
