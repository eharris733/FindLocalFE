-- Migration: Add interests column to profiles table
-- This stores the user's selected communities/interests from onboarding

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.interests IS 'User selected interests/communities (e.g., music, comedy, theater, dance, culture)';
