# Filter Bar UI Design - Visual Guide

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SEARCH BAR                                  │
│  🔍 Search events, venues...                                   ⊗   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WHEN               WHAT                                             │
│  ┌──────────┐      ┌────┬────┬────┬────┬────┬────┬────────┐        │
│  │ Today ▼  │      │🎭  │❤️  │🎁  │🎵  │😂  │🌙  │ More ▼ │        │
│  └──────────┘      │All │Fav │Free│Music│Com│Night│       │        │
│                     └────┴────┴────┴────┴────┴────┴────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  WHERE                                                               │
│  FILTER BY REGION:                                                   │
│  ┌────┬──────────┬──────────┬───────────┬────────────┐             │
│  │All │ Brooklyn │Manhattan │ Queens    │ The Bronx  │             │
│  └────┴──────────┴──────────┴───────────┴────────────┘             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Show More Filters ▼                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  125 events found in New York        [List] [Gallery] [Map]         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Search Bar
```
┌────────────────────────────────────────────────┐
│ 🔍 Search events, venues...               ⊗   │
└────────────────────────────────────────────────┘
```
- Full-width input
- Search icon on left
- Clear button (⊗) appears when text is entered
- Placeholder text guides user

### 2. When Dropdown
```
WHEN
┌────────────┐
│ Today   ▼  │  ← Click to open
└────────────┘

When clicked:
┌────────────────┐
│ 📅 Today      ✓│
│ 📆 Tomorrow    │
│ 📋 This Week   │
│ 🗓️ Custom Date │
└────────────────┘
```

States:
- **Default**: Shows "Today"
- **Selected**: Blue highlight, checkmark
- **Custom Date**: Opens modal with calendar picker

### 3. What Pills (Horizontal Scroll)
```
WHAT
┌────┬────┬────┬────┬────┬────┬────────┐
│🎭  │❤️  │🎁  │🎵  │😂  │🌙  │ More ▼ │
│All │Fav │Free│Music│Com │Night│       │
└────┴────┴────┴────┴────┴────┴────────┘
     ↑                           ↑
   Selected                  Opens dropdown
   (Blue bg)
```

#### Popular Pills (Always Visible)
1. **🎭 All** - Default, shows all events
2. **❤️ Favorites** - User's favorited events
3. **🎁 Free** - Free events only
4. **🎵 Music** - Live music
5. **😂 Comedy** - Comedy shows
6. **🌙 Nightlife** - Bars, clubs, etc.
7. **More ▼** - Opens dropdown with more categories

#### Multi-Select Behavior
```
Before:                After selecting Music + Comedy:
┌────┬────┬────┐       ┌────┬────┬────┐
│🎭  │🎵  │😂  │       │🎭  │🎵  │😂  │
│All │Music│Com │       │All │Music│Com │ ← Both blue
└────┴────┴────┘       └────┴────┴────┘
```

### 4. More Categories Dropdown
```
When "More ▼" is clicked:
┌──────────────────────────────────────┐
│ 🎭 Theater                          │
│    Plays and theatrical performances │
│                                      │
│ 💃 Dance                            │
│    Dance performances and events    │
│                                      │
│ 🎬 Film                             │
│    Movie screenings and film events │
│                                      │
│ 🎨 Art                        ✓     │  ← Selected
│    Art exhibitions and galleries    │
│                                      │
│ 📚 Literary                         │
│    Book readings and literary events│
│                                      │
│ [... scroll for more ...]           │
└──────────────────────────────────────┘
```

Features:
- Scrollable list (max 300px height)
- Each item shows:
  - Emoji icon
  - Category name (bold)
  - Description (smaller, gray text)
  - Checkmark when selected
- Selected items have light blue background
- Click outside or scroll away to close

### 5. Where Pills (Region Filter)
```
WHERE
FILTER BY REGION:
┌────┬──────────┬──────────┬───────────┬────────────┐
│All │ Brooklyn │Manhattan │ Queens    │ The Bronx  │
└────┴──────────┴──────────┴───────────┴────────────┘
 ↑                  ↑
Default          Selected (Blue)
```

Multi-select regions:
```
User clicks Brooklyn, then Manhattan:
┌────┬──────────┬──────────┬───────────┬────────────┐
│All │ Brooklyn │Manhattan │ Queens    │ The Bronx  │
└────┴──────────┴──────────┴───────────┴────────────┘
      ↑Blue      ↑Blue
```

### 6. More Filters (Collapsible)
```
Before click:
┌─────────────────────────────┐
│   Show More Filters ▼       │
└─────────────────────────────┘

After click:
┌─────────────────────────────┐
│   Hide More Filters ▲       │
└─────────────────────────────┘
┌───────────────────────────────────────────┐
│ 🗓️ Date Range │ 💰 Price │ 🏢 Size        │
│ ┌──────────┐  │ ┌──────┐ │ ┌──────────┐  │
│ │Select... │  │ │All ▼ │ │ │<100 👥 ✓│  │
│ └──────────┘  │ └──────┘ │ │100+ 👥  │  │
│               │          │ │300+ 👥  │  │
│               │          │ └──────────┘  │
└───────────────────────────────────────────┘
```

### 7. Results and View Toggle
```
┌───────────────────────────────────────────────────────────┐
│ 125 events found in New York          [=][::][🗺]        │
│                                         ↑   ↑   ↑         │
│                                       List Gal Map        │
└───────────────────────────────────────────────────────────┘
```

## Color Scheme

### Pill States
- **Unselected**: 
  - Background: Light gray (#F3F4F6)
  - Border: Light border (#E5E7EB)
  - Text: Dark gray (#6B7280)

- **Selected**: 
  - Background: Primary blue (#3B82F6)
  - Border: Primary blue (#3B82F6)
  - Text: White (#FFFFFF)

- **Hover**:
  - Background: Slightly darker than unselected (#E5E7EB)

### Dropdown States
- **Item Unselected**:
  - Background: White
  - Text: Dark (#1F2937)

- **Item Selected**:
  - Background: Light blue (#DBEAFE)
  - Text: Primary blue (#3B82F6)
  - Checkmark: Primary blue

- **Item Hover**:
  - Background: Very light gray (#F9FAFB)

## Responsive Behavior

### Mobile (< 768px)
```
┌──────────────────────────┐
│ 🔍 Search...        ⊗   │
└──────────────────────────┘

┌──────────────────────────┐
│ WHEN                     │
│ ┌──────────────────────┐ │
│ │ Today            ▼   │ │
│ └──────────────────────┘ │
└──────────────────────────┘

┌──────────────────────────┐
│ WHAT                     │
│ 🎭 ❤️ 🎁 🎵 😂 More ▼   │  ← Scrollable
└──────────────────────────┘

┌──────────────────────────┐
│ WHERE                    │
│ All Brooklyn Manhattan   │  ← Scrollable
└──────────────────────────┘

┌──────────────────────────┐
│ Show More Filters ▼      │
└──────────────────────────┘

┌──────────────────────────┐
│ 125 events               │
│ [List] [Gallery] [Map]   │
└──────────────────────────┘
```

### Desktop (≥ 768px)
- When/What in same row with more space
- Pills show more items before scrolling
- Dropdown can be wider for better readability
- More filters can show inline instead of stacked

## Interactive Examples

### Example 1: Finding Music Events This Weekend
```
Step 1: User lands on page
WHEN: Today (default)
WHAT: All Events (default)
→ Shows: All events happening today

Step 2: User clicks "When" dropdown, selects "This Week"
WHEN: This Week ✓
WHAT: All Events
→ Shows: All events in next 7 days

Step 3: User clicks "Music 🎵" pill
WHEN: This Week
WHAT: Music (blue) 
→ Shows: Music events in next 7 days

Step 4: User clicks "Brooklyn" region
WHEN: This Week
WHAT: Music
WHERE: Brooklyn (blue)
→ Shows: Music events in Brooklyn in next 7 days
```

### Example 2: Free Family Events
```
User clicks: Free 🎁 + More → Family 👨‍👩‍👧‍👦
Result: Shows all free family-friendly events
```

### Example 3: Comedy OR Nightlife Tonight
```
WHEN: Today
WHAT: Comedy 😂 + Nightlife 🌙 (both blue)
→ Shows: Events that are EITHER comedy OR nightlife
```

## Accessibility

- All interactive elements keyboard navigable (Tab/Enter)
- Screen reader labels for icons
- ARIA labels for dropdowns
- Clear focus indicators (blue outline)
- Sufficient color contrast ratios
- Touch targets ≥44px for mobile

## Animation

- Dropdown: Fade in + slide down (200ms)
- Pills: Scale 0.95 on press
- Selection: Background color transition (150ms)
- More filters: Expand/collapse with slide (300ms)
