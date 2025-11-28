import React from 'react';
import Head from 'expo-router/head';

interface BreadcrumbSchemaProps {
  city?: string;
  category?: string;
  eventName?: string;
}

export function BreadcrumbSchema({ city, category, eventName }: Readonly<BreadcrumbSchemaProps>) {
  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://findlocal.community"
    }
  ];

  if (city) {
    items.push({
      "@type": "ListItem",
      "position": 2,
      "name": `Events in ${city}`,
      "item": `https://findlocal.community?city=${encodeURIComponent(city)}`
    });
  }

  if (category) {
    items.push({
      "@type": "ListItem",
      "position": items.length + 1,
      "name": category,
      "item": `https://findlocal.community?city=${encodeURIComponent(city || '')}&category=${encodeURIComponent(category)}`
    });
  }

  if (eventName) {
    items.push({
      "@type": "ListItem",
      "position": items.length + 1,
      "name": eventName,
      "item": typeof globalThis !== 'undefined' && globalThis.location ? globalThis.location.href : "https://findlocal.community"
    });
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Head>
  );
}
