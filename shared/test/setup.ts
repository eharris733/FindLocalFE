// Applies the vendored schema (shared/data/schema/*.sql) to the miniflare D1
// binding before each test file runs (vitest-pool-workers applyD1Migrations).
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
// The writable developer-portal DB (Better Auth + api_key), from web/migrations.
await applyD1Migrations(env.AUTH_DB, env.TEST_AUTH_MIGRATIONS);
