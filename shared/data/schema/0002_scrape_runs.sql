-- Wire up scrape_runs (one row per city per weekly cron) so the scraper Worker
-- can tell when every list page for a city has reached a terminal state and
-- only then fire /api/webhook/batch-complete. Replaces the per-city sentinel
-- queue message, which raced the page renders (observed 2026-09-04: every
-- sentinel fired 10 minutes before list rendering finished).

ALTER TABLE scrape_runs ADD COLUMN expected INTEGER;
ALTER TABLE scrape_runs ADD COLUMN completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scrape_runs ADD COLUMN notify_claimed_at TEXT;
ALTER TABLE scrape_runs ADD COLUMN notified_at TEXT;

-- Why a failed render failed (cert error, redirect loop, 4xx, timeout...).
ALTER TABLE bronze_pages ADD COLUMN error_message TEXT;

-- Idempotent completion ledger: Queues deliver at-least-once, so a plain
-- counter would double count a redelivered message. PRIMARY KEY (run_id,
-- venue_id) + INSERT ... ON CONFLICT DO NOTHING makes a venue count once.
CREATE TABLE scrape_run_items (
  run_id   INTEGER NOT NULL,
  venue_id TEXT NOT NULL,
  status   TEXT,              -- success | error | oversize | invalid_url | dlq
  done_at  TEXT,
  PRIMARY KEY (run_id, venue_id)
);

CREATE INDEX idx_scrape_runs_open ON scrape_runs(notified_at, started_at);
