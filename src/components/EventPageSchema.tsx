import React, { useEffect } from 'react';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';
import { CANONICAL_ORIGIN } from '../constants/site';

interface EventPageSchemaProps {
  readonly event: Event;
  readonly venue?: Venue | null;
}

/**
 * Parse a numeric price from event data.
 * Uses price_amount as primary source, falls back to extracting from price string.
 * For ranges like "$20-$30", returns the minimum value.
 */
function parsePriceValue(event: Event): number | undefined {
  if (event.price_amount != null) {
    return event.price_amount;
  }
  if (event.price) {
    const match = event.price.match(/[\d]+(?:\.[\d]+)?/);
    if (match) {
      return parseFloat(match[0]);
    }
  }
  return undefined;
}

/**
 * EventPageSchema component for individual event pages
 * Adds Event structured data (schema.org) for better SEO and rich search results
 */
export function EventPageSchema({ event, venue }: EventPageSchemaProps) {
  // Build the event URL — always the production origin, never
  // window.location.origin (www/preview hosts must not self-canonicalise).
  const eventUrl = `${CANONICAL_ORIGIN}/event/${event.id}`;

  // Format the event date and time
  const hasDate = Boolean(event.event_date);
  const hasTime = Boolean(event.start_time);

  let startDateTime: string | undefined;
  if (hasDate && hasTime) {
    startDateTime = `${event.event_date}T${event.start_time}`;
  } else if (hasDate) {
    startDateTime = `${event.event_date}T00:00:00`;
  }

  // Build endDate
  let endDate: string | undefined;
  if (hasDate && event.end_time) {
    endDate = `${event.event_date}T${event.end_time}`;
  } else if (hasDate) {
    endDate = event.event_date!;
  }

  // Image fallback chain: image_url → cover_image_url → venue.image
  const imageUrl = event.image_url || event.cover_image_url || venue?.image || undefined;

  // Determine if event is free
  const isFree = event.price?.toLowerCase().includes('free') || event.price_amount === 0;

  // Parse price value
  const priceValue = parsePriceValue(event);

  // Build offers - emit whenever we have price info or a URL
  const offerUrl = event.ticket_page_url || event.detail_page_url || eventUrl;
  const availability = event.status?.toLowerCase().includes('sold')
    ? 'https://schema.org/SoldOut'
    : 'https://schema.org/InStock';

  let offers: Record<string, unknown> | undefined;
  if (isFree) {
    offers = {
      '@type': 'Offer',
      url: offerUrl,
      price: 0,
      priceCurrency: 'USD',
      availability,
      ...(event.created_at && { validFrom: event.created_at }),
    };
  } else if (priceValue !== undefined) {
    offers = {
      '@type': 'Offer',
      url: offerUrl,
      price: priceValue,
      priceCurrency: 'USD',
      availability,
      ...(event.created_at && { validFrom: event.created_at }),
    };
  } else if (event.ticket_page_url || event.detail_page_url) {
    offers = {
      '@type': 'Offer',
      url: offerUrl,
      availability,
      ...(event.created_at && { validFrom: event.created_at }),
    };
  }

  // Derive address region from city
  const addressRegion = event.city === 'Boston' ? 'MA' : 'NY';

  // Build location object
  let location: Record<string, unknown> | undefined;
  if (venue) {
    const address: Record<string, string> = {
      '@type': 'PostalAddress',
      addressLocality: event.city,
      addressRegion,
      addressCountry: 'US',
    };
    if (venue.address) {
      address.streetAddress = venue.address;
    }

    location = {
      '@type': 'Place',
      name: venue.name,
      address,
      ...(venue.latitude != null && venue.longitude != null && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: venue.latitude,
          longitude: venue.longitude,
        },
      }),
    };
  } else if (event.custom_location) {
    location = {
      '@type': 'Place',
      name: event.custom_location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city,
        addressRegion,
        addressCountry: 'US',
      },
    };
  }

  // Build organizer from venue
  const organizer = venue ? {
    '@type': 'Organization',
    name: venue.name,
    ...(venue.url && { url: venue.url }),
  } : undefined;

  // Determine event status
  let eventStatus = 'https://schema.org/EventScheduled';
  if (event.status?.toLowerCase().includes('cancel')) {
    eventStatus = 'https://schema.org/EventCancelled';
  } else if (event.status?.toLowerCase().includes('postpon')) {
    eventStatus = 'https://schema.org/EventPostponed';
  }

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(event.description && { description: event.description }),
    ...(startDateTime && { startDate: startDateTime }),
    ...(endDate && { endDate }),
    ...(imageUrl && { image: imageUrl }),
    url: eventUrl,
    ...(offers && { offers }),
    ...(location && { location }),
    ...(organizer && { organizer }),
    ...(isFree && { isAccessibleForFree: true }),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.event_type && event.event_type.length > 0 && {
      genre: event.event_type,
    }),
    eventStatus,
  };

  // Create a clean title for the page
  const titleParts = [event.title];
  if (event.event_date) {
    titleParts.push(new Date(event.event_date).toLocaleDateString());
  }
  if (venue?.name) {
    titleParts.push(`at ${venue.name}`);
  }
  const pageTitle = `${titleParts.join(' - ')} | Find Local Events`;

  // Create description
  let pageDescription = '';
  if (event.description) {
    const maxLength = 160;
    pageDescription = event.description.length > maxLength
      ? `${event.description.substring(0, maxLength)}...`
      : event.description;
  } else {
    const descParts = [event.title];
    if (event.event_date) {
      descParts.push(`on ${new Date(event.event_date).toLocaleDateString()}`);
    }
    if (venue?.name) {
      descParts.push(`at ${venue.name}`);
    }
    pageDescription = descParts.join(' ');
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Update document title
    document.title = pageTitle;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    updateMetaTag('description', pageDescription);

    // Open Graph
    updateMetaTag('og:title', event.title ?? '', true);
    updateMetaTag('og:description', pageDescription, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', eventUrl, true);
    if (imageUrl) {
      updateMetaTag('og:image', imageUrl, true);
    }

    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', event.title ?? '', true);
    updateMetaTag('twitter:description', pageDescription, true);
    if (imageUrl) {
      updateMetaTag('twitter:image', imageUrl, true);
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = eventUrl;

    // Add structured data script
    let script = document.querySelector('script[type="application/ld+json"][data-event-schema]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-event-schema', 'true');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(eventSchema);
  }, [event, venue, pageTitle, pageDescription, eventUrl, eventSchema]);

  return null;
}
