-- FindLocal data cleanup — found during the 2026-07-02 QA pass.
-- Review each section before running; sections are independent.

------------------------------------------------------------------------------
-- 1. discovery_locations: remove leftover test rows
--    (7x "Test City", 7x "Job Test City", 7x "Job Update Test", 6x "Update Test")
------------------------------------------------------------------------------
DELETE FROM discovery_locations
WHERE state = 'Test State'
   OR city IN ('Test City', 'Job Test City', 'Job Update Test', 'Update Test');

------------------------------------------------------------------------------
-- 2. discovery_locations: dedupe (New York exists 6x). Keeps one row per
--    (city, state) — the one with coordinates if any, else an arbitrary one.
------------------------------------------------------------------------------
DELETE FROM discovery_locations a
USING discovery_locations b
WHERE a.city = b.city
  AND coalesce(a.state, '') = coalesce(b.state, '')
  AND a.id <> b.id
  AND (a.latitude IS NULL AND b.latitude IS NOT NULL
       OR (a.latitude IS NOT NULL) = (b.latitude IS NOT NULL) AND a.id > b.id);

------------------------------------------------------------------------------
-- 3. discovery_locations: lowercase 'boston' duplicate (no coords; a proper
--    'Boston' row with coords exists). 'Brooklyn' overlaps New York — delete
--    or keep deliberately; it has no coords today.
------------------------------------------------------------------------------
DELETE FROM discovery_locations WHERE city = 'boston';
-- DELETE FROM discovery_locations WHERE city = 'Brooklyn';  -- uncomment if NY covers it

------------------------------------------------------------------------------
-- 4. discovery_locations: wrong coordinates
--    Dallas row points at Arlington, Miami row at Hollywood FL, Seattle row at
--    south Seattle, Minneapolis row at the St. Paul side. Correct city centers:
------------------------------------------------------------------------------
UPDATE discovery_locations SET latitude = 32.7767,  longitude = -96.7970  WHERE city = 'Dallas';
UPDATE discovery_locations SET latitude = 25.7617,  longitude = -80.1918  WHERE city = 'Miami';
UPDATE discovery_locations SET latitude = 47.6062,  longitude = -122.3321 WHERE city = 'Seattle';
UPDATE discovery_locations SET latitude = 44.9778,  longitude = -93.2650  WHERE city = 'Minneapolis';

------------------------------------------------------------------------------
-- 5. Region name split: both 'Saint Paul' and 'St. Paul' exist in venues and
--    events_gold, so the "Where" filter shows two chips for one place.
--    Normalize to 'St. Paul'.
------------------------------------------------------------------------------
UPDATE venues      SET region = 'St. Paul' WHERE region = 'Saint Paul';
UPDATE events_gold SET region = 'St. Paul' WHERE region = 'Saint Paul';

------------------------------------------------------------------------------
-- 6. Venue name hygiene: trailing whitespace ("Flynn Center ").
------------------------------------------------------------------------------
UPDATE venues SET name = trim(name) WHERE name <> trim(name);

------------------------------------------------------------------------------
-- 7. Scraper artifacts in events_gold:
--    a) Club Passim publishes "club closed" placeholder rows as events.
--    b) The price field sometimes contains a whole fee-policy paragraph
--       ("All tickets have a $3 processing fee and a $2 preservation fee...")
--       which renders inside the price pill on event cards.
------------------------------------------------------------------------------
UPDATE events_gold SET is_deleted = true WHERE lower(trim(title)) = 'club closed';
UPDATE events_gold SET price = NULL WHERE length(price) > 40;

------------------------------------------------------------------------------
-- 8. price_amount backfill (OPTIONAL — review first). 96% of events have
--    price text but NULL price_amount, which makes the Free/Paid filters
--    useless (0 results for "Free" in LA/Minneapolis). This parses simple
--    "$30", "$30.00", "30.00" price strings only; ranges ("$15 – $18") are
--    left alone. The real fix belongs in the FindLocalData gold pipeline.
------------------------------------------------------------------------------
-- UPDATE events_gold
-- SET price_amount = (regexp_replace(price, '[^0-9.]', '', 'g'))::numeric
-- WHERE price_amount IS NULL
--   AND price ~ '^\$?\d+(\.\d{1,2})?$';
-- UPDATE events_gold SET price_amount = 0 WHERE price_amount IS NULL AND lower(trim(price)) IN ('free', 'free!', '$0', '0');

------------------------------------------------------------------------------
-- 9. Broken venue images (2026-07-24 audit). Some venues.image values can
--    never render in the app: relative paths ("images/events/....png", ~21
--    rows) and SVGs (react-native Image can't decode SVG, ~9 rows). Null
--    them so scripts/venue-onboard.js treats those venues as imageless and
--    finds a replacement; the UI shows its placeholder in the meantime.
--    (Dead-but-well-formed URLs, e.g. old Squarespace links that now 404,
--    can't be detected in SQL — the placeholder-behind-image rendering
--    covers those.)
------------------------------------------------------------------------------
UPDATE venues SET image = NULL WHERE image IS NOT NULL AND image <> '' AND image NOT ILIKE 'http%';
UPDATE venues SET image = NULL WHERE image ~* '\.svg(\?|$)';

------------------------------------------------------------------------------
-- 10. All-caps age-policy boilerplate stored as event descriptions
--     ("THIS EVENT IS 18+ WITH A VALID I.D. 7:00 PM 8:00 PM", ~15 rows).
--     Not a description; drop it so detail pages don't render shouting.
------------------------------------------------------------------------------
UPDATE events_gold
SET description = NULL
WHERE description = upper(description)
  AND description ~ '[A-Z]'
  AND length(description) < 120
  AND description ILIKE '%THIS EVENT IS%';
