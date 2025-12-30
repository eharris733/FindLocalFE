import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export type AccountType = 'personal' | 'creator';
export type ActivityVisibility = 'everyone' | 'friends' | 'followers' | 'none';

export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  updated_at?: string | null;
  favorite_events?: string[] | null; // Array of event IDs
  preferred_city?: string | null; // "Boston" or "New York"
  interests?: string[] | null; // User's selected interests/communities
  marketing_opt_in?: boolean | null; // User consent for marketing emails
  agreed_to_terms?: boolean | null; // User agreed to Terms of Service
  agreed_to_terms_date?: string | null; // Server-side timestamp (ISO string) - cannot be manipulated by client
  // Social features
  username?: string | null; // Unique public username (e.g., @arivera)
  account_type?: AccountType | null; // 'personal' or 'creator'
  activity_visibility?: ActivityVisibility | null; // Who can see attending/hosting activity
  bio?: string | null; // User bio/description
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

export async function updateInterests(userId: string, interests: string[]): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updateMarketingOptIn(userId: string, optIn: boolean): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ marketing_opt_in: optIn })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error: any }> {
  try {
    // Call the database function to delete the user
    // This will CASCADE delete all related data (profiles, favorites, etc.)
    const { data, error } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: userId
    });

    if (error) {
      logger.error('Error deleting user account:', error);
      return { success: false, error };
    }

    // Sign out after successful deletion
    await supabase.auth.signOut();

    return { success: true, error: null };
  } catch (err) {
    logger.error('Error in deleteUserAccount:', err);
    return { success: false, error: err };
  }
}

// ============================================
// Social Profile Functions
// ============================================

export async function updateUsername(userId: string, username: string): Promise<{ data: Profile | null; error: any }> {
  // Validate username format (alphanumeric and underscores only, 3-20 chars)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return { 
      data: null, 
      error: { message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' } 
    };
  }

  const res = await supabase
    .from('profiles')
    .update({ username: username.toLowerCase() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updateAccountType(userId: string, accountType: AccountType): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ account_type: accountType })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updateActivityVisibility(userId: string, visibility: ActivityVisibility): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ activity_visibility: visibility })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function updateBio(userId: string, bio: string): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .update({ bio })
    .eq('id', userId)
    .select()
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error) {
    return { available: false, error };
  }

  return { available: data === null, error: null };
}

export async function getProfileByUsername(username: string): Promise<{ data: Profile | null; error: any }> {
  const res = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  return { data: res.data as Profile | null, error: res.error };
}

export async function searchProfiles(searchTerm: string, limit: number = 20): Promise<{ data: Profile[]; error: any }> {
  const res = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, account_type, bio')
    .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .limit(limit);
  return { data: (res.data as Profile[]) || [], error: res.error };
}
