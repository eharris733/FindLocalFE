-- Wikidata / Wikipedia / Wikimedia Commons enrichment for venues and authors.
--
-- Many venues carry a junk scraped image (a logo, a sponsor banner, a 1px
-- placeholder) or a one-line description; author bios/photos are sparse. Wikidata
-- is free and its Commons images are openly licensed, so a matched entity gives
-- us a real photo (with the attribution the license requires) and a Wikipedia
-- extract for the description.
--
-- Provenance is the point of the new *_source / *_attribution columns: we must
-- know which image came from Commons (attribution required, safe to redistribute)
-- versus a scrape (unlicensed, never resold) versus a human edit (never
-- overwritten by a job). `wikidata_checked_at` is the once-per-entity stamp that
-- keeps the weekly cron from re-searching the same misses forever.
--
-- All additive ADD COLUMN — no table rebuild. (venues was rebuilt with the
-- copy/drop/rename pattern in 0003/0008 only because those changed a CHECK
-- constraint on a table other tables have foreign keys into; plain ADD COLUMN
-- needs none of that.)

-- venues ---------------------------------------------------------------------
ALTER TABLE venues ADD COLUMN wikidata_id         TEXT;  -- 'Q123456', null = unmatched
ALTER TABLE venues ADD COLUMN wikipedia_url       TEXT;  -- en.wikipedia.org article, when the entity has one
ALTER TABLE venues ADD COLUMN image_attribution   TEXT;  -- credit line to display next to `image` (CC-BY etc.)
ALTER TABLE venues ADD COLUMN image_source        TEXT;  -- 'scrape' | 'wikimedia' | 'places' | 'manual'
ALTER TABLE venues ADD COLUMN description_source  TEXT;  -- 'wikipedia' | 'llm' | 'manual' | null (scraped/unknown)
ALTER TABLE venues ADD COLUMN wikidata_checked_at TEXT;  -- stamped on every attempt, hit or miss

-- Drives the enrichment queue (`wikidata_checked_at IS NULL` first).
CREATE INDEX IF NOT EXISTS idx_venues_wikidata_checked ON venues(wikidata_checked_at);
CREATE INDEX IF NOT EXISTS idx_venues_wikidata_id ON venues(wikidata_id);

-- authors --------------------------------------------------------------------
-- (authors.wikidata_id exists since 0009; bio/photo_url since 0010.)
ALTER TABLE authors ADD COLUMN wikipedia_url       TEXT;
ALTER TABLE authors ADD COLUMN photo_attribution   TEXT;  -- credit line for photo_url
ALTER TABLE authors ADD COLUMN wikidata_checked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_authors_wikidata_checked ON authors(wikidata_checked_at);
