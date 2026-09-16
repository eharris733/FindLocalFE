import { describe, expect, it } from 'vitest';
import type { AuthorRow, BookRow, EventRow } from '@findlocal/shared';
import { cardAuthors, cardThumb, dedupeNames, eventBuyUrl, nameKey } from '../src/lib/embedCard.js';
import { BOOKSHOP_STOREFRONT_URL } from '../src/lib/bookshop.js';

const book = (o: Partial<BookRow>): BookRow => ({
  id: 'x', title: 'T', subtitle: null, isbn13: null, isbn10: null,
  cover_url: null, description: null, publisher: null, pub_year: null, author_ids: [], ...o,
});
const author = (o: Partial<AuthorRow>): AuthorRow => ({
  id: 'a', canonical_name: 'A', photo_url: null, openlibrary_id: null,
  bio: null, wikipedia_url: null, photo_attribution: null, ...o,
});
const event = (o: Partial<EventRow>): EventRow => ({
  id: 'e', venue_id: 'v', city: 'Boston', region: null, source: 's', external_id: null, title: 'Ev', description: null,
  event_date: '2026-10-01', start_time: null, end_time: null, category: 'literary', event_type: [], performers: [],
  author_ids: [], book_ids: [], price: null, price_amount: null, status: null, detail_page_url: null, ticket_page_url: null,
  root_url: null, image_url: null, is_deleted: 0, first_seen_at: '', last_seen_at: '', updated_at: '', venue_name: 'V',
  venue_address: null, venue_image: null, venue_lat: null, venue_lng: null, venue_url: null, venue_type: null, venue_region: null,
  series_count: 1, series_image: null, ...o,
});

const ISBN = book({ id: '9780306406157', isbn13: '9780306406157', title: 'Exact', cover_url: 'https://covers.openlibrary.org/b/id/1-L.jpg' });
const SLUG = book({ id: 'work-slug', title: 'Slugged' });
const LATEST = book({ id: '9780000000027', isbn13: '9780000000027', title: 'Latest', cover_url: 'https://covers.openlibrary.org/b/id/2-L.jpg', author_ids: ['ada'] });
const ADA = author({ id: 'ada', canonical_name: 'Ada Debut', photo_url: 'https://covers.openlibrary.org/a/id/9-L.jpg' });
const NELL = author({ id: 'nell', canonical_name: 'Nell Nobook' });

describe('nameKey / dedupeNames', () => {
  it('collapses punctuation, case and diacritics', () => {
    expect(nameKey('Vincent. Yu')).toBe(nameKey('vincent yu'));
    expect(nameKey('Ríoghnach Robinson')).toBe('rioghnach robinson');
    expect(dedupeNames(['Vincent Yu', 'Vincent. Yu', ' ', 'Ada Debut'])).toEqual(['Vincent Yu', 'Ada Debut']);
  });
});

describe('eventBuyUrl', () => {
  it('returns the first exact link, ignoring storefront fallbacks', () => {
    expect(eventBuyUrl(event({ books: [SLUG, ISBN] }))).toBe('https://bookshop.org/a/128390/9780306406157');
    expect(eventBuyUrl(event({ books: [SLUG] }))).toBeNull();
    expect(eventBuyUrl(event({}))).toBeNull();
  });
});

describe('cardAuthors', () => {
  const latest = new Map([['ada', LATEST]]);
  it("links the event's own buyable book first", () => {
    expect(cardAuthors(event({ authors: [ADA], author_ids: ['ada'], books: [ISBN] }), latest)).toEqual([
      { name: 'Ada Debut', href: 'https://bookshop.org/a/128390/9780306406157' },
    ]);
  });
  it("falls back to the author's latest ISBN book, else no link (never the storefront)", () => {
    expect(cardAuthors(event({ authors: [ADA], author_ids: ['ada'], books: [SLUG] }), latest)[0]!.href).toBe('https://bookshop.org/a/128390/9780000000027');
    const nell = cardAuthors(event({ authors: [NELL], author_ids: ['nell'] }), latest);
    expect(nell).toEqual([{ name: 'Nell Nobook', href: null }]);
    expect(nell[0]!.href).not.toBe(BOOKSHOP_STOREFRONT_URL);
  });
  it('dedupes gazetteer authors and falls back to author-role performers when nothing is linked', () => {
    expect(cardAuthors(event({ authors: [ADA, { ...ADA, id: 'ada-2' }] }), latest).length).toBe(1);
    const perf = event({ performers: [{ name: 'Rex Prolific', role: 'author' }, { name: 'Rex. Prolific', role: 'author' }, { name: 'Host Person', role: 'host' }] });
    expect(cardAuthors(perf, latest)).toEqual([{ name: 'Rex Prolific', href: null }]);
    expect(cardAuthors(event({}), latest)).toEqual([]);
  });
});

describe('cardThumb', () => {
  const latest = new Map([['ada', LATEST]]);
  it('prefers the linked cover, sized to M', () => {
    expect(cardThumb(event({ books: [SLUG, ISBN] }), latest)).toEqual({ src: 'https://covers.openlibrary.org/b/id/1-M.jpg', kind: 'cover', alt: 'Cover of Exact' });
  });
  it('then the latest-book cover, then the author photo, then event/venue image, then the category art', () => {
    expect(cardThumb(event({ author_ids: ['ada'], authors: [ADA] }), latest)?.src).toBe('https://covers.openlibrary.org/b/id/2-M.jpg');
    expect(cardThumb(event({ author_ids: ['ada'], authors: [ADA] }), new Map())).toEqual({ src: 'https://covers.openlibrary.org/a/id/9-M.jpg', kind: 'photo', alt: 'Ada Debut' });
    expect(cardThumb(event({ authors: [NELL], image_url: 'https://img/e.jpg' }), new Map())).toEqual({ src: 'https://img/e.jpg', kind: 'image', alt: '' });
    expect(cardThumb(event({ venue_image: 'https://img/v.jpg' }), new Map())?.src).toBe('https://img/v.jpg');
    // Last resort is the category poster art, never null — the widget rows used to
    // fall back to a grey book glyph.
    expect(cardThumb(event({}), new Map())).toEqual({ src: '/art/literary.svg', kind: 'art', alt: '' });
  });
});
