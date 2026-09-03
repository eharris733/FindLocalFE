import { Platform } from 'react-native';
import type { Event } from '../types/events';
import type { Venue } from '../types/venues';

/**
 * First-screen data the homepage Pages Function (functions/index.ts) inlines
 * into the HTML as `window.__FEED_PRELOAD__`, alongside a server-rendered
 * `#ssr-feed` fragment. The React feed uses it as React Query *placeholder*
 * data so its first commit paints the same cards the static fragment showed,
 * then the real (full) fetch replaces it. Placeholder — never `initialData` —
 * because it's only ~12 rows and must not be cached as the city's feed.
 */
export interface FeedPreload {
  city: string;
  /** Server's yyyy-MM-dd "today" (America/New_York). */
  today: string;
  events: Event[];
  venues: Venue[];
}

declare global {
  interface Window {
    __FEED_PRELOAD__?: FeedPreload;
  }
}

/** Preloaded rows for `city`, or undefined on native / when the fragment was for another city. */
export function getFeedPreload(city: string | undefined): FeedPreload | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !city) return undefined;
  const preload = window.__FEED_PRELOAD__;
  if (!preload || preload.city !== city || !Array.isArray(preload.events)) return undefined;
  return preload;
}

/** Drop the server-rendered fragment once React has painted the real feed. */
export function removeSsrFeed(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.getElementById('ssr-feed')?.remove();
}
