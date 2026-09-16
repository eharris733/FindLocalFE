// Cloudflare Image Transformations helper (pure — no runtime dependency).
// The findlocal.community zone has Transformations turned OFF as of writing;
// flip IMAGE_CDN_ENABLED once it's enabled there so imageUrl() starts resizing.
export const IMAGE_CDN_ENABLED = false;

export const IMAGE_CDN_BASE = 'https://findlocal.community/cdn-cgi/image';

export interface ImageOpts {
  width: number;
  height?: number;
  fit?: 'cover' | 'scale-down' | 'contain';
  quality?: number;
}

/** Builds a `/cdn-cgi/image/...` URL for `src`, or passes it through unchanged
 * when disabled, not a fetchable http(s) URL, or already transformed. */
export function buildImageUrl(src: string | null | undefined, o: ImageOpts, enabled: boolean): string | null {
  if (!src) return null;
  if (!/^https?:\/\//i.test(src) || src.includes('/cdn-cgi/image/')) return src;
  if (!enabled) return src;
  const opts = [`width=${o.width}`];
  if (o.height != null) opts.push(`height=${o.height}`);
  opts.push(`fit=${o.fit ?? 'cover'}`, 'format=auto', `quality=${o.quality ?? 80}`);
  return `${IMAGE_CDN_BASE}/${opts.join(',')}/${encodeURI(src)}`;
}

const OL_COVER_RE = /^(https?:\/\/covers\.openlibrary\.org\/[ab]\/id\/\d+)-[SML](\.jpg)$/i;

/** Pick the OpenLibrary cover size (S ≈ 40px, M ≈ 180px, L ≈ 500px wide). The
 * gazetteer stores -L; thumbnails should not hot-link a 500px image while the
 * CDN transform is off. Non-OpenLibrary URLs pass through unchanged. */
export function openLibraryCover(src: string | null | undefined, size: 'S' | 'M' | 'L'): string | null {
  if (!src) return null;
  return src.replace(OL_COVER_RE, `$1-${size}$2`);
}

/** buildImageUrl gated by IMAGE_CDN_ENABLED — the call sites use this. */
export function imageUrl(src: string | null | undefined, o: ImageOpts): string | null {
  return buildImageUrl(src, o, IMAGE_CDN_ENABLED);
}

/**
 * A URL safe to drop into a `srcset` candidate. There a space ends the URL (what
 * follows is the descriptor) and a comma starts the next candidate — and we
 * hot-link scraped image URLs containing both, e.g.
 * `https://www.burren.com/images/mike verge.jpg`, which the browser reports as
 * "Dropped srcset candidate …/mike" and then renders at 1x only. The `src`
 * attribute tolerates them, so only the srcset copy needs this. Idempotent on an
 * already-encoded URL (`%20`/`%2C` contain neither character).
 */
export function srcsetUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  return src.replace(/ /g, '%20').replace(/,/g, '%2C');
}
