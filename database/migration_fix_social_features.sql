-- Migration: Fix Social Features
-- Description: Enables pgcrypto extension and fixes foreign key constraints
-- Date: 2024-12-30

-- ============================================
-- PART 1: Enable Required Extensions
-- ============================================

-- Enable pgcrypto for gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- PART 2: Fix Foreign Key Constraints (if tables exist)
-- ============================================

-- Note: Only run these if the tables already exist and have the wrong FK names
-- These will drop and recreate the foreign key constraints with explicit names

-- For friend_requests table
DO $$
BEGIN
    -- Check if friend_requests table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_requests' AND table_schema = 'public') THEN
        -- Drop existing FK constraints if they exist (ignore errors if they don't)
        BEGIN
            ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_requester_id_fkey;
            ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_recipient_id_fkey;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors
        END;
        
        -- Add FK constraints with explicit names (only if they don't exist)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'friend_requests_requester_id_fkey' 
            AND table_name = 'friend_requests'
        ) THEN
            ALTER TABLE public.friend_requests 
                ADD CONSTRAINT friend_requests_requester_id_fkey 
                FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'friend_requests_recipient_id_fkey' 
            AND table_name = 'friend_requests'
        ) THEN
            ALTER TABLE public.friend_requests 
                ADD CONSTRAINT friend_requests_recipient_id_fkey 
                FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- For followers table
DO $$
BEGIN
    -- Check if followers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'followers' AND table_schema = 'public') THEN
        -- Drop existing FK constraints if they exist
        BEGIN
            ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
            ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors
        END;
        
        -- Add FK constraints with explicit names
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'followers_follower_id_fkey' 
            AND table_name = 'followers'
        ) THEN
            ALTER TABLE public.followers 
                ADD CONSTRAINT followers_follower_id_fkey 
                FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'followers_following_id_fkey' 
            AND table_name = 'followers'
        ) THEN
            ALTER TABLE public.followers 
                ADD CONSTRAINT followers_following_id_fkey 
                FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ============================================
-- PART 3: Recreate generate_invite_token with pgcrypto
-- ============================================

-- Drop and recreate the function now that pgcrypto is enabled
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_token TEXT;
BEGIN
    -- Generate a URL-safe random token (12 chars)
    v_token := encode(gen_random_bytes(9), 'base64');
    -- Replace URL-unsafe characters
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
    RETURN v_token;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO authenticated;

-- ============================================
-- Verification Query (run manually to check)
-- ============================================
-- SELECT generate_invite_token();
