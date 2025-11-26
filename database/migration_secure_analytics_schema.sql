-- Migration: Secure Analytics Schema
-- Move analytics tables from public to private analytics schema
-- This prevents direct API access while allowing backend writes

-- Create analytics schema (private, not exposed via API)
CREATE SCHEMA IF NOT EXISTS analytics;

-- Move tables to analytics schema
ALTER TABLE IF EXISTS public.event_metrics SET SCHEMA analytics;
ALTER TABLE IF EXISTS public.venue_metrics SET SCHEMA analytics;
ALTER TABLE IF EXISTS public.user_analytics SET SCHEMA analytics;
ALTER TABLE IF EXISTS public.session_metrics SET SCHEMA analytics;
ALTER TABLE IF EXISTS public.filter_usage SET SCHEMA analytics;

-- Drop the overly permissive RLS policies from public schema (if tables were moved)
-- These will be recreated in the analytics schema with proper restrictions

-- Disable RLS on analytics tables since they're in a private schema
-- The schema itself provides the security boundary
ALTER TABLE analytics.event_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.venue_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.user_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.session_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.filter_usage DISABLE ROW LEVEL SECURITY;

-- Grant service role access to analytics schema
GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO service_role;

-- Grant authenticated users NO direct access
-- They can only write through your backend (which uses service role)
REVOKE ALL ON SCHEMA analytics FROM authenticated;
REVOKE ALL ON SCHEMA analytics FROM anon;

-- Move views to analytics schema as well
DROP VIEW IF EXISTS public.popular_events_7d;
DROP VIEW IF EXISTS public.popular_venues_7d;
DROP VIEW IF EXISTS public.daily_engagement;
DROP VIEW IF EXISTS public.session_summary;
DROP VIEW IF EXISTS public.popular_filters;
DROP VIEW IF EXISTS public.popular_communities;

-- Recreate views in analytics schema
CREATE OR REPLACE VIEW analytics.popular_events_7d AS
SELECT 
  event_id,
  COUNT(CASE WHEN metric_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN metric_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN metric_type = 'favorite' THEN 1 END) as favorites,
  COUNT(CASE WHEN metric_type = 'modal_open' THEN 1 END) as modal_opens,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_seconds,
  city
FROM analytics.event_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_id, city
ORDER BY clicks DESC;

CREATE OR REPLACE VIEW analytics.popular_venues_7d AS
SELECT 
  venue_id,
  COUNT(CASE WHEN metric_type = 'modal_open' THEN 1 END) as modal_opens,
  COUNT(CASE WHEN metric_type = 'website_click' THEN 1 END) as website_clicks,
  COUNT(CASE WHEN metric_type = 'directions_click' THEN 1 END) as directions_clicks,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 2) as avg_view_duration_seconds,
  city
FROM analytics.venue_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY venue_id, city
ORDER BY modal_opens DESC;

CREATE OR REPLACE VIEW analytics.daily_engagement AS
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
FROM analytics.user_analytics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW analytics.session_summary AS
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
FROM analytics.session_metrics
WHERE start_time > NOW() - INTERVAL '30 days'
GROUP BY DATE(start_time), platform
ORDER BY date DESC, platform;

CREATE OR REPLACE VIEW analytics.popular_filters AS
SELECT 
  filter_type,
  filter_value,
  city,
  COUNT(*) as times_used,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(results_count), 0) as avg_results_count
FROM analytics.filter_usage
WHERE applied = TRUE
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY filter_type, filter_value, city
ORDER BY times_used DESC;

CREATE OR REPLACE VIEW analytics.popular_communities AS
SELECT 
  city,
  UNNEST(communities_selected) as community,
  COUNT(*) as selection_count,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
FROM analytics.user_analytics
WHERE communities_selected IS NOT NULL 
  AND array_length(communities_selected, 1) > 0
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY city, community
ORDER BY selection_count DESC;

-- Optional: Create public-facing aggregated views (if you want to expose some data)
-- These would be read-only, anonymized, aggregated data only
-- Example:
/*
CREATE OR REPLACE VIEW public.event_popularity AS
SELECT 
  event_id,
  city,
  COUNT(*) as interaction_count,
  DATE(timestamp) as date
FROM analytics.event_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_id, city, DATE(timestamp);

GRANT SELECT ON public.event_popularity TO authenticated;
*/

-- Comment explaining the security model
COMMENT ON SCHEMA analytics IS 'Private analytics schema - not exposed via PostgREST API. Only accessible via service_role for backend writes and admin queries.';
