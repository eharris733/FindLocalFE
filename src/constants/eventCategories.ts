// Event Type Constants - matching backend schema
export const EVENT_TYPE_MUSIC = 'music';
export const EVENT_TYPE_COMEDY = 'comedy';
export const EVENT_TYPE_THEATER = 'theater';
export const EVENT_TYPE_DANCE = 'dance';
export const EVENT_TYPE_FILM = 'film';
export const EVENT_TYPE_ART = 'art';
export const EVENT_TYPE_LITERARY = 'literary';
export const EVENT_TYPE_SPORTS = 'sports';
export const EVENT_TYPE_FITNESS = 'fitness';
export const EVENT_TYPE_TRIVIA = 'trivia';
export const EVENT_TYPE_KARAOKE = 'karaoke';
export const EVENT_TYPE_NETWORKING = 'networking';
export const EVENT_TYPE_NIGHTLIFE = 'nightlife';
export const EVENT_TYPE_DATE_NIGHT = 'date_night';
export const EVENT_TYPE_CLASS = 'class';
export const EVENT_TYPE_WORKSHOP = 'workshop';
export const EVENT_TYPE_LECTURE = 'lecture';
export const EVENT_TYPE_TOURS = 'tours';
export const EVENT_TYPE_COMMUNITY = 'community';
export const EVENT_TYPE_MARKET = 'market';
export const EVENT_TYPE_FESTIVAL = 'festival';
export const EVENT_TYPE_FOOD_DRINK = 'food_drink';
export const EVENT_TYPE_FAMILY = 'family';
export const EVENT_TYPE_FREE = 'free';

// Music Genre Constants
export const MUSIC_GENRE_JAZZ = 'jazz';
export const MUSIC_GENRE_POP = 'pop';
export const MUSIC_GENRE_ROCK = 'rock';
export const MUSIC_GENRE_HIP_HOP = 'hip_hop';
export const MUSIC_GENRE_ALTERNATIVE = 'alternative';
export const MUSIC_GENRE_CLASSICAL = 'classical';
export const MUSIC_GENRE_ELECTRONIC = 'electronic';
export const MUSIC_GENRE_COUNTRY = 'country';
export const MUSIC_GENRE_BLUES = 'blues';
export const MUSIC_GENRE_FOLK = 'folk';
export const MUSIC_GENRE_UNKNOWN = 'unknown';

export const EVENT_TYPES = [
  EVENT_TYPE_MUSIC,
  EVENT_TYPE_COMEDY,
  EVENT_TYPE_THEATER,
  EVENT_TYPE_DANCE,
  EVENT_TYPE_FILM,
  EVENT_TYPE_ART,
  EVENT_TYPE_LITERARY,
  EVENT_TYPE_SPORTS,
  EVENT_TYPE_FITNESS,
  EVENT_TYPE_TRIVIA,
  EVENT_TYPE_KARAOKE,
  EVENT_TYPE_NETWORKING,
  EVENT_TYPE_NIGHTLIFE,
  EVENT_TYPE_DATE_NIGHT,
  EVENT_TYPE_CLASS,
  EVENT_TYPE_WORKSHOP,
  EVENT_TYPE_LECTURE,
  EVENT_TYPE_TOURS,
  EVENT_TYPE_COMMUNITY,
  EVENT_TYPE_MARKET,
  EVENT_TYPE_FESTIVAL,
  EVENT_TYPE_FOOD_DRINK,
  EVENT_TYPE_FAMILY,
  EVENT_TYPE_FREE,
];

// Venue Type Constants - matching backend schema
export const VENUE_TYPE_BAR = 'bar';
export const VENUE_TYPE_NIGHT_CLUB = 'night_club';
export const VENUE_TYPE_JAZZ_CLUB = 'jazz_club';
export const VENUE_TYPE_COMEDY_CLUB = 'comedy_club';
export const VENUE_TYPE_LOUNGE = 'lounge';
export const VENUE_TYPE_THEATER = 'theater';
export const VENUE_TYPE_CONCERT_HALL = 'concert_hall';
export const VENUE_TYPE_STADIUM = 'stadium';
export const VENUE_TYPE_MUSEUM = 'museum';
export const VENUE_TYPE_GALLERY = 'gallery';
export const VENUE_TYPE_LIBRARY = 'library';
export const VENUE_TYPE_BOOK_STORE = 'book_store';
export const VENUE_TYPE_RESTAURANT = 'restaurant';
export const VENUE_TYPE_CAFE = 'cafe';
export const VENUE_TYPE_BREWERY = 'brewery';
export const VENUE_TYPE_WINERY = 'winery';
export const VENUE_TYPE_GYM = 'gym';
export const VENUE_TYPE_STUDIO = 'studio';
export const VENUE_TYPE_SPORTS_COMPLEX = 'sports_complex';
export const VENUE_TYPE_COMMUNITY_CENTER = 'community_center';
export const VENUE_TYPE_CHURCH = 'church';
export const VENUE_TYPE_SCHOOL = 'school';
export const VENUE_TYPE_CONVENTION_CENTER = 'convention_center';
export const VENUE_TYPE_OUTDOORS = 'outdoors';
export const VENUE_TYPE_UNKNOWN = 'unknown';

export const VENUE_TYPES = [
  VENUE_TYPE_BAR,
  VENUE_TYPE_NIGHT_CLUB,
  VENUE_TYPE_JAZZ_CLUB,
  VENUE_TYPE_COMEDY_CLUB,
  VENUE_TYPE_LOUNGE,
  VENUE_TYPE_THEATER,
  VENUE_TYPE_CONCERT_HALL,
  VENUE_TYPE_STADIUM,
  VENUE_TYPE_MUSEUM,
  VENUE_TYPE_GALLERY,
  VENUE_TYPE_LIBRARY,
  VENUE_TYPE_BOOK_STORE,
  VENUE_TYPE_RESTAURANT,
  VENUE_TYPE_CAFE,
  VENUE_TYPE_BREWERY,
  VENUE_TYPE_WINERY,
  VENUE_TYPE_GYM,
  VENUE_TYPE_STUDIO,
  VENUE_TYPE_SPORTS_COMPLEX,
  VENUE_TYPE_COMMUNITY_CENTER,
  VENUE_TYPE_CHURCH,
  VENUE_TYPE_SCHOOL,
  VENUE_TYPE_CONVENTION_CENTER,
  VENUE_TYPE_OUTDOORS,
  VENUE_TYPE_UNKNOWN,
];

// UI Display configurations for event categories
export interface CategoryOption {
  id: string;
  label: string;
  emoji: string;
  eventTypes?: string[]; // Maps to event_type values
  venueTypes?: string[]; // Maps to venue type values
  description?: string;
  musicGenre?: string; // Maps to music_info.genres for filtering
}

// Grouped categories for better UX
export const CATEGORY_GROUPS = {
  POPULAR: 'Popular',
  PERFORMANCE: 'Performance & Entertainment',
  ARTS_CULTURE: 'Arts & Culture',
  SOCIAL: 'Social & Nightlife',
  ACTIVE: 'Sports & Fitness',
  LEARNING: 'Educational',
  SPECIAL: 'Special',
};

export const EVENT_CATEGORY_OPTIONS: CategoryOption[] = [
  // Popular/Quick Filters
  { 
    id: 'all', 
    label: 'All Events', 
    emoji: '🎭',
    description: 'Show all events'
  },
  { 
    id: 'favorites', 
    label: 'Favorites', 
    emoji: '❤️',
    description: 'Your favorited events'
  },
  { 
    id: 'free', 
    label: 'Free', 
    emoji: '🎁',
    eventTypes: [EVENT_TYPE_FREE],
    description: 'Free events'
  },
  
  // Performance & Entertainment
  { 
    id: 'music', 
    label: 'Music', 
    emoji: '🎵',
    eventTypes: [EVENT_TYPE_MUSIC],
    venueTypes: [VENUE_TYPE_CONCERT_HALL, VENUE_TYPE_JAZZ_CLUB],
    description: 'Live music performances'
  },
  
  // Music Genres
  { 
    id: 'jazz', 
    label: 'Jazz', 
    emoji: '🎷',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Jazz music events',
    musicGenre: MUSIC_GENRE_JAZZ
  },
  { 
    id: 'rock', 
    label: 'Rock', 
    emoji: '🎸',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Rock music events',
    musicGenre: MUSIC_GENRE_ROCK
  },
  { 
    id: 'pop', 
    label: 'Pop', 
    emoji: '🎤',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Pop music events',
    musicGenre: MUSIC_GENRE_POP
  },
  { 
    id: 'hip_hop', 
    label: 'Hip Hop', 
    emoji: '🎤',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Hip hop music events',
    musicGenre: MUSIC_GENRE_HIP_HOP
  },
  { 
    id: 'alternative', 
    label: 'Alternative', 
    emoji: '🎵',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Alternative music events',
    musicGenre: MUSIC_GENRE_ALTERNATIVE
  },
  { 
    id: 'classical', 
    label: 'Classical', 
    emoji: '🎻',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Classical music events',
    musicGenre: MUSIC_GENRE_CLASSICAL
  },
  { 
    id: 'electronic', 
    label: 'Electronic', 
    emoji: '🎧',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Electronic/EDM events',
    musicGenre: MUSIC_GENRE_ELECTRONIC
  },
  { 
    id: 'country', 
    label: 'Country', 
    emoji: '🤠',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Country music events',
    musicGenre: MUSIC_GENRE_COUNTRY
  },
  { 
    id: 'blues', 
    label: 'Blues', 
    emoji: '🎺',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Blues music events',
    musicGenre: MUSIC_GENRE_BLUES
  },
  { 
    id: 'folk', 
    label: 'Folk', 
    emoji: '🪕',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Folk music events',
    musicGenre: MUSIC_GENRE_FOLK
  },
  { 
    id: 'unknown_genre', 
    label: 'Other Music', 
    emoji: '🎶',
    eventTypes: [EVENT_TYPE_MUSIC],
    description: 'Other music genres',
    musicGenre: MUSIC_GENRE_UNKNOWN
  },
  
  { 
    id: 'comedy', 
    label: 'Comedy', 
    emoji: '😂',
    eventTypes: [EVENT_TYPE_COMEDY],
    venueTypes: [VENUE_TYPE_COMEDY_CLUB],
    description: 'Stand-up and comedy shows'
  },
  { 
    id: 'theater', 
    label: 'Theater', 
    emoji: '🎭',
    eventTypes: [EVENT_TYPE_THEATER],
    venueTypes: [VENUE_TYPE_THEATER],
    description: 'Plays and theatrical performances'
  },
  { 
    id: 'dance', 
    label: 'Dance', 
    emoji: '💃',
    eventTypes: [EVENT_TYPE_DANCE],
    description: 'Dance performances and events'
  },
  { 
    id: 'film', 
    label: 'Film', 
    emoji: '🎬',
    eventTypes: [EVENT_TYPE_FILM],
    description: 'Movie screenings and film events'
  },
  
  // Arts & Culture
  { 
    id: 'art', 
    label: 'Art', 
    emoji: '🎨',
    eventTypes: [EVENT_TYPE_ART],
    venueTypes: [VENUE_TYPE_MUSEUM, VENUE_TYPE_GALLERY],
    description: 'Art exhibitions and galleries'
  },
  { 
    id: 'literary', 
    label: 'Literary', 
    emoji: '📚',
    eventTypes: [EVENT_TYPE_LITERARY],
    venueTypes: [VENUE_TYPE_LIBRARY, VENUE_TYPE_BOOK_STORE],
    description: 'Book readings and literary events'
  },
  
  // Social & Nightlife
  { 
    id: 'nightlife', 
    label: 'Nightlife', 
    emoji: '🌙',
    eventTypes: [EVENT_TYPE_NIGHTLIFE],
    venueTypes: [VENUE_TYPE_BAR, VENUE_TYPE_NIGHT_CLUB, VENUE_TYPE_LOUNGE],
    description: 'Bars, clubs, and nightlife'
  },
  { 
    id: 'food_drink', 
    label: 'Food & Drink', 
    emoji: '🍽️',
    eventTypes: [EVENT_TYPE_FOOD_DRINK],
    venueTypes: [VENUE_TYPE_RESTAURANT, VENUE_TYPE_CAFE, VENUE_TYPE_BREWERY, VENUE_TYPE_WINERY],
    description: 'Dining and drink events'
  },
  { 
    id: 'trivia', 
    label: 'Trivia', 
    emoji: '🧠',
    eventTypes: [EVENT_TYPE_TRIVIA],
    description: 'Trivia nights'
  },
  { 
    id: 'karaoke', 
    label: 'Karaoke', 
    emoji: '🎤',
    eventTypes: [EVENT_TYPE_KARAOKE],
    description: 'Karaoke events'
  },
  { 
    id: 'networking', 
    label: 'Networking', 
    emoji: '🤝',
    eventTypes: [EVENT_TYPE_NETWORKING],
    description: 'Professional networking events'
  },
  { 
    id: 'date_night', 
    label: 'Date Night', 
    emoji: '💑',
    eventTypes: [EVENT_TYPE_DATE_NIGHT],
    description: 'Perfect for dates'
  },
  
  // Sports & Fitness
  { 
    id: 'sports', 
    label: 'Sports', 
    emoji: '⚽',
    eventTypes: [EVENT_TYPE_SPORTS],
    venueTypes: [VENUE_TYPE_STADIUM, VENUE_TYPE_SPORTS_COMPLEX],
    description: 'Sports events and games'
  },
  { 
    id: 'fitness', 
    label: 'Fitness', 
    emoji: '💪',
    eventTypes: [EVENT_TYPE_FITNESS],
    venueTypes: [VENUE_TYPE_GYM, VENUE_TYPE_STUDIO],
    description: 'Fitness classes and activities'
  },
  
  // Educational & Community
  { 
    id: 'workshop', 
    label: 'Workshop', 
    emoji: '🛠️',
    eventTypes: [EVENT_TYPE_WORKSHOP, EVENT_TYPE_CLASS],
    description: 'Hands-on workshops and classes'
  },
  { 
    id: 'lecture', 
    label: 'Lecture', 
    emoji: '🎓',
    eventTypes: [EVENT_TYPE_LECTURE],
    description: 'Educational talks and lectures'
  },
  { 
    id: 'tours', 
    label: 'Tours', 
    emoji: '🗺️',
    eventTypes: [EVENT_TYPE_TOURS],
    description: 'Guided tours'
  },
  { 
    id: 'community', 
    label: 'Community', 
    emoji: '🏘️',
    eventTypes: [EVENT_TYPE_COMMUNITY],
    venueTypes: [VENUE_TYPE_COMMUNITY_CENTER],
    description: 'Community events'
  },
  
  // Markets & Festivals
  { 
    id: 'market', 
    label: 'Market', 
    emoji: '🛍️',
    eventTypes: [EVENT_TYPE_MARKET],
    description: 'Markets and fairs'
  },
  { 
    id: 'festival', 
    label: 'Festival', 
    emoji: '🎪',
    eventTypes: [EVENT_TYPE_FESTIVAL],
    description: 'Festivals and celebrations'
  },
  
  // Special
  { 
    id: 'family', 
    label: 'Family', 
    emoji: '👨‍👩‍👧‍👦',
    eventTypes: [EVENT_TYPE_FAMILY],
    description: 'Family-friendly events'
  },
];

// Helper to get category option by id
export const getCategoryOption = (id: string): CategoryOption | undefined => {
  return EVENT_CATEGORY_OPTIONS.find(cat => cat.id === id);
};

// Helper to get all event types for a category
// For genre categories, returns the genre itself instead of just 'music'
export const getEventTypesForCategory = (categoryId: string): string[] => {
  const category = getCategoryOption(categoryId);
  if (!category) return [];
  
  // If this is a genre category, return the genre as the event type
  if (category.musicGenre) {
    return [category.musicGenre];
  }
  
  // Otherwise return the regular event types
  return category.eventTypes || [];
};

// Helper to get all venue types for a category
export const getVenueTypesForCategory = (categoryId: string): string[] => {
  const category = getCategoryOption(categoryId);
  return category?.venueTypes || [];
};

// Music genre constants for reference
const MUSIC_GENRES = [
  MUSIC_GENRE_JAZZ,
  MUSIC_GENRE_POP,
  MUSIC_GENRE_ROCK,
  MUSIC_GENRE_HIP_HOP,
  MUSIC_GENRE_ALTERNATIVE,
  MUSIC_GENRE_CLASSICAL,
  MUSIC_GENRE_ELECTRONIC,
  MUSIC_GENRE_COUNTRY,
  MUSIC_GENRE_BLUES,
  MUSIC_GENRE_FOLK,
  MUSIC_GENRE_UNKNOWN,
];

// Helper to extract music genres from event_type array
export const getGenresFromEventTypes = (eventTypes: string[] | null): string[] => {
  if (!eventTypes || !Array.isArray(eventTypes)) return [];
  
  const normalizedEventTypes = eventTypes.map(type => type.toLowerCase().trim());
  
  // Filter event types to only include known music genres
  return normalizedEventTypes.filter(type => 
    MUSIC_GENRES.some(genre => {
      const normalizedGenre = genre.toLowerCase().replace(/_/g, ' ');
      return type === genre || 
             type === normalizedGenre || 
             type.replace(/[\s_-]/g, '') === normalizedGenre.replace(/[\s_-]/g, '');
    })
  );
};

// Helper to get display label for a genre
export const getGenreDisplayLabel = (genre: string): string => {
  const category = EVENT_CATEGORY_OPTIONS.find(cat => 
    cat.musicGenre && cat.musicGenre.toLowerCase() === genre.toLowerCase()
  );
  return category?.label || genre;
};
