// src/api/events.ts
import type { Event } from '../types/events';
import { supabase } from '../supabase';

// ...existing code...
export async function getEvents(): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events_gold')
        .select('*')
        .order('event_date', { ascending: true });
  
      if (error) {
        console.error('Error fetching events from Supabase:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (data) {
        console.log('Events fetched successfully from Supabase:', data);
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