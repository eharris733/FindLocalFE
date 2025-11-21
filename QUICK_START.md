# Quick Start Guide - New Filter Bar

## 5-Minute Setup

### Step 1: Import the New Component

In your main events page (e.g., `src/app/index.tsx` or similar):

```typescript
// Replace old import
// import FilterBar from '../components/FilterBar';

// With new import
import FilterBarNew from '../components/FilterBarNew';
import { getAvailableRegions } from '../utils/regionHelpers';
```

### Step 2: Get Available Regions

```typescript
// In your component
const { 
  events, 
  filteredEvents, 
  filters, 
  dispatchFilters,
  loading 
} = useEvents({ selectedCity });

// Extract regions from events
const availableRegions = getAvailableRegions(events);
```

### Step 3: Replace FilterBar with FilterBarNew

```typescript
<FilterBarNew
  filters={filters}
  dispatchFilters={dispatchFilters}
  availableRegions={availableRegions}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  resultsCount={filteredEvents.length}
  loading={loading}
/>
```

### Step 4: Test It!

That's it! Your new filter bar should now work with:
- ✅ When dropdown (Today, Tomorrow, This Week, Custom)
- ✅ What pills (Music, Comedy, Nightlife, etc.)
- ✅ Where region filtering
- ✅ Multi-select categories
- ✅ Event type array filtering

## Example Full Integration

```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useEvents } from '../hooks/useEvents';
import { useCityLocation } from '../context/CityContext';
import FilterBarNew from '../components/FilterBarNew';
import { getAvailableRegions } from '../utils/regionHelpers';
import EventList from '../components/EventList';

export default function EventsPage() {
  const { selectedCity } = useCityLocation();
  const [viewMode, setViewMode] = useState<'list' | 'gallery' | 'map'>('list');
  
  const { 
    events,
    filteredEvents, 
    filters, 
    dispatchFilters,
    loading 
  } = useEvents({ selectedCity });
  
  const availableRegions = getAvailableRegions(events);

  return (
    <View style={styles.container}>
      <FilterBarNew
        filters={filters}
        dispatchFilters={dispatchFilters}
        availableRegions={availableRegions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultsCount={filteredEvents.length}
        loading={loading}
      />
      
      <EventList 
        events={filteredEvents} 
        viewMode={viewMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Verify Database Schema

Make sure your events have the `event_type` field populated:

```sql
-- Check if events have event_type
SELECT 
  title,
  event_type,
  COUNT(*) 
FROM events_gold 
WHERE event_type IS NOT NULL 
GROUP BY title, event_type 
LIMIT 10;

-- Count events with event_type
SELECT 
  COUNT(*) as total_events,
  COUNT(event_type) as events_with_types,
  COUNT(event_type) * 100.0 / COUNT(*) as percentage
FROM events_gold;
```

## Troubleshooting

### "Nothing shows up when I select a category"

**Check 1**: Do events have `event_type` populated?
```typescript
console.log('Sample event:', events[0]?.event_type);
```

**Check 2**: Are event_type values lowercase?
```typescript
// Should be: ['music', 'nightlife']
// NOT: ['Music', 'Nightlife']
```

**Check 3**: Check the category mapping
```typescript
import { getEventTypesForCategory } from '../constants/eventCategories';
console.log('Music maps to:', getEventTypesForCategory('music'));
```

### "Regions don't show up"

**Check**: Do events have `region` field?
```typescript
console.log('Available regions:', getAvailableRegions(events));
```

If no regions, the component will simply hide the WHERE section.

### "TypeScript errors"

Make sure you've updated:
- ✅ `src/types/events.d.ts` with new fields
- ✅ `src/hooks/useEvents.ts` with new reducer cases
- ✅ `src/components/ui/index.ts` exports new components

## Feature Flag Pattern

Want to test gradually? Use a feature flag:

```typescript
const ENABLE_NEW_FILTER_BAR = process.env.EXPO_PUBLIC_NEW_FILTER_BAR === 'true';

// In your component
{ENABLE_NEW_FILTER_BAR ? (
  <FilterBarNew {...props} />
) : (
  <FilterBar {...props} />
)}
```

Then in your `.env`:
```
EXPO_PUBLIC_NEW_FILTER_BAR=true
```

## What's Next?

1. **Test with real data** - See how categories match your events
2. **Gather feedback** - Watch which categories users select most
3. **Optimize mappings** - Adjust category → event_type mappings based on usage
4. **Add analytics** - Track filter combinations for insights
5. **Populate event_type** - Ensure all events have accurate types

## Performance Tips

The new filtering is optimized, but for large datasets:

```typescript
// Memoize regions calculation
const availableRegions = useMemo(
  () => getAvailableRegions(events),
  [events]
);

// Or update useEvents to return it directly
const { 
  filteredEvents,
  availableRegions // Add to hook return
} = useEvents({ selectedCity });
```

## Need Help?

- 📖 See `FILTER_BAR_REDESIGN.md` for complete technical docs
- 🎨 See `FILTER_BAR_UI_GUIDE.md` for visual design reference
- 📋 See `IMPLEMENTATION_SUMMARY.md` for full overview
- 🔍 Check component source code for inline comments

Happy filtering! 🎉
