import type { Venue } from '../types/venues';
import { supabase } from '../supabase';

export async function getVenueByName(venueName: string): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('name', venueName)
      .single();

    if (error) {
      console.error('Error fetching venue from Supabase:', error);
      return null;
    }

    return data as Venue;
  } catch (error: any) {
    console.error('Error fetching venue:', error);
    return null;
  }
}

export async function getVenueById(venueId: number): Promise<Venue | null> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      console.error('Error fetching venue from Supabase:', error);
      return null;
    }

    return data as Venue;
  } catch (error: any) {
    console.error('Error fetching venue:', error);
    return null;
  }
}