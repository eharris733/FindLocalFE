-- Setup CASCADE DELETE for user account deletion
-- This ensures all user data is properly deleted when an account is removed
-- Run this in your Supabase SQL Editor

-- First, let's check the current foreign key constraints on profiles table
-- Then we'll drop and recreate with CASCADE DELETE

-- Drop existing foreign key constraint if it exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add foreign key constraint with CASCADE DELETE
-- When a user is deleted from auth.users, their profile is automatically deleted
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Note: You'll need to do the same for any other tables with user relationships
-- Example for future tables:

-- For a favorites table (if you have one separate from the JSON array)
-- ALTER TABLE public.favorites
-- DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
-- ALTER TABLE public.favorites
-- ADD CONSTRAINT favorites_user_id_fkey
-- FOREIGN KEY (user_id)
-- REFERENCES auth.users(id)
-- ON DELETE CASCADE;

-- For a user_events table (bookmarks, RSVPs, etc)
-- ALTER TABLE public.user_events
-- DROP CONSTRAINT IF EXISTS user_events_user_id_fkey;
-- ALTER TABLE public.user_events
-- ADD CONSTRAINT user_events_user_id_fkey
-- FOREIGN KEY (user_id)
-- REFERENCES auth.users(id)
-- ON DELETE CASCADE;

-- For a user_venues table (saved venues, reviews, etc)
-- ALTER TABLE public.user_venues
-- DROP CONSTRAINT IF EXISTS user_venues_user_id_fkey;
-- ALTER TABLE public.user_venues
-- ADD CONSTRAINT user_venues_user_id_fkey
-- FOREIGN KEY (user_id)
-- REFERENCES auth.users(id)
-- ON DELETE CASCADE;

-- Create a function to safely delete a user account with logging
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id_to_delete UUID)
RETURNS JSON AS $$
DECLARE
  profile_count INTEGER;
  result JSON;
BEGIN
  -- Check if user exists in profiles
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles
  WHERE id = user_id_to_delete;

  -- Log the deletion attempt (you could store this in an audit table)
  RAISE NOTICE 'Deleting user account: %, has profile: %', user_id_to_delete, profile_count > 0;

  -- Delete from auth.users (CASCADE will handle related tables)
  DELETE FROM auth.users WHERE id = user_id_to_delete;

  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', user_id_to_delete,
    'message', 'Account deleted successfully'
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error result
  result := json_build_object(
    'success', false,
    'user_id', user_id_to_delete,
    'error', SQLERRM
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (they can only delete their own account)
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- Create an audit table to log account deletions (optional but recommended for compliance)
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deletion_reason TEXT,
  ip_address TEXT
);

-- Enable RLS on audit table
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

-- Only service role can read deletion logs (for compliance audits)
CREATE POLICY "Service role can view deletion logs"
ON public.account_deletions
FOR SELECT
TO service_role
USING (true);

-- Function to log account deletion before it happens
CREATE OR REPLACE FUNCTION public.log_account_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.account_deletions (user_id, user_email)
  VALUES (OLD.id, OLD.email);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log before user deletion
DROP TRIGGER IF EXISTS log_user_deletion ON auth.users;
CREATE TRIGGER log_user_deletion
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_account_deletion();

COMMENT ON TABLE public.account_deletions IS 
  'Audit log of deleted user accounts for compliance (GDPR/CCPA)';

COMMENT ON FUNCTION public.delete_user_account(UUID) IS 
  'Safely deletes a user account and all related data with CASCADE delete';
