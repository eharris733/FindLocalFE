-- Migration: Add venue follows functionality
-- This allows users to follow venues and get updates about events at those venues

-- Create venue_follows table
CREATE TABLE IF NOT EXISTS public.venue_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_venue_follow UNIQUE (user_id, venue_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venue_follows_user_id ON public.venue_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_follows_venue_id ON public.venue_follows(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_follows_created_at ON public.venue_follows(created_at DESC);

-- Enable RLS
ALTER TABLE public.venue_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_follows

-- Users can view their own venue follows
CREATE POLICY "Users can view own venue follows"
ON public.venue_follows FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Anyone can see how many followers a venue has (count only)
CREATE POLICY "Anyone can count venue followers"
ON public.venue_follows FOR SELECT
TO authenticated
USING (true);

-- Users can follow venues
CREATE POLICY "Users can follow venues"
ON public.venue_follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can unfollow venues
CREATE POLICY "Users can unfollow venues"
ON public.venue_follows FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.venue_follows TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.venue_follows IS 'Tracks which users follow which venues for event updates';
