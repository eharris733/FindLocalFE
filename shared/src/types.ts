// Row shapes returned by shared/src/queries.ts. JSON columns (event_type,
// performers, categories) are parsed by the query mappers; booleans stay 0/1 as in D1.

/** One entry of events.performers (JSON column, migration 0005). `role` is one of
 * headliner | support | performer | author | instructor | speaker | host | comedian | dj. */
export interface Performer {
  name: string;
  role: string;
  source_id?: string;
  url?: string;
  image?: string;
}

/** One row of the `books` gazetteer (migrations 0009/0010), fetched via book_ids
 * and attached to an event by attachBooks(). Almost every field is nullable while
 * the OpenLibrary/ISBN backfill is in flight — `isbn13` in particular is often
 * NULL, so buy-link builders must fall back gracefully. `id` is the ISBN-13 when
 * known, else an internal work slug. */
export interface BookRow {
  id: string;
  title: string;
  subtitle: string | null;
  isbn13: string | null;
  isbn10: string | null;
  cover_url: string | null;
  description: string | null;
  publisher: string | null;
  pub_year: number | null;
  /** JSON array of authors.id (parsed). */
  author_ids: string[];
}

/** One row of the `authors` gazetteer (migrations 0009/0010), fetched via
 * author_ids and attached by attachAuthors(). photo_url is OpenLibrary's. */
export interface AuthorRow {
  id: string;
  canonical_name: string;
  photo_url: string | null;
  openlibrary_id: string | null;
}

export interface EventRow {
  id: string;
  venue_id: string;
  city: string;
  region: string | null;
  source: string;
  external_id: string | null;
  title: string;
  description: string | null;
  /** Plain calendar day 'YYYY-MM-DD'. Never new Date() it. */
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  event_type: string[];
  /** People the event is by or about (authors, the bill, instructors). Empty when unknown. */
  performers: Performer[];
  /** Links into the literary gazetteer (migration 0009); '[]' for non-literary events. */
  author_ids: string[];
  book_ids: string[];
  /** Books resolved from book_ids — present only after attachBooks() runs (undefined otherwise). */
  books?: BookRow[];
  /** Authors resolved from author_ids — present only after attachAuthors() runs. */
  authors?: AuthorRow[];
  price: string | null;
  price_amount: number | null;
  status: string | null;
  detail_page_url: string | null;
  ticket_page_url: string | null;
  root_url: string | null;
  image_url: string | null;
  /** 1 when the source stopped listing the event. listUpcomingEvents hides
   * these unless includeDeleted; getEvent returns them so /event/<id> can
   * render an honest "no longer listed" state. */
  is_deleted: number;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
  venue_name: string;
  venue_address: string | null;
  venue_image: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  venue_url: string | null;
  venue_type: string | null;
  venue_region: string | null;
  /** Distinct upcoming dates sharing lower(trim(title)) at this venue (>1 = recurring). */
  series_count: number;
  /** First non-empty image_url in the series (only when series_count > 1). */
  series_image: string | null;
}

export interface VenueRow {
  id: string;
  name: string;
  city: string;
  region: string | null;
  url: string | null;
  address: string | null;
  description: string | null;
  image: string | null;
  type: string | null;
  venue_size: string | null;
  categories: string[];
  latitude: number | null;
  longitude: number | null;
  is_active: number;
  /** Upcoming non-deleted event count (0 unless requested via withUpcoming). */
  upcoming: number;
}
