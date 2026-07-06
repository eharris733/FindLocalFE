import type { Venue } from '../types/venues';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export async function getVenueByName(venueName: string): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('name', venueName)
      .single();

    if (error) {
      logger.error('Error fetching venue from Supabase:', error);
      return null;
    }

    return data as Venue;
  } catch (error: any) {
    logger.error('Error fetching venue:', error);
    return null;
  }
}

export async function getVenueById(venueId: string): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      logger.error('Error fetching venue from Supabase:', error);
      return null;
    }

    return data as Venue;
  } catch (error: any) {
    logger.error('Error fetching venue:', error);
    return null;
  }
}

// Columns needed by list/map/detail UI. Excludes scraper_config/transform_rules
// and other pipeline JSONB blobs, which dominate payload size but are never
// rendered by the app.
const VENUE_COLUMNS =
  'id, name, city, region, address, description, image, type, url, latitude, longitude, venue_size, event_types';

export async function getVenuesByCity(city: string): Promise<Venue[]> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('city', city)
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching venues by city from Supabase:', error);
      return [];
    }

    return data as Venue[];
  } catch (error: any) {
    logger.error('Error fetching venues by city:', error);
    return [];
  }
}

export async function getVenuesByRegion(region: string): Promise<Venue[]> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('region', region)
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching venues by region from Supabase:', error);
      return [];
    }

    return data as Venue[];
  } catch (error: any) {
    logger.error('Error fetching venues by region:', error);
    return [];
  }
}

export async function getVenuesByCityAndRegion(city: string, region?: string): Promise<Venue[]> {
  try {
    let query = supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('city', city)
      .eq('is_active', true);

    // If region is provided, filter by region as well
    if (region) {
      query = query.eq('region', region);
    }

    const { data, error } = await query.order('name');

    if (error) {
      logger.error('Error fetching venues by city and region from Supabase:', error);
      return [];
    }

    return data as Venue[];
  } catch (error: any) {
    logger.error('Error fetching venues by city and region:', error);
    return [];
  }
}

export async function getAllVenues(): Promise<Venue[]> {
  try {
    //console.log('🏢 Fetching all venues from database...');
    
    const { data, error } = await supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching all venues from Supabase:', error);
      return [];
    }

    // console.log(`🏢 Found ${data?.length || 0} venues in database`);
    // console.log('🏢 Sample venues:', data?.slice(0, 3).map(v => ({ 
    //   id: v.id, 
    //   name: v.name, 
    //   city: v.city, 
    //   is_active: v.is_active 
    // })));

    return data as Venue[];
  } catch (error: any) {
    logger.error('Error fetching all venues:', error);
    return [];
  }
}

export async function getAvailableCities(): Promise<string[]> {
  try {
    // console.log('🏙️ Fetching available cities from database...');

    const { data, error } = await supabase
      .from('venues')
      .select('city')
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching cities from Supabase:', error);
      return [];
    }

    // Get unique cities
    const cities = [...new Set(data.map(venue => venue.city))].filter(Boolean);
    // console.log(`🏙️ Found cities with venues:`, cities);

    return cities;
  } catch (error: any) {
    logger.error('Error fetching cities:', error);
    return [];
  }
}

/**
 * Get recommended venues for a user based on city and community preferences
 * Excludes venues the user is already following
 */
export async function getRecommendedVenues(
  city: string,
  communityIds?: string[],
  excludeVenueIds?: string[],
  limit: number = 10
): Promise<Venue[]> {
  try {
    logger.info('Fetching recommended venues:', { city, communityIds, excludeVenueIds, limit });

    // If community IDs are provided, find venues that host events in those communities
    if (communityIds && communityIds.length > 0) {
      // Query events with community assignments
      const { data: events, error: eventsError } = await supabase
        .from('events_gold')
        .select(`
          venue_name,
          event_community_assignments(community_id)
        `)
        .eq('city', city)
        .not('venue_name', 'is', null)
        .gte('event_date', new Date().toISOString()); // Only future/current events

      if (eventsError) {
        logger.error('Error fetching events for venue recommendations:', eventsError);
        // Fall back to city-based recommendations
        return getVenuesByCity(city);
      }

      // Filter events that match the user's community preferences
      const relevantEvents = events?.filter(event =>
        event.event_community_assignments?.some((assignment: any) =>
          communityIds.includes(assignment.community_id)
        )
      ) || [];

      // Extract unique venue names
      const venueNames = [...new Set(relevantEvents.map(e => e.venue_name))].filter(Boolean) as string[];

      if (venueNames.length === 0) {
        logger.info('No venues found for communities, falling back to city-based recommendations');
        return getVenuesByCity(city);
      }

      // Fetch venues by names
      let venueQuery = supabase
        .from('venues')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .in('name', venueNames)
        .order('name')
        .limit(limit);

      // Exclude venues user is already following
      if (excludeVenueIds && excludeVenueIds.length > 0) {
        venueQuery = venueQuery.not('id', 'in', `(${excludeVenueIds.join(',')})`);
      }

      const { data: venues, error: venuesError } = await venueQuery;

      if (venuesError) {
        logger.error('Error fetching recommended venues:', venuesError);
        return [];
      }

      logger.info(`Found ${venues?.length || 0} recommended venues`);
      return venues as Venue[];
    }

    // No community filter - just get popular venues in the city
    let query = supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .eq('is_active', true)
      .order('name')
      .limit(limit);

    if (excludeVenueIds && excludeVenueIds.length > 0) {
      query = query.not('id', 'in', `(${excludeVenueIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching recommended venues:', error);
      return [];
    }

    return data as Venue[];
  } catch (error: any) {
    logger.error('Error getting recommended venues:', error);
    return [];
  }
}