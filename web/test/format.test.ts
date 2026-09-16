import { describe, expect, it } from 'vitest';
import { priceLabel, shortPriceLabel } from '../src/lib/format.js';

describe('shortPriceLabel', () => {
  it('returns priceLabel unchanged when it already fits', () => {
    expect(shortPriceLabel({ price: null, price_amount: 0 })).toBe('Free');
    expect(shortPriceLabel({ price: '$10-$20', price_amount: null })).toBe('$10-$20');
    expect(shortPriceLabel({ price: null, price_amount: null })).toBe('');
  });

  it('truncates at the last word boundary before max and adds an ellipsis', () => {
    const e = { price: 'Tickets have a $3 processing fee', price_amount: null };
    expect(priceLabel(e).length).toBeGreaterThan(14);
    expect(shortPriceLabel(e)).toBe('Tickets have…');
    expect(shortPriceLabel(e).length).toBeLessThanOrEqual(14);
  });

  it('never returns fewer than 6 chars of text before the ellipsis, even with no early word boundary', () => {
    const e = { price: 'Supercalifragilisticexpialidocious', price_amount: null };
    expect(shortPriceLabel(e)).toBe('Superc…');
  });

  it('honours a custom max', () => {
    expect(shortPriceLabel({ price: 'Advance tickets required', price_amount: null }, 10)).toBe('Advance…');
  });
});

describe('leadPerformerLine', () => {
  it('shows the headliner, a +N count, and a role prefix for non-performance roles', async () => {
    const { leadPerformerLine } = await import('../src/lib/format.js');
    expect(leadPerformerLine([])).toBe('');
    expect(leadPerformerLine([{ name: 'Opener', role: 'support' }, { name: 'Big Name', role: 'headliner' }])).toBe('Big Name +1');
    expect(leadPerformerLine([{ name: 'Ann Patchett', role: 'author' }])).toBe('Author: Ann Patchett');
    expect(leadPerformerLine([{ name: 'DJ Q', role: 'dj' }])).toBe('DJ Q');
  });
});

describe('approxCount', () => {
  it('rounds down to one decimal of k above 1,000 and leaves smaller counts exact', async () => {
    const { approxCount } = await import('../src/lib/format.js');
    expect(approxCount(2423)).toBe('2.4k+');
    expect(approxCount(640)).toBe('640+');
    expect(approxCount(999)).toBe('999+');
    expect(approxCount(1000)).toBe('1k+');
    expect(approxCount(1099)).toBe('1k+');
    expect(approxCount(2000)).toBe('2k+');
    expect(approxCount(54260)).toBe('54.2k+');
    expect(approxCount(0)).toBe('0+');
    expect(approxCount(-5)).toBe('0+');
  });
});
