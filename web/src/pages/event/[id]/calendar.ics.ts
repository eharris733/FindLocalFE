import type { APIRoute } from 'astro';
import { DEFAULT_TZ, getCity, isUuid } from '@findlocal/shared';
import { getDb, getEvent } from '../../../lib/db.js';
import { cleanText } from '../../../lib/format.js';
import { buildEventIcs } from '../../../lib/ics.js';

/** Single-event iCalendar download for Apple/Outlook "Add to calendar". */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  const event = isUuid(id) ? await getEvent(getDb(), id) : null;
  if (!event || event.is_deleted === 1) return new Response('Not found', { status: 404 });
  const tz = getCity(event.city)?.tz ?? DEFAULT_TZ;
  const ics = buildEventIcs({ ...event, description: cleanText(event.description) || null }, tz);
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60) || 'event'}.ics"`,
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
