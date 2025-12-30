// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

const PAGE_SIZE = 1000;

export async function getEvents(city?: string, region?: string): Promise<Event[]> {
    try {
      let allEvents: Event[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('events_gold')
          .select('*')
          .order('event_date', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Filter by city if provided
        if (city) {
          query = query.eq('city', city);
        }

        // Filter by region if provided
        if (region) {
          query = query.eq('region', region);
        }

        const { data, error } = await query;

        if (error) {
          logger.error('Error fetching events from Supabase:', error);
          logger.error('Error details:', JSON.stringify(error, null, 2));
          throw new Error(`Supabase error: ${error.message}`);
        }

        if (data && data.length > 0) {
          allEvents.push(...(data as Event[]));
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      logger.info(`Fetched ${allEvents.length} events from Supabase`);
      return allEvents;
    } catch (error: any) {
      logger.error('Error fetching events:', error);
      logger.error('Full error object:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
}

export async function getEventsByCity(city: string): Promise<Event[]> {
  return getEvents(city);
}

export async function getEventsByRegion(region: string): Promise<Event[]> {
  return getEvents(undefined, region);
}

export async function getEventsByCityAndRegion(city: string, region?: string): Promise<Event[]> {
  return getEvents(city, region);
}

export async function getEventsByDateRange(
  startDate: string, 
  endDate: string, 
  city?: string,
  region?: string
): Promise<Event[]> {
  try {
    let allEvents: Event[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('events_gold')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filter by city if provided
      if (city) {
        query = query.eq('city', city);
      }

      // Filter by region if provided
      if (region) {
        query = query.eq('region', region);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching events by date range from Supabase:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (data && data.length > 0) {
        allEvents.push(...(data as Event[]));
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allEvents.length > 0) {
      logger.info(`Fetched ${allEvents.length} events by date range from Supabase`);
      return allEvents;
    } else {
      logger.warn('No events found in date range.');
      return [];
    }
  } catch (error: any) {
    logger.error('Error fetching events by date range:', error);
    throw new Error(`Failed to fetch events by date range: ${error.message}`);
  }
}

export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events_gold')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      logger.error('Error fetching event by ID from Supabase:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      logger.warn(`No event found with ID: ${eventId}`);
      return null;
    }

    logger.info(`Fetched event with ID: ${eventId}`);
    return data as Event;
  } catch (error: any) {
    logger.error('Error fetching event by ID:', error);
    throw new Error(`Failed to fetch event: ${error.message}`);
  }
}

export async function getAvailableCities(): Promise<string[]> {
  try {
    //console.log('🏙️ Fetching available cities from events_gold table...');
    
    const { data, error } = await supabase
      .from('events_gold')
      .select('city')
      .not('city', 'is', null);

    if (error) {
      logger.error('Error fetching cities from events_gold:', error);
      return [];
    }

    // Get unique cities from events
    const cities = [...new Set(data.map(event => event.city).filter(Boolean))];
    //console.log(`🏙️ Found cities with events:`, cities);

    return cities;
  } catch (error: any) {
    logger.error('Error fetching cities from events:', error);
    return [];
  }
}

/**
 * Fetch events with their community assignments and labels
 * This includes the community_id, labels, and assigned_by from event_community_assignments
 */
export async function getEventsWithCommunities(
  city?: string,
  communityIds?: string[],
  labels?: string[]
): Promise<Event[]> {
  try {
    let allEvents: Event[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('events_gold')
        .select(`
          *,
          event_community_assignments(
            community_id,
            labels,
            assigned_by,
            confidence
          )
        `)
        .order('event_date', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filter by city if provided
      if (city) {
        query = query.eq('city', city);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching events with communities:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (data && data.length > 0) {
        // Filter by community IDs if provided
        let filteredData = data;
        
        if (communityIds && communityIds.length > 0) {
          filteredData = data.filter(event => 
            event.event_community_assignments?.some((assignment: any) =>
              communityIds.includes(assignment.community_id)
            )
          );
        }

        // Filter by labels if provided
        if (labels && labels.length > 0) {
          filteredData = filteredData.filter(event =>
            event.event_community_assignments?.some((assignment: any) =>
              assignment.labels?.some((label: string) => labels.includes(label))
            )
          );
        }

        allEvents.push(...(filteredData as Event[]));
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    logger.info(`Fetched ${allEvents.length} events with communities from Supabase`);
    return allEvents;
  } catch (error: any) {
    logger.error('Error fetching events with communities:', error);
    throw new Error(`Failed to fetch events with communities: ${error.message}`);
  }
}

/**
 * Get events that followed creators have shared (created invitations for)
 * Returns events with creator profile info
 */
export interface CreatorEventActivity {
  event: Event;
  creator: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  activity_type: 'shared' | 'attending';
  activity_date: string;
}

export async function getEventsFromFollowedCreators(
  userId: string
): Promise<CreatorEventActivity[]> {
  try {
    // Get list of creators the user follows
    const { data: followingData, error: followingError } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId);

    if (followingError) {
      logger.error('Error fetching following list:', followingError);
      return [];
    }

    if (!followingData || followingData.length === 0) {
      return [];
    }

    const followingIds = followingData.map((f) => f.following_id);

    // Get invitations created by followed creators
    const { data: invitations, error: invitationsError } = await supabase
      .from('event_invitations')
      .select('event_id, inviter_id, created_at')
      .in('inviter_id', followingIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (invitationsError) {
      logger.error('Error fetching creator invitations:', invitationsError);
      return [];
    }

    if (!invitations || invitations.length === 0) {
      return [];
    }

    // Get unique event IDs
    const eventIds = [...new Set(invitations.map((i) => i.event_id))];

    // Fetch the events
    const { data: events, error: eventsError } = await supabase
      .from('events_gold')
      .select('*')
      .in('id', eventIds);

    if (eventsError) {
      logger.error('Error fetching events:', eventsError);
      return [];
    }

    // Fetch creator profiles
    const creatorIds = [...new Set(invitations.map((i) => i.inviter_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', creatorIds);

    if (profilesError) {
      logger.error('Error fetching creator profiles:', profilesError);
    }

    // Build a map for quick lookup
    const eventMap = new Map((events || []).map((e) => [e.id, e]));
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Combine the data
    const activities: (CreatorEventActivity | null)[] = invitations
      .map((invitation) => {
        const event = eventMap.get(invitation.event_id);
        const creator = profileMap.get(invitation.inviter_id);
        
        if (!event || !creator) return null;

        return {
          event: event as Event,
          creator: {
            id: creator.id as string,
            username: creator.username as string | null,
            full_name: creator.full_name as string | null,
            avatar_url: creator.avatar_url as string | null,
          },
          activity_type: 'shared' as const,
          activity_date: invitation.created_at as string,
        };
      });
    
    // Filter out nulls
    const validActivities = activities.filter((a): a is CreatorEventActivity => a !== null);

    // Remove duplicates (keep first activity per event)
    const seen = new Set<string>();
    const uniqueActivities = validActivities.filter((a) => {
      const key = `${a.event.id}-${a.creator.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    logger.info(`Found ${uniqueActivities.length} events from followed creators`);
    return uniqueActivities;
  } catch (error: any) {
    logger.error('Error fetching events from followed creators:', error);
    return [];
  }
}
