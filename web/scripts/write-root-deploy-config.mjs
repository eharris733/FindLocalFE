#!/usr/bin/env node
// Runs after `astro build`. The @astrojs/cloudflare adapter writes the real
// deployable config to web/dist/server/wrangler.json and a redirect at
// web/.wrangler/deploy/config.json, which wrangler only honours when its cwd
// is web/. Cloudflare Workers Builds runs the deploy command from the repo
// root, so mirror that redirect at the root too. Wrangler reads
// .wrangler/deploy/config.json from cwd even when no wrangler.toml lives there.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = resolve(repoRoot, '.wrangler', 'deploy');
mkdirSync(dir, { recursive: true });
writeFileSync(
  resolve(dir, 'config.json'),
  JSON.stringify({ configPath: '../../web/dist/server/wrangler.json' }) + '\n',
);
console.log('[web] wrote .wrangler/deploy/config.json at repo root');
