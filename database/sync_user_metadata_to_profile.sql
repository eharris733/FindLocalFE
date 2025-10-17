-- Database function to sync user metadata to profiles table
-- This should be run in your Supabase SQL Editor

-- Function to handle new user signups and sync metadata to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    marketing_opt_in,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, false),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    marketing_opt_in = COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, profiles.marketing_opt_in),
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
      marketing_opt_in = COALESCE((NEW.raw_user_meta_data->>'marketing_opt_in')::boolean, marketing_opt_in),
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
  'Automatically creates/updates profile when a new user signs up, copying marketing_opt_in from user metadata';

COMMENT ON FUNCTION public.handle_user_metadata_update() IS 
  'Automatically syncs marketing_opt_in from user metadata to profile when it changes';
