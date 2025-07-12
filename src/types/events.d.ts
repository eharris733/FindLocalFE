export interface Event {
    id: string;
    created_at: string;
    title: string;
    event_date: string;
    time: string | null;
    venue_name: string;
    category: string;
    url: string;
    preview_image: string | null;
    description: string | null;
    venue_id: number | null;
    clean_title: string | null;
  }

export interface EventFilters {
    category: string;
    startDate: Date | null;
    endDate: Date | null;
    dateRange: 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'this_month' | 'custom';
    searchText: string;
    venue: string;
  }
  
  export type FilterAction =
    | { type: 'SET_CATEGORY'; payload: string }
    | { type: 'SET_START_DATE'; payload: Date | null }
    | { type: 'SET_END_DATE'; payload: Date | null }
    | { type: 'SET_DATE_RANGE'; payload: 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'next_week' | 'this_month' | 'custom' }
    | { type: 'SET_SEARCH_TEXT'; payload: string }
    | { type: 'SET_LOCATION'; payload: string }
    | { type: 'RESET_FILTERS' };
