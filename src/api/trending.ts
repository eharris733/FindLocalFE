// src/api/trending.ts
import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import type { Event } from '../types/events';

/**
 * Get trending events grouped by community
 * Uses event_metrics table to find most viewed events
 */
export async function getTrendingEventsByCategory(
  city: string,
  limit: number = 10
): Promise<{ data: Record<string, Event[]>; error: any }> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date().toISOString().split('T')[0];

    // Get view counts from event_metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('event_metrics')
      .select('event_id')
      .eq('metric_type', 'view')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (metricsError) {
      logger.error('Error getting event metrics:', metricsError);
    }

    // Count views per event
    const viewCounts: Record<string, number> = {};
    (metrics || []).forEach((m: any) => {
      viewCounts[m.event_id] = (viewCounts[m.event_id] || 0) + 1;
    });

    // Get events for this city with upcoming dates
    const { data: events, error: eventsError } = await supabase
      .from('events_gold')
      .select(`
        *,
        event_community_assignments (
          community_id,
          labels,
          assigned_by,
          confidence
        )
      `)
      .eq('city', city)
      .gte('event_date', today)
      .is('is_deleted', false)
      .order('event_date', { ascending: true })
      .limit(100);

    if (eventsError) {
      logger.error('Error getting trending events:', eventsError);
      return { data: {}, error: eventsError };
    }

    // Sort events by view count and group by community
    const sortedEvents = (events || []).sort((a: any, b: any) => {
      const aViews = viewCounts[a.id] || 0;
      const bViews = viewCounts[b.id] || 0;
      return bViews - aViews;
    });

    // Group by first community assignment
    const grouped: Record<string, Event[]> = {};

    sortedEvents.forEach((event: any) => {
      const assignment = event.event_community_assignments?.[0];
      const communityId = assignment?.community_id || 'uncategorized';

      if (!grouped[communityId]) {
        grouped[communityId] = [];
      }

      if (grouped[communityId].length < limit) {
        grouped[communityId].push(event as Event);
      }
    });

    return { data: grouped, error: null };
  } catch (err) {
    logger.error('Error in getTrendingEventsByCategory:', err);
    return { data: {}, error: err };
  }
}

/**
 * Get popular events overall (not grouped)
 * Returns top trending events across all categories
 */
export async function getPopularEvents(
  city: string,
  limit: number = 20
): Promise<{ data: Event[]; error: any }> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date().toISOString().split('T')[0];

    // Get view counts from event_metrics
    const { data: metrics } = await supabase
      .from('event_metrics')
      .select('event_id')
      .eq('metric_type', 'view')
      .gte('created_at', sevenDaysAgo.toISOString());

    const viewCounts: Record<string, number> = {};
    (metrics || []).forEach((m: any) => {
      viewCounts[m.event_id] = (viewCounts[m.event_id] || 0) + 1;
    });

    // Get events for this city
    const { data: events, error } = await supabase
      .from('events_gold')
      .select(`
        *,
        event_community_assignments (
          community_id,
          labels,
          assigned_by,
          confidence
        )
      `)
      .eq('city', city)
      .gte('event_date', today)
      .is('is_deleted', false)
      .order('event_date', { ascending: true })
      .limit(100);

    if (error) {
      logger.error('Error getting popular events:', error);
      return { data: [], error };
    }

    // Sort by view count and take top N
    const sorted = (events || [])
      .sort((a: any, b: any) => {
        const aViews = viewCounts[a.id] || 0;
        const bViews = viewCounts[b.id] || 0;
        return bViews - aViews;
      })
      .slice(0, limit);

    return { data: sorted as Event[], error: null };
  } catch (err) {
    logger.error('Error in getPopularEvents:', err);
    return { data: [], error: err };
  }
}

/**
 * Get suggested events for user based on favorites and similar interests
 */
export async function getSuggestedEventsForUser(
  userId: string,
  city: string,
  favoriteEventIds: string[],
  limit: number = 15
): Promise<{ data: Event[]; error: any }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // If user has no favorites, return popular events
    if (favoriteEventIds.length === 0) {
      return getPopularEvents(city, limit);
    }

    // Get communities from favorite events
    const { data: favEvents } = await supabase
      .from('events_gold')
      .select(`
        event_community_assignments (
          community_id
        )
      `)
      .in('id', favoriteEventIds.slice(0, 20));

    const preferredCommunities = new Set<string>();
    (favEvents || []).forEach((e: any) => {
      e.event_community_assignments?.forEach((a: any) => {
        if (a.community_id) preferredCommunities.add(a.community_id);
      });
    });

    // Get events in those communities, excluding already favorited
    const { data: events, error } = await supabase
      .from('events_gold')
      .select(`
        *,
        event_community_assignments (
          community_id,
          labels,
          assigned_by,
          confidence
        )
      `)
      .eq('city', city)
      .gte('event_date', today)
      .is('is_deleted', false)
      .order('event_date', { ascending: true })
      .limit(100);

    if (error) {
      logger.error('Error getting suggested events:', error);
      return { data: [], error };
    }

    // Score events by community match and filter out favorites
    const scored = (events || [])
      .filter((e: any) => !favoriteEventIds.includes(e.id))
      .map((e: any) => {
        let score = 0;
        e.event_community_assignments?.forEach((a: any) => {
          if (preferredCommunities.has(a.community_id)) {
            score += 1;
          }
        });
        return { event: e, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ event }) => event as Event);

    return { data: scored, error: null };
  } catch (err) {
    logger.error('Error in getSuggestedEventsForUser:', err);
    return { data: [], error: err };
  }
}

/**
 * Get events happening today and tomorrow for quick discovery
 */
export async function getUpcomingEvents(
  city: string,
  days: number = 2,
  limit: number = 20
): Promise<{ data: Event[]; error: any }> {
  try {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const { data: events, error } = await supabase
      .from('events_gold')
      .select(`
        *,
        event_community_assignments (
          community_id,
          labels,
          assigned_by,
          confidence
        )
      `)
      .eq('city', city)
      .gte('event_date', today.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0])
      .is('is_deleted', false)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error getting upcoming events:', error);
      return { data: [], error };
    }

    return { data: (events || []) as Event[], error: null };
  } catch (err) {
    logger.error('Error in getUpcomingEvents:', err);
    return { data: [], error: err };
  }
}
