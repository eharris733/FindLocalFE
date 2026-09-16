// listUpcomingEvents deliberately attaches no gazetteer rows, so a literary card
// in the feed would fall back to the venue image / category art while the event
// page showed the book cover. attachLiteraryThumbs closes that gap for the rows
// on the current page only — and must cost nothing when nothing is linked.
import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { listUpcomingEvents, type EventRow } from '@findlocal/shared';
import { attachLiteraryThumbs } from '../src/lib/feed.js';
import { bestEventImage } from '../src/lib/format.js';
import { AUTHOR_ONLY_EVENT, BOOK_EVENT_ISBN, TODAY, seed } from '../../shared/test/seed.js';

const db = env.DB;
const byId = (rows: EventRow[], id: string) => rows.find((r) => r.id === id)!;

beforeAll(async () => {
  await seed(db);
});

describe('attachLiteraryThumbs', () => {
  it('gives feed cards the book cover / author photo the event page uses', async () => {
    const providence = await listUpcomingEvents(db, { city: 'Providence', from: TODAY, limit: 100 });
    const portland = await listUpcomingEvents(db, { city: 'Portland ME', from: TODAY, limit: 100 });

    // Before: the query layer attached nothing, so the chain cannot see a cover.
    expect(byId(providence, BOOK_EVENT_ISBN).books).toBeUndefined();
    expect(bestEventImage(byId(providence, BOOK_EVENT_ISBN)).kind).not.toBe('book');

    await attachLiteraryThumbs(db, providence);
    await attachLiteraryThumbs(db, portland);

    const withBook = byId(providence, BOOK_EVENT_ISBN);
    expect(withBook.books?.map((b) => b.title)).toEqual(['The Debut Novel']);
    expect(bestEventImage(withBook).kind).toBe('book');

    const withAuthor = byId(portland, AUTHOR_ONLY_EVENT);
    expect(withAuthor.authors?.map((a) => a.canonical_name)).toEqual(['Ada Debut']);
    expect(bestEventImage(withAuthor).kind).toBe('author');
  });

  it('leaves unlinked events alone and returns the same array', async () => {
    const boston = await listUpcomingEvents(db, { city: 'Boston', from: TODAY, limit: 100 });
    const same = await attachLiteraryThumbs(db, boston);
    expect(same).toBe(boston);
    for (const e of boston) {
      if (!e.book_ids.length) expect(e.books).toBeUndefined();
      if (!e.author_ids.length) expect(e.authors).toBeUndefined();
    }
    // no links at all on the page => no queries to make
    expect(await attachLiteraryThumbs(db, [])).toEqual([]);
  });
});
