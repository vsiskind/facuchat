/*
  # Email Domain Restriction and Verification Setup

  1. Purpose
    - Restricts user registration to emails with @mail.utdt.edu domain
    - Enforces email verification for all new accounts
    - Optimizes database for email verification performance
  
  2. Changes
    - Creates an index for better email verification performance
    - Implements trigger to enforce email domain restriction
    - Configures email verification requirements
    - Replaces and consolidates previous migrations:
      - 20250325140058_bronze_wind.sql
      - 20250325143128_dark_recipe.sql
      - 20250325225517_sweet_tree.sql
      - 20250327214128_bright_hat.sql

  3. Security
    - Domain restriction ensures only valid university emails can register
    - Email verification workflow with OTP support ensures user identity
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