# Community Taxonomy Schema Update

## Overview
Updated TypeScript types and API functions to match the actual database schema for the community-based taxonomy system.

## Database Schema (Actual)

### Communities Table
- `id` (uuid)
- `name` (text) - e.g., "Music", "Dance", "Comedy", "Theater", "Culture"
- `parent_id` (uuid, nullable) - For hierarchical structure
- `level` (integer) - Hierarchy depth (1 = top-level, 2 = sub-community)
- `description` (text, nullable)
- `metadata` (jsonb) - Contains `icon`, `color`, `display_order`
- `created_at`, `updated_at` (timestamptz)

### Community City Availability Table
- `id` (uuid)
- `community_id` (uuid) - Foreign key to communities
- `city` (text)
- `is_enabled` (boolean) - Controls which communities are available per city
- `metadata` (jsonb) - City-specific config like `min_daily_events`, `priority`
- `created_at`, `updated_at` (timestamptz)

**Purpose**: Communities are global but can be enabled/disabled per city

### Community Labels Table
- `id` (uuid)
- `community_id` (uuid) - Foreign key to communities
- `city` (text) - Labels are city-specific
- `label` (text) - e.g., "Jazz", "Open Mic", "Stand-up"
- `description` (text, nullable)
- `metadata` (jsonb) - Contains `display_order`
- `created_at`, `updated_at` (timestamptz)

**Purpose**: Sub-category labels within each community, customized per city

### Event Community Assignments Table
- `id` (uuid)
- `event_id` (uuid) - Foreign key to events_gold
- `community_id` (uuid) - Foreign key to communities
- `labels` (text[]) - Array of label names for this event/community
- `assigned_by` (text) - 'ai' | 'venue' | 'manual'
- `confidence` (float8) - AI confidence score (0.0-1.0)
- `created_at` (timestamptz)

**Purpose**: Maps events to communities with labels. Events can belong to multiple communities.

### Venue Communities Table
- `id` (uuid)
- `venue_id` (uuid) - Foreign key to venues
- `community_id` (uuid) - Foreign key to communities
- `priority` (text) - 'high' | 'medium' | 'low' - Alignment strength
- `default_labels` (text[]) - Labels auto-applied to all events at this venue
- `auto_assign` (boolean) - If true, auto-assign this community to all venue events
- `created_at`, `updated_at` (timestamptz)

**Purpose**: Maps venues to communities with alignment strength and default labels

## Updated Files

### ✅ src/api/communities.ts
- Added new interfaces matching database schema:
  - `Community` - Updated with `parent_id`, `level`
  - `CommunityLabel` - Updated metadata structure
  - `CommunityCityAvailability` - NEW
  - `EventCommunityAssignment` - NEW
  - `VenueCommunity` - NEW
  - `CommunityLabelsGrouped` - Existing

- Updated API functions:
  - `getCommunitiesForCity(city)` - NEW - Fetches communities enabled for a specific city via `community_city_availability` table
  - `getAllCommunities()` - Updated to sort by `metadata.display_order`
  - `getLabelsForCommunity(communityId, city)` - Updated, removed `enabled` filter
  - `getAllLabelsForCity(city, selectedCommunityIds?)` - Updated with optional community filtering

### ✅ src/context/CommunityContext.tsx
- Updated to use `getCommunitiesForCity()` instead of `getAllCommunities()`
- Communities now refresh when city changes (filtered by city availability)
- Labels refresh when city or communities change

### ✅ src/types/events.d.ts
- Added `EventCommunityAssignment` interface
- Added `event_community_assignments` field to `Event` interface
- Kept `event_type` field as LEGACY for backward compatibility

### ✅ src/api/events.ts
- Added `getEventsWithCommunities(city?, communityIds?, labels?)` - NEW
  - Fetches events with their community assignments via join
  - Filters by community IDs and labels if provided
  - Returns events with `event_community_assignments` populated

## Still TODO

### 🔲 Update useEvents Hook
**File**: `src/hooks/useEvents.ts`

Currently filters events by `event_type` field (legacy). Need to:
1. Add support for filtering by `event_community_assignments`
2. Update `FilterState` to include:
   - `communityIds?: string[]` - Filter by selected communities
   - `labels?: string[]` - Filter by selected labels
3. Update filter logic to check both:
   - Legacy `event_type` field (for backward compatibility)
   - New `event_community_assignments` field

### 🔲 Update Event Fetching in Main App
**File**: `src/app/index.tsx`

Currently uses `getEvents(city)`. Should consider:
1. Switching to `getEventsWithCommunities(city, communityIds)` when communities are selected
2. Fallback to `getEvents(city)` for legacy support

### 🔲 Update WhatDropdown Component
**File**: `src/components/ui/WhatDropdown.tsx`

Currently works with labels from context. May need to:
1. Update `onLabelsChange` to update filter state with selected labels
2. Ensure selected labels are passed to event filtering logic

### 🔲 Add Venue Filtering by Community
Create new API function in `src/api/venues.ts`:
```typescript
async function getVenuesForCommunity(communityId: string): Promise<Venue[]>
```
- Query `venue_communities` table
- Join with `venues` table
- Filter by `community_id`

### 🔲 Update OnboardingModal
**File**: `src/components/OnboardingModal.tsx`

Verify it's using updated community data structure

### 🔲 Testing Checklist
- [ ] Communities load correctly for each city
- [ ] Labels load correctly for selected communities
- [ ] Community picker shows correct communities for current city
- [ ] Label picker shows correct labels for selected communities
- [ ] Events filter correctly by selected communities
- [ ] Events filter correctly by selected labels
- [ ] City switching refreshes communities and labels
- [ ] Community switching updates available labels
- [ ] "Everything" option works (all communities/labels)

## Migration Notes

### Backward Compatibility
- Keep `event_type` field in events for legacy filtering
- Support both old category-based and new community-based filtering
- Gracefully handle events without `event_community_assignments`

### Data Assumptions
- Communities are pre-populated in database
- `community_city_availability` records exist for each city
- Labels are pre-populated for each community/city combination
- Events have been classified with `event_community_assignments`

### Known Issues
1. If `event_community_assignments` is empty, events won't show up in community filters
2. Need to verify all cities have community availability records
3. Need to verify all communities have labels for each city

## Next Steps

1. **Verify Database Data**
   ```sql
   -- Check if communities exist
   SELECT * FROM communities ORDER BY metadata->>'display_order';
   
   -- Check city availability
   SELECT c.name, cca.city, cca.is_enabled 
   FROM communities c
   JOIN community_city_availability cca ON c.id = cca.community_id
   ORDER BY cca.city, c.metadata->>'display_order';
   
   -- Check labels per city
   SELECT c.name, cl.city, COUNT(*) as label_count
   FROM communities c
   JOIN community_labels cl ON c.id = cl.community_id
   GROUP BY c.name, cl.city
   ORDER BY cl.city, c.name;
   
   -- Check event assignments
   SELECT COUNT(*) as total_events,
          COUNT(DISTINCT eca.event_id) as events_with_communities
   FROM events_gold eg
   LEFT JOIN event_community_assignments eca ON eg.id = eca.event_id;
   ```

2. **Update Event Filtering Logic** (Priority: HIGH)
   - Modify `useEvents` hook to support community-based filtering
   - Test filtering with actual data

3. **Test UI Components**
   - Verify CommunityPicker works with real data
   - Verify WhatDropdown shows correct labels
   - Test "Everything" vs specific community selection

4. **Add Error Handling**
   - Handle missing community assignments gracefully
   - Show appropriate messages when no labels/events found
