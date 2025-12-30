-- Migration: Fix Social Features Phase 2 (No pgcrypto required)
-- Description: Creates invitation functions using built-in gen_random_uuid instead of gen_random_bytes
-- Date: 2024-12-30

-- ============================================
-- PART 1: Replace generate_invite_token with UUID-based approach
-- ============================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.generate_invite_token();

-- Create new function using gen_random_uuid (built-in, no extension needed)
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_uuid TEXT;
BEGIN
    -- Generate a UUID and take first 12 characters (URL-safe)
    v_uuid := replace(gen_random_uuid()::text, '-', '');
    RETURN substring(v_uuid from 1 for 12);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO authenticated;

-- ============================================
-- PART 2: Recreate create_event_invitation function
-- ============================================

DROP FUNCTION IF EXISTS public.create_event_invitation(TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TIMESTAMP WITH TIME ZONE, TEXT);

CREATE OR REPLACE FUNCTION public.create_event_invitation(
    p_event_id TEXT,
    p_passcode TEXT DEFAULT NULL,
    p_allow_anonymous BOOLEAN DEFAULT true,
    p_allow_plus_one BOOLEAN DEFAULT false,
    p_max_uses INTEGER DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
BEGIN
    -- Generate unique token
    v_token := generate_invite_token();
    
    -- Ensure token is unique (very unlikely to collide but just in case)
    WHILE EXISTS (SELECT 1 FROM event_invitations WHERE invite_token = v_token) LOOP
        v_token := generate_invite_token();
    END LOOP;
    
    -- Create the invitation
    INSERT INTO event_invitations (
        event_id,
        inviter_id,
        invite_token,
        passcode,
        allow_anonymous_rsvp,
        allow_plus_one,
        max_uses,
        expires_at,
        message
    ) VALUES (
        p_event_id,
        auth.uid(),
        v_token,
        p_passcode,
        p_allow_anonymous,
        p_allow_plus_one,
        p_max_uses,
        p_expires_at,
        p_message
    )
    RETURNING id INTO v_invitation_id;
    
    -- Update or create social stats for the event
    INSERT INTO event_social_stats (event_id, share_count)
    VALUES (p_event_id, 1)
    ON CONFLICT (event_id) 
    DO UPDATE SET 
        share_count = event_social_stats.share_count + 1,
        updated_at = NOW();
    
    RETURN v_invitation_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_event_invitation(TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;

-- ============================================
-- Verification (run this to test)
-- ============================================
-- SELECT generate_invite_token();
-- Should return something like: "a1b2c3d4e5f6"
