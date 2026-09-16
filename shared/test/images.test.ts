// Tests for shared/src/images.ts. Kept in its own file (rather than added to
// pure.test.ts) to avoid clashing with concurrent edits to that file.
import { describe, expect, it } from 'vitest';
import { buildImageUrl, imageUrl, IMAGE_CDN_BASE, IMAGE_CDN_ENABLED, openLibraryCover, srcsetUrl } from '../src/images.js';

describe('openLibraryCover', () => {
  it('swaps the size suffix on OpenLibrary cover/author URLs only', () => {
    expect(openLibraryCover('https://covers.openlibrary.org/b/id/456-L.jpg', 'M')).toBe('https://covers.openlibrary.org/b/id/456-M.jpg');
    expect(openLibraryCover('https://covers.openlibrary.org/a/id/123-M.jpg', 'S')).toBe('https://covers.openlibrary.org/a/id/123-S.jpg');
    expect(openLibraryCover('https://img/cover-L.jpg', 'M')).toBe('https://img/cover-L.jpg');
    expect(openLibraryCover(null, 'M')).toBeNull();
  });
});

const SRC = 'https://images.example.com/a photo.jpg';

describe('IMAGE_CDN_ENABLED', () => {
  it('ships disabled until the zone has Transformations turned on', () => {
    expect(IMAGE_CDN_ENABLED).toBe(false);
  });
});

describe('buildImageUrl', () => {
  it('passes the source straight through when disabled', () => {
    expect(buildImageUrl(SRC, { width: 320 }, false)).toBe(SRC);
  });

  it('builds an exact transformation URL when enabled, in width,height,fit,format,quality order', () => {
    const url = buildImageUrl(SRC, { width: 320, height: 240 }, true);
    expect(url).toBe(`${IMAGE_CDN_BASE}/width=320,height=240,fit=cover,format=auto,quality=80/${encodeURI(SRC)}`);
  });

  it('honours explicit fit and quality, and omits height when absent', () => {
    const url = buildImageUrl(SRC, { width: 320, fit: 'contain', quality: 60 }, true);
    expect(url).toBe(`${IMAGE_CDN_BASE}/width=320,fit=contain,format=auto,quality=60/${encodeURI(SRC)}`);
  });

  it('is idempotent — a URL that already went through the transform is passed through unchanged', () => {
    const once = buildImageUrl(SRC, { width: 320 }, true)!;
    expect(buildImageUrl(once, { width: 640 }, true)).toBe(once);
  });

  it('passes through non-http(s) sources unchanged even when enabled', () => {
    expect(buildImageUrl('/local/relative.jpg', { width: 320 }, true)).toBe('/local/relative.jpg');
    expect(buildImageUrl('data:image/png;base64,abc', { width: 320 }, true)).toBe('data:image/png;base64,abc');
  });

  it('returns null for null/empty input', () => {
    expect(buildImageUrl(null, { width: 320 }, true)).toBeNull();
    expect(buildImageUrl(undefined, { width: 320 }, true)).toBeNull();
    expect(buildImageUrl('', { width: 320 }, true)).toBeNull();
  });
});

describe('imageUrl', () => {
  it('delegates to buildImageUrl gated by IMAGE_CDN_ENABLED (currently disabled, so it is a passthrough)', () => {
    expect(imageUrl(SRC, { width: 320 })).toBe(SRC);
    expect(imageUrl(null, { width: 320 })).toBeNull();
  });
});

describe('srcsetUrl', () => {
  it('encodes the two characters that break a srcset candidate', () => {
    // Real scraped URLs: a space ends the candidate's URL, a comma starts the next one.
    expect(srcsetUrl('https://www.burren.com/images/mike verge.jpg')).toBe('https://www.burren.com/images/mike%20verge.jpg');
    expect(srcsetUrl('https://x.test/a,b.jpg')).toBe('https://x.test/a%2Cb.jpg');
    expect(srcsetUrl('https://x.test/prestige world wide.jpeg')).toBe('https://x.test/prestige%20world%20wide.jpeg');
  });

  it('leaves clean and already-encoded URLs alone, and passes null through', () => {
    expect(srcsetUrl('https://images.example.com/clean.jpg')).toBe('https://images.example.com/clean.jpg');
    const encoded = 'https://x.test/a%20b%2Cc.jpg';
    expect(srcsetUrl(encoded)).toBe(encoded);
    expect(srcsetUrl(srcsetUrl('https://x.test/a b,c.jpg'))).toBe('https://x.test/a%20b%2Cc.jpg');
    expect(srcsetUrl(null)).toBeNull();
    expect(srcsetUrl('')).toBeNull();
  });
});
