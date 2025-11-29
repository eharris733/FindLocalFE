-- FindLocal Analytics Queries
-- Custom SQL queries for analyzing user behavior, event performance, and site metrics

-- ============================================================================
-- USER ENGAGEMENT & RETENTION
-- ============================================================================

-- Daily Active Users (DAU)
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT session_id) as daily_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as daily_active_users,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NULL) as anonymous_users
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Weekly Active Users (WAU)
SELECT 
  DATE_TRUNC('week', timestamp) as week,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as weekly_active_users,
  COUNT(DISTINCT session_id) as total_sessions
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC;

-- Monthly Active Users (MAU)
SELECT 
  DATE_TRUNC('month', timestamp) as month,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as monthly_active_users,
  COUNT(DISTINCT session_id) as total_sessions,
  ROUND(AVG(
    CASE 
      WHEN event_type = 'page_view' THEN 1 
      ELSE 0 
    END
  ) * 100, 2) as page_view_percentage
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC;

-- User Retention by Cohort (First visit week)
WITH first_visit AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', MIN(timestamp)) as cohort_week
  FROM user_analytics
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
user_activity AS (
  SELECT 
    ua.user_id,
    fv.cohort_week,
    DATE_TRUNC('week', ua.timestamp) as activity_week,
    EXTRACT(WEEK FROM ua.timestamp) - EXTRACT(WEEK FROM fv.cohort_week) as weeks_since_first
  FROM user_analytics ua
  JOIN first_visit fv ON ua.user_id = fv.user_id
  WHERE ua.user_id IS NOT NULL
)
SELECT 
  cohort_week,
  COUNT(DISTINCT user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN weeks_since_first = 0 THEN user_id END) as week_0,
  COUNT(DISTINCT CASE WHEN weeks_since_first = 1 THEN user_id END) as week_1,
  COUNT(DISTINCT CASE WHEN weeks_since_first = 2 THEN user_id END) as week_2,
  COUNT(DISTINCT CASE WHEN weeks_since_first = 4 THEN user_id END) as week_4,
  ROUND(COUNT(DISTINCT CASE WHEN weeks_since_first = 1 THEN user_id END)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN weeks_since_first = 0 THEN user_id END), 0) * 100, 1) as week_1_retention
FROM user_activity
GROUP BY cohort_week
ORDER BY cohort_week DESC
LIMIT 12;

-- ============================================================================
-- SESSION ANALYTICS
-- ============================================================================

-- Average Session Duration by Platform
SELECT 
  platform,
  COUNT(*) as total_sessions,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_duration_seconds,
  ROUND(AVG(page_views), 2) as avg_page_views,
  ROUND(AVG(events_viewed), 2) as avg_events_viewed,
  ROUND(AVG(venues_viewed), 2) as avg_venues_viewed,
  ROUND(AVG(favorites_added), 2) as avg_favorites_added,
  ROUND(AVG(filters_changed), 2) as avg_filters_changed
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
  AND duration_ms IS NOT NULL
GROUP BY platform
ORDER BY total_sessions DESC;

-- Session Depth Analysis (How engaged are users?)
SELECT 
  CASE 
    WHEN page_views = 1 THEN '1 page (bounce)'
    WHEN page_views BETWEEN 2 AND 3 THEN '2-3 pages'
    WHEN page_views BETWEEN 4 AND 7 THEN '4-7 pages'
    WHEN page_views BETWEEN 8 AND 15 THEN '8-15 pages'
    ELSE '15+ pages (power user)'
  END as engagement_level,
  COUNT(*) as session_count,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_duration_seconds,
  ROUND(AVG(events_viewed), 2) as avg_events_viewed,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
  AND duration_ms IS NOT NULL
GROUP BY engagement_level
ORDER BY MIN(page_views);

-- Time of Day Usage Pattern
SELECT 
  EXTRACT(HOUR FROM start_time) as hour_of_day,
  COUNT(*) as sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_duration_seconds
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM start_time)
ORDER BY hour_of_day;

-- Day of Week Usage Pattern
SELECT 
  TO_CHAR(start_time, 'Day') as day_of_week,
  EXTRACT(DOW FROM start_time) as day_number,
  COUNT(*) as sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_duration_seconds,
  ROUND(AVG(events_viewed), 2) as avg_events_viewed
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY TO_CHAR(start_time, 'Day'), EXTRACT(DOW FROM start_time)
ORDER BY day_number;

-- ============================================================================
-- EVENT PERFORMANCE
-- ============================================================================

-- Top Events by Clicks (Last 7 Days)
SELECT 
  em.event_id,
  em.city,
  COUNT(*) FILTER (WHERE em.metric_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE em.metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE em.metric_type = 'modal_open') as modal_opens,
  COUNT(*) FILTER (WHERE em.metric_type = 'favorite') as favorites,
  COUNT(DISTINCT em.user_id) as unique_users,
  ROUND(AVG(em.duration_ms) FILTER (WHERE em.duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_sec,
  ROUND(COUNT(*) FILTER (WHERE em.metric_type = 'click')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE em.metric_type = 'view'), 0) * 100, 2) as click_through_rate
FROM event_metrics em
WHERE em.timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY em.event_id, em.city
HAVING COUNT(*) FILTER (WHERE em.metric_type = 'click') > 0
ORDER BY clicks DESC
LIMIT 50;

-- Event Engagement by Source (List vs Gallery vs Map)
SELECT 
  source,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_duration_seconds,
  ROUND(COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 2) as ctr_percentage
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND source IS NOT NULL
GROUP BY source
ORDER BY clicks DESC;

-- Events with Highest Favorite Rate
SELECT 
  event_id,
  city,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites,
  COUNT(*) FILTER (WHERE metric_type = 'unfavorite') as unfavorites,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') - 
    COUNT(*) FILTER (WHERE metric_type = 'unfavorite') as net_favorites,
  ROUND(COUNT(*) FILTER (WHERE metric_type = 'favorite')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 2) as favorite_rate
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY event_id, city
HAVING COUNT(*) FILTER (WHERE metric_type = 'view') >= 10
ORDER BY favorite_rate DESC
LIMIT 50;

-- Event Performance by City
SELECT 
  city,
  COUNT(DISTINCT event_id) as unique_events,
  COUNT(*) FILTER (WHERE metric_type = 'click') as total_clicks,
  COUNT(*) FILTER (WHERE metric_type = 'view') as total_views,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as total_favorites,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY city
ORDER BY total_clicks DESC;

-- ============================================================================
-- VENUE PERFORMANCE
-- ============================================================================

-- Top Venues by Engagement
SELECT 
  vm.venue_id,
  vm.city,
  COUNT(*) FILTER (WHERE vm.metric_type = 'modal_open') as modal_opens,
  COUNT(*) FILTER (WHERE vm.metric_type = 'website_click') as website_clicks,
  COUNT(*) FILTER (WHERE vm.metric_type = 'directions_click') as directions_clicks,
  COUNT(DISTINCT vm.user_id) as unique_users,
  ROUND(AVG(vm.duration_ms) FILTER (WHERE vm.duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_sec,
  ROUND(COUNT(*) FILTER (WHERE vm.metric_type = 'website_click')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE vm.metric_type = 'modal_open'), 0) * 100, 2) as website_click_rate
FROM venue_metrics vm
WHERE vm.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY vm.venue_id, vm.city
HAVING COUNT(*) FILTER (WHERE vm.metric_type = 'modal_open') > 0
ORDER BY modal_opens DESC
LIMIT 50;

-- Venue Engagement by Source
SELECT 
  source,
  COUNT(*) FILTER (WHERE metric_type = 'modal_open') as opens,
  COUNT(*) FILTER (WHERE metric_type = 'website_click') as website_clicks,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_duration_seconds
FROM venue_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND source IS NOT NULL
GROUP BY source
ORDER BY opens DESC;

-- ============================================================================
-- SEARCH & DISCOVERY
-- ============================================================================

-- Most Common Search Queries
SELECT 
  search_query,
  COUNT(*) as search_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(results_count), 1) as avg_results,
  COUNT(*) FILTER (WHERE results_count = 0) as zero_results_count,
  ROUND(COUNT(*) FILTER (WHERE results_count = 0)::numeric / COUNT(*) * 100, 2) as zero_results_rate
FROM user_analytics
WHERE event_type = 'search'
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND search_query IS NOT NULL
GROUP BY search_query
ORDER BY search_count DESC
LIMIT 100;

-- Search Queries with No Results (Need attention!)
SELECT 
  search_query,
  city,
  COUNT(*) as occurrences,
  COUNT(DISTINCT session_id) as unique_sessions
FROM user_analytics
WHERE event_type = 'search'
  AND results_count = 0
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY search_query, city
ORDER BY occurrences DESC
LIMIT 50;

-- ============================================================================
-- FILTER USAGE ANALYSIS
-- ============================================================================

-- Most Popular Filters Overall
SELECT 
  filter_type,
  filter_value,
  city,
  COUNT(*) as times_applied,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(results_count), 1) as avg_results,
  COUNT(*) FILTER (WHERE results_count = 0) as zero_results_count
FROM filter_usage
WHERE applied = TRUE
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY filter_type, filter_value, city
ORDER BY times_applied DESC
LIMIT 100;

-- Filter Type Popularity
SELECT 
  filter_type,
  COUNT(*) as total_applications,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT filter_value) as unique_values,
  ROUND(AVG(results_count), 1) as avg_results
FROM filter_usage
WHERE applied = TRUE
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY filter_type
ORDER BY total_applications DESC;

-- Filter Combinations (What filters are used together?)
WITH filter_sessions AS (
  SELECT 
    session_id,
    ARRAY_AGG(DISTINCT filter_type ORDER BY filter_type) as filter_combo,
    COUNT(DISTINCT filter_type) as num_filters
  FROM filter_usage
  WHERE applied = TRUE
    AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY session_id
)
SELECT 
  filter_combo,
  num_filters,
  COUNT(*) as sessions,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM filter_sessions
WHERE num_filters > 1
GROUP BY filter_combo, num_filters
ORDER BY sessions DESC
LIMIT 50;

-- Filters that Lead to Zero Results (Need better data or UX?)
SELECT 
  filter_type,
  filter_value,
  city,
  COUNT(*) as zero_result_count,
  COUNT(DISTINCT session_id) as affected_sessions
FROM filter_usage
WHERE applied = TRUE
  AND results_count = 0
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY filter_type, filter_value, city
HAVING COUNT(*) >= 5
ORDER BY zero_result_count DESC
LIMIT 50;

-- ============================================================================
-- GEOGRAPHIC ANALYSIS
-- ============================================================================

-- City Popularity & Engagement
SELECT 
  city,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE event_type = 'search') as searches,
  COUNT(*) FILTER (WHERE event_type = 'filter_change') as filter_changes
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY city
ORDER BY total_sessions DESC;

-- Community/Region Popularity by City
SELECT 
  city,
  UNNEST(communities_selected) as community,
  COUNT(*) as selections,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
FROM user_analytics
WHERE communities_selected IS NOT NULL
  AND ARRAY_LENGTH(communities_selected, 1) > 0
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY city, community
ORDER BY city, selections DESC;

-- City Switching Behavior
WITH city_changes AS (
  SELECT 
    session_id,
    ARRAY_AGG(city ORDER BY timestamp) as cities_visited,
    COUNT(DISTINCT city) as num_cities
  FROM user_analytics
  WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
    AND city IS NOT NULL
  GROUP BY session_id
)
SELECT 
  num_cities,
  COUNT(*) as sessions,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM city_changes
GROUP BY num_cities
ORDER BY num_cities;

-- ============================================================================
-- USER BEHAVIOR FUNNELS
-- ============================================================================

-- Homepage to Event Click Funnel
WITH funnel_steps AS (
  SELECT 
    session_id,
    MAX(CASE WHEN event_type = 'page_view' AND page_path = '/' THEN 1 ELSE 0 END) as viewed_homepage,
    MAX(CASE WHEN event_type = 'filter_change' THEN 1 ELSE 0 END) as applied_filter,
    MAX(CASE WHEN event_type = 'search' THEN 1 ELSE 0 END) as used_search
  FROM user_analytics
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY session_id
),
event_clicks AS (
  SELECT DISTINCT session_id
  FROM event_metrics
  WHERE metric_type = 'click'
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
  COUNT(*) as total_sessions,
  SUM(viewed_homepage) as viewed_homepage,
  SUM(applied_filter) as applied_filter,
  SUM(used_search) as used_search,
  COUNT(ec.session_id) as clicked_event,
  ROUND(SUM(applied_filter)::numeric / NULLIF(SUM(viewed_homepage), 0) * 100, 2) as homepage_to_filter_rate,
  ROUND(COUNT(ec.session_id)::numeric / NULLIF(SUM(viewed_homepage), 0) * 100, 2) as homepage_to_click_rate
FROM funnel_steps fs
LEFT JOIN event_clicks ec ON fs.session_id = ec.session_id;

-- Search to Event Click Conversion
SELECT 
  COUNT(DISTINCT ua.session_id) as sessions_with_search,
  COUNT(DISTINCT em.session_id) as sessions_with_click_after_search,
  ROUND(COUNT(DISTINCT em.session_id)::numeric / 
        NULLIF(COUNT(DISTINCT ua.session_id), 0) * 100, 2) as conversion_rate,
  ROUND(AVG(ua.results_count), 1) as avg_search_results
FROM user_analytics ua
LEFT JOIN event_metrics em ON ua.session_id = em.session_id 
  AND em.metric_type = 'click'
  AND em.timestamp > ua.timestamp
WHERE ua.event_type = 'search'
  AND ua.timestamp >= CURRENT_DATE - INTERVAL '30 days';

-- View Mode Preferences and Impact
SELECT 
  view_mode,
  COUNT(DISTINCT session_id) as sessions_using_mode,
  COUNT(*) as mode_changes,
  ROUND(AVG(results_count), 1) as avg_results_when_switched
FROM user_analytics
WHERE event_type = 'view_mode_change'
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND view_mode IS NOT NULL
GROUP BY view_mode
ORDER BY sessions_using_mode DESC;

-- ============================================================================
-- CONVERSION & ENGAGEMENT METRICS
-- ============================================================================

-- Event View to Click Conversion Rate
SELECT 
  city,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites,
  ROUND(COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 2) as view_to_click_rate,
  ROUND(COUNT(*) FILTER (WHERE metric_type = 'favorite')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE metric_type = 'click'), 0) * 100, 2) as click_to_favorite_rate
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY city
ORDER BY clicks DESC;

-- Power Users (Most Active)
SELECT 
  user_id,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(DISTINCT city) as cities_visited,
  MAX(timestamp) as last_active
FROM user_analytics
WHERE user_id IS NOT NULL
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
ORDER BY sessions DESC
LIMIT 100;

-- Favorite Activity Over Time
SELECT 
  DATE(timestamp) as date,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites_added,
  COUNT(*) FILTER (WHERE metric_type = 'unfavorite') as favorites_removed,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') - 
    COUNT(*) FILTER (WHERE metric_type = 'unfavorite') as net_favorites,
  COUNT(DISTINCT user_id) as active_users
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND metric_type IN ('favorite', 'unfavorite')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- ============================================================================
-- PERFORMANCE & QUALITY METRICS
-- ============================================================================

-- Average Time Spent on Different Content
SELECT 
  'Events' as content_type,
  COUNT(*) as interactions,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) / 1000.0, 2) as median_seconds
FROM event_metrics
WHERE duration_ms IS NOT NULL
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  'Venues' as content_type,
  COUNT(*) as interactions,
  ROUND(AVG(duration_ms) / 1000.0, 2) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) / 1000.0, 2) as median_seconds
FROM venue_metrics
WHERE duration_ms IS NOT NULL
  AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY content_type;

-- Session Quality Score (Composite metric)
SELECT 
  session_id,
  platform,
  ROUND(duration_ms / 1000.0, 2) as duration_seconds,
  page_views,
  events_viewed,
  venues_viewed,
  favorites_added,
  filters_changed,
  -- Quality score: weighted sum of engagement metrics
  (
    LEAST(page_views * 10, 100) +  -- Max 100 points
    LEAST(events_viewed * 15, 150) +  -- Max 150 points
    LEAST(venues_viewed * 10, 50) +  -- Max 50 points
    LEAST(favorites_added * 30, 150) +  -- Max 150 points
    LEAST(filters_changed * 5, 50) +  -- Max 50 points
    LEAST(duration_ms / 1000 / 60 * 10, 100)  -- Max 100 points (10min = 100pts)
  ) as quality_score,
  CASE 
    WHEN (
      LEAST(page_views * 10, 100) +
      LEAST(events_viewed * 15, 150) +
      LEAST(venues_viewed * 10, 50) +
      LEAST(favorites_added * 30, 150) +
      LEAST(filters_changed * 5, 50) +
      LEAST(duration_ms / 1000 / 60 * 10, 100)
    ) >= 300 THEN 'Excellent'
    WHEN (
      LEAST(page_views * 10, 100) +
      LEAST(events_viewed * 15, 150) +
      LEAST(venues_viewed * 10, 50) +
      LEAST(favorites_added * 30, 150) +
      LEAST(filters_changed * 5, 50) +
      LEAST(duration_ms / 1000 / 60 * 10, 100)
    ) >= 150 THEN 'Good'
    WHEN (
      LEAST(page_views * 10, 100) +
      LEAST(events_viewed * 15, 150) +
      LEAST(venues_viewed * 10, 50) +
      LEAST(favorites_added * 30, 150) +
      LEAST(filters_changed * 5, 50) +
      LEAST(duration_ms / 1000 / 60 * 10, 100)
    ) >= 50 THEN 'Fair'
    ELSE 'Poor'
  END as quality_tier
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
  AND duration_ms IS NOT NULL
ORDER BY quality_score DESC
LIMIT 1000;

-- ============================================================================
-- ANOMALY DETECTION & ALERTS
-- ============================================================================

-- Sudden Drops in Activity (Daily comparison)
WITH daily_stats AS (
  SELECT 
    DATE(timestamp) as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_events
  FROM user_analytics
  WHERE timestamp >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY DATE(timestamp)
),
with_comparison AS (
  SELECT 
    date,
    sessions,
    total_events,
    LAG(sessions) OVER (ORDER BY date) as prev_sessions,
    LAG(total_events) OVER (ORDER BY date) as prev_total_events
  FROM daily_stats
)
SELECT 
  date,
  sessions,
  prev_sessions,
  ROUND((sessions - prev_sessions)::numeric / NULLIF(prev_sessions, 0) * 100, 2) as session_change_pct,
  CASE 
    WHEN sessions < prev_sessions * 0.5 THEN '⚠️ ALERT: 50%+ drop'
    WHEN sessions < prev_sessions * 0.7 THEN '⚠️ Warning: 30%+ drop'
    ELSE '✓ Normal'
  END as status
FROM with_comparison
WHERE prev_sessions IS NOT NULL
ORDER BY date DESC;

-- Events with Unusually High Bounce Rate (viewed but not clicked)
SELECT 
  event_id,
  city,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  ROUND(COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 2) as ctr
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_id, city
HAVING COUNT(*) FILTER (WHERE metric_type = 'view') >= 20
  AND COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
      NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) < 0.1
ORDER BY views DESC;
