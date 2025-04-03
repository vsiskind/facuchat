/*
  # Account Deletion Functionality

  1. New Functions
    - `delete_user_account` - A secure stored procedure to completely delete a user account and all their data
  
  2. Security
    - Function uses SECURITY DEFINER to execute with elevated privileges
    - Only authenticated users can delete their own accounts
    - Cascading deletion strategy ensures all user data is properly removed
*/

-- Create a function to handle complete account deletion
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

  -- Delete from profiles first
  -- This will cascade delete to all related data because of foreign key constraints
  DELETE FROM profiles WHERE id = auth_user_id;
  
  -- Delete the auth user record
  -- This needs to happen after profile deletion to maintain referential integrity
  DELETE FROM auth.users WHERE id = auth_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;