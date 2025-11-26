-- Comprehensive Analytics Migration
-- This migration adds event metrics, user analytics, venue metrics, and session tracking

-- Event metrics table
CREATE TABLE IF NOT EXISTS event_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'view', 'click', 'favorite', 'unfavorite', 'share', 'modal_open', 'modal_close'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  city TEXT,
  duration_ms INTEGER, -- Time spent viewing (for modal views)
  source TEXT, -- 'list', 'map', 'gallery', 'search'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Additional context
);

CREATE INDEX IF NOT EXISTS idx_event_metrics_event_id ON event_metrics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_metrics_timestamp ON event_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_event_metrics_type ON event_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_event_metrics_session ON event_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_event_metrics_user ON event_metrics(user_id);

-- Venue metrics table
CREATE TABLE IF NOT EXISTS venue_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'view', 'click', 'modal_open', 'modal_close', 'website_click', 'directions_click'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  city TEXT,
  duration_ms INTEGER, -- Time spent viewing venue modal
  source TEXT, -- 'map', 'event_modal', 'list'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_venue_metrics_venue_id ON venue_metrics(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_timestamp ON venue_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_type ON venue_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_session ON venue_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_venue_metrics_user ON venue_metrics(user_id);

-- User behavior analytics
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'filter_change', 'search', 'view_mode_change', 'city_change', 'community_select', etc.
  page_path TEXT,
  city TEXT,
  filters_applied JSONB,
  communities_selected TEXT[], -- Array of community/region names
  view_mode TEXT, -- 'list', 'gallery', 'map'
  search_query TEXT,
  results_count INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session ON user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_timestamp ON user_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_city ON user_analytics(city);

-- Session metrics for time tracking
CREATE TABLE IF NOT EXISTS session_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_ms INTEGER, -- Calculated when session ends
  page_views INTEGER DEFAULT 0,
  events_viewed INTEGER DEFAULT 0,
  venues_viewed INTEGER DEFAULT 0,
  favorites_added INTEGER DEFAULT 0,
  filters_changed INTEGER DEFAULT 0,
  cities_visited TEXT[], -- Array of cities viewed in session
  communities_selected TEXT[], -- Unique communities selected
  initial_city TEXT,
  final_city TEXT,
  platform TEXT, -- 'web', 'ios', 'android'
  device_info JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_session_metrics_session ON session_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_user ON session_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_start ON session_metrics(start_time);
CREATE INDEX IF NOT EXISTS idx_session_metrics_platform ON session_metrics(platform);

-- Filter usage analytics
CREATE TABLE IF NOT EXISTS filter_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  city TEXT,
  filter_type TEXT NOT NULL, -- 'time_range', 'category', 'region', 'price', 'search'
  filter_value TEXT, -- The specific value selected
  applied BOOLEAN DEFAULT TRUE, -- TRUE when added, FALSE when removed
  results_count INTEGER, -- Number of results after applying filter
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_filter_usage_session ON filter_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_filter_usage_type ON filter_usage(filter_type);
CREATE INDEX IF NOT EXISTS idx_filter_usage_value ON filter_usage(filter_value);
CREATE INDEX IF NOT EXISTS idx_filter_usage_timestamp ON filter_usage(timestamp);

-- Analytics views for common queries

-- Most popular events (last 7 days)
CREATE OR REPLACE VIEW popular_events_7d AS
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

-- Most popular venues (last 7 days)
CREATE OR REPLACE VIEW popular_venues_7d AS
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

-- Daily user engagement
CREATE OR REPLACE VIEW daily_engagement AS
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

-- Session summary stats
CREATE OR REPLACE VIEW session_summary AS
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

-- Most used filters
CREATE OR REPLACE VIEW popular_filters AS
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

-- Community/region popularity
CREATE OR REPLACE VIEW popular_communities AS
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

-- Enable Row Level Security (RLS) on analytics tables
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write all analytics (for the app to insert)
CREATE POLICY "Allow service role full access to event_metrics" ON event_metrics
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to venue_metrics" ON venue_metrics
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to user_analytics" ON user_analytics
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to session_metrics" ON session_metrics
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to filter_usage" ON filter_usage
  FOR ALL USING (true);

-- Add analytics_opt_in to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_opt_in BOOLEAN DEFAULT TRUE;
