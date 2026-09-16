import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  attachAuthors, attachBooks, authorsByIds, booksByAuthorIds, booksByIds, getEvent, latestBooksByAuthors, listUpcomingEventsForCities,
} from '../src/index.js';
import {
  AUTHOR_ID, AUTHOR_NOBOOK, AUTHOR_PHOTO, AUTHOR_TWO, BK_BOOKMANAGER, BK_ISBN, BK_NEW, BK_OLD, BK_SLUG, BOOK_CLUB_EVENT, BOOK_EVENT_ISBN,
  BOOK_EVENT_SLUG, eid, NOBOOK_AUTHOR_EVENT, seed, TODAY, TWO_BOOK_AUTHOR_EVENT,
} from './seed.js';

const db = env.DB;

beforeAll(async () => {
  await seed(db);
});

describe('booksByIds', () => {
  it('returns books by id, dedupes, drops unknown ids, and parses author_ids', async () => {
    const books = await booksByIds(db, [BK_ISBN, BK_ISBN, BK_SLUG, 'no-such-book']);
    expect(books.map((b) => b.id).sort()).toEqual([BK_ISBN, BK_SLUG].sort());
    const isbn = books.find((b) => b.id === BK_ISBN)!;
    expect(isbn.isbn13).toBe(BK_ISBN);
    expect(isbn.title).toBe('The Debut Novel');
    expect(isbn.subtitle).toBe('A Story in Parts');
    expect(isbn.author_ids).toEqual([AUTHOR_ID]);
    expect(books.find((b) => b.id === BK_SLUG)!.isbn13).toBeNull();
  });

  it('returns [] for empty input', async () => {
    expect(await booksByIds(db, [])).toEqual([]);
    expect(await booksByIds(db, ['   '])).toEqual([]);
  });
});

describe('booksByAuthorIds', () => {
  it('finds books written by the author (books.author_ids overlaps)', async () => {
    const books = await booksByAuthorIds(db, [AUTHOR_ID]);
    expect(books.map((b) => b.id)).toContain(BK_ISBN);
    expect(books.every((b) => b.author_ids.includes(AUTHOR_ID))).toBe(true);
  });

  it('returns [] for empty/unknown authors', async () => {
    expect(await booksByAuthorIds(db, [])).toEqual([]);
    expect(await booksByAuthorIds(db, ['nobody'])).toEqual([]);
  });

  it('puts buyable books first — an ISBN-13 id counts even when isbn13 is NULL — then newest', async () => {
    const ids = (await booksByAuthorIds(db, [AUTHOR_TWO])).map((b) => b.id);
    expect(ids).toEqual([BK_BOOKMANAGER, BK_NEW, BK_OLD]);
  });
});

describe('latestBooksByAuthors', () => {
  it('maps each author to their newest buyable book; authors with none are absent', async () => {
    const m = await latestBooksByAuthors(db, [AUTHOR_ID, AUTHOR_TWO, AUTHOR_NOBOOK, 'nobody', ' ']);
    expect(m.get(AUTHOR_ID)?.id).toBe(BK_ISBN);
    expect(m.get(AUTHOR_TWO)?.id).toBe(BK_BOOKMANAGER);
    expect(m.has(AUTHOR_NOBOOK)).toBe(false);
    expect(m.size).toBe(2);
    expect((await latestBooksByAuthors(db, [])).size).toBe(0);
  });
});

describe('authorsByIds / attachAuthors', () => {
  it('returns gazetteer authors with photo + openlibrary id, dropping unknowns', async () => {
    const rows = await authorsByIds(db, [AUTHOR_ID, 'nobody', AUTHOR_ID]);
    expect(rows).toEqual([{ id: AUTHOR_ID, canonical_name: 'Ada Debut', photo_url: AUTHOR_PHOTO, openlibrary_id: 'OL1A' }]);
    expect(await authorsByIds(db, [])).toEqual([]);
  });

  it('attaches authors in author_ids order and leaves authorless events untouched', async () => {
    const events = await listUpcomingEventsForCities(db, { cities: ['Providence', 'Portland ME'], from: TODAY, tz: 'America/New_York' });
    await attachAuthors(db, events);
    expect(events.find((e) => e.id === TWO_BOOK_AUTHOR_EVENT)?.authors?.map((a) => a.canonical_name)).toEqual(['Rex Prolific']);
    expect(events.find((e) => e.id === NOBOOK_AUTHOR_EVENT)?.authors?.[0]?.photo_url).toBeNull();
    expect(events.find((e) => e.id === BOOK_CLUB_EVENT)?.authors).toBeUndefined();
    expect(events.find((e) => e.id === BOOK_CLUB_EVENT)?.author_ids).toEqual([]);
  });
});

describe('getEvent attaches books', () => {
  it('hangs resolved books off a literary event (ISBN book)', async () => {
    const e = await getEvent(db, BOOK_EVENT_ISBN);
    expect(e?.book_ids).toEqual([BK_ISBN]);
    expect(e?.books?.map((b) => b.id)).toEqual([BK_ISBN]);
  });

  it('attaches a work-slug book that has no ISBN yet', async () => {
    const e = await getEvent(db, BOOK_EVENT_SLUG);
    expect(e?.books?.[0]?.id).toBe(BK_SLUG);
    expect(e?.books?.[0]?.isbn13).toBeNull();
  });

  it('leaves books undefined and book_ids empty for non-literary events', async () => {
    const e = await getEvent(db, eid(1)); // first Trivia Night
    expect(e?.book_ids).toEqual([]);
    expect(e?.books).toBeUndefined();
  });
});

describe('attachBooks', () => {
  it('batch-attaches books across a list (list queries do not attach on their own)', async () => {
    const events = await listUpcomingEventsForCities(db, {
      cities: ['Providence', 'Portland ME'], from: TODAY, tz: 'America/New_York',
    });
    expect(events.every((e) => e.books === undefined)).toBe(true);
    await attachBooks(db, events);
    expect(events.find((e) => e.id === BOOK_EVENT_ISBN)?.books?.[0]?.id).toBe(BK_ISBN);
    expect(events.find((e) => e.id === BOOK_EVENT_SLUG)?.books?.[0]?.id).toBe(BK_SLUG);
    // Events with no linked book stay unattached.
    expect(events.find((e) => e.title === 'Book Club')?.books).toBeUndefined();
  });
});
