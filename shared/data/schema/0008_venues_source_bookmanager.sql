-- Add 'bookmanager' to venues.source_type. Bookmanager is the webstore platform
-- behind hundreds of indie bookstores; its sites are React SPAs whose events
-- come from api.bookmanager.com, so they are ingested per store through
-- src/sources/bookmanager_client.py (API source, no Bronze) instead of scraped.
--
-- Same rebuild as 0003 (SQLite cannot ALTER a CHECK constraint; D1 keeps
-- foreign_keys ON so rows are copied aside, the table dropped, the new one
-- renamed into place and the rows re-inserted). Legacy values still allowed
-- until migrations-pending/0004 lands.

PRAGMA defer_foreign_keys = on;

CREATE TABLE venues_copy AS SELECT * FROM venues;

CREATE TABLE venues_new (
  id                        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  name                      TEXT NOT NULL,
  city                      TEXT NOT NULL,
  region                    TEXT,
  url                       TEXT,
  start_url                 TEXT,
  address                   TEXT,
  description               TEXT,
  image                     TEXT,
  insta_handle              TEXT,
  type                      TEXT,
  secondary_types           TEXT NOT NULL DEFAULT '[]',
  venue_size                TEXT,
  categories                TEXT NOT NULL DEFAULT '[]',
  latitude                  REAL,
  longitude                 REAL,
  is_active                 INTEGER NOT NULL DEFAULT 1,
  source_type               TEXT NOT NULL DEFAULT 'scraper_cloudflare'
                            CHECK (source_type IN ('scraper_cloudflare','scraper_static','scraper_local',
                                                   'stubhub','ticketmaster','seatgeek','ovationtix','dice','nps','bookmanager')),
  scraper_config            TEXT,
  transform_rules           TEXT,
  last_scraped_at           TEXT,
  health_status             TEXT NOT NULL DEFAULT 'unknown'
                            CHECK (health_status IN ('healthy','degraded','failing','unknown')),
  health_score              REAL,
  health_updated_at         TEXT,
  last_successful_scrape_at TEXT,
  consecutive_failures      INTEGER NOT NULL DEFAULT 0,
  last_error_category       TEXT,
  heal_attempted            INTEGER NOT NULL DEFAULT 0,
  last_heal_attempt_at      TEXT,
  needs_manual_review       INTEGER NOT NULL DEFAULT 0,
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

DROP TABLE venues;
ALTER TABLE venues_new RENAME TO venues;
INSERT INTO venues SELECT * FROM venues_copy;
DROP TABLE venues_copy;

CREATE UNIQUE INDEX uq_venues_name_city ON venues(name, city);
CREATE INDEX idx_venues_city_active ON venues(city, is_active);
CREATE INDEX idx_venues_source ON venues(source_type, is_active);
