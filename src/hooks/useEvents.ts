import { useState, useEffect, useMemo, useReducer } from 'react';
import type { Event, FilterState, FilterAction } from '../types/events';
import { getEvents } from '../api/events';
import { 
  startOfDay, 
  endOfDay, 
  isBefore, 
  isAfter, 
  isWithinInterval,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay
} from 'date-fns';

const initialFilterState: FilterState = {
  category: 'all',
  startDate: null,
  endDate: null,
  dateRange: 'all',
  searchText: '',
  location: 'all',
};

const getDateRangeFromSelection = (dateRange: FilterState['dateRange']): { start: Date | null; end: Date | null } => {
  const today = new Date();
  
  switch (dateRange) {
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    
    case 'tomorrow':
      const tomorrow = addDays(today, 1);
      return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
    
    case 'this_week':
      return { start: startOfWeek(today), end: endOfWeek(today) };
    
    case 'this_weekend':
      const saturday = addDays(startOfWeek(today), 6);
      const sunday = addDays(startOfWeek(today), 7);
      return { start: startOfDay(saturday), end: endOfDay(sunday) };
    
    case 'next_week':
      const nextWeekStart = addDays(startOfWeek(today), 7);
      const nextWeekEnd = addDays(endOfWeek(today), 7);
      return { start: nextWeekStart, end: nextWeekEnd };
    
    case 'this_month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    
    case 'all':
    case 'custom':
    default:
      return { start: null, end: null };
  }
};

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload, dateRange: 'custom' };
    case 'SET_END_DATE':
      return { ...state, endDate: action.payload, dateRange: 'custom' };
    case 'SET_DATE_RANGE':
      const { start, end } = getDateRangeFromSelection(action.payload);
      return { 
        ...state, 
        dateRange: action.payload,
        startDate: start,
        endDate: end
      };
    case 'SET_SEARCH_TEXT':
      return { ...state, searchText: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'CLEAR_ALL':
    case 'RESET_FILTERS':
      return initialFilterState;
    default:
      return state;
  }
};

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: string | null;
  filteredEvents: Event[];
  filters: FilterState;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, dispatchFilters] = useReducer(filterReducer, initialFilterState);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEvents();
        setEvents(data || []); 
      } catch (err) {
        setError("Failed to load events. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const { availableCategories, availableLocations } = useMemo(() => {
    const categories = new Set(['all']);
    const locations = new Set(['all']);
    events.forEach(event => {
      if (event.category) categories.add(event.category);
      if (event.venue_name) locations.add(event.venue_name);
    });
    return {
      availableCategories: Array.from(categories).sort((a, b) => {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return a.localeCompare(b);
      }),
      availableLocations: Array.from(locations).sort((a, b) => {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return a.localeCompare(b);
      }),
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.event_date);

      // Category filter
      if (filters.category !== 'all' && event.category !== filters.category) {
        return false;
      }

      // Location filter (venue)
      if (filters.location !== 'all' && event.venue_name !== filters.location) {
        return false;
      }

      // Date filter
      if (filters.startDate && filters.endDate) {
        if (!isWithinInterval(eventDate, { start: filters.startDate, end: filters.endDate })) {
          return false;
        }
      } else if (filters.startDate) {
        if (isBefore(eventDate, startOfDay(filters.startDate))) {
          return false;
        }
      } else if (filters.endDate) {
        if (isAfter(eventDate, endOfDay(filters.endDate))) {
          return false;
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const titleLower = event.title.toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const venueLower = event.venue_name.toLowerCase();
        if (!titleLower.includes(searchLower) && 
            !descriptionLower.includes(searchLower) && 
            !venueLower.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  return {
    events,
    loading,
    error,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
  };
};

export type { FilterState, FilterAction };
