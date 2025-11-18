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
import { logger } from '../utils/logger';

const initialFilterState: FilterState = {
  category: 'all',
  startDate: startOfDay(new Date()),
  endDate: endOfDay(new Date()),
  dateRange: 'today',
  searchText: '',
  location: 'all',
  venues: [], // Initialize as empty array
  price: 'All prices',
  size: ['All sizes'], // Initialize as array
};

const getDateRangeFromSelection = (dateRange: FilterState['dateRange']): { start: Date | null; end: Date | null } => {
  const today = new Date();
  
  switch (dateRange) {
    case 'all':
      // Show all events from today through one year in the future
      return { start: startOfDay(today), end: endOfDay(addDays(today, 365)) };
    
    case 'today':
      return { start: startOfDay(today), end: endOfDay(today) };
    
    case 'tomorrow':
      const tomorrow = addDays(today, 1);
      return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
    
    case 'this_week':
      // Show next 7 days starting from today
      return { start: startOfDay(today), end: endOfDay(addDays(today, 6)) };
    
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
    case 'SET_PRICE':
      return { ...state, price: action.payload };
    case 'SET_SIZE':
      return { ...state, size: action.payload };
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
      //console.log('🎉 useEvents: fetchEvents called with selectedCity:', selectedCity);
      setLoading(true);
      setEvents([]); // Clear old events immediately when city changes
      setError(null);
      try {
        // Fetch events filtered by city if provided
        const data = await getEvents(selectedCity);
        setEvents(data || []); 
        //console.log(`🎉 Loaded ${data?.length || 0} events for city: ${selectedCity || 'all cities'}`);
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
      //console.log('🏢 useEvents: fetchVenues called with selectedCity:', selectedCity);
      setVenuesLoading(true);
      setVenues([]); // Clear old venues immediately when city changes
      try {
        // Use selectedCity instead of hardcoded 'brooklyn'
        const venueData = selectedCity 
          ? await getVenuesByCity(selectedCity)
          : await getAllVenues();
        setVenues(venueData);
        //console.log(`🏢 Loaded ${venueData.length} venues for ${selectedCity || 'all cities'}`);
        
        // Debug: Log venue sizes
        const venueSizes = venueData.map(v => v.venue_size).filter(Boolean);
        //console.log('Venue sizes found:', [...new Set(venueSizes)]);
        venueData.slice(0, 5).forEach(v => {
          if (v.venue_size) {
            //console.log(`${v.name}: size="${v.venue_size}", type="${v.type}"`);
          }
        });
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
    events.forEach(event => {
      // Add predefined categories that we support
      categories.add('music');
      categories.add('bar');
      categories.add('theater');
      categories.add('comedy');
      categories.add('other');
      
      // Use city as location
      if (event.city) locations.add(event.city);
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
    let filtered = events.filter(event => {
      // Skip events without valid date
      if (!event.event_date) return false;
      
      const eventDate = new Date(event.event_date);

      // Normalize category filter to array
      const categoryFilter = Array.isArray(filters.category) ? filters.category : [filters.category];

      // Category filter - check music_info.genres and venue type/event_types
      // Use OR logic: event matches if it matches ANY selected category
      if (!categoryFilter.includes('all')) {
        // Special handling for favorites: check if event is favorited OR matches other categories
        const hasFavorites = categoryFilter.includes('favorites');
        const otherCategories = categoryFilter.filter(c => c !== 'favorites');
        
        // If event is favorited and favorites is selected, it's automatically a match
        if (hasFavorites && favoriteEventIds.includes(event.id)) {
          return true; // Skip other checks, this event matches
        }
        
        // If there are no other categories selected besides favorites, and event isn't favorited, exclude it
        if (hasFavorites && otherCategories.length === 0) {
          return false;
        }
        
        // If there are other categories, check if event matches any of them
        const categoriesToCheck = otherCategories.length > 0 ? otherCategories : categoryFilter;
        
        let matchesAnyCategory = false;
        
        for (const category of categoriesToCheck) {
          let hasMatchingGenre = false;
          
          // First check event's music_info.genres
          if (event.music_info && event.music_info.genres) {
            const genres = Array.isArray(event.music_info.genres) 
              ? event.music_info.genres 
              : [event.music_info.genres];
            
            // Convert genres to lowercase for comparison
            const lowerGenres = genres.map((g: string) => g.toLowerCase());
            
            switch (category) {
              case 'music':
                hasMatchingGenre = lowerGenres.some((g: string) => 
                  g.includes('music') || g.includes('rock') || g.includes('pop') || 
                  g.includes('jazz') || g.includes('blues') || g.includes('hip hop') ||
                  g.includes('electronic') || g.includes('classical') || g.includes('folk')
                );
                break;
              case 'bar':
                hasMatchingGenre = lowerGenres.some((g: string) => 
                  g.includes('bar') || g.includes('nightlife') || g.includes('drinks') ||
                  g.includes('cocktail') || g.includes('pub')
                );
                break;
              case 'theater':
                hasMatchingGenre = lowerGenres.some((g: string) => 
                  g.includes('theater') || g.includes('theatre') || g.includes('play') ||
                  g.includes('musical') || g.includes('drama')
                );
                break;
              case 'comedy':
                hasMatchingGenre = lowerGenres.some((g: string) => 
                  g.includes('comedy') || g.includes('stand up') || g.includes('standup') ||
                  g.includes('humor') || g.includes('funny')
                );
                break;
              case 'other':
                hasMatchingGenre = !lowerGenres.some((g: string) => 
                  g.includes('music') || g.includes('rock') || g.includes('pop') || 
                  g.includes('jazz') || g.includes('blues') || g.includes('hip hop') ||
                  g.includes('electronic') || g.includes('classical') || g.includes('folk') ||
                  g.includes('bar') || g.includes('nightlife') || g.includes('drinks') ||
                  g.includes('cocktail') || g.includes('pub') ||
                  g.includes('theater') || g.includes('theatre') || g.includes('play') ||
                  g.includes('musical') || g.includes('drama') ||
                  g.includes('comedy') || g.includes('stand up') || g.includes('standup') ||
                  g.includes('humor') || g.includes('funny')
                );
                break;
              default:
                hasMatchingGenre = false;
            }
          }
          
          // If not matched by music_info, check venue type and event_types
          if (!hasMatchingGenre && event.venue_id) {
            const venue = venues.find(v => v.id === event.venue_id);
            if (venue) {
              const venueType = (venue.type || '').toLowerCase();
              let venueEventTypes: string[] = [];
              
              if (venue.event_types) {
                venueEventTypes = Array.isArray(venue.event_types) 
                  ? venue.event_types.map((t: string) => t.toLowerCase())
                  : [venue.event_types.toString().toLowerCase()];
              }
              
              switch (category) {
                case 'music':
                  hasMatchingGenre = venueType.includes('music') ||
                    venueEventTypes.some(t => t.includes('music') || t.includes('concert'));
                  break;
                case 'bar':
                  hasMatchingGenre = venueType.includes('bar') ||
                    venueEventTypes.some(t => t.includes('bar') || t.includes('nightlife'));
                  break;
                case 'theater':
                  hasMatchingGenre = venueType.includes('theater') || venueType.includes('theatre') ||
                    venueEventTypes.some(t => t.includes('theater') || t.includes('play'));
                  break;
                case 'comedy':
                  hasMatchingGenre = venueType.includes('comedy') ||
                    venueEventTypes.some(t => t.includes('comedy'));
                  break;
                case 'other':
                  hasMatchingGenre = !venueType.includes('music') && !venueType.includes('bar') &&
                    !venueType.includes('theater') && !venueType.includes('theatre') &&
                    !venueType.includes('comedy');
                  break;
              }
            }
          }
          
          // If still no match and no venue data, only show in "other" category
          if (!hasMatchingGenre && !event.venue_id) {
            hasMatchingGenre = category === 'other';
          }
          
          // If this event matches this category, mark as matched and break
          if (hasMatchingGenre) {
            matchesAnyCategory = true;
            break;
          }
        }
        
        if (!matchesAnyCategory) return false;
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

      // Size filter - supports both single string and multi-select array
      const sizeFilter = Array.isArray(filters.size) ? filters.size : [filters.size];
      if (!sizeFilter.includes('All sizes') && event.venue_id) {
        const venue = venues.find(v => v.id === event.venue_id);
        if (venue && venue.venue_size) {
          let sizeMatches = false;
          
          // Convert venue_size to lowercase for comparison
          const venueSize = venue.venue_size.toLowerCase();
          
          // Check if venue matches any of the selected sizes
          for (const selectedSize of sizeFilter) {
            switch (selectedSize) {
              case '<100 👥':
                if (venueSize.includes('small')) {
                  sizeMatches = true;
                }
                break;
              case '100+ 👥':
                if (venueSize.includes('medium')) {
                  sizeMatches = true;
                }
                break;
              case '300+ 👥':
                if (venueSize.includes('large')) {
                  sizeMatches = true;
                }
                break;
            }
            if (sizeMatches) break; // Exit early if we found a match
          }
          
          // Debug logging
          logger.debug(`Size filter: ${JSON.stringify(sizeFilter)}, venue: ${venue.name}, venue_size: "${venue.venue_size}", matches: ${sizeMatches}`);
          
          if (!sizeMatches) {
            return false;
          }
        } else {
          // If venue has no size data, exclude it from size filtering
          logger.debug(`Size filter: ${JSON.stringify(sizeFilter)}, venue: ${venue?.name || 'unknown'}, no venue_size data`);
          return false;
        }
      }

      // Price filter - for now, only allow "All prices" since we don't have price data
      if (filters.price !== 'All prices') {
        // Skip events for non-"All prices" selections until we have real price data
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
