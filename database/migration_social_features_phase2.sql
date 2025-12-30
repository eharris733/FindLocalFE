-- Migration: Social Features Phase 2 - Event Invitations
-- Description: Adds event invitations and RSVP tracking
-- Date: 2024-12-30

-- ============================================
-- PART 1: Event Invitations Table
-- ============================================

-- Table to store event invitations created by hosts
CREATE TABLE IF NOT EXISTS public.event_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL, -- References events_gold.id (TEXT type)
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Invitation settings
    invite_token TEXT NOT NULL UNIQUE, -- Unique token for the share link
    passcode TEXT, -- Optional passcode for private invites (NULL = no passcode)
    allow_anonymous_rsvp BOOLEAN DEFAULT true, -- Allow RSVP without account
    allow_plus_one BOOLEAN DEFAULT false, -- Can invitees bring guests
    max_uses INTEGER, -- NULL = unlimited uses
    
    -- Tracking
    use_count INTEGER DEFAULT 0, -- How many times the link was used
    view_count INTEGER DEFAULT 0, -- How many times the link was viewed
    
    -- Validity
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires (but invalidates after event)
    is_active BOOLEAN DEFAULT true, -- Host can deactivate without deleting
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional: custom message from host
    message TEXT
);

-- Indexes for event_invitations
CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON public.event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_inviter ON public.event_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_token ON public.event_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_event_invitations_active ON public.event_invitations(event_id, is_active) WHERE is_active = true;

-- ============================================
-- PART 2: Event RSVPs Table
-- ============================================

-- Table to store RSVPs to event invitations
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.event_invitations(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL, -- Denormalized for easier queries
    
    -- Responder info (either user_id OR anonymous_name)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_name TEXT, -- For anonymous RSVPs
    
    -- Response
    response TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
    plus_one_count INTEGER DEFAULT 0, -- Number of additional guests
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate RSVPs from same user for same invitation
    CONSTRAINT unique_user_rsvp UNIQUE (invitation_id, user_id),
    -- Ensure either user_id or anonymous_name is provided
    CONSTRAINT rsvp_identity CHECK (user_id IS NOT NULL OR anonymous_name IS NOT NULL)
);

-- Indexes for event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_invitation ON public.event_rsvps(invitation_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON public.event_rsvps(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_rsvps_response ON public.event_rsvps(event_id, response);

-- ============================================
-- PART 3: Event Share Tracking (Aggregates)
-- ============================================

-- Table to track share/invitation counts per event (denormalized for performance)
CREATE TABLE IF NOT EXISTS public.event_social_stats (
    event_id TEXT PRIMARY KEY,
    share_count INTEGER DEFAULT 0, -- Total shares/invitations created
    rsvp_yes_count INTEGER DEFAULT 0, -- "Yes" responses
    rsvp_maybe_count INTEGER DEFAULT 0, -- "Maybe" responses
    rsvp_no_count INTEGER DEFAULT 0, -- "No" responses
    total_attending INTEGER DEFAULT 0, -- Yes + plus_ones
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for event_social_stats
CREATE INDEX IF NOT EXISTS idx_event_social_stats_attending ON public.event_social_stats(total_attending DESC);

-- ============================================
-- PART 4: Row Level Security
-- ============================================

-- Enable RLS
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_social_stats ENABLE ROW LEVEL SECURITY;

-- Event Invitations Policies

-- Hosts can view their own invitations
CREATE POLICY "Hosts can view their invitations"
    ON public.event_invitations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = inviter_id);

-- Anyone can view active invitations by token (for RSVP flow)
CREATE POLICY "Anyone can view invitations by token"
    ON public.event_invitations
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Authenticated users can create invitations
CREATE POLICY "Users can create invitations"
    ON public.event_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = inviter_id);

-- Hosts can update their invitations
CREATE POLICY "Hosts can update their invitations"
    ON public.event_invitations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = inviter_id);

-- Hosts can delete their invitations
CREATE POLICY "Hosts can delete their invitations"
    ON public.event_invitations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = inviter_id);

-- Event RSVPs Policies

-- Anyone can view RSVPs for invitations they created
CREATE POLICY "Hosts can view RSVPs for their invitations"
    ON public.event_rsvps
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM event_invitations 
            WHERE id = event_rsvps.invitation_id 
            AND inviter_id = auth.uid()
        )
    );

-- Users can view their own RSVPs
CREATE POLICY "Users can view their own RSVPs"
    ON public.event_rsvps
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Anyone can create RSVPs (anonymous or authenticated)
CREATE POLICY "Anyone can create RSVPs"
    ON public.event_rsvps
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Users can update their own RSVPs
CREATE POLICY "Users can update their own RSVPs"
    ON public.event_rsvps
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Hosts can delete RSVPs for their invitations (for removing anonymous entries)
CREATE POLICY "Hosts can manage RSVPs"
    ON public.event_rsvps
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM event_invitations 
            WHERE id = event_rsvps.invitation_id 
            AND inviter_id = auth.uid()
        )
    );

-- Event Social Stats Policies (read-only for everyone)
CREATE POLICY "Anyone can view event stats"
    ON public.event_social_stats
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Stats are managed by functions only
CREATE POLICY "Stats managed by system"
    ON public.event_social_stats
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- PART 5: Helper Functions
-- ============================================

-- Function to generate a secure invitation token
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

-- Function to create an event invitation
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
    
    -- Ensure token is unique
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

-- Function to get invitation by token (validates and returns details)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    event_id TEXT,
    inviter_id UUID,
    inviter_username TEXT,
    inviter_name TEXT,
    passcode_required BOOLEAN,
    allow_anonymous_rsvp BOOLEAN,
    allow_plus_one BOOLEAN,
    message TEXT,
    is_valid BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ei.id,
        ei.event_id,
        ei.inviter_id,
        p.username AS inviter_username,
        p.full_name AS inviter_name,
        (ei.passcode IS NOT NULL) AS passcode_required,
        ei.allow_anonymous_rsvp,
        ei.allow_plus_one,
        ei.message,
        (
            ei.is_active = true 
            AND (ei.expires_at IS NULL OR ei.expires_at > NOW())
            AND (ei.max_uses IS NULL OR ei.use_count < ei.max_uses)
        ) AS is_valid,
        ei.expires_at
    FROM event_invitations ei
    LEFT JOIN profiles p ON p.id = ei.inviter_id
    WHERE ei.invite_token = p_token;
    
    -- Increment view count
    UPDATE event_invitations 
    SET view_count = view_count + 1
    WHERE invite_token = p_token;
END;
$$;

-- Function to submit an RSVP
CREATE OR REPLACE FUNCTION public.submit_rsvp(
    p_token TEXT,
    p_response TEXT,
    p_passcode TEXT DEFAULT NULL,
    p_anonymous_name TEXT DEFAULT NULL,
    p_plus_one_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    success BOOLEAN,
    rsvp_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_rsvp_id UUID;
    v_user_id UUID;
    v_existing_rsvp UUID;
BEGIN
    -- Get current user (may be NULL for anonymous)
    v_user_id := auth.uid();
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM event_invitations
    WHERE invite_token = p_token AND is_active = true;
    
    -- Validate invitation exists
    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid or expired invitation';
        RETURN;
    END IF;
    
    -- Check expiration
    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This invitation has expired';
        RETURN;
    END IF;
    
    -- Check max uses
    IF v_invitation.max_uses IS NOT NULL AND v_invitation.use_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This invitation has reached its maximum uses';
        RETURN;
    END IF;
    
    -- Check passcode if required
    IF v_invitation.passcode IS NOT NULL AND v_invitation.passcode != p_passcode THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Incorrect passcode';
        RETURN;
    END IF;
    
    -- Check if anonymous RSVPs are allowed
    IF v_user_id IS NULL AND NOT v_invitation.allow_anonymous_rsvp THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You must be logged in to RSVP';
        RETURN;
    END IF;
    
    -- Check if user already RSVPd (for logged in users)
    IF v_user_id IS NOT NULL THEN
        SELECT id INTO v_existing_rsvp
        FROM event_rsvps
        WHERE invitation_id = v_invitation.id AND user_id = v_user_id;
        
        IF v_existing_rsvp IS NOT NULL THEN
            -- Update existing RSVP
            UPDATE event_rsvps
            SET response = p_response, 
                plus_one_count = p_plus_one_count,
                updated_at = NOW()
            WHERE id = v_existing_rsvp;
            
            RETURN QUERY SELECT true, v_existing_rsvp, NULL::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Require name for anonymous RSVPs
    IF v_user_id IS NULL AND (p_anonymous_name IS NULL OR p_anonymous_name = '') THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Please provide your name';
        RETURN;
    END IF;
    
    -- Create the RSVP
    INSERT INTO event_rsvps (
        invitation_id,
        event_id,
        user_id,
        anonymous_name,
        response,
        plus_one_count
    ) VALUES (
        v_invitation.id,
        v_invitation.event_id,
        v_user_id,
        CASE WHEN v_user_id IS NULL THEN p_anonymous_name ELSE NULL END,
        p_response,
        CASE WHEN v_invitation.allow_plus_one THEN p_plus_one_count ELSE 0 END
    )
    RETURNING id INTO v_rsvp_id;
    
    -- Increment use count
    UPDATE event_invitations
    SET use_count = use_count + 1, updated_at = NOW()
    WHERE id = v_invitation.id;
    
    -- Update social stats
    PERFORM update_event_social_stats(v_invitation.event_id);
    
    RETURN QUERY SELECT true, v_rsvp_id, NULL::TEXT;
END;
$$;

-- Function to update event social stats
CREATE OR REPLACE FUNCTION public.update_event_social_stats(p_event_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_yes_count INTEGER;
    v_maybe_count INTEGER;
    v_no_count INTEGER;
    v_total_attending INTEGER;
BEGIN
    -- Count RSVPs by response type
    SELECT 
        COUNT(*) FILTER (WHERE response = 'yes'),
        COUNT(*) FILTER (WHERE response = 'maybe'),
        COUNT(*) FILTER (WHERE response = 'no'),
        COALESCE(SUM(CASE WHEN response = 'yes' THEN 1 + plus_one_count ELSE 0 END), 0)
    INTO v_yes_count, v_maybe_count, v_no_count, v_total_attending
    FROM event_rsvps
    WHERE event_id = p_event_id;
    
    -- Update or insert stats
    INSERT INTO event_social_stats (
        event_id, 
        rsvp_yes_count, 
        rsvp_maybe_count, 
        rsvp_no_count, 
        total_attending,
        updated_at
    )
    VALUES (
        p_event_id, 
        v_yes_count, 
        v_maybe_count, 
        v_no_count, 
        v_total_attending,
        NOW()
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET 
        rsvp_yes_count = v_yes_count,
        rsvp_maybe_count = v_maybe_count,
        rsvp_no_count = v_no_count,
        total_attending = v_total_attending,
        updated_at = NOW();
END;
$$;

-- Function to get RSVPs for an invitation (for hosts)
CREATE OR REPLACE FUNCTION public.get_invitation_rsvps(p_invitation_id UUID)
RETURNS TABLE (
    rsvp_id UUID,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    anonymous_name TEXT,
    response TEXT,
    plus_one_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is the invitation host
    IF NOT EXISTS (
        SELECT 1 FROM event_invitations 
        WHERE id = p_invitation_id AND inviter_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to view these RSVPs';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id AS rsvp_id,
        r.user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        r.anonymous_name,
        r.response,
        r.plus_one_count,
        r.created_at
    FROM event_rsvps r
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.invitation_id = p_invitation_id
    ORDER BY r.created_at DESC;
END;
$$;

-- Function to get all invitations and RSVPs for an event (for hosts)
CREATE OR REPLACE FUNCTION public.get_event_invitations_with_rsvps(p_event_id TEXT)
RETURNS TABLE (
    invitation_id UUID,
    invite_token TEXT,
    passcode_enabled BOOLEAN,
    allow_anonymous_rsvp BOOLEAN,
    allow_plus_one BOOLEAN,
    max_uses INTEGER,
    use_count INTEGER,
    view_count INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    rsvp_count BIGINT,
    yes_count BIGINT,
    maybe_count BIGINT,
    no_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ei.id AS invitation_id,
        ei.invite_token,
        (ei.passcode IS NOT NULL) AS passcode_enabled,
        ei.allow_anonymous_rsvp,
        ei.allow_plus_one,
        ei.max_uses,
        ei.use_count,
        ei.view_count,
        ei.is_active,
        ei.created_at,
        COUNT(r.id) AS rsvp_count,
        COUNT(r.id) FILTER (WHERE r.response = 'yes') AS yes_count,
        COUNT(r.id) FILTER (WHERE r.response = 'maybe') AS maybe_count,
        COUNT(r.id) FILTER (WHERE r.response = 'no') AS no_count
    FROM event_invitations ei
    LEFT JOIN event_rsvps r ON r.invitation_id = ei.id
    WHERE ei.event_id = p_event_id AND ei.inviter_id = auth.uid()
    GROUP BY ei.id
    ORDER BY ei.created_at DESC;
END;
$$;

-- Function to get event social stats
CREATE OR REPLACE FUNCTION public.get_event_social_stats(p_event_id TEXT)
RETURNS TABLE (
    share_count INTEGER,
    rsvp_yes_count INTEGER,
    rsvp_maybe_count INTEGER,
    rsvp_no_count INTEGER,
    total_attending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ess.share_count, 0),
        COALESCE(ess.rsvp_yes_count, 0),
        COALESCE(ess.rsvp_maybe_count, 0),
        COALESCE(ess.rsvp_no_count, 0),
        COALESCE(ess.total_attending, 0)
    FROM event_social_stats ess
    WHERE ess.event_id = p_event_id;
END;
$$;

-- Trigger to update stats when RSVP changes
CREATE OR REPLACE FUNCTION public.trigger_update_social_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_event_social_stats(OLD.event_id);
        RETURN OLD;
    ELSE
        PERFORM update_event_social_stats(NEW.event_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_social_stats_trigger ON public.event_rsvps;
CREATE TRIGGER update_social_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_social_stats();

-- ============================================
-- PART 6: Grants
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_invitations TO authenticated;
GRANT SELECT ON public.event_invitations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT SELECT, INSERT ON public.event_rsvps TO anon;
GRANT SELECT ON public.event_social_stats TO anon, authenticated;
GRANT INSERT, UPDATE ON public.event_social_stats TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_invitation(TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_event_social_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_rsvps(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_invitations_with_rsvps(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_social_stats(TEXT) TO anon, authenticated;

-- ============================================
-- PART 7: Comments
-- ============================================

COMMENT ON TABLE public.event_invitations IS 'Stores event invitations created by hosts with sharing options';
COMMENT ON TABLE public.event_rsvps IS 'Stores RSVPs to event invitations from users or anonymous guests';
COMMENT ON TABLE public.event_social_stats IS 'Denormalized table for fast access to event social statistics';

COMMENT ON COLUMN public.event_invitations.invite_token IS 'Unique URL-safe token for the invitation link';
COMMENT ON COLUMN public.event_invitations.passcode IS 'Optional passcode to protect private invitations';
COMMENT ON COLUMN public.event_invitations.allow_anonymous_rsvp IS 'Whether guests can RSVP without an account';
COMMENT ON COLUMN public.event_invitations.allow_plus_one IS 'Whether guests can bring additional people';

COMMENT ON COLUMN public.event_rsvps.anonymous_name IS 'Name provided by anonymous RSVPs (when user_id is NULL)';
COMMENT ON COLUMN public.event_rsvps.response IS 'RSVP response: yes, no, or maybe';
