-- Migration: Add Social Analytics Metrics Table
-- Description: Creates a table to track social feature usage (friends, followers, invitations, venue follows)
-- Run this in Supabase SQL Editor

-- Create the social_metrics table
CREATE TABLE IF NOT EXISTS social_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    action_type TEXT NOT NULL,
    target_id TEXT, -- Can be user_id, venue_id, event_id, or invitation_id
    target_type TEXT, -- 'user', 'venue', 'event', 'invitation'
    source TEXT, -- Where the action was triggered (e.g., 'event_page', 'profile', 'discover')
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_social_metrics_user_id ON social_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_action_type ON social_metrics(action_type);
CREATE INDEX IF NOT EXISTS idx_social_metrics_target_type ON social_metrics(target_type);
CREATE INDEX IF NOT EXISTS idx_social_metrics_created_at ON social_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_social_metrics_session_id ON social_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_target_id ON social_metrics(target_id);

-- Add RLS policies
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;

-- Allow insert for all authenticated users (and anonymous for non-logged in tracking)
CREATE POLICY "Allow insert for all" ON social_metrics
    FOR INSERT
    WITH CHECK (true);

-- Allow users to read their own metrics
CREATE POLICY "Users can read own metrics" ON social_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can read all metrics (for analytics dashboards)
-- This is handled automatically by the service role bypass

-- Add comments for documentation
COMMENT ON TABLE social_metrics IS 'Tracks social feature usage including friends, followers, invitations, and venue follows';
COMMENT ON COLUMN social_metrics.action_type IS 'Type of social action: friend_request_sent, friend_request_accepted, user_followed, venue_followed, invitation_created, rsvp_submitted, etc.';
COMMENT ON COLUMN social_metrics.target_id IS 'ID of the entity being acted upon (user, venue, event, or invitation)';
COMMENT ON COLUMN social_metrics.target_type IS 'Type of target entity: user, venue, event, invitation';
COMMENT ON COLUMN social_metrics.source IS 'UI location where the action was triggered';

-- Verify the table was created
SELECT 'social_metrics table created successfully' AS status;
