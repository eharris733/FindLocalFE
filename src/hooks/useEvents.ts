import { useState, useEffect, useMemo, useReducer } from 'react';
import type { Event, FilterState, FilterAction } from '../types/events';
import type { Venue } from '../types/venues';
import { getEvents } from '../api/events';
import { getAllVenues, getVenuesByCity } from '../api/venues';
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
  category: 'ALL',
  startDate: null,
  endDate: null,
  dateRange: 'all',
  searchText: '',
  location: 'all',
  venues: [], // Initialize as empty array
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
    case 'SET_VENUES':
      return { ...state, venues: action.payload };
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
  venues: Venue[];
  venuesLoading: boolean;
}

export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState<boolean>(true);
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

  // Fetch venues for filtering
  useEffect(() => {
    const fetchVenues = async () => {
      setVenuesLoading(true);
      try {
        // For now, filter by brooklyn - later this can be dynamic based on user location
        const venueData = await getVenuesByCity('brooklyn');
        setVenues(venueData);
        console.log('Loaded venues for brooklyn:', venueData.length);
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      } finally {
        setVenuesLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const { availableCategories, availableLocations } = useMemo(() => {
    const categories = new Set(['ALL']);
    const locations = new Set(['all']);
    events.forEach(event => {
      // Extract genres from music_info if available
      if (event.music_info && event.music_info.genres) {
        if (Array.isArray(event.music_info.genres)) {
          event.music_info.genres.forEach((genre: string) => categories.add(genre));
        } else if (typeof event.music_info.genres === 'string') {
          categories.add(event.music_info.genres);
        }
      }
      // Use city as location
      if (event.city) locations.add(event.city);
    });
    return {
      availableCategories: Array.from(categories).sort((a, b) => {
        if (a === 'ALL') return -1;
        if (b === 'ALL') return 1;
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
      // Skip events without valid date
      if (!event.event_date) return false;
      
      const eventDate = new Date(event.event_date);

      // Category filter - check music_info.genres
      if (filters.category !== 'ALL') {
        let hasMatchingGenre = false;
        if (event.music_info && event.music_info.genres) {
          if (Array.isArray(event.music_info.genres)) {
            hasMatchingGenre = event.music_info.genres.includes(filters.category);
          } else if (typeof event.music_info.genres === 'string') {
            hasMatchingGenre = event.music_info.genres === filters.category;
          }
        }
        if (!hasMatchingGenre) return false;
      }

      // Location filter (city)
      if (filters.location !== 'all' && event.city !== filters.location) {
        return false;
      }

      // Venue filter - check if event's venue is in selected venues
      if (filters.venues.length > 0 && event.venue_id) {
        if (!filters.venues.includes(event.venue_id)) {
          return false;
        }
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
        const titleLower = (event.title || '').toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const cityLower = event.city.toLowerCase();
        
        // Also search venue names
        let venueNameLower = '';
        if (event.venue_id) {
          const venue = venues.find(v => v.id === event.venue_id);
          if (venue) {
            venueNameLower = venue.name.toLowerCase();
          }
        }
        
        if (!titleLower.includes(searchLower) && 
            !descriptionLower.includes(searchLower) && 
            !cityLower.includes(searchLower) &&
            !venueNameLower.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters, venues]);

  return {
    events,
    loading,
    error,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
    venues,
    venuesLoading,
  };
};

export type { FilterState, FilterAction };
