import type { APIRoute } from 'astro';
import { isUuid } from '@findlocal/shared';
import { jsonResponse } from '../../../lib/apiHeaders.js';
import { getDb, getEvent } from '../../../lib/db.js';

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  const event = isUuid(id) ? await getEvent(getDb(), id) : null;
  if (!event) return jsonResponse({ error: 'not found' }, 404);
  return jsonResponse({ data: event });
};
