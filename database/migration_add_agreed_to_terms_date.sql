-- Migration: Add agreed_to_terms_date column to profiles table
-- This ensures legal compliance by tracking when users agreed to terms
-- The timestamp is set SERVER-SIDE and cannot be manipulated by clients

-- Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_terms_date TIMESTAMPTZ;

-- For existing users, set agreed_to_terms_date to their created_at date
-- (assumes they agreed when they signed up)
UPDATE public.profiles 
SET 
  agreed_to_terms = true,
  agreed_to_terms_date = created_at
WHERE 
  agreed_to_terms_date IS NULL 
  AND created_at IS NOT NULL;

-- Add index for faster queries on agreed_to_terms_date
CREATE INDEX IF NOT EXISTS idx_profiles_agreed_to_terms_date 
ON public.profiles(agreed_to_terms_date);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.agreed_to_terms IS 
  'Boolean flag indicating if user agreed to Terms of Service';

COMMENT ON COLUMN public.profiles.agreed_to_terms_date IS 
  'Server-side timestamp when user agreed to Terms of Service. Set by database trigger, cannot be manipulated by client. Required for GDPR/CCPA compliance.';

-- Verify the migration
SELECT 
  COUNT(*) as total_users,
  COUNT(agreed_to_terms_date) as users_with_terms_date,
  COUNT(*) - COUNT(agreed_to_terms_date) as users_missing_terms_date
FROM public.profiles;
