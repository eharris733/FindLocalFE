/**
 * Post-build script that injects Google Analytics, SEO meta tags, and
 * structured data into dist/index.html after `expo export`.
 *
 * Expo's `output: "single"` ignores +html.tsx, so we inject directly.
 * Keep this in sync with src/app/+html.tsx for when/if we switch to static.
 */
const fs = require('fs');
const path = require('path');

const distHtml = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.error('dist/index.html not found. Run expo export first.');
  process.exit(1);
}

let html = fs.readFileSync(distHtml, 'utf8');

if (html.includes('G-SK3E86M5F8')) {
  console.log('Already injected, skipping.');
  process.exit(0);
}

// --- HEAD injections (before </head>) ---

const headSnippet = `
<!-- SEO Meta Tags -->
<title>Find Local - Discover Events in Boston & New York | Concerts, Comedy & More</title>
<meta name="description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, dance performances, and cultural experiences in Boston and New York City. Free and paid events updated daily." />
<meta name="keywords" content="local events, events near me, concerts, comedy shows, theater, live music, Boston events, New York events, NYC events, things to do, nightlife, cultural events, event discovery" />
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
<meta property="og:title" content="Find Local - Discover Events in Boston & New York" />
<meta property="og:description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences updated daily." />
<meta property="og:image" content="https://findlocal.community/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Find Local - Event Discovery Platform" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://findlocal.community" />
<meta name="twitter:title" content="Find Local - Discover Events in Boston & New York" />
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
  "description": "Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences in Boston and New York City.",
  "applicationCategory": "EntertainmentApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "areaServed": [
    { "@type": "City", "name": "Boston", "addressRegion": "MA" },
    { "@type": "City", "name": "New York", "addressRegion": "NY" }
  ]
}
</script>

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SK3E86M5F8"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-SK3E86M5F8', { send_page_view: false });
</script>

<!-- Material Symbols (icons) -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />

<!-- Microsoft Clarity -->
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "vkzkf8j9n8");
</script>
`;

// --- BODY injections (after <body>) ---

const bodySnippet = `
<!-- SEO content for crawlers -->
<div style="position:absolute;left:-9999px">
  <h1>Find Local Events in Boston & New York: Concerts, Comedy, Theater & More</h1>
  <p>Discover the best local events in your city. Browse thousands of concerts, comedy shows, theater performances, dance events, and cultural experiences in Boston and New York, updated daily.</p>
  <p>Filter by music, comedy, theater, culture, and more. Find events at jazz clubs, comedy venues, concert halls, and community spaces.</p>
</div>
<noscript>
  <div style="max-width:1200px;margin:40px auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <h1>Find Local Events</h1>
    <p>Discover local events in Boston and New York including concerts, comedy shows, theater, and more.</p>
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

fs.writeFileSync(distHtml, html, 'utf8');
console.log('Injected SEO meta tags, structured data, Google Analytics, and Microsoft Clarity into dist/index.html');
