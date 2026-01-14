# Frontend Developer Guide: Community Taxonomy System

**Last Updated:** November 28, 2025  
**For:** Frontend developers building FindLocal UI  
**Purpose:** Understanding the new community-based event classification system

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Core Concepts](#core-concepts)
4. [API Endpoints](#api-endpoints)
5. [Data Structures](#data-structures)
6. [UI Implementation Guide](#ui-implementation-guide)
7. [Common Use Cases](#common-use-cases)
8. [Migration Notes](#migration-notes)

---

## Overview

FindLocal has migrated from a flat event type system to a **hierarchical community taxonomy** that organizes events and venues into communities with specific labels.

### What Changed?

**OLD SYSTEM (Deprecated):**
```json
{
  "event_type": ["Music", "Comedy", "Nightlife"],
  "music_genre": "Jazz",
  "price_category": "Paid"
}
```

**NEW SYSTEM:**
```json
{
  "community_assignments": [
    {
      "community": "Music",
      "labels": ["Jazz", "Live Music"],
      "confidence": 0.95,
      "assigned_by": "ai"
    },
    {
      "community": "Comedy",
      "labels": ["Stand-up", "Comedy Show"],
      "confidence": 0.90,
      "assigned_by": "ai"
    }
  ]
}
```

### Why This Matters for Frontend

- **Better filtering:** Users can browse by community AND specific labels
- **Richer metadata:** Icons, colors, confidence scores for each classification
- **Venue-level communities:** Venues have primary communities (high/medium/low priority)
- **Event-level assignments:** Events can belong to multiple communities with specific labels

---

## Database Schema

### Key Tables

#### 1. `communities` - Top-level community definitions

```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- "Music", "Dance", "Comedy", etc.
  parent_id UUID,                      -- For future hierarchical nesting
  level INTEGER DEFAULT 1,             -- Hierarchy level
  description TEXT,
  metadata JSONB,                      -- {icon, color, display_order}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Communities:**
| Name | Icon | Color | Display Order |
|------|------|-------|---------------|
| Music | 🎵 | #FF5733 | 1 |
| Dance | 💃 | #33C3FF | 2 |
| Comedy | 😂 | #FFC233 | 3 |
| Theater | 🎭 | #9B59B6 | 4 |
| Culture | 🎨 | #2ECC71 | 5 |

#### 2. `community_labels` - Specific labels within communities

```sql
CREATE TABLE community_labels (
  id UUID PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  city TEXT NOT NULL,                  -- Labels are city-specific
  label TEXT NOT NULL,                 -- "Jazz", "Stand-up", "Salsa", etc.
  enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, city, label)
);
```

**Example Labels:**
- **Music (New York):** Jazz, Rock, Electronic, Hip Hop, Pop, Classical, Folk, Blues, etc.
- **Comedy (New York):** Stand-up, Open Mic, Improv, Sketch, Comedy Show, Variety
- **Dance (New York):** Salsa, EDM, Clubbing, Ballroom, Hip Hop Dance, Contemporary
- **Culture (New York):** Art Exhibition, Museum, Book Reading, Lecture, Film Screening, etc.

#### 3. `venue_community_assignments` - Venue → Community mapping

```sql
CREATE TABLE venue_community_assignments (
  id UUID PRIMARY KEY,
  venue_id UUID REFERENCES venues(id),
  community_id UUID REFERENCES communities(id),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  assigned_by TEXT DEFAULT 'manual',   -- 'manual', 'ai', 'venue'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, community_id)
);
```

**Priority Levels:**
- **high**: Primary focus of venue (e.g., jazz club → Music)
- **medium**: Regular but secondary (e.g., bar with weekly comedy → Comedy)
- **low**: Occasional events (e.g., bookstore with rare readings → Culture)

#### 4. `event_community_assignments` - Event → Community mapping

```sql
CREATE TABLE event_community_assignments (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events_gold(id),
  community_id UUID REFERENCES communities(id),
  labels TEXT[],                       -- Array of specific labels
  confidence REAL DEFAULT 0.5,         -- AI confidence (0.0-1.0)
  assigned_by TEXT DEFAULT 'ai',       -- 'ai', 'manual', 'venue'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, community_id)
);
```

---

## Core Concepts

### 1. Communities vs Labels

**Communities** are top-level categories (Music, Dance, Comedy, Theater, Culture).  
**Labels** are specific sub-types within a community.

```
Music (Community)
  ├── Jazz (Label)
  ├── Rock (Label)
  ├── Electronic (Label)
  └── Hip Hop (Label)

Comedy (Community)
  ├── Stand-up (Label)
  ├── Improv (Label)
  └── Open Mic (Label)
```

### 2. City-Specific Labels

Labels are **city-specific** because different cities have different event cultures:

```javascript
// New York has extensive music labels
{
  "New York": {
    "Music": ["Jazz", "Rock", "Electronic", "Hip Hop", "Pop", "Classical", 
               "Folk", "Blues", "Country", "Alternative", "Metal", "R&B", 
               "Latin", "Reggae", "World", "Open Mic", "Live Music", "DJ Set"]
  }
}

// Boston might have fewer
{
  "Boston": {
    "Music": ["Jazz", "Rock", "Electronic", "Folk", "Classical", 
               "Hip Hop", "Open Mic", "Live Music", "DJ Set"]
  }
}
```

### 3. Multi-Community Assignment

Events and venues can belong to **multiple communities**:

```javascript
// A jazz club with comedy nights
{
  "venue_communities": [
    { "community": "Music", "priority": "high" },    // Primary focus
    { "community": "Comedy", "priority": "medium" }  // Weekly event
  ]
}

// A cultural event with music performance
{
  "event_communities": [
    { "community": "Culture", "labels": ["Art Exhibition", "Performance"] },
    { "community": "Music", "labels": ["Live Music", "Classical"] }
  ]
}
```

### 4. Assignment Sources

Track **who/what** assigned the classification:

- **`ai`**: Classified by Gemini AI (most common)
- **`venue`**: Inherited from venue's primary community
- **`manual`**: Hand-curated by admin

---

## API Endpoints

### Metadata Endpoints

#### Get All Communities
```http
GET /api/metadata/communities
```

**Response:**
```json
[
  {
    "id": "463d7fa4-c4e7-4bca-8fad-fcc7b6e06035",
    "name": "Music",
    "description": "Live music performances, concerts, DJ sets...",
    "metadata": {
      "icon": "🎵",
      "color": "#FF5733",
      "display_order": 1
    }
  },
  // ... more communities
]
```

#### Get Labels for a Community in a City
```http
GET /api/metadata/communities/{community_id}/labels?city=New%20York
```

**Response:**
```json
[
  {
    "id": "...",
    "label": "Jazz",
    "enabled": true,
    "display_order": 1
  },
  {
    "id": "...",
    "label": "Rock",
    "enabled": true,
    "display_order": 2
  }
  // ... more labels
]
```

#### Get All Labels for a City (Grouped by Community)
```http
GET /api/metadata/labels?city=New%20York
```

**Response:**
```json
{
  "Music": [
    {"id": "...", "label": "Jazz", "enabled": true},
    {"id": "...", "label": "Rock", "enabled": true}
  ],
  "Comedy": [
    {"id": "...", "label": "Stand-up", "enabled": true},
    {"id": "...", "label": "Improv", "enabled": true}
  ]
}
```

### Venue Endpoints

#### Get Venue with Communities
```http
GET /api/venues/{venue_id}?city=New%20York
```

**Response:**
```json
{
  "id": "...",
  "name": "Brooklyn Steel",
  "city": "New York",
  "region": "Brooklyn",
  "communities": [
    {
      "community_id": "463d7fa4-c4e7-4bca-8fad-fcc7b6e06035",
      "community_name": "Music",
      "priority": "high",
      "assigned_by": "manual"
    }
  ]
}
```

#### Update Venue Communities
```http
PUT /api/venues/{venue_id}/communities?city=New%20York
Content-Type: application/json

{
  "assignments": [
    {
      "community_id": "463d7fa4-c4e7-4bca-8fad-fcc7b6e06035",
      "priority": "high"
    },
    {
      "community_id": "6bf6cde3-3599-4270-bc7b-08abb27c2a17",
      "priority": "medium"
    }
  ]
}
```

### Event Endpoints

#### Get Events with Community Filters
```http
GET /api/events?city=New%20York&community=Music&labels=Jazz,Rock&start_date=2025-12-01
```

**Query Parameters:**
- `city` (required): "New York" or "Boston"
- `community` (optional): Community name to filter by
- `labels` (optional): Comma-separated list of labels
- `start_date` / `end_date` (optional): Date range
- `venue_id` (optional): Filter by venue

**Response:**
```json
{
  "events": [
    {
      "id": "...",
      "title": "Jazz Night at Brooklyn Steel",
      "event_date": "2025-12-01T20:00:00Z",
      "venue_id": "...",
      "venue_name": "Brooklyn Steel",
      "city": "New York",
      "region": "Brooklyn",
      "communities": [
        {
          "community_id": "463d7fa4-...",
          "community_name": "Music",
          "labels": ["Jazz", "Live Music"],
          "confidence": 0.95,
          "assigned_by": "ai"
        }
      ]
    }
  ],
  "total": 145,
  "page": 1,
  "per_page": 20
}
```

#### Get Event Details with Communities
```http
GET /api/events/{event_id}?city=New%20York
```

**Response:**
```json
{
  "id": "...",
  "title": "Jazz Night",
  "description": "...",
  "event_date": "2025-12-01T20:00:00Z",
  "communities": [
    {
      "community_id": "463d7fa4-c4e7-4bca-8fad-fcc7b6e06035",
      "community_name": "Music",
      "icon": "🎵",
      "color": "#FF5733",
      "labels": ["Jazz", "Live Music"],
      "confidence": 0.95,
      "assigned_by": "ai"
    }
  ]
}
```

---

## Data Structures

### TypeScript Interfaces

```typescript
// Core entities
interface Community {
  id: string;                    // UUID
  name: string;                  // "Music", "Dance", etc.
  description: string;
  metadata: {
    icon: string;                // Emoji
    color: string;               // Hex color
    display_order: number;
  };
}

interface CommunityLabel {
  id: string;
  community_id: string;
  city: string;
  label: string;
  enabled: boolean;
  display_order: number;
}

// Assignments
interface VenueCommunityAssignment {
  id: string;
  venue_id: string;
  community_id: string;
  community_name?: string;       // Included in API responses
  priority: 'high' | 'medium' | 'low';
  assigned_by: 'manual' | 'ai' | 'venue';
  created_at: string;
  updated_at: string;
}

interface EventCommunityAssignment {
  id: string;
  event_id: string;
  community_id: string;
  community_name?: string;       // Included in API responses
  community_icon?: string;       // Included in API responses
  community_color?: string;      // Included in API responses
  labels: string[];              // Array of label strings
  confidence: number;            // 0.0 - 1.0
  assigned_by: 'ai' | 'manual' | 'venue';
  created_at: string;
  updated_at: string;
}

// Extended models with communities
interface VenueWithCommunities extends Venue {
  communities: VenueCommunityAssignment[];
}

interface EventWithCommunities extends Event {
  communities: EventCommunityAssignment[];
}
```

---

## UI Implementation Guide

### 1. Community Filter Sidebar

**Design Pattern:** Hierarchical filter with expandable communities

```jsx
function CommunityFilter({ city, selectedCommunities, onFilterChange }) {
  const [communities, setCommunities] = useState([]);
  const [labels, setLabels] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    // Fetch communities
    fetch('/api/metadata/communities')
      .then(r => r.json())
      .then(setCommunities);

    // Fetch labels for city
    fetch(`/api/metadata/labels?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(setLabels);
  }, [city]);

  return (
    <div className="community-filter">
      {communities.map(community => (
        <div key={community.id} className="community-group">
          {/* Community header with icon and color */}
          <div 
            className="community-header"
            style={{ borderLeft: `4px solid ${community.metadata.color}` }}
            onClick={() => toggleExpand(community.id)}
          >
            <span className="icon">{community.metadata.icon}</span>
            <span className="name">{community.name}</span>
            <span className="count">{getEventCount(community.id)}</span>
          </div>

          {/* Label checkboxes (shown when expanded) */}
          {expanded[community.id] && (
            <div className="labels">
              {labels[community.name]?.map(label => (
                <label key={label.id}>
                  <input
                    type="checkbox"
                    checked={isLabelSelected(community.id, label.label)}
                    onChange={(e) => onFilterChange(community.id, label.label, e.target.checked)}
                  />
                  {label.label}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 2. Event Card with Community Badges

```jsx
function EventCard({ event }) {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p>{event.venue_name}</p>
      <div className="communities">
        {event.communities?.map(assignment => (
          <div
            key={assignment.community_id}
            className="community-badge"
            style={{ backgroundColor: assignment.community_color }}
          >
            <span className="icon">{assignment.community_icon}</span>
            <span className="name">{assignment.community_name}</span>
            {/* Show primary label */}
            {assignment.labels?.[0] && (
              <span className="label">• {assignment.labels[0]}</span>
            )}
          </div>
        ))}
      </div>
      {/* Show AI confidence if relevant */}
      {showConfidence && event.communities?.[0]?.confidence && (
        <div className="confidence">
          AI Confidence: {(event.communities[0].confidence * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
```

### 3. Venue Profile with Community Info

```jsx
function VenueProfile({ venueId, city }) {
  const [venue, setVenue] = useState(null);

  useEffect(() => {
    fetch(`/api/venues/${venueId}?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(setVenue);
  }, [venueId, city]);

  if (!venue) return <Loading />;

  // Sort communities by priority
  const sortedCommunities = [...venue.communities].sort((a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="venue-profile">
      <h1>{venue.name}</h1>
      
      <div className="venue-communities">
        <h3>Communities</h3>
        {sortedCommunities.map(assignment => (
          <div key={assignment.community_id} className="community-item">
            <span className="priority-badge" data-priority={assignment.priority}>
              {assignment.priority}
            </span>
            <span className="community-name">{assignment.community_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Admin: Edit Event Communities

```jsx
function EditEventCommunities({ eventId, city }) {
  const [communities, setCommunities] = useState([]);
  const [labels, setLabels] = useState({});
  const [assignments, setAssignments] = useState([]);

  // Load current assignments
  useEffect(() => {
    fetch(`/api/events/${eventId}?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(event => setAssignments(event.communities || []));
  }, [eventId, city]);

  // Add a community assignment
  const addCommunity = (communityId, selectedLabels) => {
    const newAssignment = {
      community_id: communityId,
      labels: selectedLabels,
      assigned_by: 'manual',
      confidence: 1.0
    };

    fetch(`/api/events/${eventId}/communities?city=${encodeURIComponent(city)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments: [...assignments, newAssignment] })
    })
    .then(r => r.json())
    .then(() => {
      setAssignments([...assignments, newAssignment]);
    });
  };

  return (
    <div className="edit-communities">
      <h3>Assigned Communities</h3>
      {assignments.map(assignment => (
        <CommunityAssignmentEditor
          key={assignment.community_id}
          assignment={assignment}
          availableLabels={labels[assignment.community_name]}
          onUpdate={updateAssignment}
          onRemove={removeAssignment}
        />
      ))}

      <button onClick={showAddCommunityModal}>
        + Add Community
      </button>
    </div>
  );
}
```

---

## Common Use Cases

### 1. "Show me all jazz events in Brooklyn this weekend"

```typescript
const params = new URLSearchParams({
  city: 'New York',
  community: 'Music',
  labels: 'Jazz',
  region: 'Brooklyn',
  start_date: '2025-12-01',
  end_date: '2025-12-03'
});

fetch(`/api/events?${params}`)
  .then(r => r.json())
  .then(data => displayEvents(data.events));
```

### 2. "Show venues that are primarily comedy clubs"

```typescript
fetch(`/api/venues?city=New York&community=Comedy&priority=high`)
  .then(r => r.json())
  .then(venues => displayVenues(venues));
```

### 3. "Get event counts by community for a date range"

```typescript
fetch(`/api/analytics/community-counts?city=New York&start_date=2025-12-01&end_date=2025-12-31`)
  .then(r => r.json())
  .then(counts => {
    // { "Music": 450, "Comedy": 120, "Dance": 80, "Culture": 200 }
    renderChart(counts);
  });
```

### 4. "Browse all live music events (any genre)"

```typescript
// Just filter by Music community, don't specify labels
fetch(`/api/events?city=Boston&community=Music`)
  .then(r => r.json())
  .then(data => displayEvents(data.events));
```

---

## Migration Notes

### Deprecated Fields (Still Present for Backwards Compatibility)

The following fields exist in `events_gold` table but are **DEPRECATED**:

```typescript
// ❌ DEPRECATED - Do NOT use for new features
interface EventGold {
  event_type: string[];     // Old flat array: ["Music", "Nightlife"]
  music_genre: string;      // Old genre field: "Jazz"
  price_amount: number;     // Old price field
}

// ✅ USE INSTEAD
interface EventGold {
  communities: EventCommunityAssignment[];  // New relational data
}
```

### Migration Timeline

- **Before Nov 26, 2025:** Events used `event_type` field
- **Nov 26-28, 2025:** Migration to community taxonomy system
- **Nov 28, 2025:** Backfill script classifies all existing events
- **Future:** `event_type` column will be removed from database

### Handling Old Data

If you encounter events without community assignments:

```typescript
function getEventCommunities(event) {
  // New system (preferred)
  if (event.communities && event.communities.length > 0) {
    return event.communities;
  }

  // Fallback to old system (deprecated)
  if (event.event_type && event.event_type.length > 0) {
    console.warn('Event using deprecated event_type field:', event.id);
    return event.event_type.map(type => ({
      community_name: type,
      labels: event.music_genre ? [event.music_genre] : [],
      assigned_by: 'legacy'
    }));
  }

  return [];
}
```

---

## Best Practices

### 1. Always Pass City Parameter

Labels are city-specific, so always include the city:

```typescript
// ✅ GOOD
fetch(`/api/metadata/labels?city=New York`)

// ❌ BAD - Will fail or return wrong data
fetch(`/api/metadata/labels`)
```

### 2. Use Community Metadata for Styling

```css
/* Apply community colors dynamically */
.community-badge[data-community="Music"] {
  background-color: #FF5733;
}

.community-badge[data-community="Dance"] {
  background-color: #33C3FF;
}
```

### 3. Handle Multiple Communities Gracefully

Events can have 2-3 community assignments. Show all or prioritize by confidence:

```typescript
function getPrimaryCommunity(event) {
  if (!event.communities || event.communities.length === 0) {
    return null;
  }

  // Sort by confidence (highest first)
  const sorted = [...event.communities].sort((a, b) => 
    (b.confidence || 0) - (a.confidence || 0)
  );

  return sorted[0];
}
```

### 4. Cache Community/Label Metadata

Community and label data rarely changes. Cache it:

```typescript
// Cache for 1 hour
const CACHE_TTL = 3600000;
let communityCache = null;
let cacheTime = 0;

async function getCommunities() {
  const now = Date.now();
  if (communityCache && (now - cacheTime) < CACHE_TTL) {
    return communityCache;
  }

  const data = await fetch('/api/metadata/communities').then(r => r.json());
  communityCache = data;
  cacheTime = now;
  return data;
}
```

---

## Support & Questions

- **Database Schema:** See `COMMUNITY_TAXONOMY_DESIGN.md`
- **Backend API:** See `backend/README.md`
- **Classification Logic:** See `backend/app/services/event_classifier_service.py`
- **Constants:** See `src/constants.py` (community names, labels, etc.)

For questions about the taxonomy system, contact the backend team or open an issue on GitHub.
