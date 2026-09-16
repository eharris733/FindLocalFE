-- Richer book/author metadata for frontend display and (resale-safe) data export.
--
-- Sourced from OpenLibrary (open-licensed, safe to store and resell). Google
-- Books stays a facts-only fallback in the client — its descriptions/covers are
-- ToS-restricted for redistribution and are never written here.
--
-- All additive ADD COLUMN, so no table rebuild.

ALTER TABLE books ADD COLUMN cover_url    TEXT;
ALTER TABLE books ADD COLUMN description  TEXT;
ALTER TABLE books ADD COLUMN subtitle     TEXT;
ALTER TABLE books ADD COLUMN publisher    TEXT;
ALTER TABLE books ADD COLUMN page_count   INTEGER;
ALTER TABLE books ADD COLUMN subjects     TEXT NOT NULL DEFAULT '[]';  -- JSON array
ALTER TABLE books ADD COLUMN language     TEXT;

ALTER TABLE authors ADD COLUMN bio        TEXT;
ALTER TABLE authors ADD COLUMN photo_url  TEXT;
ALTER TABLE authors ADD COLUMN birth_date TEXT;
