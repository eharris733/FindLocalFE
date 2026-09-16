-- LLM-based literary extraction cache + author latest-book bookkeeping.
--
-- Authors/books for literary events are now extracted per event by an LLM
-- (src/pipelines/literary_extract.py) instead of regex title rules + a
-- gazetteer substring matcher. One row per event remembers what the model
-- said for a given text_hash, so re-scrapes with unchanged text never re-call
-- the model and the nightly cron only processes new/changed events.
--
-- All additive, no table rebuild.

CREATE TABLE IF NOT EXISTS literary_extractions (
  event_id        TEXT PRIMARY KEY,
  text_hash       TEXT NOT NULL,                 -- sha1 of normalized title + description
  model           TEXT NOT NULL,
  is_author_event INTEGER NOT NULL DEFAULT 0,
  authors         TEXT NOT NULL DEFAULT '[]',    -- JSON [{name, role: featured|discussed}]
  books           TEXT NOT NULL DEFAULT '[]',    -- JSON [{title, author, role}]
  extracted_at    TEXT NOT NULL
);

-- Stamped when the nightly job looked up an author's most recent ISBN-bearing
-- book on OpenLibrary (hit or miss), so each author is queried once.
ALTER TABLE authors ADD COLUMN latest_book_checked_at TEXT;
