import { supabase } from '../supabase';
import { logger } from '../utils/logger';

// Types matching actual database schema
export interface Community {
  id: string;
  name: string;
  parent_id?: string | null;
  level: number;
  description?: string | null;
  metadata?: {
    icon?: string;
    color?: string;
    display_order?: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityLabel {
  id: string;
  community_id: string;
  city: string;
  label: string;
  description?: string | null;
  metadata?: {
    display_order?: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityCityAvailability {
  id: string;
  community_id: string;
  city: string;
  is_enabled: boolean;
  metadata?: {
    min_daily_events?: number;
    priority?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventCommunityAssignment {
  id: string;
  event_id: string;
  community_id: string;
  labels?: string[] | null;
  assigned_by: 'ai' | 'venue' | 'manual';
  confidence?: number | null;
  created_at?: string;
}

export interface VenueCommunity {
  id: string;
  venue_id: string;
  community_id: string;
  priority?: 'high' | 'medium' | 'low' | null;
  default_labels?: string[] | null;
  auto_assign: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityLabelsGrouped {
  [communityName: string]: CommunityLabel[];
}

/**
 * Fetch all communities that are enabled for a specific city
 */
export async function getCommunitiesForCity(city: string): Promise<Community[]> {
  try {
    logger.info('[communities.ts] Fetching communities for city:', city);
    
    const { data, error } = await supabase
      .from('community_city_availability')
      .select(`
        community:communities(*)
      `)
      .eq('city', city)
      .eq('is_enabled', true);

    if (error) {
      logger.error('[communities.ts] Error fetching communities for city:', error);
      return [];
    }

    // Extract communities from the join
    const communities = data?.map((item: any) => item.community).filter(Boolean) || [];
    
    // Sort by display_order in metadata
    communities.sort((a: Community, b: Community) => {
      const orderA = a.metadata?.display_order ?? 999;
      const orderB = b.metadata?.display_order ?? 999;
      return orderA - orderB;
    });

    logger.info('[communities.ts] Fetched communities for city:', communities);
    return communities;
  } catch (error) {
    logger.error('[communities.ts] Error fetching communities for city:', error);
    return [];
  }
}

/**
 * Fetch all communities (regardless of city)
 */
export async function getAllCommunities(): Promise<Community[]> {
  try {
    logger.info('[communities.ts] Fetching all communities...');
    
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      logger.error('[communities.ts] Error fetching all communities:', error);
      return [];
    }

    // Sort by display_order in metadata
    const sorted = (data || []).sort((a: Community, b: Community) => {
      const orderA = a.metadata?.display_order ?? 999;
      const orderB = b.metadata?.display_order ?? 999;
      return orderA - orderB;
    });

    logger.info('[communities.ts] Fetched all communities:', sorted);
    return sorted;
  } catch (error) {
    logger.error('[communities.ts] Error fetching all communities:', error);
    return [];
  }
}

/**
 * Fetch labels for a specific community in a city
 */
export async function getLabelsForCommunity(
  communityId: string,
  city: string
): Promise<CommunityLabel[]> {
  try {
    logger.info('[communities.ts] Fetching labels for community:', communityId, 'city:', city);
    
    const { data, error } = await supabase
      .from('community_labels')
      .select('*')
      .eq('community_id', communityId)
      .eq('city', city);

    if (error) {
      logger.error('[communities.ts] Error fetching community labels:', error);
      return [];
    }

    // Sort by display_order in metadata
    const sorted = (data || []).sort((a: CommunityLabel, b: CommunityLabel) => {
      const orderA = a.metadata?.display_order ?? 999;
      const orderB = b.metadata?.display_order ?? 999;
      return orderA - orderB;
    });

    logger.info('[communities.ts] Fetched community labels:', sorted);
    return sorted;
  } catch (error) {
    logger.error('[communities.ts] Error fetching community labels:', error);
    return [];
  }
}

/**
 * Fetch all labels for a city, grouped by community name
 * Optionally filter by selected community IDs
 */
export async function getAllLabelsForCity(
  city: string,
  selectedCommunityIds?: string[]
): Promise<CommunityLabelsGrouped> {
  try {
    logger.info('[communities.ts] Fetching labels for city:', city, 'communities:', selectedCommunityIds);
    
    // Build query
    let query = supabase
      .from('community_labels')
      .select(`
        *,
        community:communities(name)
      `)
      .eq('city', city);

    // Filter by selected communities if provided
    if (selectedCommunityIds && selectedCommunityIds.length > 0) {
      query = query.in('community_id', selectedCommunityIds);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[communities.ts] Error fetching labels for city:', error);
      return {};
    }

    logger.info('[communities.ts] Raw labels data:', data);

    // Group by community name
    const grouped: CommunityLabelsGrouped = {};
    
    if (data) {
      data.forEach((label: any) => {
        const communityName = label.community?.name;
        if (communityName) {
          if (!grouped[communityName]) {
            grouped[communityName] = [];
          }
          grouped[communityName].push(label);
        }
      });
    }

    logger.info('[communities.ts] Grouped labels:', grouped);
    return grouped;
  } catch (error) {
    logger.error('[communities.ts] Error fetching labels for city:', error);
    return {};
  }
}
