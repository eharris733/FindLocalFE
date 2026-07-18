export interface EventCommunityAssignment {
  community_id: string;
  labels?: string[] | null;
  assigned_by: 'ai' | 'venue' | 'manual';
  confidence?: number | null;
}

export interface Event {
  id: string;
  silver_event_id: string | null;
  venue_id: string | null;
  title: string | null;
  city: string;
  region: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  detail_page_url: string | null;
  root_url: string | null;
  image_url: string | null;
  ticket_page_url: string | null;
  price: string | null;
  price_amount: number | null;
  status: string | null;
  event_type: string[] | null;
  event_community_assignments?: EventCommunityAssignment[] | null;
  created_at: string | null;
  last_seen_at: string | null;
  is_deleted: boolean | null;
  creator_id: string | null;
  end_time: string | null;
  custom_location: string | null;
  is_private: boolean | null;
  cover_image_url: string | null;
}

export type WhenFilter = 'anytime' | 'today' | 'tomorrow' | 'this_weekend' | 'custom';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface FilterState {
  when: WhenFilter;
  customDate: Date | null;
  categories: string[];
  regions: string[];
  free: boolean;
  paid: boolean;
  maxPrice: number | null;
  timeOfDay: TimeOfDay[];
  /** Free-text search over title / venue name. Session-only — never persisted. */
  query: string;
}

export type FilterAction =
  | { type: 'SET_WHEN'; payload: WhenFilter }
  | { type: 'SET_CUSTOM_DATE'; payload: Date | null }
  | { type: 'TOGGLE_CATEGORY'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'TOGGLE_REGION'; payload: string }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'SET_FREE'; payload: boolean }
  | { type: 'SET_PAID'; payload: boolean }
  | { type: 'SET_MAX_PRICE'; payload: number | null }
  | { type: 'TOGGLE_TIME_OF_DAY'; payload: TimeOfDay }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; payload: Partial<FilterState> };
