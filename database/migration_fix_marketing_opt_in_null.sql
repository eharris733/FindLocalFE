-- Migration: Allow NULL for marketing_opt_in to track consent properly
-- This enables GDPR/CCPA compliance by distinguishing between:
-- - NULL: User was never asked about marketing consent
-- - false: User explicitly declined marketing
-- - true: User explicitly opted in to marketing

-- Remove any DEFAULT false constraint if it exists
ALTER TABLE public.profiles 
ALTER COLUMN marketing_opt_in DROP DEFAULT;

-- The column should already allow NULL from initial schema
-- But we'll ensure it explicitly
ALTER TABLE public.profiles 
ALTER COLUMN marketing_opt_in DROP NOT NULL;

-- For existing users who have false, we can't distinguish if they:
-- 1. Explicitly declined marketing, OR
-- 2. Never saw the marketing opt-in (defaulted to false)
-- 
-- Conservative approach: Treat existing false values as "never asked" (NULL)
-- This allows you to re-prompt them with proper consent flow
UPDATE public.profiles 
SET marketing_opt_in = NULL
WHERE marketing_opt_in = false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.marketing_opt_in IS 
  'User consent for marketing emails. NULL = never asked, false = explicitly declined, true = opted in. Required for GDPR/CCPA compliance.';

-- Verify the migration
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE marketing_opt_in IS NULL) as never_asked,
  COUNT(*) FILTER (WHERE marketing_opt_in = false) as opted_out,
  COUNT(*) FILTER (WHERE marketing_opt_in = true) as opted_in
FROM public.profiles;

