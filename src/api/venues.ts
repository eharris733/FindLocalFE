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

export async function getVenueById(venueId: string): Promise<Venue | null> {
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

export async function getVenuesByCity(city: string): Promise<Venue[]> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching venues by city from Supabase:', error);
      return [];
    }

    return data as Venue[];
  } catch (error: any) {
    console.error('Error fetching venues by city:', error);
    return [];
  }
}

export async function getAllVenues(): Promise<Venue[]> {
  try {
    console.log('🏢 Fetching all venues from database...');
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching all venues from Supabase:', error);
      return [];
    }

    console.log(`🏢 Found ${data?.length || 0} venues in database`);
    console.log('🏢 Sample venues:', data?.slice(0, 3).map(v => ({ 
      id: v.id, 
      name: v.name, 
      city: v.city, 
      is_active: v.is_active 
    })));

    return data as Venue[];
  } catch (error: any) {
    console.error('Error fetching all venues:', error);
    return [];
  }
}

export async function getAvailableCities(): Promise<string[]> {
  try {
    console.log('🏙️ Fetching available cities from database...');
    
    const { data, error } = await supabase
      .from('venues')
      .select('city')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching cities from Supabase:', error);
      return [];
    }

    // Get unique cities
    const cities = [...new Set(data.map(venue => venue.city))].filter(Boolean);
    console.log(`🏙️ Found cities with venues:`, cities);

    return cities;
  } catch (error: any) {
    console.error('Error fetching cities:', error);
    return [];
  }
}