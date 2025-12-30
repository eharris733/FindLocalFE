// src/app/sitemap+api.ts
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

interface SitemapEvent {
  id: string;
  event_date: string | null;
  city: string;
  created_at: string | null;
}

export async function GET() {
  try {
    // Fetch all events from the database
    const { data: events, error } = await supabase
      .from('events_gold')
      .select('id, event_date, city, created_at')
      .gte('event_date', new Date().toISOString().split('T')[0]) // Only future events
      .order('event_date', { ascending: true })
      .limit(50000); // Sitemap limit

    if (error) {
      logger.error('Error fetching events for sitemap:', error);
      return new Response('Error generating sitemap', { status: 500 });
    }

    const baseUrl = 'https://findlocal.community';
    
    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- Event Pages -->
${(events || []).map((event: SitemapEvent) => `  <url>
    <loc>${baseUrl}/event/${event.id}</loc>
    <lastmod>${event.created_at || event.event_date || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

    logger.info(`Generated sitemap with ${events?.length || 0} event URLs`);

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
