-- Daily fleet-health rollup so the admin Overview can show trends.
--
-- Nothing else keeps history: venue_scrape_attempts is purged at 30 days and
-- scrape_runs at 90, and venues.health_* is only the current state. The
-- backend writes one row per (day, city, source_type) from the 04:30 UTC
-- health-snapshot webhook (src/pipelines/health_snapshot.py); fleet and
-- per-city totals are SUMs over source_type. ~190 rows/day, purged at 400 d.

CREATE TABLE health_snapshots (
  day               TEXT NOT NULL,            -- 'YYYY-MM-DD' (UTC)
  city              TEXT NOT NULL,
  source_type       TEXT NOT NULL,
  venues_total      INTEGER NOT NULL DEFAULT 0,
  venues_active     INTEGER NOT NULL DEFAULT 0,
  with_scraper      INTEGER NOT NULL DEFAULT 0,   -- active, scraper_config has custom_code
  no_scraper        INTEGER NOT NULL DEFAULT 0,   -- active scraper-source venues without code
  healthy           INTEGER NOT NULL DEFAULT 0,
  degraded          INTEGER NOT NULL DEFAULT 0,
  failing           INTEGER NOT NULL DEFAULT 0,
  unknown           INTEGER NOT NULL DEFAULT 0,
  blocked           INTEGER NOT NULL DEFAULT 0,   -- last_error_category = 'blocked'
  needs_review      INTEGER NOT NULL DEFAULT 0,
  paused            INTEGER NOT NULL DEFAULT 0,   -- failing AND needs_manual_review (skipped by the weekly cron)
  gold_upcoming_30d INTEGER NOT NULL DEFAULT 0,   -- live events in the next 30 days
  new_events_24h    INTEGER NOT NULL DEFAULT 0,   -- live events first seen in the last 24 h
  attempts_7d       INTEGER NOT NULL DEFAULT 0,
  attempts_ok_7d    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (day, city, source_type)
);
CREATE INDEX idx_health_snapshots_city_day ON health_snapshots(city, day);
