# When-What-Where Filter Bar Design

## Overview
This document outlines the redesigned filter bar that uses a "When, What, Where" approach to help users discover events more easily and create a more personalized experience.

## Filter Structure

### 1. WHEN Filter
**Component**: `WhenDropdown.tsx`

User-friendly time filtering with the following options:
- **Today** - Events happening today
- **Tomorrow** - Events happening tomorrow  
- **This Week** - Events in the next 7 days
- **Custom Date** - Opens a date range picker for specific dates

**Implementation**:
- Dropdown with visual calendar icons
- Custom date option opens a modal with `DateRangePicker`
- Updates the `filters.dateRange` state

### 2. WHAT Filter
**Component**: `WhatDropdown.tsx`

Category-based filtering using the new `event_type` database field.

#### Quick Pills (Always Visible)
Popular categories shown as horizontal scrolling pills:
- All Events 🎭
- Favorites ❤️
- Free 🎁
- Music 🎵
- Comedy 😂
- Nightlife 🌙
- **More** (opens dropdown)

#### Extended Categories (In Dropdown)
Organized by theme:

**Performance & Entertainment:**
- Theater 🎭
- Dance 💃
- Film 🎬

**Arts & Culture:**
- Art 🎨
- Literary 📚

**Social & Nightlife:**
- Food & Drink 🍽️
- Trivia 🧠
- Karaoke 🎤
- Networking 🤝
- Date Night 💑

**Sports & Fitness:**
- Sports ⚽
- Fitness 💪

**Educational & Community:**
- Workshop 🛠️
- Lecture 🎓
- Tours 🗺️
- Community 🏘️

**Markets & Festivals:**
- Market 🛍️
- Festival 🎪

**Special:**
- Family 👨‍👩‍👧‍👦

**Features**:
- Multi-select support (select multiple categories at once)
- Each category maps to specific `event_type` values
- Visual feedback with checkmarks for selected items
- Descriptive text for each category

### 3. WHERE Filter
**Component**: `RegionPills.tsx` (existing)

Regional filtering within the selected city:
- Shows available regions (e.g., "Brooklyn", "Manhattan", "Queens")
- Multi-select with pill UI
- "All" option to clear regional filter

### 4. Additional Filters (Collapsible)
**Component**: `FilterRow.tsx` (existing)

Advanced filters shown when "Show More Filters" is clicked:
- **Custom Date Range** - Precise date selection
- **Price** - Coming soon (currently disabled)
- **Venue Size** - Small (<100), Medium (100+), Large (300+)

## Database Schema Integration

### Event Type Filtering
Events now have an `event_type` array field in the database:

```sql
event_type text[] null
```

**Example values**:
- `['music', 'nightlife', 'free']`
- `['comedy', 'date_night']`
- `['workshop', 'art', 'community']`

**Filtering Logic**:
When a user selects categories, the filter checks if ANY of the event's `event_type` values match ANY of the selected categories (OR logic).

```typescript
// User selects: Music, Comedy
// Event A: event_type = ['music', 'nightlife'] ✅ Matches (has 'music')
// Event B: event_type = ['theater', 'date_night'] ❌ No match
// Event C: event_type = ['comedy', 'food_drink'] ✅ Matches (has 'comedy')
```

### Venue Type Integration
Venues have a single `type` field:

```sql
type text null
```

**Example values**: `'bar'`, `'comedy_club'`, `'concert_hall'`, `'museum'`

Categories can also filter by venue type. For example:
- **Music** category matches events at venues with type `'concert_hall'` or `'jazz_club'`
- **Nightlife** category matches venues with type `'bar'`, `'night_club'`, or `'lounge'`

## Category Mapping

Each UI category maps to specific event and venue types:

```typescript
{
  id: 'music',
  label: 'Music',
  emoji: '🎵',
  eventTypes: ['music'],
  venueTypes: ['concert_hall', 'jazz_club']
}
```

This mapping is defined in `constants/eventCategories.ts`.

## State Management

### Filter State
```typescript
interface FilterState {
  category: string | string[];      // UI categories (legacy)
  eventTypes: string[];              // Database event_type values
  venueTypes: string[];              // Database venue type values
  dateRange: 'today' | 'tomorrow' | 'this_week' | 'custom';
  startDate: Date | null;
  endDate: Date | null;
  regions: string[];
  searchText: string;
  size: string | string[];
  price: string;
}
```

### Filter Actions
```typescript
type FilterAction =
  | { type: 'SET_CATEGORY'; payload: string | string[] }
  | { type: 'SET_EVENT_TYPES'; payload: string[] }
  | { type: 'SET_VENUE_TYPES'; payload: string[] }
  | { type: 'SET_DATE_RANGE'; payload: 'today' | 'tomorrow' | 'this_week' | 'custom' }
  | { type: 'SET_REGIONS'; payload: string[] }
  // ... other actions
```

## User Experience Flow

1. **Initial Load**:
   - Default: "When: Today", "What: All Events"
   - Shows all events happening today in the selected city

2. **Selecting a Time**:
   - User clicks "When" dropdown
   - Selects "This Week"
   - Filter updates to show next 7 days of events

3. **Selecting Categories**:
   - User taps "Music 🎵" pill (turns blue)
   - User taps "Comedy 😂" pill (also turns blue)
   - Events with `event_type` containing 'music' OR 'comedy' are shown
   - User can click "More" to see additional categories

4. **Selecting Regions**:
   - User taps "Brooklyn" region pill
   - Only events in Brooklyn are shown
   - User can select multiple regions

5. **Advanced Filters**:
   - User clicks "Show More Filters"
   - Selects "Venue Size: <100 👥" for intimate venues
   - Results update to show small venue events only

## Implementation Files

### New Files
- `src/constants/eventCategories.ts` - Category definitions and mappings
- `src/components/ui/WhenDropdown.tsx` - Time filter dropdown
- `src/components/ui/WhatDropdown.tsx` - Category filter with pills
- `src/components/FilterBarNew.tsx` - New filter bar layout

### Modified Files
- `src/types/events.d.ts` - Added `event_type`, `eventTypes`, `venueTypes` fields
- `src/hooks/useEvents.ts` - Updated filtering logic for new schema
- `src/components/ui/index.ts` - Export new components

### Existing Files (Reused)
- `src/components/ui/RegionPills.tsx` - Regional filtering
- `src/components/ui/FilterRow.tsx` - Advanced filters
- `src/components/ui/SearchAndToggle.tsx` - Search bar

## Benefits

1. **Clearer Intent**: "When, What, Where" is more intuitive than generic filters
2. **Better Discovery**: Quick pills make popular categories easily accessible
3. **Flexible**: Multi-select allows users to combine interests
4. **Scalable**: Easy to add new categories as event types grow
5. **Data-Driven**: Leverages the new `event_type` array field for accurate filtering
6. **Mobile-Friendly**: Horizontal scrolling pills work well on small screens

## Migration Notes

To use the new filter bar:

1. Replace `FilterBar` import with `FilterBarNew` in your main layout
2. Ensure events have `event_type` populated in the database
3. Pass `availableRegions` prop from your city/region data
4. The hook will automatically filter based on the new fields

The old filtering logic remains as a fallback for events without `event_type` data.

## Future Enhancements

1. **Price Filtering**: Enable when price data is available
2. **Smart Suggestions**: "Popular this weekend", "Trending near you"
3. **Saved Filters**: Let users save favorite filter combinations
4. **Category Discovery**: Show event count per category
5. **Time Suggestions**: "Tonight", "This Weekend", "Next Month"
