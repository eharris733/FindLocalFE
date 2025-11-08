-- Migration: Add user_feedback table
-- Description: Stores user feedback including bugs, feature requests, and general feedback
-- Date: 2025-11-08

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general')),
    feedback_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster querying by created_at
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Add index for feedback_type for filtering
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(feedback_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert feedback
CREATE POLICY "Authenticated users can submit feedback"
    ON public.user_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to view all feedback
-- This can be adjusted based on your admin setup
CREATE POLICY "Authenticated users can view feedback"
    ON public.user_feedback
    FOR SELECT
    TO authenticated
    USING (true);

-- Grant necessary permissions
GRANT INSERT ON public.user_feedback TO authenticated;
GRANT SELECT ON public.user_feedback TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.user_feedback IS 'Stores user feedback submissions including bug reports, feature requests, and general feedback';
