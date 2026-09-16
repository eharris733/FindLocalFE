// web/public/art/*.svg is the curated category poster set. These assets are
// served raw to browsers (both as <img src> and as a CSS background-image), so
// the contract is checked here rather than trusted: one file per canonical
// category slug, well-formed XML, no <text>/<image>/external references, and
// small enough to inline in a cache-friendly response.
import { describe, expect, it } from 'vitest';
import { CATEGORY_SLUGS } from '@findlocal/shared';
import { CATEGORY_ART_SLUGS, FALLBACK_ART_SLUG, categoryArtSlug, categoryArtUrl } from '../src/lib/categoryArt.js';

const raw = import.meta.glob('../public/art/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
/** Every file in the directory — anything here is served at /art/<name>. */
const dirFiles = Object.keys(import.meta.glob('../public/art/*', { query: '?raw', import: 'default', eager: true }))
  .map((p) => p.slice(p.lastIndexOf('/') + 1))
  .sort();

const ART: Map<string, string> = new Map(
  Object.entries(raw).map(([path, src]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), src]),
);

const MAX_BYTES = 12 * 1024;
const VOID_OK = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'stop', 'use']);

/** Minimal XML well-formedness check: every tag closes, in order. */
function xmlErrors(src: string): string[] {
  const errs: string[] = [];
  const stack: string[] = [];
  const body = src.replace(/<!--[\s\S]*?-->/g, '');
  const tagRe = /<\/?([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(body)) !== null) {
    const [tag = '', name = '', attrs = '', selfClose = ''] = m;
    if (tag.startsWith('</')) {
      const open = stack.pop();
      if (open !== name) errs.push(`</${name}> closes <${open ?? 'nothing'}>`);
      continue;
    }
    if (selfClose === '/') continue;
    if (VOID_OK.has(name) && !attrs.includes('>')) {
      errs.push(`<${name}> is not self-closed`);
      continue;
    }
    stack.push(name);
  }
  if (stack.length) errs.push(`unclosed: ${stack.join(', ')}`);
  const quotes = (body.match(/"/g) ?? []).length;
  if (quotes % 2 !== 0) errs.push('odd number of double quotes');
  return errs;
}

describe('category art files', () => {
  it('ships one SVG per canonical category plus the generic fallback', () => {
    const missing = CATEGORY_SLUGS.filter((slug) => !ART.has(slug));
    expect(missing).toEqual([]);
    expect(ART.has(FALLBACK_ART_SLUG)).toBe(true);
    expect([...ART.keys()].sort()).toEqual([...CATEGORY_ART_SLUGS].sort());
  });

  it('ships nothing else servable from /art/ (the contact sheet lives at web/art-sheet.html)', () => {
    // Everything under public/ is served by Workers assets, so a stray HTML page
    // here would be a live, indexable URL. README.md is the one allowed extra.
    expect(dirFiles.filter((f) => !f.endsWith('.svg'))).toEqual(['README.md']);
  });

  it.each([...ART.keys()].sort())('%s.svg is a small, self-contained, well-formed SVG', (slug) => {
    const src = ART.get(slug)!;
    const bytes = new TextEncoder().encode(src).length;

    expect(src.trimStart().startsWith('<svg')).toBe(true);
    expect(src.trimEnd().endsWith('</svg>')).toBe(true);
    expect(xmlErrors(src)).toEqual([]);
    expect(bytes).toBeLessThan(MAX_BYTES);

    // self-contained: no fonts/text, no raster, no network references
    expect(src).not.toMatch(/<text[\s>]/);
    expect(src).not.toMatch(/<image[\s>]/);
    expect(src).not.toMatch(/<(script|foreignObject)[\s>]/);
    expect(src).not.toMatch(/xlink:href/);
    expect(src).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(src).not.toMatch(/url\((?!#)/);
    for (const href of src.match(/href="([^"]*)"/g) ?? []) expect(href).toMatch(/href="#/);

    // renders identically in an <img> and as a CSS background
    expect(src).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(src).toContain('viewBox="0 0 1200 800"');
  });

  it('keeps ids unique per file so inlining several never collides', () => {
    const seen = new Map<string, string>();
    for (const [slug, src] of ART) {
      for (const m of src.matchAll(/\sid="([^"]+)"/g)) {
        const id = m[1]!;
        expect(id.toLowerCase().startsWith(slug.replace(/_/g, '').slice(0, 4))).toBe(true);
        expect(seen.has(id)).toBe(false);
        seen.set(id, slug);
      }
    }
  });
});

describe('categoryArtUrl', () => {
  it('maps every canonical slug to its own file', () => {
    for (const slug of CATEGORY_SLUGS) expect(categoryArtUrl(slug)).toBe(`/art/${slug}.svg`);
  });

  it('falls back to the generic event art', () => {
    expect(categoryArtUrl(null)).toBe('/art/event.svg');
    expect(categoryArtUrl(undefined)).toBe('/art/event.svg');
    expect(categoryArtUrl('')).toBe('/art/event.svg');
    expect(categoryArtUrl('   ')).toBe('/art/event.svg');
    expect(categoryArtUrl('something-nobody-classified')).toBe('/art/event.svg');
  });

  it('normalises labels, venue types and aliases onto a real file', () => {
    expect(categoryArtUrl('Music')).toBe('/art/music.svg');
    expect(categoryArtUrl('  THEATRE ')).toBe('/art/theater.svg');
    expect(categoryArtUrl('Arts & Culture')).toBe('/art/art.svg');
    expect(categoryArtUrl('food-drink')).toBe('/art/food_drink.svg');
    expect(categoryArtUrl('Food & Drink')).toBe('/art/food_drink.svg');
    expect(categoryArtUrl('outdoors')).toBe('/art/parks.svg');
    expect(categoryArtUrl('kids')).toBe('/art/family.svg');
    expect(categoryArtUrl('bookstore')).toBe('/art/literary.svg');
    expect(categoryArtUrl('trivia')).toBe('/art/nightlife.svg');
  });

  it('never resolves to a slug without a file', () => {
    const inputs = ['music', 'sports', 'film', 'museum', 'yoga', 'block party', null, 'zzz'];
    for (const input of inputs) expect(ART.has(categoryArtSlug(input))).toBe(true);
  });
});
