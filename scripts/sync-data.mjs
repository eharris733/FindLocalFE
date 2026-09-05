#!/usr/bin/env node
// Vendors the canonical data files owned by the sibling FindLocalData repo into
// shared/data/ so the front doors never drift from the pipeline:
//   ../FindLocalData/src/data/cities.json      -> shared/data/cities.json
//   ../FindLocalData/src/data/categories.json  -> shared/data/categories.json
//   ../FindLocalData/cf/workers/data-api/migrations/*.sql -> shared/data/schema/
//
//   npm run sync-data          copy (overwrites the vendored files)
//   npm run sync-data:check    exit 1 if any vendored copy differs (CI)
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = process.env.FINDLOCAL_DATA_DIR ?? resolve(root, '..', 'FindLocalData');
const check = process.argv.includes('--check');

const migrationsDir = join(source, 'cf', 'workers', 'data-api', 'migrations');
if (!existsSync(migrationsDir)) {
  console.error(`sync-data: FindLocalData not found at ${source} (set FINDLOCAL_DATA_DIR)`);
  process.exit(2);
}

const pairs = [
  [join(source, 'src', 'data', 'cities.json'), join(root, 'shared', 'data', 'cities.json')],
  [join(source, 'src', 'data', 'categories.json'), join(root, 'shared', 'data', 'categories.json')],
  ...readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => [join(migrationsDir, f), join(root, 'shared', 'data', 'schema', f)]),
];

let drift = 0;
for (const [from, to] of pairs) {
  const same = existsSync(to) && readFileSync(from, 'utf8') === readFileSync(to, 'utf8');
  if (check) {
    if (!same) {
      drift++;
      console.error(`sync-data: ${to} differs from ${from}`);
    }
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`${same ? 'unchanged' : 'updated  '} ${to}`);
}

if (check) {
  if (drift) {
    console.error(`sync-data: ${drift} vendored file(s) out of date — run \`npm run sync-data\``);
    process.exit(1);
  }
  console.log('sync-data: vendored data is up to date');
}
