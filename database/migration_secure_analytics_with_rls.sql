-- Secure Analytics with Proper RLS Policies
-- This keeps tables in public schema (accessible via API) but locks them down with RLS

-- Step 1: Move tables back to public schema if they're in analytics schema
ALTER TABLE IF EXISTS analytics.event_metrics SET SCHEMA public;
ALTER TABLE IF EXISTS analytics.venue_metrics SET SCHEMA public;
ALTER TABLE IF EXISTS analytics.user_analytics SET SCHEMA public;
ALTER TABLE IF EXISTS analytics.session_metrics SET SCHEMA public;
ALTER TABLE IF EXISTS analytics.filter_usage SET SCHEMA public;

-- Move views back to public schema
DROP VIEW IF EXISTS analytics.popular_events_7d;
DROP VIEW IF EXISTS analytics.popular_venues_7d;
DROP VIEW IF EXISTS analytics.daily_engagement;
DROP VIEW IF EXISTS analytics.session_summary;
DROP VIEW IF EXISTS analytics.popular_filters;
DROP VIEW IF EXISTS analytics.popular_communities;

-- Recreate views in public schema
CREATE OR REPLACE VIEW public.popular_events_7d AS
SELECT 
  event_id,
  COUNT(CASE WHEN metric_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN metric_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN metric_type = 'favorite' THEN 1 END) as favorites,
  COUNT(CASE WHEN metric_type = 'modal_open' THEN 1 END) as modal_opens,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_seconds,
  city
FROM event_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_id, city
ORDER BY clicks DESC;

CREATE OR REPLACE VIEW public.popular_venues_7d AS
SELECT 
  venue_id,
  COUNT(CASE WHEN metric_type = 'modal_open' THEN 1 END) as modal_opens,
  COUNT(CASE WHEN metric_type = 'website_click' THEN 1 END) as website_clicks,
  COUNT(CASE WHEN metric_type = 'directions_click' THEN 1 END) as directions_clicks,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_seconds,
  city
FROM venue_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY venue_id, city
ORDER BY modal_opens DESC;

CREATE OR REPLACE VIEW public.daily_engagement AS
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as logged_in_users,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE event_type = 'filter_change') as filter_changes,
  COUNT(*) FILTER (WHERE event_type = 'search') as searches,
  COUNT(*) FILTER (WHERE event_type = 'view_mode_change') as view_mode_changes,
  COUNT(*) FILTER (WHERE event_type = 'city_change') as city_changes
FROM user_analytics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW public.session_summary AS
SELECT 
  DATE(start_time) as date,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_session_duration_seconds,
  ROUND(AVG(page_views), 2) as avg_page_views,
  ROUND(AVG(events_viewed), 2) as avg_events_viewed,
  ROUND(AVG(venues_viewed), 2) as avg_venues_viewed,
  ROUND(AVG(favorites_added), 2) as avg_favorites_added,
  platform
FROM session_metrics
WHERE start_time > NOW() - INTERVAL '30 days'
GROUP BY DATE(start_time), platform
ORDER BY date DESC, platform;

CREATE OR REPLACE VIEW public.popular_filters AS
SELECT 
  filter_type,
  filter_value,
  city,
  COUNT(*) as times_used,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(results_count), 0) as avg_results_count
FROM filter_usage
WHERE applied = TRUE
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY filter_type, filter_value, city
ORDER BY times_used DESC;

CREATE OR REPLACE VIEW public.popular_communities AS
SELECT 
  city,
  UNNEST(communities_selected) as community,
  COUNT(*) as selection_count,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
FROM user_analytics
WHERE communities_selected IS NOT NULL 
  AND array_length(communities_selected, 1) > 0
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY city, community
ORDER BY selection_count DESC;

-- Drop analytics schema if it exists and is empty
DROP SCHEMA IF EXISTS analytics CASCADE;

-- Step 2: Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow service role full access to event_metrics" ON event_metrics;
DROP POLICY IF EXISTS "Allow service role full access to venue_metrics" ON venue_metrics;
DROP POLICY IF EXISTS "Allow service role full access to user_analytics" ON user_analytics;
DROP POLICY IF EXISTS "Allow service role full access to session_metrics" ON session_metrics;
DROP POLICY IF EXISTS "Allow service role full access to filter_usage" ON filter_usage;

-- Ensure RLS is enabled
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_usage ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow INSERT only (users can track their own analytics)
CREATE POLICY "Users can insert their own event metrics"
  ON event_metrics
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert their own venue metrics"
  ON venue_metrics
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert their own analytics"
  ON user_analytics
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert their own session metrics"
  ON session_metrics
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert their own filter usage"
  ON filter_usage
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Policy 2: Allow UPDATE only on own session (for session tracking)
CREATE POLICY "Users can update their own session metrics"
  ON session_metrics
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy 3: Allow SELECT only on own data (users can view their own analytics)
CREATE POLICY "Users can view their own event metrics"
  ON event_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own venue metrics"
  ON venue_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own analytics"
  ON user_analytics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own session metrics"
  ON session_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own filter usage"
  ON filter_usage
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 4: Block DELETE for regular users (only admins via service role)
-- No DELETE policies = users cannot delete analytics data

-- Comments for clarity
COMMENT ON TABLE event_metrics IS 'Analytics for event interactions. Users can INSERT and SELECT their own data only.';
COMMENT ON TABLE venue_metrics IS 'Analytics for venue interactions. Users can INSERT and SELECT their own data only.';
COMMENT ON TABLE user_analytics IS 'General user behavior analytics. Users can INSERT and SELECT their own data only.';
COMMENT ON TABLE session_metrics IS 'Session tracking metrics. Users can INSERT, UPDATE, and SELECT their own data only.';
COMMENT ON TABLE filter_usage IS 'Filter usage analytics. Users can INSERT and SELECT their own data only.';
