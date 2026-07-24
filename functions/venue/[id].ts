// Server-rendered meta + honest status codes for /venue/:id.
// Mirrors functions/event/[id].ts: unknown or inactive venues 404 instead of
// answering 200 with the homepage shell.
import { Env, supabaseSelect, fetchShell, applyMeta, htmlResponse, cleanMetaDescription } from '../_shared';

interface VenueRow {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  image: string | null;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean | null;
}

const VENUE_COLUMNS = 'id,name,description,address,city,region,image,url,latitude,longitude,is_active';

export async function onRequest(context: {
  env: Env;
  params: { id: string };
  request: Request;
}): Promise<Response> {
  const { env, params, request } = context;
  const id = params.id;
  const canonical = `https://findlocal.community/venue/${id}`;
  const shell = await fetchShell(env, request.url);

  let rows: VenueRow[] | null = null;
  try {
    rows = await supabaseSelect<VenueRow>(
      env,
      'venues',
      `id=eq.${encodeURIComponent(id)}&select=${VENUE_COLUMNS}&limit=1`
    );
  } catch {
    return htmlResponse(shell, 200);
  }

  const venue = rows?.[0] ?? null;
  if (!venue || venue.is_active === false) {
    return htmlResponse(
      applyMeta(shell, {
        title: 'Venue not available | Find Local',
        description: 'This venue is no longer listed. Browse local venues and events on Find Local.',
        canonical,
        noindex: true,
      }),
      404
    );
  }

  const name = venue.name ?? 'Venue';
  const title = [name, venue.city && `in ${venue.city}`].filter(Boolean).join(' ');
  const cleanedDescription = cleanMetaDescription(venue.description);
  const description =
    cleanedDescription ||
    [
      `Upcoming events at ${name}`,
      venue.address,
      [venue.region, venue.city].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(' · ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name,
    ...(cleanedDescription && { description: cleanedDescription }),
    ...(venue.image && { image: venue.image }),
    url: canonical,
    ...(venue.url && { sameAs: venue.url }),
    address: {
      '@type': 'PostalAddress',
      ...(venue.address && { streetAddress: venue.address }),
      ...(venue.city && { addressLocality: venue.city }),
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
  };

  return htmlResponse(
    applyMeta(shell, {
      title: `${title} | Find Local`,
      description,
      canonical,
      image: venue.image ?? undefined,
      jsonLd,
    }),
    200
  );
}
