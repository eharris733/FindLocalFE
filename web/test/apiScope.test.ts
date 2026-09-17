import { describe, expect, it } from 'vitest';
import { apiScope } from '../src/lib/apiScope.js';

describe('apiScope', () => {
  it('gates the sellable developer endpoints', () => {
    expect(apiScope('/api/events')).toBe('keyed');
    expect(apiScope('/api/venues')).toBe('keyed');
    expect(apiScope('/api/events/0b3f6a7c-1d2e-4a5b-8c9d-0e1f2a3b4c5d')).toBe('keyed');
  });

  it('leaves first-party browser endpoints open', () => {
    // /api/events/map must NOT be classified as a single-event (keyed) route.
    expect(apiScope('/api/events/map')).toBe('open');
    expect(apiScope('/api/embed/events')).toBe('open');
    expect(apiScope('/api/geo')).toBe('open');
  });

  it('treats non-api and unknown api paths safely', () => {
    expect(apiScope('/city/boston')).toBe('none');
    expect(apiScope('/')).toBe('none');
    // Unknown /api/* defaults to open, never silently gated.
    expect(apiScope('/api/something-new')).toBe('open');
  });
});
