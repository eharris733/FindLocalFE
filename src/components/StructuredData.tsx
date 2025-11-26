import React from 'react';
import { Head } from 'expo-router';

interface StructuredDataProps {
  city?: string;
}

export function StructuredData({ city }: StructuredDataProps) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Find Local",
    "url": "https://findlocal.community",
    "logo": "https://findlocal.community/logo.png",
    "description": "Discover local events in your city. Find concerts, comedy shows, theater, dance performances, and more.",
    "sameAs": [
      "https://www.instagram.com/findl0cal/"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "findlocalinternal@gmail.com",
      "contactType": "Customer Service"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Find Local",
    "url": "https://findlocal.community",
    "description": "Discover local events in Boston and New York. Browse concerts, comedy shows, theater performances, and more.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://findlocal.community/?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Head>
  );
}
