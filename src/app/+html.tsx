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
      </head>
      <body>{children}</body>
    </html>
  );
}
