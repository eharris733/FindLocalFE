-- Migration: Direct Event Invites
-- Adds table for in-app friend-to-friend event invitations

-- ============================================
-- Table: direct_event_invites
-- ============================================

CREATE TABLE IF NOT EXISTS public.direct_event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events_gold(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined')),
  allow_plus_one BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate invites for the same event from the same sender to the same recipient
  UNIQUE(event_id, sender_id, recipient_id)
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_direct_event_invites_recipient_status
  ON public.direct_event_invites(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_direct_event_invites_sender_event
  ON public.direct_event_invites(sender_id, event_id);

CREATE INDEX IF NOT EXISTS idx_direct_event_invites_event
  ON public.direct_event_invites(event_id);

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.update_direct_event_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_direct_event_invites_updated_at
  BEFORE UPDATE ON public.direct_event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_direct_event_invites_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.direct_event_invites ENABLE ROW LEVEL SECURITY;

-- Users can read invites they sent or received
CREATE POLICY "Users can read own invites"
  ON public.direct_event_invites
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can insert invites they send
CREATE POLICY "Users can send invites"
  ON public.direct_event_invites
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update invites they sent (e.g. cancel) or received (e.g. accept/decline)
CREATE POLICY "Users can update own invites"
  ON public.direct_event_invites
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================
-- RPC: Send direct event invites (batch)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_direct_event_invites(
  p_event_id UUID,
  p_recipient_ids UUID[],
  p_message TEXT DEFAULT NULL,
  p_allow_plus_one BOOLEAN DEFAULT false
)
RETURNS SETOF public.direct_event_invites
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.direct_event_invites (event_id, sender_id, recipient_id, message, allow_plus_one)
  SELECT p_event_id, auth.uid(), unnest(p_recipient_ids), p_message, p_allow_plus_one
  ON CONFLICT (event_id, sender_id, recipient_id) DO NOTHING
  RETURNING *;
END;
$$;

-- ============================================
-- RPC: Get pending direct invites for current user
-- ============================================

CREATE OR REPLACE FUNCTION public.get_pending_direct_invites()
RETURNS TABLE (
  invite_id UUID,
  event_id UUID,
  sender_id UUID,
  sender_username TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  message TEXT,
  allow_plus_one BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id AS invite_id,
    di.event_id,
    di.sender_id,
    p.username::TEXT AS sender_username,
    p.full_name::TEXT AS sender_name,
    p.avatar_url::TEXT AS sender_avatar,
    di.message,
    di.allow_plus_one,
    di.status,
    di.created_at
  FROM public.direct_event_invites di
  JOIN public.profiles p ON p.id = di.sender_id
  WHERE di.recipient_id = auth.uid()
    AND di.status IN ('pending', 'viewed')
  ORDER BY di.created_at DESC;
END;
$$;

-- ============================================
-- RPC: Get already-invited friend IDs for an event
-- ============================================

CREATE OR REPLACE FUNCTION public.get_already_invited_friends(p_event_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result UUID[];
BEGIN
  SELECT ARRAY_AGG(recipient_id) INTO result
  FROM public.direct_event_invites
  WHERE event_id = p_event_id
    AND sender_id = auth.uid();

  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$;

-- ============================================
-- RPC: Respond to a direct invite
-- ============================================

CREATE OR REPLACE FUNCTION public.respond_to_direct_invite(
  p_invite_id UUID,
  p_response TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_rsvp_id UUID;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid response. Must be accepted or declined.');
  END IF;

  -- Get the invite and verify recipient
  SELECT * INTO v_invite
  FROM public.direct_event_invites
  WHERE id = p_invite_id AND recipient_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invite not found.');
  END IF;

  -- Update invite status
  UPDATE public.direct_event_invites
  SET status = p_response
  WHERE id = p_invite_id;

  -- If accepted, create an RSVP
  IF p_response = 'accepted' THEN
    INSERT INTO public.event_rsvps (event_id, user_id, response, invitation_id)
    VALUES (v_invite.event_id, auth.uid(), 'yes', NULL)
    ON CONFLICT (event_id, user_id) DO UPDATE SET response = 'yes', updated_at = now()
    RETURNING id INTO v_rsvp_id;

    RETURN json_build_object('success', true, 'rsvp_id', v_rsvp_id);
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
