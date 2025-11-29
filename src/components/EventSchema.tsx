import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

interface EventSchemaProps {
  event: Event;
  venue?: Venue | null;
}

export function EventSchema({ event, venue }: EventSchemaProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !event) return;

    // Parse event date and time
    const eventDate = event.event_date;
    const startTime = event.start_time;
    
    // Construct start date-time
    let startDateTime = eventDate;
    if (eventDate && startTime) {
      startDateTime = `${eventDate.split('T')[0]}T${startTime}`;
    }

    // Parse price
    const priceValue = event.price_amount || undefined;
    const priceCurrency = 'USD';
    
    // Determine if it's free
    const isFree = event.price?.toLowerCase().includes('free') || event.price_amount === 0;

    const eventSchema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title || 'Event',
      "description": event.description || `Join us for ${event.title} at ${venue?.name || 'the venue'}`,
      "startDate": startDateTime,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      ...(event.image_url && {
        "image": [event.image_url]
      }),
      ...(event.ticket_page_url && {
        "url": event.ticket_page_url
      }),
      ...(venue && {
        "location": {
          "@type": "Place",
          "name": venue.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": event.city,
            "addressRegion": event.city === 'Boston' ? 'MA' : 'NY',
            "addressCountry": "US"
          }
        }
      }),
      ...(!venue && event.city && {
        "location": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": event.city,
            "addressRegion": event.city === 'Boston' ? 'MA' : 'NY',
            "addressCountry": "US"
          }
        }
      }),
      ...(isFree ? {
        "isAccessibleForFree": true,
        "offers": {
          "@type": "Offer",
          "price": 0,
          "priceCurrency": priceCurrency,
          "availability": "https://schema.org/InStock",
          "url": event.ticket_page_url || event.detail_page_url,
        }
      } : priceValue !== undefined && {
        "offers": {
          "@type": "Offer",
          "price": priceValue,
          "priceCurrency": priceCurrency,
          "availability": event.status?.toLowerCase().includes('sold out') 
            ? "https://schema.org/SoldOut" 
            : "https://schema.org/InStock",
          "url": event.ticket_page_url || event.detail_page_url,
        }
      }),
      ...(event.event_type && event.event_type.length > 0 && {
        "genre": event.event_type
      })
    };

    // Inject script into head
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(eventSchema);
    script.id = `schema-event-${event.id}`;

    // Remove existing script if it exists
    const existing = document.getElementById(`schema-event-${event.id}`);
    if (existing) existing.remove();

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [event, venue]);

  return null;
}
