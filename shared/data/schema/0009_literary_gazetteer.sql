-- Literary author/book gazetteer + event linking.
--
-- Replaces the brittle title-regex author extraction (gold_transformer) with
-- entity linking against a curated, ever-growing whitelist. Candidate names and
-- book titles harvested from literary events are verified against
-- OpenLibrary/Google Books and accumulated here; Gold then links event text to
-- these canonical rows. See src/pipelines/literary_linker.py and
-- src/sources/bibliographic_client.py.
--
-- All additive (new tables + ADD COLUMN), so no table rebuild is needed.

-- Canonical authors. `id` is a slug of the canonical name; `name_key` is the
-- normalized (lowercased, accent-folded, whitespace-collapsed) lookup key that
-- the matcher and dedup use. `aliases` is a JSON array of name variants
-- ("J.K. Rowling" / "Joanne Rowling"). `work_count` is OpenLibrary's published
-- work count, used as a disambiguation guard when accepting a candidate.
CREATE TABLE IF NOT EXISTS authors (
  id             TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  name_key       TEXT NOT NULL,
  aliases        TEXT NOT NULL DEFAULT '[]',
  openlibrary_id TEXT,
  wikidata_id    TEXT,
  work_count     INTEGER,
  source         TEXT,
  verified_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_authors_name_key ON authors(name_key);
CREATE INDEX IF NOT EXISTS idx_authors_openlibrary ON authors(openlibrary_id);

-- Canonical books. `id` is the ISBN-13 when known, else a work slug. `title_key`
-- is the normalized lookup key. `author_ids` is a JSON array of authors.id.
CREATE TABLE IF NOT EXISTS books (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  title_key           TEXT NOT NULL,
  isbn13              TEXT,
  isbn10              TEXT,
  openlibrary_work_id TEXT,
  author_ids          TEXT NOT NULL DEFAULT '[]',
  pub_year            INTEGER,
  source              TEXT,
  verified_at         TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_books_title_key ON books(title_key);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);

-- The ever-growing engine's queue. Every literary event enqueues its candidate
-- names/titles here; the grower (scripts/build_literary_whitelist.py /
-- enrich-literary cron) verifies pending rows against the bibliographic APIs,
-- upserts confirmed entities to authors/books, and marks the rest 'rejected'
-- (a negative cache so junk is never re-queried). `norm_key` + `kind` is unique.
CREATE TABLE IF NOT EXISTS literary_candidates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kind            TEXT NOT NULL CHECK (kind IN ('author','book')),
  raw_text        TEXT NOT NULL,
  norm_key        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected')),
  occurrences     INTEGER NOT NULL DEFAULT 1,
  resolved_id     TEXT,
  isbn            TEXT,
  last_checked_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_literary_candidates_kind_key ON literary_candidates(kind, norm_key);
CREATE INDEX IF NOT EXISTS idx_literary_candidates_status ON literary_candidates(status);

-- Per-event links into the gazetteer. JSON arrays of authors.id / books.id
-- (mirrors the events.performers / event_type JSON pattern; the nightly event
-- purge drops the links with the row). events.performers stays the display
-- field and is populated with canonical author names.
ALTER TABLE events ADD COLUMN author_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE events ADD COLUMN book_ids TEXT NOT NULL DEFAULT '[]';
