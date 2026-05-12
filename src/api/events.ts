// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

const PAGE_SIZE = 1000;

export interface EventWithExpiredStatus {
  event: Event | null;
  isExpired: boolean;
}

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

/**
 * Fetch an event by ID with fallback to old_events table
 * Returns the event and whether it came from the archive (expired)
 */
export async function getEventByIdWithFallback(eventId: string): Promise<EventWithExpiredStatus> {
  try {
    // 1. Try events_gold first (active events)
    const { data: goldEvent, error: goldError } = await supabase
      .from('events_gold')
      .select('*')
      .eq('id', eventId)
      .single();

    if (goldEvent) {
      logger.info(`Fetched active event with ID: ${eventId}`);
      return { event: goldEvent as Event, isExpired: false };
    }

    // Log the gold error for debugging, but continue to fallback
    if (goldError && goldError.code !== 'PGRST116') {
      logger.warn('Error fetching from events_gold (continuing to fallback):', goldError);
    }

    // 2. Fallback to old_events (archived events)
    logger.info(`Event not found in events_gold, checking old_events for ID: ${eventId}`);
    const { data: oldEvent, error: oldError } = await supabase
      .from('old_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (oldEvent) {
      logger.info(`Fetched expired event from archive with ID: ${eventId}`);
      return { event: oldEvent as Event, isExpired: true };
    }

    // Event not found in either table
    if (oldError) {
      logger.warn('Error fetching from old_events:', oldError);
    }

    logger.warn(`No event found with ID: ${eventId} in either events_gold or old_events`);
    return { event: null, isExpired: false };
  } catch (error: any) {
    logger.error('Error fetching event by ID with fallback:', error);
    throw new Error(`Failed to fetch event: ${error.message}`);
  }
}

/**
 * Fetch a set of events by IDs from events_gold + old_events.
 * Used by /saved so favorites from any city remain visible.
 * events_gold wins on conflict (matches getEventByIdWithFallback ordering).
 */
export async function getEventsByIds(ids: string[]): Promise<Event[]> {
  if (ids.length === 0) return [];
  try {
    const [goldResult, oldResult] = await Promise.all([
      supabase.from('events_gold').select('*').in('id', ids),
      supabase.from('old_events').select('*').in('id', ids),
    ]);
    if (goldResult.error) logger.warn('events_gold fetch in getEventsByIds:', goldResult.error);
    if (oldResult.error) logger.warn('old_events fetch in getEventsByIds:', oldResult.error);

    const byId = new Map<string, Event>();
    for (const e of (goldResult.data ?? []) as Event[]) byId.set(e.id, e);
    for (const e of (oldResult.data ?? []) as Event[]) if (!byId.has(e.id)) byId.set(e.id, e);
    return Array.from(byId.values());
  } catch (err: any) {
    logger.error('Error in getEventsByIds:', err);
    return [];
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

    const today = new Date().toISOString().split('T')[0];

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
        .gte('event_date', today)
        .or('is_deleted.is.null,is_deleted.eq.false')
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

/**
 * Get upcoming events for a specific venue
 */
export async function getUpcomingEventsForVenue(venueId: string, limit: number = 3): Promise<Event[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('events_gold')
      .select('*')
      .eq('venue_id', venueId)
      .gte('event_date', today)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('event_date', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching upcoming events for venue:', error);
      return [];
    }

    return (data || []) as Event[];
  } catch (error: any) {
    logger.error('Error fetching upcoming events for venue:', error);
    return [];
  }
}

/**
 * Network event activity - events from user's network with source attribution
 */
export interface NetworkEventActivity {
  event: Event;
  source_type: 'followed_venue' | 'followed_creator' | 'friend_attending';
  source_name: string;
  source_id: string;
  source_avatar_url?: string | null;
}

/**
 * Get events from user's network (followed venues, followed creators, friends attending)
 * Combines multiple sources and returns with attribution
 */
export async function getEventsFromNetwork(userId: string): Promise<NetworkEventActivity[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const activities: NetworkEventActivity[] = [];
    const seenEventIds = new Set<string>();

    // 1. Get events from followed venues
    const { data: venueFollows } = await supabase
      .from('venue_follows')
      .select('venue_id')
      .eq('user_id', userId);

    if (venueFollows && venueFollows.length > 0) {
      const venueIds = venueFollows.map(vf => vf.venue_id);

      // Get venue details
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name')
        .in('id', venueIds);

      const venueMap = new Map((venues || []).map(v => [v.id, v]));

      // Get upcoming events at these venues
      const { data: venueEvents } = await supabase
        .from('events_gold')
        .select('*')
        .in('venue_id', venueIds)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(20);

      if (venueEvents) {
        for (const event of venueEvents) {
          if (!seenEventIds.has(event.id)) {
            seenEventIds.add(event.id);
            const venue = venueMap.get(event.venue_id);
            activities.push({
              event: event as Event,
              source_type: 'followed_venue',
              source_name: venue?.name || 'Venue',
              source_id: event.venue_id,
              source_avatar_url: null,
            });
          }
        }
      }
    }

    // 2. Get events from followed creators
    const creatorActivities = await getEventsFromFollowedCreators(userId);
    for (const activity of creatorActivities) {
      if (!seenEventIds.has(activity.event.id)) {
        seenEventIds.add(activity.event.id);
        activities.push({
          event: activity.event,
          source_type: 'followed_creator',
          source_name: activity.creator.full_name || activity.creator.username || 'Creator',
          source_id: activity.creator.id,
          source_avatar_url: activity.creator.avatar_url,
        });
      }
    }

    // 3. Get events friends are attending
    // First get the user's friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f =>
        f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
      );

      // Get RSVPs from friends (yes or maybe)
      const { data: friendRsvps } = await supabase
        .from('event_rsvps')
        .select('event_id, user_id')
        .in('user_id', friendIds)
        .in('response', ['yes', 'maybe'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (friendRsvps && friendRsvps.length > 0) {
        // Get friend profiles
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', friendIds);

        const profileMap = new Map((friendProfiles || []).map(p => [p.id, p]));

        // Get unique event IDs from friend RSVPs that we haven't seen
        const newEventIds = [...new Set(
          friendRsvps
            .map(r => r.event_id)
            .filter(id => !seenEventIds.has(id))
        )];

        if (newEventIds.length > 0) {
          const { data: friendEvents } = await supabase
            .from('events_gold')
            .select('*')
            .in('id', newEventIds)
            .gte('event_date', today)
            .order('event_date', { ascending: true });

          if (friendEvents) {
            for (const event of friendEvents) {
              if (!seenEventIds.has(event.id)) {
                seenEventIds.add(event.id);
                // Find a friend attending this event
                const rsvp = friendRsvps.find(r => r.event_id === event.id);
                const friend = rsvp ? profileMap.get(rsvp.user_id) : null;

                activities.push({
                  event: event as Event,
                  source_type: 'friend_attending',
                  source_name: friend?.full_name || friend?.username || 'Friend',
                  source_id: friend?.id || '',
                  source_avatar_url: friend?.avatar_url,
                });
              }
            }
          }
        }
      }
    }

    // Sort by event date
    activities.sort((a, b) => {
      const dateA = a.event.event_date || '';
      const dateB = b.event.event_date || '';
      return dateA.localeCompare(dateB);
    });

    logger.info(`Found ${activities.length} events from network`);
    return activities;
  } catch (error: any) {
    logger.error('Error fetching events from network:', error);
    return [];
  }
}

// ─── User-Created Event CRUD ─────────────────────────────────────────────────

export interface CreateEventParams {
  title: string;
  city: string;
  description?: string | null;
  event_date: string;       // ISO date string
  start_time: string;       // "HH:MM"
  end_time?: string | null;  // "HH:MM"
  venue_id?: string | null;
  custom_location?: string | null;
  cover_image_url?: string | null;
  is_private?: boolean;
}

export interface UpdateEventParams extends Partial<CreateEventParams> {
  id: string;
}

/**
 * Create a new user event. Sets creator_id to the current user automatically.
 * Also sets image_url = cover_image_url for EventCard compatibility.
 */
export async function createEvent(
  params: CreateEventParams
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('events_gold')
      .insert({
        title: params.title,
        city: params.city,
        description: params.description || null,
        event_date: params.event_date,
        start_time: params.start_time,
        end_time: params.end_time || null,
        venue_id: params.venue_id || null,
        custom_location: params.custom_location || null,
        cover_image_url: params.cover_image_url || null,
        image_url: params.cover_image_url || null,
        is_private: params.is_private ?? true,
        creator_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error creating event:', error);
      return { data: null, error: error.message };
    }

    logger.info('Created event:', data.id);
    return { data: { id: data.id }, error: null };
  } catch (err: any) {
    logger.error('Error in createEvent:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Update an existing user-created event. Only updates provided fields.
 * Keeps image_url in sync with cover_image_url.
 */
export async function updateEvent(
  params: UpdateEventParams
): Promise<{ data: Event | null; error: string | null }> {
  try {
    const { id, ...updates } = params;
    const updateData: Record<string, any> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.event_date !== undefined) updateData.event_date = updates.event_date;
    if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
    if (updates.venue_id !== undefined) updateData.venue_id = updates.venue_id;
    if (updates.custom_location !== undefined) updateData.custom_location = updates.custom_location;
    if (updates.is_private !== undefined) updateData.is_private = updates.is_private;
    if (updates.cover_image_url !== undefined) {
      updateData.cover_image_url = updates.cover_image_url;
      updateData.image_url = updates.cover_image_url;
    }

    const { data, error } = await supabase
      .from('events_gold')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('Error updating event:', error);
      return { data: null, error: error.message };
    }

    logger.info('Updated event:', id);
    return { data: data as Event, error: null };
  } catch (err: any) {
    logger.error('Error in updateEvent:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Soft-delete a user-created event.
 */
export async function deleteEvent(
  eventId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('events_gold')
      .update({ is_deleted: true })
      .eq('id', eventId);

    if (error) {
      logger.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }

    logger.info('Deleted event:', eventId);
    return { success: true, error: null };
  } catch (err: any) {
    logger.error('Error in deleteEvent:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all events created by the current user.
 */
export async function getMyCreatedEvents(): Promise<{ data: Event[]; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('events_gold')
      .select('*')
      .eq('creator_id', user.id)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('event_date', { ascending: true });

    if (error) {
      logger.error('Error fetching created events:', error);
      return { data: [], error: error.message };
    }

    return { data: (data || []) as Event[], error: null };
  } catch (err: any) {
    logger.error('Error in getMyCreatedEvents:', err);
    return { data: [], error: err.message };
  }
}
