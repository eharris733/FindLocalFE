# FindLocal Analytics Implementation Guide

## Overview

This guide covers the comprehensive analytics system implemented for FindLocal, designed to track user behavior, event performance, venue engagement, and overall site usage across web, iOS, and Android platforms.

## Architecture

### Multi-Layered Analytics Approach

1. **Supabase Analytics** - Primary analytics storage using PostgreSQL tables
2. **Client-Side Service** - Centralized `analytics.ts` service for tracking
3. **Time Tracking** - Session duration and engagement metrics
4. **Component Integration** - Seamless tracking throughout the app

## Database Schema

### Tables Created

#### 1. `event_metrics`
Tracks all event-related interactions:
- **Metrics**: view, click, favorite, unfavorite, share, modal_open, modal_close
- **Includes**: duration, source (list/map/gallery), city, metadata
- **Indexes**: event_id, timestamp, metric_type, session_id, user_id

#### 2. `venue_metrics`
Tracks venue-specific interactions:
- **Metrics**: view, click, modal_open, modal_close, website_click, directions_click
- **Includes**: duration, source (map/event_modal/list), city, metadata
- **Indexes**: venue_id, timestamp, metric_type, session_id, user_id

#### 3. `user_analytics`
Tracks general user behavior:
- **Events**: page_view, filter_change, search, view_mode_change, city_change, community_select
- **Data**: page path, filters applied, communities selected, view mode, search query
- **Indexes**: user_id, session_id, timestamp, event_type, city

#### 4. `session_metrics`
Tracks session-level data:
- **Data**: start/end time, duration, page views, events viewed, venues viewed
- **Aggregates**: favorites added, filters changed, cities visited, communities selected
- **Includes**: platform (web/ios/android), device info
- **Indexes**: session_id, user_id, start_time, platform

#### 5. `filter_usage`
Tracks filter application:
- **Types**: time_range, category, region, price, search
- **Data**: filter value, applied/removed status, results count
- **Indexes**: session_id, filter_type, filter_value, timestamp

### Analytics Views

Pre-built SQL views for quick insights:

1. **`popular_events_7d`** - Most popular events in last 7 days
2. **`popular_venues_7d`** - Most visited venues in last 7 days
3. **`daily_engagement`** - Daily user engagement metrics
4. **`session_summary`** - Session statistics by platform
5. **`popular_filters`** - Most used filters by city
6. **`popular_communities`** - Most selected regions/communities

## Implementation

### 1. Analytics Service (`src/utils/analytics.ts`)

Central service handling all analytics:

```typescript
import { analytics } from '../utils/analytics';

// Initialize (automatically done in _layout.tsx)
await analytics.initialize();

// Track page view
analytics.trackPageView('/events', { city: 'Seattle' });

// Track event interaction
analytics.trackEventMetric({
  eventId: 'event-123',
  metricType: 'click',
  city: 'Seattle',
  source: 'gallery',
});

// Track venue interaction
analytics.trackVenueMetric({
  venueId: 'venue-456',
  metricType: 'modal_open',
  city: 'Seattle',
  source: 'event_modal',
});

// Track filter usage
analytics.trackFilterUsage({
  filterType: 'category',
  filterValue: 'Music',
  applied: true,
  resultsCount: 42,
});

// Track search
analytics.trackSearch('jazz concert', 15, 'Seattle');

// Track city change
analytics.trackCityChange('Portland', 'Seattle');

// Track community selection
analytics.trackCommunitySelection(['Capitol Hill', 'Fremont'], 'Seattle');

// Track view mode change
analytics.trackViewModeChange('map', 'Seattle');
```

### 2. Time Tracking (`src/hooks/useTimeTracking.ts`)

Hooks for measuring engagement duration:

```typescript
import { useModalTimeTracking } from '../hooks/useTimeTracking';

function MyModal() {
  const { getDuration } = useModalTimeTracking();
  
  const handleClose = () => {
    const duration = getDuration();
    analytics.trackEventMetric({
      eventId: event.id,
      metricType: 'modal_close',
      durationMs: duration,
    });
  };
}
```

### 3. Component Integration

Analytics are automatically tracked in:

- **EventCard**: Click, favorite/unfavorite actions
- **EventModal**: Modal open/close with duration tracking
- **VenueModal**: Modal interactions, website clicks
- **FilterBar**: Filter changes, search queries, view mode
- **Index Route**: Page views, city changes

### 4. Session Management

Sessions are automatically managed:
- Created on app start
- Updated with activity
- Ended after 30 minutes of inactivity
- Aggregates key metrics (page views, events viewed, etc.)

## Privacy & Consent

### Analytics Opt-In

Users can control analytics via their profile:

```typescript
// Update user consent
analytics.updateConsent(false); // Disable analytics

// Check consent (automatic on initialization)
// If user has analytics_opt_in = false, tracking is disabled
```

### Default Behavior
- Analytics enabled by default for new users
- Opt-out available in user settings
- Error tracking always enabled for debugging

## Metrics Tracked

### Event Metrics
- ✅ Event views (modal opens)
- ✅ Event clicks
- ✅ Favorites added/removed
- ✅ Time spent viewing event details
- ✅ Source of interaction (list/gallery/map)
- ✅ Event shares (when implemented)

### Venue Metrics
- ✅ Venue modal views
- ✅ Website clicks
- ✅ Directions clicks
- ✅ Time spent viewing venue details
- ✅ Source of interaction

### User Behavior
- ✅ Page views per session
- ✅ Cities visited
- ✅ Communities/regions selected
- ✅ View mode preferences
- ✅ Session duration
- ✅ Time on site

### Filter Usage
- ✅ Most used categories
- ✅ Most used regions/communities
- ✅ Price filter preferences
- ✅ Time range preferences
- ✅ Search queries and results
- ✅ Filter combinations

### Session Metrics
- ✅ Platform distribution (web/iOS/Android)
- ✅ Events viewed per session
- ✅ Venues viewed per session
- ✅ Favorites added per session
- ✅ Filter changes per session
- ✅ Average session duration

## Querying Analytics

### Example Queries

**Most popular events this week:**
```sql
SELECT * FROM popular_events_7d 
WHERE city = 'Seattle' 
ORDER BY clicks DESC 
LIMIT 10;
```

**Daily active users:**
```sql
SELECT * FROM daily_engagement 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

**Most used filters:**
```sql
SELECT * FROM popular_filters 
WHERE city = 'Seattle'
ORDER BY times_used DESC;
```

**Session statistics by platform:**
```sql
SELECT * FROM session_summary 
WHERE platform = 'web'
AND date >= CURRENT_DATE - INTERVAL '7 days';
```

**Community/region popularity:**
```sql
SELECT * FROM popular_communities
WHERE city = 'Seattle'
ORDER BY selection_count DESC;
```

## Dashboard Setup

### Supabase Dashboard

1. Navigate to Supabase SQL Editor
2. Run the migration: `database/migration_add_comprehensive_analytics.sql`
3. Create custom charts using the views above

### Custom Analytics Dashboard (Future)

Consider building a custom dashboard using:
- **Chart Library**: recharts or victory-native
- **Data Source**: Pre-built views
- **Refresh**: Real-time subscriptions or periodic polling
- **Metrics**: KPIs, trends, user segments

## Performance Considerations

### Batching
- Events are queued and flushed every 5 seconds
- Max queue size: 50 events
- Prevents excessive database writes

### Indexes
- All tables have proper indexes on frequently queried columns
- Composite indexes for common query patterns
- Time-based partitioning recommended for high volume

### Data Retention

Consider implementing data retention policies:

```sql
-- Delete analytics older than 90 days
DELETE FROM event_metrics 
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM user_analytics 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

Or use Supabase's automatic cleanup:

```sql
-- Create a cron job to clean old data
SELECT cron.schedule(
  'cleanup-old-analytics',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM event_metrics WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM venue_metrics WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM user_analytics WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM filter_usage WHERE timestamp < NOW() - INTERVAL '90 days';
  DELETE FROM session_metrics WHERE start_time < NOW() - INTERVAL '90 days';
  $$
);
```

## Debugging

### Enable Debug Logging

Analytics uses the existing logger:

```typescript
// In src/utils/logger.ts, ensure debug logging is enabled
logger.debug('Analytics tracked:', eventType, properties);
```

### View Queue Status

Check pending events in the queue:

```typescript
// Add to analytics service for debugging
console.log('Queue size:', analytics['eventQueue'].length);
```

### Verify Database Writes

```sql
-- Check recent analytics events
SELECT event_type, COUNT(*) 
FROM user_analytics 
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

## Error Handling

Analytics failures don't break the app:

- Failed writes are re-queued
- Errors are logged but don't throw
- Session continues even if tracking fails
- User experience is unaffected

## Future Enhancements

### Recommended Additions

1. **A/B Testing Framework**
   - Track experiment variants
   - Measure conversion rates
   - Statistical significance

2. **Funnel Analysis**
   - Homepage → Event View → External Link
   - Search → Filter → Event Click
   - Onboarding completion rates

3. **Cohort Analysis**
   - User retention by signup date
   - Feature adoption over time
   - Churn prediction

4. **Heatmaps** (Web only)
   - Click patterns
   - Scroll depth
   - Element interaction

5. **Performance Monitoring**
   - Page load times
   - API response times
   - Error rates

6. **Third-Party Integration**
   - PostHog for session recording
   - Mixpanel for advanced segmentation
   - Google Analytics for benchmarking

## Migration Instructions

### Step 1: Run Database Migration

```bash
# Connect to your Supabase instance
psql $DATABASE_URL

# Run the migration
\i database/migration_add_comprehensive_analytics.sql
```

### Step 2: Verify Tables

```sql
-- Check tables were created
\dt *metrics
\dt user_analytics
\dt filter_usage

-- Check views were created
\dv popular_*
\dv daily_engagement
\dv session_summary
```

### Step 3: Test Analytics

```typescript
// In your app, verify tracking works
analytics.trackPageView('/test');

// Check database
SELECT * FROM user_analytics ORDER BY timestamp DESC LIMIT 1;
```

### Step 4: Set Up RLS Policies (Optional)

If you want users to see their own analytics:

```sql
-- Allow users to read their own analytics
CREATE POLICY "Users can view own analytics" ON user_analytics
  FOR SELECT USING (auth.uid() = user_id);
```

## Troubleshooting

### Analytics Not Tracking

1. Check initialization:
   ```typescript
   // Verify analytics.initialize() was called in _layout.tsx
   ```

2. Check user consent:
   ```sql
   SELECT analytics_opt_in FROM profiles WHERE id = 'user-id';
   ```

3. Check session ID:
   ```typescript
   // Verify session was created
   SELECT * FROM session_metrics ORDER BY start_time DESC LIMIT 1;
   ```

### Slow Query Performance

1. Add indexes for your query patterns
2. Use materialized views for heavy aggregations
3. Consider time-based partitioning
4. Implement data archiving

### High Database Usage

1. Increase flush interval to 10+ seconds
2. Increase max queue size to 100+ events
3. Batch insert operations
4. Archive old data to separate table

## Support

For questions or issues:
1. Check this guide
2. Review `src/utils/analytics.ts` source code
3. Check Supabase logs for errors
4. Review database schema in migration file

---

**Last Updated**: November 25, 2025  
**Version**: 1.0.0
