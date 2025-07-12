// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';

export async function getEvents(): Promise<Event[]> {
    try {
      console.log('Attempting to fetch events from Supabase...');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Schema:', 'brooklyn'); // Since you're using brooklyn schema
      
      const { data, error } = await supabase
        .from('events_gold')
        .select('*')
        .order('event_date', { ascending: true });
  
      console.log('Supabase response - data:', data);
      console.log('Supabase response - error:', error);
      
      if (error) {
        console.error('Error fetching events from Supabase:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (data) {
        console.log('Events fetched successfully from Supabase:', data.length, 'events');
        return data as Event[];
      } else {
        console.warn('No events found in Supabase.');
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }