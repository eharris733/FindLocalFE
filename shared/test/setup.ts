// Applies the vendored schema (shared/data/schema/*.sql) to the miniflare D1
// binding before each test file runs (vitest-pool-workers applyD1Migrations).
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
