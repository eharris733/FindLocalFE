-- Our own table linking a portal account to the Unkey keys it has minted. Unkey
-- holds the real key + metering; we store only display metadata (prefix/last_four)
-- and the Unkey key id so we can list/revoke. Plaintext is NEVER stored — Unkey
-- reveals it once at creation. One account can hold many named keys, all sharing
-- the account's plan quota via a single Unkey identity (externalId = user.id).

CREATE TABLE IF NOT EXISTS api_key (
  id           TEXT PRIMARY KEY NOT NULL,
  user_id      TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
  unkey_key_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  prefix       TEXT,
  last_four    TEXT,
  plan         TEXT,
  created_at   INTEGER NOT NULL,
  revoked_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_api_key_user_id ON api_key (user_id);
