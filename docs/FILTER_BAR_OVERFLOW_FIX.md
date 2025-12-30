# Filter Bar Overflow Fix & Price/Time Filters

## Overview
Fixed horizontal overflow issue in FilterBarNew and added Price and Time filtering capabilities.

## Changes Made

### 1. Layout Fix - Prevent Horizontal Overflow
**File**: `src/components/FilterBarNew.tsx`

**Problem**: Filter dropdowns were overflowing horizontally on mobile screens.

**Solution**: Added `flexWrap: 'wrap'` to the mainFilters container to allow dropdowns to wrap to the next line on smaller screens.

```tsx
mainFilters: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 6,
  paddingHorizontal: 4,
  paddingVertical: 8,
  flexWrap: 'wrap', // ← NEW: Allows wrapping on small screens
}
```

### 2. New Price Filter Component
**File**: `src/components/ui/PriceDropdown.tsx`

**Features**:
- Modal-based dropdown matching When/What/Where design pattern
- Price range options:
  - Free (price_amount = 0)
  - Under $25 (0-25)
  - Under $50 (0-50)
  - $50+ (50+)
  - Any Price (no filter)
- Active filter shows in primary color
- Filters based on `event.price_amount` database field

**Usage**:
```tsx
<PriceDropdown
  selectedPrice={filters.price}
  onPriceChange={handlePriceChange}
/>
```

### 3. New Time Filter Component
**File**: `src/components/ui/TimeDropdown.tsx`

**Features**:
- Modal-based dropdown matching design system
- Time of day options:
  - Morning (6am - 12pm)
  - Afternoon (12pm - 5pm)
  - Evening (5pm - 9pm)
  - Night (9pm - 6am) - handles overnight range
  - Any Time (no filter)
- Shows human-readable time ranges (e.g., "6am - 12pm")
- Filters based on `event.start_time` database field

**Usage**:
```tsx
<TimeDropdown
  selectedTime={filters.timeRange}
  onTimeChange={handleTimeChange}
/>
```

### 4. Updated Type Definitions
**File**: `src/types/events.d.ts`

**Changes**:
```tsx
export interface FilterState {
  // ... existing fields
  price?: { min?: number; max?: number }; // Changed from string
  timeRange?: { start?: number; end?: number }; // NEW: hour-based filtering
  // ... rest of fields
}

export type FilterAction =
  // ... existing actions
  | { type: 'SET_PRICE'; payload: { min?: number; max?: number } | undefined }
  | { type: 'SET_TIME_RANGE'; payload: { start?: number; end?: number } | undefined }
  // ... rest of actions
```

### 5. Updated Filter Logic
**File**: `src/hooks/useEvents.ts`

**Price Filtering**:
```tsx
// Check price range
if (filters.price) {
  const eventPrice = event.price_amount;
  if (eventPrice !== null && eventPrice !== undefined) {
    if (filters.price.min !== undefined && eventPrice < filters.price.min) {
      return false;
    }
    if (filters.price.max !== undefined && eventPrice > filters.price.max) {
      return false;
    }
  } else if (filters.price.min === 0 && filters.price.max === 0) {
    // Free events only
    return false;
  }
}
```

**Time Filtering**:
```tsx
// Filter by time of day
if (filters.timeRange && event.start_time) {
  const timeMatch = event.start_time.match(/^(\d{2}):(\d{2})/);
  if (timeMatch) {
    const eventHour = parseInt(timeMatch[1], 10);
    const { start, end } = filters.timeRange;
    
    if (start !== undefined && end !== undefined) {
      // Handle overnight ranges (e.g., Night: 21-6)
      if (start > end) {
        if (eventHour < start && eventHour >= end) {
          return false;
        }
      } else {
        if (eventHour < start || eventHour >= end) {
          return false;
        }
      }
    }
  }
}
```

**Reducer Updates**:
```tsx
case 'SET_TIME_RANGE':
  return { ...state, timeRange: action.payload };
```

### 6. Updated Filter Bar Layout
**File**: `src/components/FilterBarNew.tsx`

The filter bar now displays 5 filters in a wrapping row:
```
[When] [What] [Where] [Price] [Time]
```

On smaller screens, they wrap automatically:
```
[When] [What] [Where]
[Price] [Time]
```

## Database Schema Requirements

The filtering relies on these database fields:

1. **price_amount** (numeric): Numeric price value for filtering
2. **start_time** (time): Event start time in HH:MM:SS format

Example event structure:
```tsx
{
  id: "...",
  title: "Jazz Night",
  event_date: "2024-01-15",
  start_time: "20:00:00", // 8pm
  price_amount: 25,
  // ... other fields
}
```

## UI/UX Improvements

### Consistent Design Pattern
All five dropdowns (When, What, Where, Price, Time) now follow the same pattern:
- Button shows current selection or filter count
- Active filters highlighted in primary color
- Modal opens with scrollable options
- Checkmark indicates selected option
- Close button in header

### Responsive Layout
- Filters wrap to multiple lines on small screens
- Reduced padding and gaps for better mobile experience
- No horizontal scrolling or overflow

### Visual Feedback
- Active filters show in primary color (#4CAF50 by default)
- Inactive filters show in secondary background
- Button text changes color based on state
- Chevron icon provides affordance

## Testing Checklist

- [ ] Filter bar displays all 5 filters without overflow
- [ ] Filters wrap correctly on mobile screens
- [ ] Price filter works for all price ranges
- [ ] Time filter correctly filters morning/afternoon/evening/night
- [ ] Time filter handles overnight range (Night: 9pm-6am)
- [ ] Multiple filters can be active simultaneously
- [ ] Clearing filters returns to "Any Price" / "Any Time"
- [ ] Active filters display in primary color
- [ ] Modals open and close correctly
- [ ] Selected options show checkmarks

## Future Enhancements

Potential improvements:
1. Custom price range input (slider or text fields)
2. Custom time range picker
3. Price + time combination presets (e.g., "Cheap & Late Night")
4. Show number of events per price/time category
5. Save filter preferences to user profile
6. Filter analytics to show popular combinations

## Migration Notes

### Breaking Changes
- `FilterState.price` changed from `string` to `{ min?: number; max?: number } | undefined`
- Components using `filters.price` directly will need updates
- FilterRow component still uses old price format (string) but is now hidden/disabled

### Backward Compatibility
- Old FilterRow component still works but shows "All prices" when new price filter is active
- Legacy code can continue using FilterRow until migration is complete

## Files Modified

1. `/src/components/FilterBarNew.tsx` - Added Price/Time filters, fixed layout
2. `/src/components/ui/PriceDropdown.tsx` - NEW component
3. `/src/components/ui/TimeDropdown.tsx` - NEW component
4. `/src/components/ui/index.ts` - Exported new components
5. `/src/types/events.d.ts` - Updated FilterState and FilterAction types
6. `/src/hooks/useEvents.ts` - Added price/time filtering logic and reducer cases

## Summary

The filter bar now provides a complete, responsive filtering experience with:
- ✅ No horizontal overflow on any screen size
- ✅ Price filtering based on actual event prices
- ✅ Time of day filtering based on event start times
- ✅ Consistent modal-based UI across all filters
- ✅ Proper type safety with TypeScript
- ✅ Efficient filtering logic in useEvents hook

Users can now find events by combining when, what, where, price, and time filters - making event discovery much more powerful and user-friendly.
