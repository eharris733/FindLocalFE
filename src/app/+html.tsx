import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* Primary SEO */}
        <title>Find Local - Discover Events in Boston & New York | Concerts, Comedy & More</title>
        <meta name="description" content="Discover local events in your city. Find concerts, comedy shows, theater, dance performances, and more. Browse thousands of events in Boston and New York, updated daily." />
        <meta name="keywords" content="local events, concerts, comedy shows, theater, live music, Boston events, New York events" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://findlocal.community" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://findlocal.community" />
        <meta property="og:title" content="Find Local - Discover Events in Boston & New York" />
        <meta property="og:description" content="Discover local events in your city. Find concerts, comedy shows, theater, dance performances, and more." />
        <meta property="og:image" content="https://findlocal.community/og-image.jpg" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://findlocal.community" />
        <meta property="twitter:title" content="Find Local - Discover Events in Boston & New York" />
        <meta property="twitter:description" content="Discover local events in your city. Find concerts, comedy shows, theater, dance performances, and more." />
        <meta property="twitter:image" content="https://findlocal.community/og-image.jpg" />

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
