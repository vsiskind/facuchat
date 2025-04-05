/*
  # Fix Profile Creation Permission

  1. Purpose
    - Allow anonymous users to create profiles during signup
    - Ensure service role can create profiles as needed
    - Maintain user flow with proper email verification

  2. Changes
    - Add policy for anonymous users to insert profiles during signup
    - Add policy for service role to create profiles
    - Maintain strict email verification requirements
*/

-- Adding policies with IF NOT EXISTS to prevent duplicate creation errors
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anonymous users can insert profiles during signup'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Anonymous users can insert profiles during signup"
    ON public.profiles
    FOR INSERT
    TO anon
    WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Service role can create profiles during signup'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Service role can create profiles during signup"
    ON public.profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;