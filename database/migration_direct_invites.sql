-- Migration: Direct Invites System
-- Adds direct friend-to-friend invitations alongside existing link-based invitations

-- ============================================
-- 1. Create direct_invites table
-- ============================================

CREATE TABLE IF NOT EXISTS direct_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate invites for same event+inviter+invitee
  UNIQUE (event_id, inviter_id, invitee_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_direct_invites_invitee_status ON direct_invites (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_direct_invites_event ON direct_invites (event_id);
CREATE INDEX IF NOT EXISTS idx_direct_invites_inviter ON direct_invites (inviter_id);

-- ============================================
-- 2. Modify event_rsvps to support direct invites
-- ============================================

-- Make invitation_id nullable (was NOT NULL before)
ALTER TABLE event_rsvps ALTER COLUMN invitation_id DROP NOT NULL;

-- Add direct_invite_id column
ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS direct_invite_id UUID REFERENCES direct_invites(id) ON DELETE SET NULL;

-- Ensure at least one invite reference exists
-- (Only enforce for new rows; existing rows already have invitation_id)
ALTER TABLE event_rsvps ADD CONSTRAINT rsvp_has_invite_source
  CHECK (invitation_id IS NOT NULL OR direct_invite_id IS NOT NULL);

-- ============================================
-- 3. RLS Policies for direct_invites
-- ============================================

ALTER TABLE direct_invites ENABLE ROW LEVEL SECURITY;

-- Inviter can insert new direct invites
CREATE POLICY direct_invites_insert ON direct_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Inviter can delete (cancel) their own invites
CREATE POLICY direct_invites_delete ON direct_invites
  FOR DELETE USING (auth.uid() = inviter_id);

-- Both inviter and invitee can view
CREATE POLICY direct_invites_select ON direct_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Invitee can update status (accept/decline)
CREATE POLICY direct_invites_update ON direct_invites
  FOR UPDATE USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- ============================================
-- 4. RPC: get_pending_direct_invites
-- Returns pending direct invites for the current user
-- with inviter profile and event data
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_direct_invites()
RETURNS TABLE (
  invite_id UUID,
  event_id TEXT,
  inviter_id UUID,
  inviter_username TEXT,
  inviter_name TEXT,
  inviter_avatar TEXT,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    di.id AS invite_id,
    di.event_id,
    di.inviter_id,
    p.username AS inviter_username,
    p.full_name AS inviter_name,
    p.avatar_url AS inviter_avatar,
    di.message,
    di.status,
    di.created_at
  FROM direct_invites di
  JOIN profiles p ON p.id = di.inviter_id
  WHERE di.invitee_id = auth.uid()
    AND di.status = 'pending'
  ORDER BY di.created_at DESC;
$$;

-- ============================================
-- 5. Updated timestamp trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_direct_invite_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER direct_invites_updated_at
  BEFORE UPDATE ON direct_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_invite_updated_at();
