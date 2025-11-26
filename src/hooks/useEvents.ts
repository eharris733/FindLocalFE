import { useState, useEffect, useMemo, useReducer } from 'react';
import type { Event, FilterState, FilterAction } from '../types/events';
import type { Venue } from '../types/venues';
import { getEvents } from '../api/events';
import { getVenuesByCity } from '../api/venues';
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
  endOfMonth
} from 'date-fns';
import { logger } from '../utils/logger';
import { ALL_VENUES } from '../constants';

const initialFilterState: FilterState = {
  category: 'all',
  eventTypes: [], // New: for event_type filtering
  venueTypes: [], // New: for venue type filtering
  startDate: startOfDay(new Date()),
  endDate: endOfDay(new Date()),
  dateRange: 'today',
  searchText: '',
  location: 'all',
  venues: [], // Initialize as empty array
  price: undefined, // Price range filter
  timeRange: undefined, // Time of day filter
  size: [ALL_VENUES], // Initialize as array
  regions: [], // Initialize as empty array - all regions selected by default
};

const getDateRangeFromSelection = (dateRange: FilterState['dateRange']): { start: Date | null; end: Date | null } => {
  const today = new Date();
  
  switch (dateRange) {
    case 'all':
      // Show all events from today through one year in the future
      return { start: startOfDay(today), end: endOfDay(addDays(today, 365)) };
    
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
    }
    
    case 'this_week':
      // Show next 7 days starting from today
      return { start: startOfDay(today), end: endOfDay(addDays(today, 6)) };
    
    case 'this_weekend': {
      const saturday = addDays(startOfWeek(today), 6);
      const sunday = addDays(startOfWeek(today), 7);
      return { start: startOfDay(saturday), end: endOfDay(sunday) };
    }
    
    case 'next_week': {
      const nextWeekStart = addDays(startOfWeek(today), 7);
      const nextWeekEnd = addDays(endOfWeek(today), 7);
      return { start: nextWeekStart, end: nextWeekEnd };
    }
    
    case 'this_month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    
    case 'custom':
    default:
      return { start: null, end: null };
  }
};

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SET_EVENT_TYPES':
      return { ...state, eventTypes: action.payload };
    case 'SET_VENUE_TYPES':
      return { ...state, venueTypes: action.payload };
    case 'SET_START_DATE':
      return { ...state, startDate: action.payload, dateRange: 'custom' };
    case 'SET_END_DATE':
      return { ...state, endDate: action.payload, dateRange: 'custom' };
    case 'SET_DATE_RANGE': {
      const { start, end } = getDateRangeFromSelection(action.payload);
      // For 'custom', preserve existing startDate/endDate if they exist
      if (action.payload === 'custom' && state.startDate && state.endDate) {
        return { 
          ...state, 
          dateRange: action.payload,
        };
      }
      return { 
        ...state, 
        dateRange: action.payload,
        startDate: start,
        endDate: end
      };
    }
    case 'SET_SEARCH_TEXT':
      return { ...state, searchText: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'SET_VENUES':
      return { ...state, venues: action.payload };
    case 'SET_PRICE':
      return { ...state, price: action.payload };
    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.payload };
    case 'SET_SIZE':
      return { ...state, size: action.payload };
    case 'SET_REGIONS':
      return { ...state, regions: action.payload };
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
  availableFilterOptions: {
    venueTypes: string[];
    sizes: string[];
    regions: string[];
    priceRanges: string[];
    timeRanges: string[];
    eventTypes: string[];
  };
}

interface UseEventsProps {
  selectedCity?: string;
  favoriteEventIds?: string[]; // Array of favorited event IDs
}

export const useEvents = ({ selectedCity, favoriteEventIds = [] }: UseEventsProps = {}): UseEventsResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState<boolean>(true);
  const [filters, dispatchFilters] = useReducer(filterReducer, initialFilterState);
  
  // Capture initial favorites snapshot for sorting - only updates when events are reloaded
  const [initialFavoriteIds, setInitialFavoriteIds] = useState<string[]>(favoriteEventIds);

  useEffect(() => {
    const fetchEvents = async () => {
      // Don't fetch if no city is selected
      if (!selectedCity) {
        setLoading(false);
        setEvents([]);
        return;
      }

      setLoading(true);
      setEvents([]); // Clear old events immediately when city changes
      setError(null);
      try {
        // Fetch events filtered by city
        const data = await getEvents(selectedCity);
        setEvents(data || []); 
      } catch (err) {
        setError("Failed to load events. Please try again.");
        logger.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [selectedCity]); // Re-fetch when selectedCity changes
  
  // Update the favorites snapshot when events are loaded (events array reference changes)
  useEffect(() => {
    setInitialFavoriteIds(favoriteEventIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]); // Only when events array changes, not favoriteEventIds

  // Fetch venues for filtering
  useEffect(() => {
    const fetchVenues = async () => {
      // Don't fetch if no city is selected
      if (!selectedCity) {
        setVenuesLoading(false);
        setVenues([]);
        return;
      }

      setVenuesLoading(true);
      setVenues([]); // Clear old venues immediately when city changes
      try {
        // Fetch venues for the selected city only
        const venueData = await getVenuesByCity(selectedCity);
        setVenues(venueData);
      } catch (err) {
        logger.error('Failed to fetch venues:', err);
      } finally {
        setVenuesLoading(false);
      }
    };
    fetchVenues();
  }, [selectedCity]); // Re-fetch when selectedCity changes

  const { availableCategories, availableLocations } = useMemo(() => {
    const categories = new Set(['all']); // Use lowercase 'all' instead of 'ALL'
    const locations = new Set(['all']);
    for (const event of events) {
      // Add predefined categories that we support
      categories.add('music');
      categories.add('bar');
      categories.add('theater');
      categories.add('comedy');
      categories.add('other');
      
      // Use city as location
      if (event.city) locations.add(event.city);
    }
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
    let filtered = events.filter(event => {
      // Skip events without valid date
      if (!event.event_date) return false;
      
      const eventDate = new Date(event.event_date);

      // Normalize category filter to array
      const categoryFilter = Array.isArray(filters.category) ? filters.category : [filters.category];

      // Event type filtering - use the event_type field from database
      // This includes both regular event types AND music genres (they're all in event_type array)
      if (filters.eventTypes.length > 0) {
        // If event doesn't have event_type array, exclude it
        if (!event.event_type || !Array.isArray(event.event_type) || event.event_type.length === 0) {
          return false;
        }
        
        // Normalize event types for comparison (lowercase, replace spaces with underscores)
        const normalizedEventTypes = event.event_type.map(type => 
          type.toLowerCase().replaceAll(/\s+/g, '_')
        );
        const normalizedFilterTypes = new Set(filters.eventTypes.map(type => 
          type.toLowerCase().replaceAll(/\s+/g, '_')
        ));
        
        // Check if event has ANY of the selected event types (including genres)
        const hasMatchingType = normalizedEventTypes.some(eventType => 
          normalizedFilterTypes.has(eventType)
        );
        
        if (!hasMatchingType) {
          return false;
        }
      }

      // Special handling for favorites category
      if (categoryFilter.includes('favorites')) {
        // If ONLY favorites is selected, show only favorited events
        if (categoryFilter.length === 1 || (categoryFilter.length === 2 && categoryFilter.includes('all'))) {
          if (!favoriteEventIds.includes(event.id)) {
            return false;
          }
        }
        // If favorites + other categories, favorites are automatically included (handled by eventTypes filter above)
      }

      // Venue type filter - independent of event type filtering
      if (filters.venueTypes.length > 0) {
        // If event has a venue_id, check if venue type matches
        if (event.venue_id) {
          const venue = venues.find(v => v.id === event.venue_id);
          if (venue?.type) {
            // Case-insensitive and flexible comparison
            // Normalize both values: lowercase, trim, remove underscores and extra spaces
            const venueTypeNormalized = venue.type.toLowerCase().trim().replaceAll(/[_\s]+/g, '');
            const hasMatchingType = filters.venueTypes.some(filterType => {
              const filterNormalized = filterType.toLowerCase().trim().replaceAll(/[_\s]+/g, '');
              // Check if they match when normalized
              return venueTypeNormalized === filterNormalized || 
                     venueTypeNormalized.includes(filterNormalized) ||
                     filterNormalized.includes(venueTypeNormalized);
            });
            if (!hasMatchingType) {
              return false;
            }
          }
          // If venue not found or has no type, exclude the event
          else {
            return false;
          }
        }
        // If event has no venue_id, exclude it when venue type filter is active
        else {
          return false;
        }
      }

      // Location filter (city)
      if (filters.location !== 'all' && event.city !== filters.location) {
        return false;
      }

      // Region filter - if regions are selected, check if event's region matches
      if (filters.regions.length > 0) {
        if (event.region) {
          if (!filters.regions.includes(event.region)) {
            return false;
          }
        } else {
          // If event has no region data and region filter is active, exclude it
          return false;
        }
      }

      // Venue filter - check if event's venue is in selected venues
      if (filters.venues.length > 0 && event.venue_id) {
        if (!filters.venues.includes(event.venue_id)) {
          return false;
        }
      }

      // Size filter - supports both single string and multi-select array
      const sizeFilter = Array.isArray(filters.size) ? filters.size : [filters.size];
      if (!sizeFilter.includes(ALL_VENUES) && event.venue_id) {
        const venue = venues.find(v => v.id === event.venue_id);
        if (venue?.venue_size) {
          let sizeMatches = false;
          
          // Convert venue_size to lowercase for comparison
          const venueSize = venue.venue_size.toLowerCase();
          
          // Check if venue matches any of the selected sizes
          for (const selectedSize of sizeFilter) {
            switch (selectedSize) {
              case '<100':
                if (venueSize.includes('small')) {
                  sizeMatches = true;
                }
                break;
              case '100+':
                if (venueSize.includes('medium')) {
                  sizeMatches = true;
                }
                break;
              case '300+':
                if (venueSize.includes('large')) {
                  sizeMatches = true;
                }
                break;
            }
            if (sizeMatches) break; // Exit early if we found a match
          }
          
          if (!sizeMatches) {
            return false;
          }
        } else {
          // If venue has no size data, exclude it from size filtering
          return false;
        }
      }

      // Price filter
      if (filters.price) {
        const eventPrice = event.price_amount;
        
        // Special case for "Free" filter (min: 0, max: 0)
        if (filters.price.min === 0 && filters.price.max === 0) {
          // Only show events that are explicitly free (price_amount is 0 or 0.00)
          if (eventPrice === null || eventPrice === undefined || eventPrice > 0) {
            return false;
          }
        } else if (eventPrice !== null && eventPrice !== undefined) {
          // For other price ranges, only filter events with valid price data
          if (filters.price.min !== undefined && eventPrice < filters.price.min) {
            return false;
          }
          if (filters.price.max !== undefined && eventPrice > filters.price.max) {
            return false;
          }
        } else {
          // If event has no price data and a price filter is active, exclude it
          return false;
        }
      }

      // Time of day filter
      if (filters.timeRange && event.start_time) {
        const timeRegex = /^(\d{2}):(\d{2})/;
        const timeMatch = timeRegex.exec(event.start_time);
        if (timeMatch) {
          const eventHour = Number.parseInt(timeMatch[1], 10);
          const { start, end } = filters.timeRange;
          
          if (start !== undefined && end !== undefined) {
            // Handle overnight ranges (e.g., Night: 21-6)
            if (start > end) {
              if (eventHour < start && eventHour >= end) {
                return false;
              }
            } else if (eventHour < start || eventHour >= end) {
              return false;
            }
          }
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

    // Sort favorited events to the top (except when filtering by favorites category)
    // Use initial snapshot to prevent reordering when user favorites/unfavorites
    if (filters.category !== 'favorites' && initialFavoriteIds.length > 0) {
      filtered = filtered.sort((a, b) => {
        const aIsFavorite = initialFavoriteIds.includes(a.id);
        const bIsFavorite = initialFavoriteIds.includes(b.id);
        
        // Favorites first
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        
        // If both are favorites or both are not, maintain original order (by date)
        return 0;
      });
    }

    return filtered;
  }, [
    events, 
    filters, 
    venues, 
    initialFavoriteIds,
    // Only include favoriteEventIds when in favorites filter mode
    // This prevents recalculation when favoriting in other modes
    filters.category === 'favorites' ? favoriteEventIds : null
  ]);

  // Compute available filter options based on events with each filter category excluded
  // This allows multi-select within a category (e.g., selecting multiple regions)
  const availableFilterOptions = useMemo(() => {
    // Helper to filter events excluding specific filter categories
    const getEventsExcluding = (excludeFilters: string[]) => {
      return events.filter(event => {
        if (!event.event_date) return false;
        const eventDate = new Date(event.event_date);
        
        // Apply date filter (always applied)
        if (filters.startDate && filters.endDate) {
          if (!isWithinInterval(eventDate, { start: filters.startDate, end: filters.endDate })) {
            return false;
          }
        }
        
        // Apply search filter (always applied)
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          const titleLower = (event.title || '').toLowerCase();
          const descriptionLower = (event.description || '').toLowerCase();
          const cityLower = event.city.toLowerCase();
          
          if (!titleLower.includes(searchLower) && 
              !descriptionLower.includes(searchLower) && 
              !cityLower.includes(searchLower)) {
            return false;
          }
        }
        
        // Apply event type filter (unless excluded)
        // This includes both regular event types AND music genres
        if (!excludeFilters.includes('eventTypes') && filters.eventTypes.length > 0) {
          // Only apply filter if event has event_type data
          if (!event.event_type || !Array.isArray(event.event_type) || event.event_type.length === 0) {
            return false;
          }
          
          // Normalize event types for comparison (lowercase, replace spaces with underscores)
          const normalizedEventTypes = event.event_type.map(type => 
            type.toLowerCase().replaceAll(/\s+/g, '_')
          );
          const normalizedFilterTypes = new Set(filters.eventTypes.map(type => 
            type.toLowerCase().replaceAll(/\s+/g, '_')
          ));
          
          const hasMatchingType = normalizedEventTypes.some(eventType => 
            normalizedFilterTypes.has(eventType)
          );
          if (!hasMatchingType) return false;
        }
        
        // Apply venue type filter (unless excluded)
        if (!excludeFilters.includes('venueTypes') && filters.venueTypes.length > 0) {
          if (event.venue_id) {
            const venue = venues.find(v => v.id === event.venue_id);
            if (venue?.type) {
              const venueTypeNormalized = venue.type.toLowerCase().trim().replaceAll(/[_\s]+/g, '');
              const hasMatchingType = filters.venueTypes.some(filterType => {
                const filterNormalized = filterType.toLowerCase().trim().replaceAll(/[_\s]+/g, '');
                return venueTypeNormalized === filterNormalized || 
                       venueTypeNormalized.includes(filterNormalized) ||
                       filterNormalized.includes(venueTypeNormalized);
              });
              if (!hasMatchingType) return false;
            } else {
              return false;
            }
          } else {
            return false;
          }
        }
        
        // Apply region filter (unless excluded)
        if (!excludeFilters.includes('regions') && filters.regions.length > 0) {
          if (event.region) {
            if (!filters.regions.includes(event.region)) return false;
          } else {
            return false;
          }
        }
        
        // Apply size filter (unless excluded)
        if (!excludeFilters.includes('sizes')) {
          const sizeFilter = Array.isArray(filters.size) ? filters.size : [filters.size];
          if (!sizeFilter.includes(ALL_VENUES) && event.venue_id) {
            const venue = venues.find(v => v.id === event.venue_id);
            if (venue?.venue_size) {
              const venueSize = venue.venue_size.toLowerCase();
              let sizeMatches = false;
              for (const selectedSize of sizeFilter) {
                if ((selectedSize === '<100' && venueSize.includes('small')) ||
                    (selectedSize === '100+' && venueSize.includes('medium')) ||
                    (selectedSize === '300+' && venueSize.includes('large'))) {
                  sizeMatches = true;
                  break;
                }
              }
              if (!sizeMatches) return false;
            } else {
              return false;
            }
          }
        }
        
        // Apply price filter (unless excluded)
        if (!excludeFilters.includes('price') && filters.price) {
          const eventPrice = event.price_amount;
          if (filters.price.min === 0 && filters.price.max === 0) {
            // Free events: exclude if price is null, undefined, or > 0
            if (eventPrice === null || eventPrice === undefined || eventPrice > 0) return false;
          } else if (eventPrice !== null && eventPrice !== undefined) {
            if (filters.price.min !== undefined && eventPrice < filters.price.min) return false;
            if (filters.price.max !== undefined && eventPrice > filters.price.max) return false;
          } else {
            return false;
          }
        }
        
        // Apply time filter (unless excluded)
        if (!excludeFilters.includes('time') && filters.timeRange && event.start_time) {
          const timeRegex = /^(\d{2}):(\d{2})/;
          const timeMatch = timeRegex.exec(event.start_time);
          if (timeMatch) {
            const eventHour = Number.parseInt(timeMatch[1], 10);
            const { start, end } = filters.timeRange;
            if (start !== undefined && end !== undefined) {
              if (start < end) {
                if (eventHour < start || eventHour >= end) return false;
              } else if (eventHour < start && eventHour >= end) {
                return false;
              }
            }
          }
        }
        
        return true;
      });
    };
    
    // Collect available options for each filter category
    const venueTypes = new Set<string>();
    const sizes = new Set<string>();
    const regions = new Set<string>();
    const priceRanges = new Set<string>();
    const timeRanges = new Set<string>();
    const eventTypes = new Set<string>();
    
    // Get events excluding venue type filter to find available venue types
    const eventsForVenueTypes = getEventsExcluding(['venueTypes']);
    for (const event of eventsForVenueTypes) {
      if (event.venue_id) {
        const venue = venues.find(v => v.id === event.venue_id);
        if (venue?.type) {
          venueTypes.add(venue.type.toLowerCase().trim());
        }
      }
    }
    
    // Get events excluding size filter to find available sizes
    const eventsForSizes = getEventsExcluding(['sizes']);
    for (const event of eventsForSizes) {
      if (event.venue_id) {
        const venue = venues.find(v => v.id === event.venue_id);
        if (venue?.venue_size) {
          sizes.add(venue.venue_size.toLowerCase().trim());
        }
      }
    }
    
    // Get events excluding region filter to find available regions
    const eventsForRegions = getEventsExcluding(['regions']);
    for (const event of eventsForRegions) {
      if (event.region) {
        regions.add(event.region);
      }
    }
    
    // Get events excluding price filter to find available prices
    const eventsForPrices = getEventsExcluding(['price']);
    for (const event of eventsForPrices) {
      if (event.price_amount !== null && event.price_amount !== undefined) {
        const price = event.price_amount;
        if (price === 0) {
          priceRanges.add('free');
        } else if (price < 25) {
          priceRanges.add('under25');
        } else if (price < 50) {
          priceRanges.add('under50');
        } else {
          priceRanges.add('50plus');
        }
      }
    }
    
    // Get events excluding time filter to find available times
    const eventsForTimes = getEventsExcluding(['time']);
    for (const event of eventsForTimes) {
      if (event.start_time) {
        const timeRegex = /^(\d{2}):(\d{2})/;
        const timeMatch = timeRegex.exec(event.start_time);
        if (timeMatch) {
          const hour = Number.parseInt(timeMatch[1], 10);
          if (hour >= 6 && hour < 12) {
            timeRanges.add('morning');
          } else if (hour >= 12 && hour < 17) {
            timeRanges.add('afternoon');
          } else if (hour >= 17 && hour < 21) {
            timeRanges.add('evening');
          } else {
            timeRanges.add('night');
          }
        }
      }
    }
    
    // Get events excluding event type filter to find available event types
    const eventsForEventTypes = getEventsExcluding(['eventTypes']);
    
    for (const event of eventsForEventTypes) {
      if (event.event_type && Array.isArray(event.event_type)) {
        for (const type of event.event_type) {
          // Normalize to lowercase with underscores to match constants
          const normalizedType = type.toLowerCase().replaceAll(/\s+/g, '_');
          eventTypes.add(normalizedType);
        }
      }
    }

    return {
      venueTypes: Array.from(venueTypes),
      sizes: Array.from(sizes),
      regions: Array.from(regions),
      priceRanges: Array.from(priceRanges),
      timeRanges: Array.from(timeRanges),
      eventTypes: Array.from(eventTypes),
    };
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
    availableFilterOptions,
  };
};

export type { FilterState, FilterAction } from '../types/events';
