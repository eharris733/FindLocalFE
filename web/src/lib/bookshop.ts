// Bookshop.org affiliate links (pure). We build our own buy links from our book
// gazetteer data rather than embedding Bookshop's iframe/script widgets, so the
// affordance matches the site design, ships no third-party script, and stays safe
// inside the already-iframed /embed widget.
//
// Affiliate mechanics: a link under /a/<id>/... or /shop/<slug> sets Bookshop's
// 48h affiliate cookie and credits the sale. A plain search URL does NOT, so the
// graceful fallback when we lack an ISBN is the storefront, never a search link.
import type { BookRow } from '@findlocal/shared';

export const BOOKSHOP_AFFILIATE_ID = '128390';
export const BOOKSHOP_SHOP_SLUG = 'findlocal';

/** The affiliate storefront — always credits; the graceful fallback. */
export const BOOKSHOP_STOREFRONT_URL = `https://bookshop.org/shop/${BOOKSHOP_SHOP_SLUG}`;

/** rel for every affiliate anchor (paid link, not a crawlable endorsement). */
export const BOOKSHOP_LINK_REL = 'sponsored nofollow noopener';

/** The 13 digits of an ISBN-13, or null. Tolerates hyphens/spaces; rejects ISBN-10
 * and anything else (Bookshop's /a/ deep link only resolves an ISBN-13). */
export function normalizeIsbn13(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  return /^\d{13}$/.test(digits) ? digits : null;
}

/** Per-ISBN affiliate deep link, or null when there is no usable ISBN-13. */
export function bookshopBookUrl(isbn13: string | null | undefined): string | null {
  const isbn = normalizeIsbn13(isbn13);
  return isbn ? `https://bookshop.org/a/${BOOKSHOP_AFFILIATE_ID}/${isbn}` : null;
}

export interface BuyLink {
  href: string;
  label: string;
  /** true when it deep-links the exact book; false when it falls back to the storefront. */
  exact: boolean;
}

/** The buy affordance for a book. Deep-links the exact book when an ISBN-13 is
 * known (either the isbn13 column or an id that already is one — Bookmanager books
 * store the ISBN as the id), otherwise falls back to the always-credited storefront
 * (during the ISBN backfill, or for author-only events with no linked book). */
export function buyLink(book?: BookRow | null): BuyLink {
  const isbn = normalizeIsbn13(book?.isbn13) ?? normalizeIsbn13(book?.id);
  if (isbn) {
    return { href: `https://bookshop.org/a/${BOOKSHOP_AFFILIATE_ID}/${isbn}`, label: 'Buy the book', exact: true };
  }
  return { href: BOOKSHOP_STOREFRONT_URL, label: 'Shop on Bookshop.org', exact: false };
}
