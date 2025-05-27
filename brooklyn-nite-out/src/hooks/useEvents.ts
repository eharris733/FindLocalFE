// src/hooks/useEvents.ts (No changes from previous iteration)
import { useState, useEffect, useMemo, useReducer } from 'react';
import type { Event, ViewType, EventFilters, FilterAction } from '../types/events.d';
import { fetchEvents } from '../api/events';
import { startOfDay,  isBefore} from 'date-fns'; // date-fns remains useful for logic

// Initial state for filters
const initialFilterState: EventFilters = {
  category: 'All',
  startDate: null,
  searchText: '',
  venue: 'All',
};

// Reducer function for managing filters
const filterReducer = (state: EventFilters, action: FilterAction): EventFilters => {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload };
    case 'SET_SEARCH_TEXT':
      return { ...state, searchText: action.payload };
    case 'SET_LOCATION':
      return { ...state, venue: action.payload };
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
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  filteredEvents: Event[];
  filters: EventFilters;
  dispatchFilters: React.Dispatch<FilterAction>;
  availableCategories: string[];
  availableLocations: string[];
}

export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [filters, dispatchFilters] = useReducer(filterReducer, initialFilterState);

  useEffect(() => {
    const getEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchEvents();
        setEvents(data);
      } catch (err) {
        setError("Failed to load events. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getEvents();
  }, []);

  const { availableCategories, availableLocations } = useMemo(() => {
    const categories = new Set(['All']);
    const locations = new Set(['All']);
    events.forEach(event => {
      if (event.category) categories.add(event.category);
      if (event.venue) locations.add(event.venue);
    });
    return {
      availableCategories: Array.from(categories).sort(),
      availableLocations: Array.from(locations).sort(),
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = startOfDay(event.date);

      if (filters.category !== 'All' && event.category !== filters.category) {
        return false;
      }

      if (filters.venue !== 'All' && event.venue !== filters.venue) {
        return false;
      }

      if (filters.startDate && isBefore(eventDate, startOfDay(filters.startDate))) {
        return false;
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const titleLower = event.title.toLowerCase();
        const descriptionLower = event.description.toLowerCase();
        if (!titleLower.includes(searchLower) && !descriptionLower.includes(searchLower)) {
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
    currentView,
    setCurrentView,
    filteredEvents,
    filters,
    dispatchFilters,
    availableCategories,
    availableLocations,
  };
};