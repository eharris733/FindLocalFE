export interface Event {
    title: string;
    date: string;
    time: string;
    description: string;
    preview_image: string;
    category: string;
    id: string;
    venue: string;
    url: string;
  }

export type ViewType = 'list' | 'calendar';


// these need to be fixed a bit but a good start
export interface EventFilters {
    category: string;
    startDate: Date | null;
    searchText: string;
    venue: string;
  }
  
  export type FilterAction =
    | { type: 'SET_CATEGORY'; payload: string }
    | { type: 'SET_START_DATE'; payload: Date | null }
    | { type: 'SET_END_DATE'; payload: Date | null }
    | { type: 'SET_SEARCH_TEXT'; payload: string }
    | { type: 'SET_LOCATION'; payload: string }
    | { type: 'RESET_FILTERS' };