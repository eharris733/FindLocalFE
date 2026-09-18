// Root vitest config. Tests run inside workerd via @cloudflare/vitest-pool-workers
// (the `cloudflareTest` Vite plugin, vitest 4 API) with a miniflare D1 binding
// `DB`; shared/test/setup.ts applies the vendored schema (shared/data/schema/*.sql)
// before each test file.
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('shared/data/schema');
  const authMigrations = await readD1Migrations('web/migrations');
  return {
    plugins: [
      cloudflareTest({
        singleWorker: true,
        miniflare: {
          compatibilityDate: '2026-08-01',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB', 'AUTH_DB'],
          kvNamespaces: ['AUTH_KV'],
          bindings: { TEST_MIGRATIONS: migrations, TEST_AUTH_MIGRATIONS: authMigrations },
        },
      }),
    ],
    test: {
      include: ['shared/test/**/*.test.ts', 'workers/mcp/test/**/*.test.ts', 'web/test/**/*.test.ts'],
      setupFiles: ['shared/test/setup.ts'],
    },
  };
});
