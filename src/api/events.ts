// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export async function getEvents(city?: string, region?: string): Promise<Event[]> {
    try {
      // console.log('Fetching events from events_gold table...');
      // console.log('Schema: public, Table: events_gold');
      
      let query = supabase
        .from('events_gold')
        .select('*')
        .order('event_date', { ascending: true });

      // Filter by city if provided
      if (city) {
        query = query.eq('city', city);
      }

      // Filter by region if provided
      if (region) {
        query = query.eq('region', region);
      }

      const { data, error, status, statusText } = await query;
  
      // console.log('Supabase Query Response:', {
      //   data: data?.length || 0,
      //   error: error?.message,
      //   status,
      //   statusText,
      //   fullError: error
      // });

      if (error) {
        logger.error('Error fetching events from Supabase:', error);
        logger.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (data) {
        // console.log('Events fetched successfully from Supabase:', data.length, 'events');
        // if (data.length === 0) {
        //   console.warn('⚠️ No events found in events_gold table. This could be a permissions issue if you know data exists.');
        // } else {
        //   console.log('Sample event:', data[0]);
        // }
        return data as Event[];
      } else {
        // console.warn('No events found in Supabase.');
        return [];
      }
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
    let query = supabase
      .from('events_gold')
      .select('*')
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true });

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

    if (data) {
      //console.log('Events fetched successfully by date range from Supabase:', data.length, 'events');
      return data as Event[];
    } else {
      logger.warn('No events found in date range.');
      return [];
    }
  } catch (error: any) {
    logger.error('Error fetching events by date range:', error);
    throw new Error(`Failed to fetch events by date range: ${error.message}`);
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
