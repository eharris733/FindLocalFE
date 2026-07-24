-- Copies an image_url from a sibling occurrence of the same recurring series
-- (same venue, same normalized title) onto future events that lack one.
-- The app now does this fallback client-side too, but fixing the row also
-- fixes og:image in functions/event/[id].ts and any other consumer.
--
-- Apply via the Supabase dashboard (the app's key is read-only).
--
-- Preview first — expect on the order of ~22 rows (as of 2026-07-24):
--
--   SELECT e.id, e.title, e.event_date,
--          (SELECT s.image_url FROM events_gold s
--            WHERE s.venue_id = e.venue_id
--              AND lower(btrim(regexp_replace(s.title, '\s+', ' ', 'g'))) =
--                  lower(btrim(regexp_replace(e.title, '\s+', ' ', 'g')))
--              AND s.image_url IS NOT NULL AND s.image_url <> ''
--              AND (s.is_deleted IS NULL OR s.is_deleted = false)
--            ORDER BY s.event_date LIMIT 1) AS borrowed_image
--   FROM events_gold e
--   WHERE (e.image_url IS NULL OR e.image_url = '')
--     AND e.venue_id IS NOT NULL
--     AND e.event_date >= CURRENT_DATE
--     AND (e.is_deleted IS NULL OR e.is_deleted = false)
--     AND EXISTS (
--       SELECT 1 FROM events_gold s
--       WHERE s.venue_id = e.venue_id
--         AND lower(btrim(regexp_replace(s.title, '\s+', ' ', 'g'))) =
--             lower(btrim(regexp_replace(e.title, '\s+', ' ', 'g')))
--         AND s.image_url IS NOT NULL AND s.image_url <> ''
--         AND (s.is_deleted IS NULL OR s.is_deleted = false));

UPDATE events_gold e
SET image_url = (
  SELECT s.image_url FROM events_gold s
  WHERE s.venue_id = e.venue_id
    AND lower(btrim(regexp_replace(s.title, '\s+', ' ', 'g'))) =
        lower(btrim(regexp_replace(e.title, '\s+', ' ', 'g')))
    AND s.image_url IS NOT NULL AND s.image_url <> ''
    AND (s.is_deleted IS NULL OR s.is_deleted = false)
  ORDER BY s.event_date
  LIMIT 1
)
WHERE (e.image_url IS NULL OR e.image_url = '')
  AND e.venue_id IS NOT NULL
  AND e.event_date >= CURRENT_DATE
  AND (e.is_deleted IS NULL OR e.is_deleted = false)
  AND EXISTS (
    SELECT 1 FROM events_gold s
    WHERE s.venue_id = e.venue_id
      AND lower(btrim(regexp_replace(s.title, '\s+', ' ', 'g'))) =
          lower(btrim(regexp_replace(e.title, '\s+', ' ', 'g')))
      AND s.image_url IS NOT NULL AND s.image_url <> ''
      AND (s.is_deleted IS NULL OR s.is_deleted = false));
