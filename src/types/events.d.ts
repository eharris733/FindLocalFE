export interface Event {
  id: string; // uuid
  silver_event_id: string | null; // uuid, foreign key to events_silver
  venue_id: string | null;
  title: string | null;
  city: string;
  description: string | null;
  event_date: string | null; // date
  start_time: string | null; // time without time zone
  end_time: string | null; // time without time zone
  detail_page_url: string | null;
  root_url: string | null;
  image_url: string | null;
  music_info: any | null; // jsonb
  created_at: string | null; // timestamp with time zone
}

export interface FilterState {
  category: string;
  startDate: Date | null;
  endDate: Date | null;
  dateRange: 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'this_month' | 'custom';
  searchText: string;
  location: string; // Changed from 'venue' to 'location' for consistency
}

// Backwards compatibility
export type EventFilters = FilterState;

export type FilterAction =
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_START_DATE'; payload: Date | null }
  | { type: 'SET_END_DATE'; payload: Date | null }
  | { type: 'SET_DATE_RANGE'; payload: FilterState['dateRange'] }
  | { type: 'SET_SEARCH_TEXT'; payload: string }
  | { type: 'SET_LOCATION'; payload: string }
  | { type: 'CLEAR_ALL' } // Added clear all action
  | { type: 'RESET_FILTERS' }; // Keep for backwards compatibility
