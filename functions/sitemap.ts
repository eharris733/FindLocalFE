// Cloudflare Function for dynamic sitemap generation
// This will be available at /sitemap

import { createClient } from '@supabase/supabase-js';

interface Env {
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}

interface SitemapEvent {
  id: string;
  event_date: string | null;
  city: string;
  created_at: string | null;
}

export async function onRequest(context: { env: Env }) {
  try {
    // Initialize Supabase client with environment variables
    const supabase = createClient(
      context.env.EXPO_PUBLIC_SUPABASE_URL,
      context.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );

    // Fetch all future events from the database
    const { data: events, error } = await supabase
      .from('events_gold')
      .select('id, event_date, city, created_at')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(50000);

    if (error) {
      console.error('Error fetching events for sitemap:', error);
      return new Response('Error generating sitemap', { status: 500 });
    }

    const baseUrl = 'https://findlocal.community';
    const today = new Date().toISOString().split('T')[0];
    
    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- Event Pages -->
${(events || []).map((event: SitemapEvent) => `  <url>
    <loc>${baseUrl}/event/${event.id}</loc>
    <lastmod>${event.created_at || event.event_date || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

    console.log(`Generated sitemap with ${events?.length || 0} event URLs`);

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
