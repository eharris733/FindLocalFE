-- Migration: Social Features Phase 1 - Friends System
-- Description: Adds username, account types, visibility settings, and friends tables
-- Date: 2024-12-30

-- ============================================
-- PART 1: Profile Enhancements
-- ============================================

-- Add username column to profiles (unique, public identifier)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add account_type column (personal or creator)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal' 
CHECK (account_type IN ('personal', 'creator'));

-- Add visibility settings for social features
-- Controls who can see your attending/hosting activity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_visibility TEXT DEFAULT 'friends' 
CHECK (activity_visibility IN ('everyone', 'friends', 'followers', 'none'));

-- Add bio for profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create index for account type filtering
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- ============================================
-- PART 2: Friend Requests Table
-- ============================================

-- Table to store pending friend requests
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT, -- Optional message with the request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate requests
    CONSTRAINT unique_friend_request UNIQUE (requester_id, recipient_id),
    -- Prevent self-requests
    CONSTRAINT no_self_request CHECK (requester_id != recipient_id)
);

-- Indexes for friend_requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON public.friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_pending ON public.friend_requests(recipient_id, status) WHERE status = 'pending';

-- ============================================
-- PART 3: Friendships Table
-- ============================================

-- Table to store established friendships (mutual connections)
-- We store the relationship in one direction (user_id_1 < user_id_2) to avoid duplicates
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user_id_1 is always less than user_id_2 to prevent duplicate friendships
    CONSTRAINT ordered_friendship CHECK (user_id_1 < user_id_2),
    -- Ensure unique friendship pairs
    CONSTRAINT unique_friendship UNIQUE (user_id_1, user_id_2)
);

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user_id_2);

-- ============================================
-- PART 4: Followers Table (for Creator accounts)
-- ============================================

-- Table to store follower relationships (one-way, no approval needed)
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate follows
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    -- Prevent self-follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for followers
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.followers(following_id);

-- ============================================
-- PART 5: Row Level Security
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Friend Requests Policies
-- Users can view requests they sent or received
CREATE POLICY "Users can view their own friend requests"
    ON public.friend_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
    ON public.friend_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = requester_id);

-- Users can update requests they received (to accept/reject)
CREATE POLICY "Recipients can respond to friend requests"
    ON public.friend_requests
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id);

-- Users can delete/cancel requests they sent
CREATE POLICY "Requesters can cancel their requests"
    ON public.friend_requests
    FOR DELETE
    TO authenticated
    USING (auth.uid() = requester_id);

-- Friendships Policies
-- Users can view their own friendships
CREATE POLICY "Users can view their own friendships"
    ON public.friendships
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Friendships are created via function (when request is accepted)
CREATE POLICY "Friendships created via accepted requests"
    ON public.friendships
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can unfriend"
    ON public.friendships
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Followers Policies
-- Anyone can view followers (for public creator profiles)
CREATE POLICY "Anyone can view followers"
    ON public.followers
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can follow creators
CREATE POLICY "Users can follow creators"
    ON public.followers
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
    ON public.followers
    FOR DELETE
    TO authenticated
    USING (auth.uid() = follower_id);

-- ============================================
-- PART 6: Helper Functions
-- ============================================

-- Function to accept a friend request and create friendship
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requester_id UUID;
    v_recipient_id UUID;
    v_user1 UUID;
    v_user2 UUID;
BEGIN
    -- Get the request details and verify the current user is the recipient
    SELECT requester_id, recipient_id INTO v_requester_id, v_recipient_id
    FROM friend_requests
    WHERE id = request_id AND recipient_id = auth.uid() AND status = 'pending';
    
    IF v_requester_id IS NULL THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    -- Order the IDs for the friendship table constraint
    IF v_requester_id < v_recipient_id THEN
        v_user1 := v_requester_id;
        v_user2 := v_recipient_id;
    ELSE
        v_user1 := v_recipient_id;
        v_user2 := v_requester_id;
    END IF;
    
    -- Update request status
    UPDATE friend_requests 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = request_id;
    
    -- Create the friendship
    INSERT INTO friendships (user_id_1, user_id_2)
    VALUES (v_user1, v_user2)
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
    
    RETURN TRUE;
END;
$$;

-- Function to reject a friend request
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE friend_requests 
    SET status = 'rejected', updated_at = NOW()
    WHERE id = request_id AND recipient_id = auth.uid() AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user1 UUID;
    v_user2 UUID;
BEGIN
    IF user_a < user_b THEN
        v_user1 := user_a;
        v_user2 := user_b;
    ELSE
        v_user1 := user_b;
        v_user2 := user_a;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM friendships 
        WHERE user_id_1 = v_user1 AND user_id_2 = v_user2
    );
END;
$$;

-- Function to get friend count for a user
CREATE OR REPLACE FUNCTION public.get_friend_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM friendships
        WHERE user_id_1 = user_id OR user_id_2 = user_id
    );
END;
$$;

-- Function to get follower count for a user
CREATE OR REPLACE FUNCTION public.get_follower_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM followers
        WHERE following_id = user_id
    );
END;
$$;

-- Function to get following count for a user
CREATE OR REPLACE FUNCTION public.get_following_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM followers
        WHERE follower_id = user_id
    );
END;
$$;

-- Function to generate a unique username from email or name
CREATE OR REPLACE FUNCTION public.generate_username(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_username TEXT;
    v_suffix INTEGER := 0;
BEGIN
    -- Clean the base name (lowercase, remove special chars, limit length)
    v_username := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9_]', '', 'g'));
    v_username := LEFT(v_username, 20);
    
    -- If empty, use a random string
    IF v_username = '' THEN
        v_username := 'user';
    END IF;
    
    -- Check if username exists, add suffix if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username || CASE WHEN v_suffix > 0 THEN v_suffix::TEXT ELSE '' END) LOOP
        v_suffix := v_suffix + 1;
    END LOOP;
    
    IF v_suffix > 0 THEN
        v_username := v_username || v_suffix::TEXT;
    END IF;
    
    RETURN v_username;
END;
$$;

-- ============================================
-- PART 7: Grants
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.followers TO authenticated;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_follower_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_following_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_username(TEXT) TO authenticated;

-- ============================================
-- PART 8: Comments
-- ============================================

COMMENT ON TABLE public.friend_requests IS 'Stores pending, accepted, and rejected friend requests between users';
COMMENT ON TABLE public.friendships IS 'Stores established mutual friendships between users';
COMMENT ON TABLE public.followers IS 'Stores one-way follower relationships for creator accounts';

COMMENT ON COLUMN public.profiles.username IS 'Unique public username for the user (e.g., @arivera)';
COMMENT ON COLUMN public.profiles.account_type IS 'Type of account: personal (default) or creator';
COMMENT ON COLUMN public.profiles.activity_visibility IS 'Who can see attending/hosting activity: everyone, friends, followers, or none';
COMMENT ON COLUMN public.profiles.bio IS 'User bio/description for their profile';
