import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// SSR Worker for findlocal.community. Every page reads D1 through the
// @findlocal/shared SELECT helpers (see src/lib/db.ts); nothing here builds SQL.
export default defineConfig({
  output: 'server',
  site: 'https://findlocal.community',
  // One indexable URL per page: /about, never /about/. Middleware 301s the
  // slash variants for SSR routes ('ignore' so the request reaches it); Workers
  // assets normalise them for prerendered files.
  trailingSlash: 'ignore',
  build: { format: 'file' },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: 'wrangler.toml',
    },
  }),
});

// Deployed by Cloudflare Workers Builds (see repo settings); wrangler reads dist/server/wrangler.json.
