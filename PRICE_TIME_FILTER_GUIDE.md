# Price & Time Filter Visual Guide

## Filter Bar Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search events...                               [Toggle]  │
├─────────────────────────────────────────────────────────────┤
│  [When ▾] [What ▾] [Where ▾] [Price ▾] [Time ▾]            │
│                                                              │
│  Show More Filters                                          │
└─────────────────────────────────────────────────────────────┘
```

On mobile (wraps):
```
┌─────────────────────────────────────┐
│  🔍 Search events...      [Toggle]  │
├─────────────────────────────────────┤
│  [When ▾] [What ▾] [Where ▾]       │
│  [Price ▾] [Time ▾]                │
│                                     │
│  Show More Filters                 │
└─────────────────────────────────────┘
```

## Price Filter Modal

```
┌─────────────────────────────────────┐
│  Filter by Price              [✕]   │
├─────────────────────────────────────┤
│                                     │
│  ○  Free                            │
│  ○  Under $25                       │
│  ✓  Under $50                       │
│  ○  $50+                            │
│  ○  Any Price                       │
│                                     │
└─────────────────────────────────────┘
```

**Button States:**

Inactive (no filter):
```
┌──────────┐
│ Price ▾  │  ← Gray background
└──────────┘
```

Active (filter applied):
```
┌──────────────┐
│ Under $50 ▾  │  ← Primary color background, white text
└──────────────┘
```

## Time Filter Modal

```
┌─────────────────────────────────────┐
│  Filter by Time of Day        [✕]   │
├─────────────────────────────────────┤
│                                     │
│  ○  Morning                         │
│      6am - 12pm                     │
│                                     │
│  ○  Afternoon                       │
│      12pm - 5pm                     │
│                                     │
│  ✓  Evening                         │
│      5pm - 9pm                      │
│                                     │
│  ○  Night                           │
│      9pm - 6am                      │
│                                     │
│  ○  Any Time                        │
│                                     │
└─────────────────────────────────────┘
```

**Button States:**

Inactive (no filter):
```
┌──────────┐
│ Time ▾   │  ← Gray background
└──────────┘
```

Active (filter applied):
```
┌──────────────┐
│ Evening ▾    │  ← Primary color background, white text
└──────────────┘
```

## Combined Filter Example

User wants: "Live Music, This Weekend, Under $50, Evening Shows"

Filter bar displays:
```
┌────────────────────────────────────────────────────────────────┐
│  [This Week ▾] [3 categories ▾] [Where ▾] [Under $50 ▾] [Evening ▾]  │
│   ↑ primary     ↑ primary         ↑ gray    ↑ primary    ↑ primary   │
└────────────────────────────────────────────────────────────────┘

Active filters:
✓ When: This Week
✓ What: Music, Nightlife, Arts (3 categories)
✗ Where: No filter (all venues)
✓ Price: Under $50
✓ Time: Evening
```

## Price Filter Logic

### Database Field: `price_amount` (numeric)

```tsx
// Free events
price: { min: 0, max: 0 }
→ Shows events where price_amount = 0

// Under $25
price: { min: 0, max: 25 }
→ Shows events where 0 ≤ price_amount ≤ 25

// Under $50
price: { min: 0, max: 50 }
→ Shows events where 0 ≤ price_amount ≤ 50

// $50+
price: { min: 50 }
→ Shows events where price_amount ≥ 50

// Any Price
price: undefined
→ Shows all events regardless of price
```

### Example Events

```tsx
Event 1: { title: "Free Concert", price_amount: 0 }
  ✓ Free
  ✓ Under $25
  ✓ Under $50
  ✗ $50+
  ✓ Any Price

Event 2: { title: "Comedy Show", price_amount: 20 }
  ✗ Free
  ✓ Under $25
  ✓ Under $50
  ✗ $50+
  ✓ Any Price

Event 3: { title: "Broadway Show", price_amount: 150 }
  ✗ Free
  ✗ Under $25
  ✗ Under $50
  ✓ $50+
  ✓ Any Price
```

## Time Filter Logic

### Database Field: `start_time` (time format: HH:MM:SS)

```tsx
// Morning (6am - 12pm)
timeRange: { start: 6, end: 12 }
→ Shows events where hour ≥ 6 and hour < 12

// Afternoon (12pm - 5pm)
timeRange: { start: 12, end: 17 }
→ Shows events where hour ≥ 12 and hour < 17

// Evening (5pm - 9pm)
timeRange: { start: 17, end: 21 }
→ Shows events where hour ≥ 17 and hour < 21

// Night (9pm - 6am) - OVERNIGHT
timeRange: { start: 21, end: 6 }
→ Shows events where hour ≥ 21 OR hour < 6

// Any Time
timeRange: undefined
→ Shows all events regardless of time
```

### Example Events

```tsx
Event 1: { title: "Brunch Music", start_time: "11:00:00" }
  Hour: 11
  ✓ Morning (6-12)
  ✗ Afternoon, Evening, Night

Event 2: { title: "Matinee Show", start_time: "14:30:00" }
  Hour: 14
  ✗ Morning
  ✓ Afternoon (12-17)
  ✗ Evening, Night

Event 3: { title: "Dinner Theater", start_time: "19:00:00" }
  Hour: 19
  ✗ Morning, Afternoon
  ✓ Evening (17-21)
  ✗ Night

Event 4: { title: "Late Night Comedy", start_time: "22:30:00" }
  Hour: 22
  ✗ Morning, Afternoon, Evening
  ✓ Night (21-6)

Event 5: { title: "After Hours Club", start_time: "02:00:00" }
  Hour: 2
  ✗ Morning, Afternoon, Evening
  ✓ Night (21-6)  ← Handles overnight correctly
```

## Interaction Flow

### Opening Price Filter
1. User taps "Price ▾" button
2. Modal slides in from center
3. Current selection shown with checkmark
4. User taps desired option
5. Modal closes
6. Button updates to show selection
7. Button background changes to primary color
8. Events filter immediately

### Clearing Filters
1. User taps active filter button
2. Modal opens showing current selection
3. User taps "Any Price" or "Any Time"
4. Modal closes
5. Button returns to default state (gray)
6. All events shown

### Multiple Active Filters
```
Scenario: User wants cheap evening shows

Step 1: Tap Price, select "Under $25"
  → Button shows: [Under $25 ▾] in primary color

Step 2: Tap Time, select "Evening"
  → Button shows: [Evening ▾] in primary color

Result:
[When ▾] [What ▾] [Where ▾] [Under $25 ▾] [Evening ▾]
 gray     gray      gray      PRIMARY      PRIMARY

Events shown: Only events with price_amount ≤ 25 AND start_time 17:00-20:59
```

## Edge Cases Handled

### Price Filter
- ✅ Null price_amount values ignored (don't fail filter)
- ✅ Free events (price_amount = 0) only shown when "Free" selected
- ✅ Events without price_amount shown only in "Any Price"
- ✅ Max value exclusive (Under $50 shows up to 50, not 50.01)

### Time Filter
- ✅ Overnight range (Night: 21-6) correctly includes 21:00-23:59 and 00:00-05:59
- ✅ Events without start_time ignored (don't break filter)
- ✅ Time parsing handles various formats (HH:MM:SS, HH:MM)
- ✅ Hour boundaries exclusive (Evening 17-21 includes 17:00-20:59, not 21:00)

## Accessibility

All modals include:
- Close button with proper icon (✕)
- Tap outside to dismiss
- Clear visual feedback for selections (checkmark icon)
- High contrast between active/inactive states
- Descriptive labels ("Filter by Price", "Filter by Time of Day")

## Performance

Filter operations are optimized:
- Price: Simple numeric comparison (O(1) per event)
- Time: Regex parse once + hour comparison (O(1) per event)
- Filters combine with AND logic (all must match)
- No re-filtering until modal closes (prevents lag during selection)
