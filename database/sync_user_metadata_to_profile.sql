-- Database function to sync user metadata to profiles table
-- This should be run in your Supabase SQL Editor

-- First, add the agreed_to_terms_date column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agreed_to_terms_date TIMESTAMPTZ;

-- Add agreed_to_terms boolean column if needed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS agreed_to_terms BOOLEAN DEFAULT false;

-- Function to handle new user signups and sync metadata to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_agreed_to_terms BOOLEAN;
BEGIN
  -- Extract agreed_to_terms from metadata
  user_agreed_to_terms := COALESCE((NEW.raw_user_meta_data->>'agreed_to_terms')::boolean, false);
  
  INSERT INTO public.profiles (
    id,
    email,
    marketing_opt_in,
    agreed_to_terms,
    agreed_to_terms_date,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- NULL means "never asked", false means "explicitly declined", true means "opted in"
    (NEW.raw_user_meta_data->>'marketing_opt_in')::boolean,
    user_agreed_to_terms,
    -- Set timestamp server-side when user agrees to terms
    CASE WHEN user_agreed_to_terms THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    -- Only update if explicitly provided in metadata (preserve NULL if not present)
    marketing_opt_in = CASE 
      WHEN NEW.raw_user_meta_data ? 'marketing_opt_in' 
      THEN (NEW.raw_user_meta_data->>'marketing_opt_in')::boolean
      ELSE profiles.marketing_opt_in
    END,
    agreed_to_terms = EXCLUDED.agreed_to_terms,
    agreed_to_terms_date = EXCLUDED.agreed_to_terms_date,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates to user metadata (if they change it later)
CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if metadata has changed
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    UPDATE public.profiles SET
      -- Only update if explicitly provided in metadata (preserve NULL if not present)
      marketing_opt_in = CASE 
        WHEN NEW.raw_user_meta_data ? 'marketing_opt_in' 
        THEN (NEW.raw_user_meta_data->>'marketing_opt_in')::boolean
        ELSE marketing_opt_in
      END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run when user metadata is updated
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- Comment explaining the setup
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates/updates profile when a new user signs up, copying marketing_opt_in and agreed_to_terms from user metadata. Sets agreed_to_terms_date server-side for legal compliance.';

COMMENT ON FUNCTION public.handle_user_metadata_update() IS 
  'Automatically syncs marketing_opt_in from user metadata to profile when it changes';

COMMENT ON COLUMN public.profiles.agreed_to_terms_date IS 
  'Server-side timestamp when user agreed to Terms of Service. Cannot be manipulated by client.';
