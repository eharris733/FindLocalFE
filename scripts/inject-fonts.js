/**
 * Post-build script to inject @font-face rules into index.html
 * This is needed because Expo's +html.tsx doesn't support require() in static exports
 */
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

function findFontFile(fontName) {
  const files = [];
  
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.includes(fontName) && entry.name.endsWith('.ttf')) {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.existsSync(ASSETS_DIR)) {
    walk(ASSETS_DIR);
  }
  
  return files[0] || null;
}

function main() {
  console.log('[inject-fonts] Starting font injection...');
  
  // Find the font files
  const ioniconsTTF = findFontFile('Ionicons');
  const antdesignTTF = findFontFile('AntDesign');
  
  if (!ioniconsTTF || !antdesignTTF) {
    console.warn('[inject-fonts] Warning: Could not find all font files');
    console.log('Ionicons:', ioniconsTTF);
    console.log('AntDesign:', antdesignTTF);
    return;
  }
  
  // Get relative paths from dist root
  const ioniconsPath = '/' + path.relative(DIST_DIR, ioniconsTTF).replace(/\\/g, '/');
  const antdesignPath = '/' + path.relative(DIST_DIR, antdesignTTF).replace(/\\/g, '/');
  
  console.log('[inject-fonts] Found fonts:');
  console.log('  Ionicons:', ioniconsPath);
  console.log('  AntDesign:', antdesignPath);
  
  // Read index.html
  if (!fs.existsSync(INDEX_HTML)) {
    console.error('[inject-fonts] Error: index.html not found');
    return;
  }
  
  let html = fs.readFileSync(INDEX_HTML, 'utf8');
  
  // Check if already injected
  if (html.includes('font-family: Ionicons') || html.includes('font-family: antdesign')) {
    console.log('[inject-fonts] Fonts already injected, skipping');
    return;
  }
  
  // Create the font-face CSS
  const fontCSS = `
  <style id="icon-fonts">
    @font-face {
      font-family: Ionicons;
      src: url('${ioniconsPath}') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: antdesign;
      src: url('${antdesignPath}') format('truetype');
      font-display: swap;
    }
  </style>
`;
  
  // Inject before </head>
  html = html.replace('</head>', fontCSS + '</head>');
  
  // Write back
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  console.log('[inject-fonts] Successfully injected font CSS into index.html');
}

main();
