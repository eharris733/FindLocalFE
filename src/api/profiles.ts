import { supabase } from '../supabase';

export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  updated_at?: string | null;
  favorite_events?: string[] | null; // Array of event IDs
  preferred_city?: string | null; // Database city name (e.g., 'boston', 'brooklyn')
}

export async function getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function upsertProfile(profile: Partial<Profile>): Promise<{ data: Profile | null; error: any }> {
  // Supabase upsert -> select -> maybeSingle to return the row
  const res = await supabase.from('profiles').upsert(profile).select().maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updateFavoriteEvents(userId: string, favoriteEvents: string[]): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ favorite_events: favoriteEvents })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updatePreferredCity(userId: string, city: string): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ preferred_city: city })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}
