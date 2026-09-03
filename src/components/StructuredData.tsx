import React, { useEffect } from 'react';
import { Platform } from 'react-native';

interface StructuredDataProps {
  city?: string;
}

export function StructuredData({ city }: StructuredDataProps) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Find Local",
      "url": "https://findlocal.community",
      "logo": "https://findlocal.community/logo.webp",
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

    // Inject scripts into head
    const script1 = document.createElement('script');
    script1.type = 'application/ld+json';
    script1.text = JSON.stringify(organizationSchema);
    script1.id = 'schema-organization';
    
    const script2 = document.createElement('script');
    script2.type = 'application/ld+json';
    script2.text = JSON.stringify(websiteSchema);
    script2.id = 'schema-website';

    // Remove existing scripts if they exist
    const existingOrg = document.getElementById('schema-organization');
    const existingWebsite = document.getElementById('schema-website');
    if (existingOrg) existingOrg.remove();
    if (existingWebsite) existingWebsite.remove();

    document.head.appendChild(script1);
    document.head.appendChild(script2);

    return () => {
      script1.remove();
      script2.remove();
    };
  }, [city]);

  return null;
}
