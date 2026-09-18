-- Better Auth core schema (SQLite / D1) for the developer portal, plus the
-- account fields we add via user.additionalFields (stripeCustomerId, plan,
-- unkeyIdentityId). Magic link and email verification reuse the `verification`
-- table (no extra table). Social OAuth (Phase B) reuses `account`. TOTP + passkey
-- tables (Phase C) are added in a later migration.
--
-- Dates are stored as ISO strings; booleans as 0/1 integers.

CREATE TABLE IF NOT EXISTS user (
  id               TEXT PRIMARY KEY NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  emailVerified    INTEGER NOT NULL DEFAULT 0,
  image            TEXT,
  createdAt        TEXT NOT NULL,
  updatedAt        TEXT NOT NULL,
  stripeCustomerId TEXT,
  plan             TEXT DEFAULT 'free',
  unkeyIdentityId  TEXT
);

CREATE TABLE IF NOT EXISTS session (
  id        TEXT PRIMARY KEY NOT NULL,
  expiresAt TEXT NOT NULL,
  token     TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId    TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_userId ON session (userId);

CREATE TABLE IF NOT EXISTS account (
  id                    TEXT PRIMARY KEY NOT NULL,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  userId                TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
  accessToken           TEXT,
  refreshToken          TEXT,
  idToken               TEXT,
  accessTokenExpiresAt  TEXT,
  refreshTokenExpiresAt TEXT,
  scope                 TEXT,
  password              TEXT,
  createdAt             TEXT NOT NULL,
  updatedAt             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account (userId);

CREATE TABLE IF NOT EXISTS verification (
  id         TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  createdAt  TEXT,
  updatedAt  TEXT
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification (identifier);
