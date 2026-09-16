import { describe, expect, it } from 'vitest';
import type { AuthorRow, BookRow, EventRow } from '@findlocal/shared';
import { bestEventImage, eventImageOrArt, hasLiteraryLinks, literaryImage } from '../src/lib/format.js';
import { authorBio, imageAttribution, isWikipediaDescription, photoAttribution, wikipediaUrl } from '../src/lib/enrichment.js';
import { cardThumb } from '../src/lib/embedCard.js';

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
  event_date: '2026-10-01', start_time: null, end_time: null, category: 'music', event_type: [], performers: [],
  author_ids: [], book_ids: [], price: null, price_amount: null, status: null, detail_page_url: null, ticket_page_url: null,
  root_url: null, image_url: null, is_deleted: 0, first_seen_at: '', last_seen_at: '', updated_at: '', venue_name: 'V',
  venue_address: null, venue_image: null, venue_lat: null, venue_lng: null, venue_url: null, venue_type: null, venue_region: null,
  series_count: 1, series_image: null, ...o,
});

const COVER = 'https://covers.openlibrary.org/b/id/1-L.jpg';
const PHOTO = 'https://covers.openlibrary.org/a/id/9-L.jpg';

describe('eventImageOrArt', () => {
  it('prefers the event image, then the series image, then the venue image', () => {
    expect(eventImageOrArt(event({ image_url: 'a.jpg', series_image: 'b.jpg', venue_image: 'c.jpg' }))).toMatchObject({ src: 'a.jpg', kind: 'event', isArt: false });
    expect(eventImageOrArt(event({ series_image: 'b.jpg', venue_image: 'c.jpg' }))).toMatchObject({ src: 'b.jpg', kind: 'series' });
    expect(eventImageOrArt(event({ venue_image: 'c.jpg' }))).toMatchObject({ src: 'c.jpg', kind: 'venue' });
  });

  it('falls back to the category poster art — never a null src and never a label', () => {
    const pick = eventImageOrArt(event({ category: 'music' }));
    expect(pick).toMatchObject({ src: '/art/music.svg', isArt: true, kind: 'art', alt: '', attribution: null, contain: false });
  });

  it('uses the generic art for an unknown or missing category', () => {
    expect(eventImageOrArt(event({ category: null })).src).toBe('/art/event.svg');
    expect(eventImageOrArt(event({ category: 'not-a-category' })).src).toBe('/art/event.svg');
    expect(eventImageOrArt(event({ category: 'Arts & Culture' })).src).toBe('/art/art.svg');
  });

  it('carries the venue image credit when the venue row has one', () => {
    const venue = { image_attribution: 'Photo: Jane Doe, CC BY-SA 4.0' };
    expect(eventImageOrArt(event({ venue_image: 'c.jpg' }), { venue }).attribution).toBe('Photo: Jane Doe, CC BY-SA 4.0');
    // no credit is attached to an event's own image or to the art
    expect(eventImageOrArt(event({ image_url: 'a.jpg' }), { venue }).attribution).toBeNull();
    expect(eventImageOrArt(event({}), { venue }).attribution).toBeNull();
  });
});

describe('literaryImage', () => {
  const books = [book({ title: 'Bel Canto', cover_url: COVER })];
  const authors = [author({ canonical_name: 'Ann Patchett', photo_url: PHOTO })];

  it('runs book cover → author photo → event image → venue image → art', () => {
    const e = event({ image_url: 'a.jpg', venue_image: 'c.jpg', category: 'literary' });
    expect(literaryImage(e, books, authors)).toMatchObject({ kind: 'book', alt: 'Cover of Bel Canto', contain: true });
    expect(literaryImage(e, [], authors)).toMatchObject({ kind: 'author', alt: 'Ann Patchett', contain: true });
    expect(literaryImage(e, [], [])).toMatchObject({ kind: 'event', src: 'a.jpg' });
    expect(literaryImage(event({ venue_image: 'c.jpg' }), [], [])).toMatchObject({ kind: 'venue', src: 'c.jpg' });
    expect(literaryImage(event({ category: 'literary' }), [], [])).toMatchObject({ src: '/art/literary.svg', isArt: true });
  });

  it('skips books/authors that have no image at all', () => {
    const e = event({ category: 'literary' });
    expect(literaryImage(e, [book({}), book({ title: 'Has cover', cover_url: COVER })], []).alt).toBe('Cover of Has cover');
    expect(literaryImage(e, [book({})], [author({}), author({ canonical_name: 'Pic', photo_url: PHOTO })]).alt).toBe('Pic');
  });

  it('sizes OpenLibrary images (L for heroes, M for cards)', () => {
    const e = event({ category: 'literary' });
    expect(literaryImage(e, books, []).src).toBe('https://covers.openlibrary.org/b/id/1-L.jpg');
    expect(literaryImage(e, books, [], { coverSize: 'M' }).src).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
    expect(literaryImage(e, [], authors, { coverSize: 'M' }).src).toBe('https://covers.openlibrary.org/a/id/9-M.jpg');
  });

  it('defaults to the books/authors attached to the event', () => {
    const e = event({ category: 'literary', books, authors });
    expect(literaryImage(e).kind).toBe('book');
  });

  it('shows the author photo credit when the gazetteer row has one', () => {
    // photo_attribution is a real D1 column (migration 0013), now declared on
    // AuthorRow and selected by AUTHOR_COLS — but sparse, so the accessor must
    // still cope with a row that has none (second assertion).
    const credited: AuthorRow[] = [author({ canonical_name: 'Ann', photo_url: PHOTO, photo_attribution: 'Wikimedia Commons / CC BY 2.0' })];
    expect(literaryImage(event({}), [], credited).attribution).toBe('Wikimedia Commons / CC BY 2.0');
    expect(literaryImage(event({}), [], authors).attribution).toBeNull();
  });
});

describe('hasLiteraryLinks / bestEventImage', () => {
  it('only takes the literary chain when the event has gazetteer links', () => {
    expect(hasLiteraryLinks(event({}))).toBe(false);
    expect(hasLiteraryLinks(event({ author_ids: ['a'] }))).toBe(true);
    expect(hasLiteraryLinks(event({ book_ids: ['9780306406157'] }))).toBe(true);

    const withBook = event({ image_url: 'a.jpg', book_ids: ['b'], books: [book({ title: 'B', cover_url: COVER })] });
    expect(bestEventImage(withBook).kind).toBe('book');
    // same event without the link keeps its own image
    expect(bestEventImage(event({ image_url: 'a.jpg' })).kind).toBe('event');
  });
});

describe('cardThumb art fallback (embed rows)', () => {
  it('ends on the category art instead of null', () => {
    expect(cardThumb(event({ category: 'nightlife' }), new Map())).toEqual({ src: '/art/nightlife.svg', kind: 'art', alt: '' });
    expect(cardThumb(event({ category: 'music', image_url: 'a.jpg' }), new Map())).toEqual({ src: 'a.jpg', kind: 'image', alt: '' });
  });
});

describe('enrichment accessors (columns may be absent)', () => {
  it('returns null for missing rows, missing columns and blank strings', () => {
    for (const row of [null, undefined, {}, { wikipedia_url: '' }, { wikipedia_url: '   ' }, 'nope', 7]) {
      expect(wikipediaUrl(row)).toBeNull();
    }
    expect(imageAttribution(undefined)).toBeNull();
    expect(photoAttribution({})).toBeNull();
    expect(authorBio({ bio: '  ' })).toBeNull();
  });

  it('accepts only https wikipedia.org article URLs', () => {
    expect(wikipediaUrl({ wikipedia_url: 'https://en.wikipedia.org/wiki/Paradise_Rock_Club' })).toBe('https://en.wikipedia.org/wiki/Paradise_Rock_Club');
    expect(wikipediaUrl({ wikipedia_url: 'https://fr.wikipedia.org/wiki/Foo' })).toBe('https://fr.wikipedia.org/wiki/Foo');
    expect(wikipediaUrl({ wikipedia_url: 'http://en.wikipedia.org/wiki/Foo' })).toBeNull();
    expect(wikipediaUrl({ wikipedia_url: 'https://evil.example.com/wikipedia.org' })).toBeNull();
    expect(wikipediaUrl({ wikipedia_url: 'javascript:alert(1)' })).toBeNull();
    expect(wikipediaUrl({ wikipedia_url: 'not a url' })).toBeNull();
  });

  it('collapses whitespace in credits and bios', () => {
    expect(imageAttribution({ image_attribution: ' Photo:\n  Jane Doe ' })).toBe('Photo: Jane Doe');
    expect(authorBio({ bio: 'Line one.\n\nLine two.' })).toBe('Line one. Line two.');
  });

  it('flags Wikipedia-sourced descriptions case-insensitively', () => {
    expect(isWikipediaDescription({ description_source: 'Wikipedia' })).toBe(true);
    expect(isWikipediaDescription({ description_source: 'llm' })).toBe(false);
    expect(isWikipediaDescription({})).toBe(false);
  });
});
