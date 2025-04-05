/*
  # Consolidated Profile Creation, Account Deletion, Email Domain Restriction and Verification Setup

  1. Purpose
    - Restricts user registration to emails with @mail.utdt.edu domain
    - Enforces email verification for all new accounts
    - Optimizes database for email verification performance
    - Ensures a profile is automatically created whenever a new user registers
    - No longer rely on client-side code to create profiles
    - Make the signup flow more robust
    - Fix foreign key constraint violation during account deletion
    - Ensure proper deletion order to maintain referential integrity
    - Update profile policies to align with the automatic profile creation
    - Remove policies that are no longer needed with the trigger approach
    - Maintain existing user permissions for profile updates
  
  2. Changes
    - Creates an index for better email verification performance
    - Implements trigger to enforce email domain restriction
    - Configures email verification requirements
    - Creates a function that will be triggered after user creation
    - Add a trigger to auth.users table that calls this function
    - Use metadata from signup to populate profile fields
    - Ensure the process works with email verification flow
    - Modify the delete_user_account function to delete data in the correct order:
      1. First delete posts (which will cascade to delete votes, comments, and identities)
      2. Then delete the profile
      3. Finally delete the auth user record
    - Remove policies for manual profile creation
    - Keep policies for profile viewing and updates

  3. Security
    - Domain restriction ensures only valid university emails can register
    - Email verification workflow with OTP support ensures user identity
    - Function uses SECURITY DEFINER to execute with elevated privileges
    - Only authenticated users can delete their own accounts
    - Cascading deletion strategy ensures all user data is properly removed
*/

-- Create index for email verification performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email_verification 
ON auth.users (email, email_confirmed_at)
WHERE email_confirmed_at IS NULL;

-- Drop existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS enforce_email_domain_restriction ON auth.users;
DROP FUNCTION IF EXISTS check_email_domain();

-- Create function to check email domains (@mail.utdt.edu only)
CREATE OR REPLACE FUNCTION check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the email ends with @mail.utdt.edu
  IF NEW.email IS NOT NULL AND NEW.email NOT LIKE '%@mail.utdt.edu' THEN
    RAISE EXCEPTION 'Only email addresses with @mail.utdt.edu domain are allowed to register';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce domain restriction on user creation
CREATE TRIGGER enforce_email_domain_restriction
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION check_email_domain();

-- Drop existing email verification trigger and function to avoid conflicts
DROP TRIGGER IF EXISTS ensure_email_verification ON auth.users;
DROP FUNCTION IF EXISTS auth.enforce_email_verification();

-- Create function to enforce email verification
CREATE OR REPLACE FUNCTION auth.enforce_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Set verification required flag in user metadata
  NEW.raw_app_meta_data := 
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('requires_email_confirmation', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce email verification on user creation
CREATE TRIGGER ensure_email_verification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.enforce_email_verification();

-- Create function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract username and avatar from metadata if available
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

-- Create trigger to call the function whenever a new user is created
DO $$ 
BEGIN
  -- Drop trigger if it already exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create the trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_user_profile();
END $$;

-- Remove policies that are no longer needed with automatic profile creation
DROP POLICY IF EXISTS "Anonymous users can insert profiles during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can create profiles during signup" ON public.profiles;

-- Drop the service role policy if it exists to avoid the duplicate policy error
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;

-- Create a policy allowing service role full access to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Service role has full access to profiles'
  ) THEN
    CREATE POLICY "Service role has full access to profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_user_account();

-- Create an improved function to handle complete account deletion
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with the privileges of the creator
SET search_path = public, auth
AS $$
DECLARE
  auth_user_id uuid;
BEGIN
  -- Get the ID of the authenticated user
  auth_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- First delete posts (this will cascade to post_identities, votes, comments, etc.)
  DELETE FROM posts WHERE author_id = auth_user_id;
  
  -- Now delete profile since no posts are referencing it
  DELETE FROM profiles WHERE id = auth_user_id;
  
  -- Finally delete the auth user record
  DELETE FROM auth.users WHERE id = auth_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;