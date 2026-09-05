-- FindLocal D1 schema (pass 1). Conventions: booleans INTEGER 0/1, timestamps
-- ISO-8601 UTC TEXT ('YYYY-MM-DDTHH:MM:SS.sssZ'), calendar dates 'YYYY-MM-DD',
-- arrays/objects JSON TEXT. venues/events/recurring keep TEXT UUIDs so public
-- /event/<uuid> and /venue/<uuid> URLs survive the migration from Supabase.

-- ---------------------------------------------------------------- venues
CREATE TABLE venues (
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
                                                   'ticketmaster','seatgeek','ovationtix','dice','nps')),
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
CREATE UNIQUE INDEX uq_venues_name_city ON venues(name, city);
CREATE INDEX idx_venues_city_active ON venues(city, is_active);
CREATE INDEX idx_venues_source ON venues(source_type, is_active);

-- ---------------------------------------------------------------- events (gold)
CREATE TABLE events (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  venue_id         TEXT NOT NULL REFERENCES venues(id),
  city             TEXT NOT NULL,
  region           TEXT,
  source           TEXT NOT NULL,
  external_id      TEXT,
  silver_event_id  INTEGER,
  title            TEXT NOT NULL,
  description      TEXT,
  event_date       TEXT NOT NULL CHECK (length(event_date) = 10),
  start_time       TEXT,
  end_time         TEXT,
  category         TEXT,
  event_type       TEXT NOT NULL DEFAULT '[]',
  price            TEXT,
  price_amount     REAL,
  status           TEXT,
  detail_page_url  TEXT,
  ticket_page_url  TEXT,
  root_url         TEXT,
  image_url        TEXT,
  is_deleted       INTEGER NOT NULL DEFAULT 0,
  first_seen_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
-- Identity = the natural key, exactly as the Postgres schema had it. A venue has one
-- non-recurring source at a time and sources can change (scraper_local -> scraper_static),
-- so `source` must NOT be part of the identity; upserts refresh it. Upserts revive
-- soft-deleted rows so /event/<id> URLs stay stable.
CREATE UNIQUE INDEX uq_events_natural ON events(venue_id, title, event_date);
CREATE INDEX idx_events_city_date  ON events(city, is_deleted, event_date, start_time);
CREATE INDEX idx_events_venue_date ON events(venue_id, event_date);
CREATE INDEX idx_events_source_ext ON events(source, external_id);
CREATE INDEX idx_events_category   ON events(city, category, event_date);
CREATE INDEX idx_events_date       ON events(event_date);

-- ---------------------------------------------------------------- bronze / silver
CREATE TABLE bronze_pages (
  id           INTEGER PRIMARY KEY,
  venue_id     TEXT NOT NULL,
  city         TEXT NOT NULL,
  run_id       INTEGER,
  url          TEXT NOT NULL,
  page_type    TEXT NOT NULL DEFAULT 'list' CHECK (page_type IN ('list','detail','ticket')),
  status       TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','oversize')),
  html_content TEXT,
  html_length  INTEGER,
  scraped_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_bronze_latest  ON bronze_pages(venue_id, page_type, scraped_at DESC);
CREATE INDEX idx_bronze_url     ON bronze_pages(url, scraped_at DESC);
CREATE INDEX idx_bronze_scraped ON bronze_pages(scraped_at);

CREATE TABLE events_silver (
  id                    INTEGER PRIMARY KEY,
  venue_id              TEXT NOT NULL,
  city                  TEXT NOT NULL,
  run_id                INTEGER,
  source                TEXT NOT NULL,
  external_id           TEXT,
  bronze_list_page_id   INTEGER,
  bronze_detail_page_id INTEGER,
  bronze_ticket_page_id INTEGER,
  raw_event_json        TEXT NOT NULL,
  extracted_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_silver_venue          ON events_silver(venue_id, extracted_at DESC);
CREATE INDEX idx_silver_city_extracted ON events_silver(city, extracted_at);

-- ---------------------------------------------------------------- recurring rules
CREATE TABLE recurring_events (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  venue_id         TEXT NOT NULL REFERENCES venues(id),
  city             TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  frequency        TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','biweekly','monthly')),
  day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  week_of_month    INTEGER CHECK (week_of_month IN (-1,1,2,3,4)),
  start_time       TEXT NOT NULL,
  end_time         TEXT,
  price            TEXT,
  url              TEXT,
  image            TEXT,
  category         TEXT,
  event_type       TEXT NOT NULL DEFAULT '[]',
  valid_from       TEXT NOT NULL DEFAULT (date('now')),
  valid_until      TEXT,
  last_verified_on TEXT NOT NULL DEFAULT (date('now')),
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (frequency <> 'monthly' OR week_of_month IS NOT NULL)
);
CREATE INDEX idx_recurring_city  ON recurring_events(city, is_active);
CREATE INDEX idx_recurring_venue ON recurring_events(venue_id);

-- ---------------------------------------------------------------- runs / health
CREATE TABLE scrape_runs (
  id            INTEGER PRIMARY KEY,
  city          TEXT,
  source        TEXT,
  trigger       TEXT NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron','webhook','manual','test')),
  started_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at   TEXT,
  venues_ok     INTEGER NOT NULL DEFAULT 0,
  venues_failed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE venue_scrape_attempts (
  id                     INTEGER PRIMARY KEY,
  run_id                 INTEGER,
  venue_id               TEXT NOT NULL,
  city                   TEXT NOT NULL,
  attempt_started_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  attempt_completed_at   TEXT,
  duration_ms            INTEGER,
  stage_reached          TEXT NOT NULL DEFAULT 'none' CHECK (stage_reached IN ('none','bronze','silver','gold')),
  bronze_success         INTEGER NOT NULL DEFAULT 0,
  silver_success         INTEGER NOT NULL DEFAULT 0,
  gold_success           INTEGER NOT NULL DEFAULT 0,
  bronze_events_count    INTEGER NOT NULL DEFAULT 0,
  silver_events_count    INTEGER NOT NULL DEFAULT 0,
  gold_events_count      INTEGER NOT NULL DEFAULT 0,
  events_already_existed INTEGER NOT NULL DEFAULT 0,
  new_events_count       INTEGER NOT NULL DEFAULT 0,
  error_category         TEXT,
  error_stage            TEXT,
  error_message          TEXT,
  error_details          TEXT,
  triggered_by           TEXT NOT NULL DEFAULT 'scheduled',
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_attempts_venue_recent ON venue_scrape_attempts(venue_id, created_at DESC);
CREATE INDEX idx_attempts_city_recent  ON venue_scrape_attempts(city, created_at DESC);
CREATE INDEX idx_attempts_created      ON venue_scrape_attempts(created_at);
