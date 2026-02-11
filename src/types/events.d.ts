export interface EventCommunityAssignment {
  community_id: string;
  labels?: string[] | null;
  assigned_by: 'ai' | 'venue' | 'manual';
  confidence?: number | null;
}

export interface Event {
  id: string; // uuid
  silver_event_id: string | null; // uuid, foreign key to events_silver
  venue_id: string | null;
  title: string | null;
  city: string; // "Boston" or "New York"
  region: string | null; // "Brooklyn", "Cambridge", "Staten Island", etc.
  description: string | null;
  event_date: string | null; // timestamp with time zone
  start_time: string | null; // time without time zone
  detail_page_url: string | null;
  root_url: string | null;
  image_url: string | null;
  ticket_page_url: string | null; // URL to external ticket purchase page
  price: string | null; // Ticket price or price range (e.g., "$25", "$20-$30", "Free")
  price_amount: number | null; // Numeric price for filtering
  status: string | null; // Event status: "Sold Out", "Cancelled", "Postponed", etc.
  event_type: string[] | null; // Array of event types and genres (music, jazz, rock, comedy, theater, etc.) - LEGACY
  event_community_assignments?: EventCommunityAssignment[] | null; // New: community-based taxonomy
  created_at: string | null; // timestamp with time zone
  last_seen_at: string | null; // timestamp with time zone
  is_deleted: boolean | null; // soft delete flag
  creator_id: string | null; // user who created the event (null for scraped events)
  end_time: string | null; // "HH:MM" format, same as start_time
  custom_location: string | null; // free-form address when no venue_id
  is_private: boolean | null; // defaults true for user-created events
  cover_image_url: string | null; // Supabase Storage URL for cover photo
}

export interface FilterState {
  category: string | string[]; // Legacy - maps to event categories
  communityIds: string[]; // Community-based filtering (replaces eventTypes)
  labels: string[]; // Label filtering within communities
  venueTypes: string[]; // Venue type filtering
  startDate: Date | null;
  endDate: Date | null;
  dateRange: 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'this_month' | 'custom';
  searchText: string;
  location: string; // Changed from 'venue' to 'location' for consistency (cities)
  venues: string[]; // New field for multi-select venues
  price?: { min?: number; max?: number }; // Price range filtering
  timeRange?: { start?: number; end?: number }; // Time of day filtering (hours in 24h format)
  size: string | string[]; // New field for venue size filtering - supports multi-select
  regions: string[]; // New field for region filtering - supports multi-select
}

// Backwards compatibility
export type EventFilters = FilterState;

export type FilterAction =
  | { type: 'SET_CATEGORY'; payload: string | string[] }
  | { type: 'SET_COMMUNITY_IDS'; payload: string[] }
  | { type: 'SET_LABELS'; payload: string[] }
  | { type: 'SET_VENUE_TYPES'; payload: string[] }
  | { type: 'SET_START_DATE'; payload: Date | null }
  | { type: 'SET_END_DATE'; payload: Date | null }
  | { type: 'SET_DATE_RANGE'; payload: FilterState['dateRange'] }
  | { type: 'SET_SEARCH_TEXT'; payload: string }
  | { type: 'SET_LOCATION'; payload: string }
  | { type: 'SET_VENUES'; payload: string[] }
  | { type: 'SET_PRICE'; payload: { min?: number; max?: number } | undefined }
  | { type: 'SET_TIME_RANGE'; payload: { start?: number; end?: number } | undefined }
  | { type: 'SET_SIZE'; payload: string | string[] }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'CLEAR_ALL' } // Added clear all action
  | { type: 'RESET_FILTERS' }; // Keep for backwards compatibility
