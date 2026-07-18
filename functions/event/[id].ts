// Server-rendered meta + honest status codes for /event/:id.
//
// Before this function existed, every event URL was rewritten to the SPA
// shell with a 200 — Search Console filed thousands of them as "Soft 404"
// (dead events answering 200) and "Duplicate without user-selected
// canonical" (10k URLs, one identical <head>). Now:
//   - live event   → 200, per-event title/description/canonical/OG/JSON-LD
//   - past event   → 410 Gone + noindex (shell still renders the friendly
//                    "this event has passed" page for humans)
//   - unknown id   → 404 + noindex
import {
  Env,
  supabaseSelect,
  fetchShell,
  applyMeta,
  htmlResponse,
  todayString,
} from '../_shared';

interface EventRow {
  id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  city: string | null;
  image_url: string | null;
  venue_id: string | null;
  ticket_page_url: string | null;
  price: string | null;
  price_amount: number | null;
}

interface VenueRow {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

const EVENT_COLUMNS =
  'id,title,description,event_date,start_time,city,image_url,venue_id,ticket_page_url,price,price_amount';

export async function onRequest(context: {
  env: Env;
  params: { id: string };
  request: Request;
}): Promise<Response> {
  const { env, params, request } = context;
  const id = params.id;
  const canonical = `https://findlocal.community/event/${id}`;
  const shell = await fetchShell(env, request.url);

  const notFound = (status: 404 | 410) =>
    htmlResponse(
      applyMeta(shell, {
        title: 'Event not available | Find Local',
        description:
          'This event has ended or been removed. Browse upcoming local events on Find Local.',
        canonical,
        noindex: true,
      }),
      status
    );

  let rows: EventRow[] | null = null;
  try {
    rows = await supabaseSelect<EventRow>(
      env,
      'events_gold',
      `id=eq.${encodeURIComponent(id)}&select=${EVENT_COLUMNS}&limit=1`
    );
  } catch {
    // Fall through: serve the shell untouched rather than a 500 for crawlers.
    return htmlResponse(shell, 200);
  }

  let event = rows?.[0] ?? null;
  let expired = false;

  if (!event) {
    // old_events doesn't share the full gold schema, so only ask for the
    // columns needed to distinguish "gone" (410) from "never existed" (404).
    const oldRows = await supabaseSelect<EventRow>(
      env,
      'old_events',
      `id=eq.${encodeURIComponent(id)}&select=id,title,event_date&limit=1`
    ).catch(() => null);
    if (!oldRows?.[0]) return notFound(404);
    event = oldRows[0];
    expired = true;
  }

  // event_date can come back as a full timestamp; compare on the date part.
  const eventDay = event.event_date ? event.event_date.slice(0, 10) : null;
  if (!expired && eventDay && eventDay < todayString()) {
    expired = true;
  }
  if (expired) return notFound(410);

  let venue: VenueRow | null = null;
  if (event.venue_id) {
    const venueRows = await supabaseSelect<VenueRow>(
      env,
      'venues',
      `id=eq.${encodeURIComponent(event.venue_id)}&select=name,address,latitude,longitude&limit=1`
    ).catch(() => null);
    venue = venueRows?.[0] ?? null;
  }

  const title = [
    event.title ?? 'Event',
    eventDay &&
      new Date(`${eventDay}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    venue?.name && `at ${venue.name}`,
  ]
    .filter(Boolean)
    .join(' - ');

  const description =
    event.description?.trim() ||
    [
      event.title,
      eventDay && `on ${eventDay}`,
      venue?.name && `at ${venue.name}`,
      event.city && `in ${event.city}`,
    ]
      .filter(Boolean)
      .join(' ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(event.description && { description: event.description }),
    ...(eventDay && {
      startDate: event.start_time ? `${eventDay}T${event.start_time}` : eventDay,
    }),
    ...(event.image_url && { image: event.image_url }),
    url: canonical,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    ...(venue?.name && {
      location: {
        '@type': 'Place',
        name: venue.name,
        address: {
          '@type': 'PostalAddress',
          ...(venue.address && { streetAddress: venue.address }),
          ...(event.city && { addressLocality: event.city }),
          addressCountry: 'US',
        },
        ...(venue.latitude != null &&
          venue.longitude != null && {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: venue.latitude,
              longitude: venue.longitude,
            },
          }),
      },
    }),
    ...(event.price_amount != null && {
      offers: {
        '@type': 'Offer',
        price: event.price_amount,
        priceCurrency: 'USD',
        url: event.ticket_page_url || canonical,
        availability: 'https://schema.org/InStock',
      },
    }),
  };

  return htmlResponse(
    applyMeta(shell, {
      title: `${title} | Find Local Events`,
      description,
      canonical,
      image: event.image_url ?? undefined,
      jsonLd,
    }),
    200
  );
}
