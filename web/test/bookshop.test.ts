import { describe, expect, it } from 'vitest';
import type { BookRow } from '@findlocal/shared';
import { BOOKSHOP_STOREFRONT_URL, bookshopBookUrl, buyLink, normalizeIsbn13 } from '../src/lib/bookshop.js';

const book = (o: Partial<BookRow>): BookRow => ({
  id: 'x', title: 'T', subtitle: null, isbn13: null, isbn10: null,
  cover_url: null, description: null, publisher: null, pub_year: null, author_ids: [], ...o,
});

describe('normalizeIsbn13', () => {
  it('accepts 13 digits, tolerating hyphens and spaces', () => {
    expect(normalizeIsbn13('978-0-306-40615-7')).toBe('9780306406157');
    expect(normalizeIsbn13('978 0 306 40615 7')).toBe('9780306406157');
    expect(normalizeIsbn13('9780306406157')).toBe('9780306406157');
  });
  it('rejects ISBN-10, wrong length, and junk', () => {
    expect(normalizeIsbn13('0306406152')).toBeNull();
    expect(normalizeIsbn13('123')).toBeNull();
    expect(normalizeIsbn13('not-an-isbn')).toBeNull();
    expect(normalizeIsbn13('')).toBeNull();
    expect(normalizeIsbn13(null)).toBeNull();
    expect(normalizeIsbn13(undefined)).toBeNull();
  });
});

describe('bookshopBookUrl', () => {
  it('builds an /a/128390/<isbn> affiliate deep link', () => {
    expect(bookshopBookUrl('978-0-306-40615-7')).toBe('https://bookshop.org/a/128390/9780306406157');
  });
  it('returns null without a usable ISBN-13', () => {
    expect(bookshopBookUrl(null)).toBeNull();
    expect(bookshopBookUrl('0306406152')).toBeNull();
  });
});

describe('buyLink', () => {
  it('deep-links the exact book when isbn13 is set', () => {
    expect(buyLink(book({ isbn13: '9780306406157' }))).toEqual({
      href: 'https://bookshop.org/a/128390/9780306406157', label: 'Buy the book', exact: true,
    });
  });
  it('uses the id when it is itself an ISBN-13 (Bookmanager books store ISBN as id)', () => {
    const l = buyLink(book({ id: '9780306406157', isbn13: null }));
    expect(l.exact).toBe(true);
    expect(l.href).toBe('https://bookshop.org/a/128390/9780306406157');
  });
  it('falls back to the credited storefront during the ISBN backfill or for author-only events', () => {
    const fallback = { href: BOOKSHOP_STOREFRONT_URL, label: 'Shop on Bookshop.org', exact: false };
    expect(buyLink(book({ id: 'collected-poems-work', isbn13: null }))).toEqual(fallback);
    expect(buyLink(null)).toEqual(fallback);
    expect(buyLink(undefined)).toEqual(fallback);
  });
  it('storefront URL targets the findlocal shop', () => {
    expect(BOOKSHOP_STOREFRONT_URL).toBe('https://bookshop.org/shop/findlocal');
  });
});
