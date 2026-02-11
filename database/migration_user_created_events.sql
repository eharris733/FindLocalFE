-- Migration: User-Created Events
-- Adds support for users creating their own events

-- 1. New columns on events_gold
ALTER TABLE events_gold
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS custom_location text,
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

CREATE INDEX IF NOT EXISTS idx_events_gold_creator_id
  ON events_gold(creator_id) WHERE creator_id IS NOT NULL;

-- 2. RLS policies for user-created events

-- Creators can INSERT their own events
CREATE POLICY "users_create_events" ON events_gold
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Creators can UPDATE their own events
CREATE POLICY "users_update_events" ON events_gold
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Creators can read their own private events
CREATE POLICY "creators_read_own_events" ON events_gold
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

-- 3. Supabase Storage bucket for event images
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('event-images', 'event-images', true, ARRAY['image/jpeg','image/png','image/webp'], 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "users_upload_event_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_update_event_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_delete_event_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for event images (shared via invite links)
CREATE POLICY "public_read_event_images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'event-images');
