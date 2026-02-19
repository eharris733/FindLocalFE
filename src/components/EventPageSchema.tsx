import React, { useEffect } from 'react';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

interface EventPageSchemaProps {
  readonly event: Event;
  readonly venue?: Venue | null;
}

/**
 * EventPageSchema component for individual event pages
 * Adds Event structured data (schema.org) for better SEO and rich search results
 */
export function EventPageSchema({ event, venue }: EventPageSchemaProps) {
  // Build the event URL
  const isWeb = typeof globalThis.window !== 'undefined';
  const baseUrl = isWeb ? globalThis.window.location.origin : 'https://findlocal.community';
  const eventUrl = `${baseUrl}/event/${event.id}`;

  // Format the event date and time
  const hasDate = Boolean(event.event_date);
  const hasTime = Boolean(event.start_time);
  
  let startDateTime: string | undefined;
  if (hasDate && hasTime) {
    startDateTime = `${event.event_date}T${event.start_time}`;
  } else if (hasDate) {
    startDateTime = `${event.event_date}T00:00:00`;
  }

  // Build offers object if ticket URL exists
  const offers = event.ticket_page_url ? {
    '@type': 'Offer',
    url: event.ticket_page_url,
    ...(event.price && { 
      price: event.price.replaceAll(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
    }),
    availability: event.status?.toLowerCase().includes('sold') 
      ? 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock',
  } : undefined;

  // Build location object if venue exists
  const location = venue ? {
    '@type': 'Place',
    name: venue.name,
    ...(venue.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address,
        addressLocality: event.city,
      }
    }),
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
    ...(event.image_url && { image: event.image_url }),
    url: eventUrl,
    ...(offers && { offers }),
    ...(location && { location }),
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
    updateMetaTag('og:title', event.title, true);
    updateMetaTag('og:description', pageDescription, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', eventUrl, true);
    if (event.image_url) {
      updateMetaTag('og:image', event.image_url, true);
    }
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', event.title, true);
    updateMetaTag('twitter:description', pageDescription, true);
    if (event.image_url) {
      updateMetaTag('twitter:image', event.image_url, true);
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
