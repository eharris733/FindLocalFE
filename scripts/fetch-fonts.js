#!/usr/bin/env node
/**
 * One-off helper: refresh the self-hosted latin-subset variable woff2 files in
 * public/fonts/ from Google Fonts. NOT part of `npm run build` — the files are
 * committed so builds are deterministic and never depend on fonts.googleapis.
 *
 *   node scripts/fetch-fonts.js
 *
 * The @font-face declarations that consume these live in scripts/inject-head.js.
 */
const fs = require('fs');
const path = require('path');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const FAMILIES = [
  { family: 'Manrope:wght@400..700', out: 'manrope-latin.woff2' },
  { family: 'Epilogue:wght@400..700', out: 'epilogue-latin.woff2' },
];
const outDir = path.join(__dirname, '..', 'public', 'fonts');

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { family, out } of FAMILIES) {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
      headers: { 'User-Agent': UA },
    }).then((r) => r.text());
    // Blocks are "/* latin */ @font-face { ... src: url(...) ... }"; take the latin one.
    const block = css.split('/* latin */')[1];
    const url = block && block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) throw new Error(`No latin woff2 URL found for ${family}`);
    const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
    fs.writeFileSync(path.join(outDir, out), buf);
    console.log(`${out}: ${buf.length} bytes from ${url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
