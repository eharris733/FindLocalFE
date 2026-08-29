import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
//
// NOTE: INERT under the current app.config.js `web.output: "single"` — Expo
// only consults +html.tsx with `output: "static"`. The shipped equivalent is
// scripts/inject-head.js; keep the two in sync if we ever switch to static.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Primary SEO */}
        <title>Find Local - Discover Events in Boston & New York | Concerts, Comedy & More</title>
        <meta name="description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, dance performances, and cultural experiences in Boston and New York City. Free and paid events updated daily." />
        <meta name="keywords" content="local events, events near me, concerts, comedy shows, theater, live music, Boston events, New York events, NYC events, things to do, nightlife, cultural events, event discovery" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Find Local" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#006565" />

        {/* Material Symbols (icons) */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Find Local" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Find Local" />
        <meta property="og:locale" content="en_US" />
        {/* og:url set dynamically per-page by schema components */}
        <meta property="og:title" content="Find Local - Discover Events in Boston & New York" />
        <meta property="og:description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences updated daily." />
        <meta property="og:image" content="https://findlocal.community/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Find Local - Event Discovery Platform" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://findlocal.community" />
        <meta name="twitter:title" content="Find Local - Discover Events in Boston & New York" />
        <meta name="twitter:description" content="Discover the best local events near you. Browse concerts, comedy shows, live music, theater, and cultural experiences updated daily." />
        <meta name="twitter:image" content="https://findlocal.community/og-image.jpg" />
        <meta name="twitter:image:alt" content="Find Local - Event Discovery Platform" />

        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SK3E86M5F8" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-SK3E86M5F8', { send_page_view: false });
        `}} />

        {/* Affiliate verification */}
        <meta name="impact-site-verification" {...{ value: "69cc4690-1595-47a6-9724-1c86ad3258b6" } as any} />

        {/* Structured data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
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
        })}} />

        <ScrollViewStyleReset />

        {/* Preload critical content for SEO */}
        <style dangerouslySetInnerHTML={{ __html: `
          .seo-content { position: absolute; left: -9999px; }
          noscript .seo-fallback {
            display: block;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}} />
      </head>
      <body>
        {/* SEO-friendly content that crawlers can see */}
        <div className="seo-content">
          <h1>Find Local Events in Boston & New York: Concerts, Comedy, Theater & More</h1>
          <p>Discover the best local events in your city. Browse thousands of concerts, comedy shows, theater performances, dance events, and cultural experiences in Boston and New York, updated daily.</p>
          <p>Filter by music, comedy, theater, culture, and more. Find events at jazz clubs, comedy venues, concert halls, and community spaces.</p>
        </div>

        <noscript>
          <div className="seo-fallback">
            <h1>Find Local Events</h1>
            <p>Discover local events in Boston and New York including concerts, comedy shows, theater, and more.</p>
            <p>Please enable JavaScript to use the full Find Local experience.</p>
          </div>
        </noscript>

        {children}
      </body>
    </html>
  );
}
