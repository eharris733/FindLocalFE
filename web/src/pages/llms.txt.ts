// /llms.txt — machine-readable summary of the site for AI answer engines,
// per https://llmstxt.org. Prerendered so it ships as a static asset, but
// generated (rather than a hand-maintained public/llms.txt) so the city
// count and list never drift from the vendored data (see cities.json / CITIES).
import type { APIRoute } from 'astro';
import { CATEGORIES, CITIES } from '@findlocal/shared';

export const prerender = true;

function body(): string {
  const cityNames = CITIES.map((c) => c.name).join(', ');
  const categorySlugs = CATEGORIES.map((c) => c.slug).join(', ');
  return `# Find Local

> Find Local (findlocal.community) is a local event data platform covering ${CITIES.length} US metros. It collects concerts, comedy shows, theater, author readings, live music and community events directly from venue calendars — updated daily — and serves them through a browsable site, embeddable widgets, a free JSON API and an MCP server. Literary events are indexed by author AND by book.

Find Local's data is collected from the venues themselves rather than ticketing aggregators, so it includes small community events that never appear on Ticketmaster-style platforms; each event records whether it came from the venue's own calendar or a partner API. Event and venue pages serve schema.org Event/Place JSON-LD in the initial HTML.

## Key pages

- [Platform landing](https://findlocal.community/): what is in the catalogue, live totals, and the four ways to use it (widgets, JSON API, MCP, browsing). /platform 301s here.
- [City pages](https://findlocal.community/city/boston): the event feed, per metro, at /city/<slug> (e.g. /city/new-york, /city/chicago, /city/los-angeles) — filterable by date, category and price
- [Venues](https://findlocal.community/venues): browsable directory of active venues
- [Blog](https://findlocal.community/blog): guides and writing about local event discovery
- [Developers](https://findlocal.community/developers): reference docs for the JSON API (/developers/api), the MCP server (/developers/mcp) and embeddable widgets (/developers/widgets)
- [About](https://findlocal.community/about)

## URL shapes

- Event detail: https://findlocal.community/event/<uuid> — expired events return 410
- Venue detail: https://findlocal.community/venue/<uuid>
- City listing: https://findlocal.community/city/<city-slug>

## Machine-readable

- Sitemap: https://findlocal.community/sitemap.xml
- JSON API: https://findlocal.community/api/events?city=Boston (also /api/events/<uuid>, /api/venues?city=Boston); noindex, CORS enabled
- API reference: https://findlocal.community/developers/api (walkthrough: https://findlocal.community/blog/findlocal-events-api)
- MCP server: https://mcp.findlocal.community/mcp — reference: https://findlocal.community/developers/mcp
- Embeddable widget: <script src="https://findlocal.community/widget.js" data-widget="literary-new-england"></script> renders a list/calendar/map of live events in an iframe (/embed/events); reference: https://findlocal.community/developers/widgets
- Cities covered (${CITIES.length}): ${cityNames}
- Event categories: ${categorySlugs}
`;
}

export const GET: APIRoute = () =>
  new Response(body(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
