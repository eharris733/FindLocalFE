# Analytics Quick Reference

## 🚀 Quick Start

1. **Run Migration:**
   ```sql
   -- In Supabase SQL Editor
   \i database/migration_add_comprehensive_analytics.sql
   ```

2. **Analytics Auto-Initializes** on app start in `_layout.tsx`

3. **Start Using:**
   ```typescript
   import { analytics } from '../utils/analytics';
   
   // Track anything!
   analytics.trackPageView('/events', { city: 'Seattle' });
   ```

## 📊 Common Tracking Patterns

### Track Page View
```typescript
analytics.trackPageView('/path', { city, customProp: 'value' });
```

### Track Event Interaction
```typescript
// Click
analytics.trackEventMetric({
  eventId: event.id,
  metricType: 'click',
  city: event.city,
  source: 'gallery',
});

// Favorite
analytics.trackEventMetric({
  eventId: event.id,
  metricType: 'favorite',
  city: event.city,
});
```

### Track Venue Interaction
```typescript
analytics.trackVenueMetric({
  venueId: venue.id,
  metricType: 'modal_open',
  city: venue.city,
  source: 'event_modal',
});
```

### Track Modal with Duration
```typescript
import { useModalTimeTracking } from '../hooks/useTimeTracking';

const { getDuration } = useModalTimeTracking();

// On close:
const duration = getDuration();
analytics.trackEventMetric({
  eventId: event.id,
  metricType: 'modal_close',
  durationMs: duration,
});
```

### Track Filter Usage
```typescript
analytics.trackFilterUsage({
  filterType: 'category',
  filterValue: 'Music',
  applied: true,
  resultsCount: 42,
  city: 'Seattle',
});
```

### Track Search
```typescript
analytics.trackSearch('jazz concert', resultsCount, 'Seattle');
```

### Track Communities
```typescript
analytics.trackCommunitySelection(['Capitol Hill', 'Fremont'], 'Seattle');
```

### Track City Change
```typescript
analytics.trackCityChange('Portland', 'Seattle');
```

### Track View Mode
```typescript
analytics.trackViewModeChange('map', 'Seattle');
```

## 🔍 Common Queries

### Most Popular Events (Last 7 Days)
```sql
SELECT * FROM popular_events_7d 
WHERE city = 'Seattle' 
ORDER BY clicks DESC 
LIMIT 10;
```

### Most Popular Venues
```sql
SELECT * FROM popular_venues_7d 
WHERE city = 'Seattle' 
ORDER BY modal_opens DESC;
```

### Daily Engagement
```sql
SELECT * FROM daily_engagement 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Session Stats by Platform
```sql
SELECT * FROM session_summary 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, platform;
```

### Most Used Filters
```sql
SELECT * FROM popular_filters 
WHERE city = 'Seattle'
ORDER BY times_used DESC
LIMIT 20;
```

### Popular Communities
```sql
SELECT * FROM popular_communities
WHERE city = 'Seattle'
ORDER BY selection_count DESC;
```

### Active Sessions
```sql
SELECT 
  session_id,
  user_id,
  start_time,
  page_views,
  events_viewed,
  duration_ms / 1000 as duration_seconds
FROM session_metrics
WHERE end_time IS NULL
ORDER BY start_time DESC;
```

### User Journey
```sql
SELECT 
  session_id,
  event_type,
  timestamp,
  page_path,
  city,
  metadata
FROM user_analytics
WHERE session_id = 'session-id-here'
ORDER BY timestamp;
```

## 🎯 Metrics Tracked

| Category | Metrics |
|----------|---------|
| **Events** | views, clicks, favorites, modal duration, source |
| **Venues** | views, clicks, website clicks, modal duration |
| **Sessions** | duration, page views, events viewed, platform |
| **Filters** | categories, regions, price, time, search |
| **User** | page views, city changes, communities |

## 🗃️ Database Tables

| Table | Purpose |
|-------|---------|
| `event_metrics` | Event interactions |
| `venue_metrics` | Venue interactions |
| `user_analytics` | General user behavior |
| `session_metrics` | Session aggregates |
| `filter_usage` | Filter applications |

## 📈 Pre-built Views

| View | Shows |
|------|-------|
| `popular_events_7d` | Top events by clicks |
| `popular_venues_7d` | Top venues by views |
| `daily_engagement` | Daily activity metrics |
| `session_summary` | Session stats by platform |
| `popular_filters` | Most used filters |
| `popular_communities` | Top selected regions |

## 🔒 Privacy

```typescript
// Disable analytics for user
analytics.updateConsent(false);

// Check opt-in status (automatic on init)
SELECT analytics_opt_in FROM profiles WHERE id = 'user-id';
```

## 🐛 Debugging

```typescript
// Check queue size
console.log(analytics['eventQueue'].length);

// View recent events
SELECT * FROM user_analytics 
ORDER BY timestamp DESC 
LIMIT 20;

// Check session
SELECT * FROM session_metrics 
ORDER BY start_time DESC 
LIMIT 1;
```

## 📱 Platform-Specific

Analytics works identically across:
- ✅ Web
- ✅ iOS
- ✅ Android

Platform is automatically detected and stored in `session_metrics.platform`.

## ⚡ Performance

- Batched writes (every 5s or 50 events)
- Comprehensive indexes
- Non-blocking (won't break app)
- Failed events re-queued

## 📚 Full Documentation

See `ANALYTICS_IMPLEMENTATION_GUIDE.md` for complete details.

---

**Quick Tip**: Use the pre-built SQL views for instant insights! They're optimized and ready to use.
