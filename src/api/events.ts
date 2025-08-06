// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';

export async function getEvents(city?: string): Promise<Event[]> {
    try {
      console.log('Fetching events from events_gold table...');
      console.log('Schema: public, Table: events_gold');
      
      let query = supabase
        .from('events_gold')
        .select('*')
        .order('event_date', { ascending: true });

      // Filter by city if provided
      if (city) {
        query = query.eq('city', city);
      }

      const { data, error, status, statusText } = await query;
  
      console.log('Supabase Query Response:', {
        data: data?.length || 0,
        error: error?.message,
        status,
        statusText,
        fullError: error
      });

      if (error) {
        console.error('Error fetching events from Supabase:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (data) {
        console.log('Events fetched successfully from Supabase:', data.length, 'events');
        if (data.length === 0) {
          console.warn('⚠️ No events found in events_gold table. This could be a permissions issue if you know data exists.');
        } else {
          console.log('Sample event:', data[0]);
        }
        return data as Event[];
      } else {
        console.warn('No events found in Supabase.');
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
}

export async function getEventsByCity(city: string): Promise<Event[]> {
  return getEvents(city);
}

export async function getEventsByDateRange(
  startDate: string, 
  endDate: string, 
  city?: string
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

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events by date range from Supabase:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (data) {
      console.log('Events fetched successfully by date range from Supabase:', data.length, 'events');
      return data as Event[];
    } else {
      console.warn('No events found in date range.');
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching events by date range:', error);
    throw new Error(`Failed to fetch events by date range: ${error.message}`);
  }
}
