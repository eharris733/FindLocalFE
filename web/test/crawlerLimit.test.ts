import { describe, expect, it } from 'vitest';
import { blockedCrawlerResponse, isBlockedCrawler } from '../src/lib/crawlerLimit.js';

describe('isBlockedCrawler', () => {
  it('blocks meta-externalagent regardless of the spoofed browser prefix', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))';
    expect(isBlockedCrawler(ua)).toBe(true);
    expect(isBlockedCrawler(ua.toUpperCase())).toBe(true);
  });
  it('leaves search/answer-engine bots, link previews and browsers alone', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot',
      'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    ]) {
      expect(isBlockedCrawler(ua)).toBe(false);
    }
    expect(isBlockedCrawler(null)).toBe(false);
    expect(isBlockedCrawler('')).toBe(false);
  });
});

describe('blockedCrawlerResponse', () => {
  it('is an uncacheable, noindex 403', () => {
    const res = blockedCrawlerResponse();
    expect(res.status).toBe(403);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
