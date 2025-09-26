import { supabase } from '../supabase';

export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  updated_at?: string | null;
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
