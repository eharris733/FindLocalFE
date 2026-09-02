/**
 * Post-build script that injects SEO meta tags, structured data, self-hosted
 * font declarations and resource hints into dist/index.html after `expo export`.
 *
 * Expo's `output: "single"` ignores +html.tsx, so we inject directly.
 * Keep this in sync with src/app/+html.tsx for when/if we switch to static.
 *
 * Deliberately NO third-party analytics here (GA4/Clarity were removed
 * 2026-09-02 — no value, EU consent exposure, ~200 KB on the critical path).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const INJECTED_MARKER = 'data-findlocal-head';
const SUPABASE_ORIGIN = (() => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('EXPO_PUBLIC_SUPABASE_URL is not set; cannot emit the Supabase preconnect.');
    process.exit(1);
  }
  return new URL(url).origin;
})();

// Google Fonts' latin subset range — keeps the woff2 small; anything outside
// it (e.g. the ↻ recurring glyph) falls back to the system stack.
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

// The app references expo-style family names (src/theme/typography.ts), one
// per weight. Each alias points at the same variable woff2 with a SINGLE
// font-weight so `Manrope_700Bold` renders at 700 without the text having to
// set fontWeight — and call sites that add fontWeight:'700' on a 400 alias
// keep getting synthetic bold exactly as expo-font's declaration did. Do not
// widen these to `400 700` ranges.
const FONT_FACES = [
  ['Manrope_400Regular', 'manrope-latin.woff2', 400],
  ['Manrope_500Medium', 'manrope-latin.woff2', 500],
  ['Manrope_600SemiBold', 'manrope-latin.woff2', 600],
  ['Manrope_700Bold', 'manrope-latin.woff2', 700],
  ['Epilogue_400Regular', 'epilogue-latin.woff2', 400],
  ['Epilogue_600SemiBold', 'epilogue-latin.woff2', 600],
  ['Epilogue_700Bold', 'epilogue-latin.woff2', 700],
];
const fontFaceCss = FONT_FACES.map(
  ([family, file, weight]) =>
    `@font-face{font-family:"${family}";src:url(/fonts/${file}) format("woff2");font-weight:${weight};font-style:normal;font-display:swap;unicode-range:${LATIN_RANGE}}`
).join('\n');

const distHtml = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.error('dist/index.html not found. Run expo export first.');
  process.exit(1);
}

let html = fs.readFileSync(distHtml, 'utf8');

if (html.includes(INJECTED_MARKER)) {
  console.log('Already injected, skipping.');
  process.exit(0);
}

// --- HEAD injections (before </head>) ---
//
// NOTE: deliberately NO <link rel="canonical"> here. This shell is served on
// arbitrary paths by the SPA catch-all, so any canonical baked in would be
// wrong everywhere except one URL. Per-route canonicals are injected
// server-side by the Cloudflare Pages Functions in functions/ (and
// client-side by src/app/_layout.tsx during navigation).

const headSnippet = `
<!-- Resource hints: the feed's first request is a Supabase fetch; warm the
     connection while the bundle downloads. Fonts are preloaded so they're
     discovered from the HTML rather than after the bundle executes. -->
<link rel="preconnect" href="${SUPABASE_ORIGIN}" crossorigin ${INJECTED_MARKER} />
<link rel="preload" href="/fonts/epilogue-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin />
<style>
${fontFaceCss}
</style>

<!-- SEO Meta Tags -->
<title>Find Local — Discover Local Events: Concerts, Comedy, Theater & More</title>
<meta name="description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences across 31 US cities. Free and paid events updated daily." />
<meta name="keywords" content="local events, events near me, concerts, comedy shows, theater, live music, things to do, nightlife, cultural events, event discovery" />
<meta name="robots" content="index, follow" />
<meta name="author" content="Find Local" />

<!-- Theme color -->
<meta name="theme-color" content="#006565" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Find Local" />

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Find Local" />
<meta property="og:locale" content="en_US" />
<meta property="og:title" content="Find Local — Discover Local Events Near You" />
<meta property="og:description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences updated daily." />
<meta property="og:image" content="https://findlocal.community/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Find Local - Event Discovery Platform" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://findlocal.community" />
<meta name="twitter:title" content="Find Local — Discover Local Events Near You" />
<meta name="twitter:description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences updated daily." />
<meta name="twitter:image" content="https://findlocal.community/og-image.jpg" />
<meta name="twitter:image:alt" content="Find Local - Event Discovery Platform" />

<!-- Affiliate verification -->
<meta name="impact-site-verification" value="69cc4690-1595-47a6-9724-1c86ad3258b6" />

<!-- Structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Find Local",
  "url": "https://findlocal.community",
  "description": "Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences across 31 US cities.",
  "applicationCategory": "EntertainmentApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "areaServed": { "@type": "Country", "name": "United States" }
}
</script>
`;

// --- BODY injections (after <body>) ---

const bodySnippet = `
<!-- SEO content for crawlers -->
<div style="position:absolute;left:-9999px">
  <h1>Find Local Events: Concerts, Comedy, Theater & More</h1>
  <p>Discover the best local events in your city. Browse thousands of concerts, comedy shows, theater performances, dance events, and cultural experiences across 31 US cities, updated daily.</p>
  <p>Filter by music, comedy, theater, culture, and more. Find events at jazz clubs, comedy venues, concert halls, and community spaces.</p>
</div>
<noscript>
  <div style="max-width:1200px;margin:40px auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <h1>Find Local Events</h1>
    <p>Discover local events near you including concerts, comedy shows, theater, and more.</p>
    <p>Please enable JavaScript to use the full Find Local experience.</p>
  </div>
</noscript>
`;

// Replace the default <title>Find Local</title> with our full title
html = html.replace(/<title>Find Local<\/title>/, '');

// Inject head content before </head>
html = html.replace('</head>', headSnippet + '</head>');

// Inject body content right after <body> (before existing content)
html = html.replace('<body>', '<body>' + bodySnippet);

// The entry bundle is `defer`red, which Chrome fetches at Low priority behind
// images and third-party scripts. Nothing paints until it runs, so bump it.
const scriptTag = /<script src="(\/_expo\/static\/js\/web\/[^"]+\.js)" defer><\/script>/;
if (!scriptTag.test(html)) {
  console.error('Could not find the Expo entry <script> tag in dist/index.html — did the export format change?');
  process.exit(1);
}
html = html.replace(scriptTag, '<script src="$1" defer fetchpriority="high"></script>');

fs.writeFileSync(distHtml, html, 'utf8');
console.log('Injected SEO meta, structured data, font-face declarations and resource hints into dist/index.html');
