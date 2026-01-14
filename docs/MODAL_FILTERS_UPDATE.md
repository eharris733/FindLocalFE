# Filter Bar Update - Modal-Based Filters

## What Changed

I've redesigned the "What" and "Where" filters to use **modals** instead of inline dropdowns/pills, making them consistent with the "When" filter design.

## New User Experience

### When Filter (Unchanged)
- Click to open dropdown
- Select: Today, Tomorrow, This Week, or Custom Date
- Shows selected option in button

### What Filter (NEW - Modal-Based)
**Before:** Horizontal scrolling pills + "More" dropdown
**After:** Single button that opens a modal

#### How it works:
1. **Button shows:** 
   - "All Events" (default)
   - Category name if 1 selected (e.g., "Music")
   - "2 categories" if multiple selected

2. **Click opens modal with:**
   - All 26+ categories organized by groups:
     - Popular (All, Favorites, Free)
     - Performance & Entertainment
     - Arts & Culture
     - Social & Nightlife
     - Sports & Fitness
     - Educational & Community
     - Markets & Festivals
     - Special
   - Each category is a pill with emoji + label
   - Selected pills are blue with checkmark
   - Multi-select enabled

3. **Footer shows:**
   - Count: "3 categories selected"
   - "Done" button to close modal

### Where Filter (NEW - Modal-Based)
**Before:** Separate RegionPills component
**After:** Single button that opens a comprehensive location modal

#### How it works:
1. **Button shows:**
   - "All Locations" (default)
   - Venue type name if 1 selected (e.g., "Bar")
   - Region name if 1 selected
   - "3 filters" if multiple selected

2. **Click opens modal with TWO sections:**

   **Section 1: Venue Types**
   - Organized by groups:
     - Nightlife & Entertainment (Bar, Night Club, Jazz Club, etc.)
     - Performance Venues (Theater, Concert Hall, Stadium)
     - Cultural & Educational (Museum, Gallery, Library)
     - Dining & Social (Restaurant, Café, Brewery, Winery)
     - Fitness & Recreation (Gym, Studio, Sports Complex)
     - Community (Community Center, Church, School)
     - Other (Outdoors)
   - Each venue type has emoji + label
   - Multi-select with checkmarks

   **Section 2: Regions** (at bottom)
   - Shows available regions (Brooklyn, Manhattan, etc.)
   - "Clear All" button if any selected
   - Uses secondary color (different from venue types)
   - Multi-select with checkmarks

3. **Footer shows:**
   - Count: "5 filters selected" (venue types + regions combined)
   - "Done" button to close modal

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│ 🔍 Search events, venues...                     │
└─────────────────────────────────────────────────┘

┌──────────┬──────────────────────┬──────────────┐
│ WHEN     │ WHAT                 │ WHERE        │
│┌────────┐│┌────────────────────┐│┌────────────┐│
││Today ▼ │││All Events       ▼  │││All Locs ▼  ││
│└────────┘│└────────────────────┘│└────────────┘│
└──────────┴──────────────────────┴──────────────┘

         Show More Filters ▼

125 events found in New York     [List][Gallery][Map]
```

## What Modal Example

```
┌──────────────────────────────────────┐
│ Select Categories               ✕    │
├──────────────────────────────────────┤
│ POPULAR                              │
│ 🎭 All  ❤️ Favorites  🎁 Free       │
│                                      │
│ PERFORMANCE & ENTERTAINMENT          │
│ 🎵 Music  😂 Comedy  🎭 Theater     │
│ 💃 Dance  🎬 Film                   │
│                                      │
│ SOCIAL & NIGHTLIFE                   │
│ 🌙 Nightlife ✓  🍽️ Food & Drink   │
│ 🧠 Trivia  🎤 Karaoke               │
│ ... (scroll for more)                │
├──────────────────────────────────────┤
│ 3 categories selected    [Done]      │
└──────────────────────────────────────┘
```

## Where Modal Example

```
┌──────────────────────────────────────┐
│ Select Locations                ✕    │
├──────────────────────────────────────┤
│ Venue Types                          │
│                                      │
│ NIGHTLIFE & ENTERTAINMENT            │
│ 🍺 Bar ✓  🎉 Night Club  🎷 Jazz   │
│ 😂 Comedy Club  🛋️ Lounge           │
│                                      │
│ PERFORMANCE VENUES                   │
│ 🎭 Theater  🎵 Concert Hall ✓       │
│ 🏟️ Stadium                          │
│                                      │
│ ... (scroll for more groups)         │
│                                      │
├──────────────────────────────────────┤
│ Regions                   Clear All  │
│ Brooklyn ✓  Manhattan  Queens        │
│ The Bronx  Staten Island             │
├──────────────────────────────────────┤
│ 3 filters selected       [Done]      │
└──────────────────────────────────────┘
```

## Technical Changes

### New Components

1. **`WhatDropdown.tsx`** - Redesigned
   - Removed horizontal pills
   - Removed inline dropdown
   - Added modal with grouped categories
   - Shows count in button text

2. **`WhereDropdown.tsx`** - NEW
   - Replaces RegionPills
   - Combines venue types + regions in one modal
   - 40+ venue types organized by category
   - Separate sections with clear visual hierarchy

### Updated Components

3. **`FilterBarNew.tsx`**
   - Removed RegionPills usage
   - Added WhereDropdown
   - Added venue type state handling
   - All three filters now in one row

### Filter State

The filter state now includes:
```typescript
{
  venueTypes: string[],  // NEW: ['bar', 'concert_hall']
  regions: string[],      // Existing: ['Brooklyn', 'Manhattan']
  eventTypes: string[],   // Existing: ['music', 'nightlife']
  // ... other filters
}
```

## Benefits

✅ **Consistent UX** - All three filters work the same way (click → modal → select → done)
✅ **Cleaner UI** - No horizontal scrolling pills taking up space
✅ **More discoverable** - Users see ALL options organized by category
✅ **Better for mobile** - Modal works better than inline dropdowns
✅ **Combined filters** - Venue types + regions in one place
✅ **Visual feedback** - Always shows count of active filters

## How to Use

The integration is already complete in `MainLayout.tsx`! Just run your app and you'll see:

1. Three compact dropdowns: When, What, Where
2. Click any to open modal with options
3. Select multiple options
4. Button updates to show count
5. Filters apply automatically

## Filter Combinations Examples

**Example 1:** Find music at jazz clubs in Brooklyn
- What: Music ✓
- Where: Jazz Club ✓, Brooklyn ✓
- Result: Music events at jazz clubs in Brooklyn

**Example 2:** Comedy or nightlife tonight
- When: Today
- What: Comedy ✓, Nightlife ✓
- Where: All Locations
- Result: All comedy and nightlife events today

**Example 3:** Family-friendly events at museums
- What: Family ✓
- Where: Museum ✓
- Result: Family events at museums

The new design makes it much easier for users to discover and combine filters!
