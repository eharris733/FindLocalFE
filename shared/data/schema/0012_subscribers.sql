-- Email capture for the mobile app onboarding (and later the web/widget).
--
-- No auth, no accounts: a person hands us an email plus what they want to hear
-- about (metro, categories, regions, an optional point + radius) and we keep it
-- so a future notifier can mail them. Nothing sends yet — this table is the
-- durable side of POST /api/subscribe only.
--
-- One row per email (UNIQUE, stored lowercased/trimmed by the backend):
-- re-subscribing updates the preferences in place and clears unsubscribed_at.
-- email_hash is a salted digest kept alongside the address so rate limiting and
-- analytics can key on it without re-reading the plaintext.
--
-- Additive, no table rebuild.

CREATE TABLE IF NOT EXISTS subscribers (
  id                TEXT PRIMARY KEY,               -- uuid4
  email             TEXT NOT NULL UNIQUE,           -- lowercased + trimmed by the backend
  email_hash        TEXT,                           -- salted sha256 of the normalized email
  city              TEXT,                           -- SUPPORTED_CITIES metro name, NULL = all
  categories        TEXT,                           -- JSON array of category slugs
  regions           TEXT,                           -- JSON array of region names
  radius_km         REAL,                           -- used with latitude/longitude when given
  latitude          REAL,
  longitude         REAL,
  -- weekly | daily | none  ('none' = keep the address, send nothing)
  cadence           TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly','daily','none')),
  -- mobile | web | widget
  source            TEXT NOT NULL DEFAULT 'mobile' CHECK (source IN ('mobile','web','widget')),
  platform          TEXT,                           -- free text: ios, android, web, ...
  timezone          TEXT,                           -- IANA zone, e.g. America/New_York
  consent_at        TEXT,                           -- when they opted in
  unsubscribed_at   TEXT,                           -- set by GET /api/unsubscribe, NULL = subscribed
  unsubscribe_token TEXT UNIQUE,                    -- opaque one-click token (uuid4 hex)
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The notifier's two access paths: "everyone still subscribed in metro X" and
-- "everyone still subscribed".
CREATE INDEX IF NOT EXISTS idx_subscribers_city         ON subscribers(city, unsubscribed_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribed ON subscribers(unsubscribed_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_hash         ON subscribers(email_hash);
