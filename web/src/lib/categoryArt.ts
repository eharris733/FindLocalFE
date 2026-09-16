// Curated per-category poster art. One hand-authored SVG per canonical category
// slug lives in web/public/art/<slug>.svg (plus a generic event.svg), so a card
// with no image gets real illustration instead of a flat gradient + label.
// The files are original CC0 assets — see web/public/art/README.md.
//
// Pure + dependency-free: it only maps a category string to a public URL, so the
// native app can vendor the same table alongside the SVGs.
import { CATEGORY_SLUGS } from '@findlocal/shared';

/** Slug used when a category is missing, unknown, or has no art of its own. */
export const FALLBACK_ART_SLUG = 'event';

/** Every slug that has a file under web/public/art (categories + the fallback). */
export const CATEGORY_ART_SLUGS: readonly string[] = [...CATEGORY_SLUGS, FALLBACK_ART_SLUG];

const HAS_ART = new Set<string>(CATEGORY_ART_SLUGS);

/**
 * Alternate spellings that reach us from `events.category`, `venues.type` and
 * hand-typed filters. Keys are already normalised (lowercase, `_`-joined).
 * Every value must be a slug in CATEGORY_ART_SLUGS.
 */
const ALIASES: Readonly<Record<string, string>> = {
  // music
  concert: 'music', concerts: 'music', live_music: 'music', gig: 'music', band: 'music', jazz: 'music',
  // comedy
  standup: 'comedy', stand_up: 'comedy', improv: 'comedy', open_mic: 'comedy',
  // theater
  theatre: 'theater', play: 'theater', plays: 'theater', cabaret: 'theater', performance: 'theater',
  // dance
  dancing: 'dance', ballet: 'dance', salsa: 'dance',
  // literary
  books: 'literary', book: 'literary', bookstore: 'literary', library: 'literary', poetry: 'literary',
  author: 'literary', reading: 'literary', storytelling: 'literary',
  // arts & culture
  arts: 'art', culture: 'art', arts_culture: 'art', museum: 'art', museums: 'art', gallery: 'art',
  exhibition: 'art', film: 'art', movies: 'art', screening: 'art', lecture: 'art', tour: 'art',
  // food & drink
  food: 'food_drink', drink: 'food_drink', drinks: 'food_drink', food_and_drink: 'food_drink',
  dining: 'food_drink', restaurant: 'food_drink', brewery: 'food_drink', tasting: 'food_drink',
  // family
  kids: 'family', children: 'family', family_friendly: 'family', all_ages: 'family', storytime: 'family',
  // markets
  markets: 'market', farmers_market: 'market', flea_market: 'market', craft_fair: 'market', bazaar: 'market',
  // classes & workshops
  workshops: 'workshop', class: 'workshop', classes: 'workshop', seminar: 'workshop', course: 'workshop',
  // fitness & wellness
  wellness: 'fitness', yoga: 'fitness', health: 'fitness', running: 'fitness', run_club: 'fitness',
  sports: 'fitness', sport: 'fitness', game: 'fitness',
  // nightlife
  club: 'nightlife', clubbing: 'nightlife', dj: 'nightlife', party: 'nightlife', trivia: 'nightlife',
  karaoke: 'nightlife', drag: 'nightlife', bar: 'nightlife',
  // community
  civic: 'community', meetup: 'community', volunteer: 'community', social: 'community',
  networking: 'community', fundraiser: 'community', neighborhood: 'community',
  // festivals
  festivals: 'festival', fair: 'festival', parade: 'festival', block_party: 'festival', celebration: 'festival',
  // parks & outdoors
  park: 'parks', outdoor: 'parks', outdoors: 'parks', nature: 'parks', hike: 'parks', hiking: 'parks',
  parks_outdoors: 'parks', trail: 'parks',
};

/** lowercase, collapse separators/ampersands to `_`, drop anything else. */
function normalise(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Category (slug, label, venue type or junk) -> the art slug to use. */
export function categoryArtSlug(category: string | null | undefined): string {
  if (!category) return FALLBACK_ART_SLUG;
  const key = normalise(category);
  if (!key) return FALLBACK_ART_SLUG;
  if (HAS_ART.has(key)) return key;
  const alias = ALIASES[key];
  if (alias && HAS_ART.has(alias)) return alias;
  return FALLBACK_ART_SLUG;
}

/** Absolute site path of the poster art for a category, always a real file. */
export function categoryArtUrl(category: string | null | undefined): string {
  return `/art/${categoryArtSlug(category)}.svg`;
}
