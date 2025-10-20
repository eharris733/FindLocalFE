/*
  Copies the vector icon TTFs we use into a stable /fonts path inside dist,
  so our @font-face can load from /fonts/*.ttf even if the hashed asset path changes.
*/
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.resolve(__dirname, '..', 'dist');
const FONTS_DIR = path.join(DIST, 'fonts');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function findExportedAsset(namePart) {
  // Look into dist/assets/node_modules/... for a file that ends with the target TTF name
  const assetsRoot = path.join(DIST, 'assets');
  let found = null;
  function walk(dir) {
    if (found) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (
        e.isFile() &&
        e.name.toLowerCase().includes(namePart.toLowerCase()) &&
        e.name.toLowerCase().endsWith('.ttf')
      ) {
        found = p;
        return;
      }
    }
  }
  if (fs.existsSync(assetsRoot)) walk(assetsRoot);
  return found;
}

function main() {
  ensureDir(FONTS_DIR);

  const ionicons = findExportedAsset('Ionicons');
  const antdesign = findExportedAsset('AntDesign');

  if (!ionicons || !antdesign) {
    console.warn('[postexport-fonts] Could not locate one or more TTFs in dist/assets; continuing.');
  }

  if (ionicons) copyIfExists(ionicons, path.join(FONTS_DIR, 'ionicons.ttf'));
  if (antdesign) copyIfExists(antdesign, path.join(FONTS_DIR, 'antdesign.ttf'));

  console.log('[postexport-fonts] Copied icon fonts to dist/fonts');

  // Inject preload and @font-face into dist/index.html for earliest load
  const indexHtml = path.join(DIST, 'index.html');
  if (fs.existsSync(indexHtml)) {
    let html = fs.readFileSync(indexHtml, 'utf8');
    const headEnd = '</head>';
    const preload = `\n<link rel="preload" href="/fonts/ionicons.ttf" as="font" type="font/ttf" crossorigin>\n<link rel="preload" href="/fonts/antdesign.ttf" as="font" type="font/ttf" crossorigin>\n<style>\n@font-face{font-family:Ionicons;src:url('/fonts/ionicons.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}\n@font-face{font-family:anticon;src:url('/fonts/antdesign.ttf') format('truetype');font-style:normal;font-weight:400;font-display:swap;}\n</style>\n`;
    if (!html.includes('/fonts/ionicons.ttf')) {
      html = html.replace(headEnd, preload + headEnd);
      fs.writeFileSync(indexHtml, html);
      console.log('[postexport-fonts] Injected font preloads and @font-face into index.html');
    }
  }
}

main();
