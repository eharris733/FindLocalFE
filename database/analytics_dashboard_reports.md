# Analytics Dashboard Reports for Supabase

## How to Add Custom Reports in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Reports** in the left sidebar
3. Click **"New Report"** or **"Custom Query"**
4. Name the report and paste the SQL query
5. Set refresh interval (e.g., every 5 minutes, hourly, daily)
6. Save and pin to dashboard

---

## 📊 Key Metrics Dashboard

### Daily Active Users (Last 30 Days)
**Description:** Track daily sessions and unique users  
**Refresh:** Every hour

```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT session_id) as daily_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as logged_in_users,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NULL) as anonymous_users,
  COUNT(*) as total_events
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Current Week Summary
**Description:** This week's engagement metrics  
**Refresh:** Every 15 minutes

```sql
SELECT 
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE event_type = 'search') as searches,
  COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) as sessions_with_pageviews,
  ROUND(AVG(
    CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END
  ) * 100, 1) as page_view_rate
FROM user_analytics
WHERE timestamp >= DATE_TRUNC('week', CURRENT_DATE);
```

### Average Session Stats (Last 7 Days)
**Description:** Session quality metrics  
**Refresh:** Hourly

```sql
SELECT 
  platform,
  COUNT(*) as sessions,
  ROUND(AVG(duration_ms) / 1000.0, 1) as avg_duration_sec,
  ROUND(AVG(page_views), 1) as avg_page_views,
  ROUND(AVG(events_viewed), 1) as avg_events_viewed,
  ROUND(AVG(favorites_added), 1) as avg_favorites
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
  AND duration_ms IS NOT NULL
GROUP BY platform
ORDER BY sessions DESC;
```

---

## 🎯 Event Performance

### Top 20 Events This Week
**Description:** Most engaged events  
**Refresh:** Every 30 minutes

```sql
SELECT 
  event_id,
  city,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(
    COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 
    1
  ) as click_rate,
  MAX(timestamp) as last_interaction
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_id, city
ORDER BY clicks DESC
LIMIT 20;
```

### Event Engagement by Source
**Description:** Which view generates most clicks  
**Refresh:** Hourly

```sql
SELECT 
  source,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'favorite') as favorites,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 1) as avg_view_sec,
  ROUND(
    COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 
    1
  ) as conversion_rate
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  AND source IS NOT NULL
GROUP BY source
ORDER BY clicks DESC;
```

---

## 🏢 Venue Performance

### Top 15 Venues This Week
**Description:** Most popular venues  
**Refresh:** Hourly

```sql
SELECT 
  venue_id,
  city,
  COUNT(*) FILTER (WHERE metric_type = 'modal_open') as opens,
  COUNT(*) FILTER (WHERE metric_type = 'website_click') as website_clicks,
  COUNT(*) FILTER (WHERE metric_type = 'directions_click') as direction_clicks,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 1000.0, 1) as avg_view_sec
FROM venue_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY venue_id, city
ORDER BY opens DESC
LIMIT 15;
```

---

## 🔍 Search & Discovery

### Recent Searches (Last 24h)
**Description:** What users are searching for  
**Refresh:** Every 15 minutes

```sql
SELECT 
  search_query,
  city,
  COUNT(*) as search_count,
  ROUND(AVG(results_count), 0) as avg_results,
  COUNT(*) FILTER (WHERE results_count = 0) as zero_results,
  MAX(timestamp) as last_search
FROM user_analytics
WHERE event_type = 'search'
  AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
  AND search_query IS NOT NULL
  AND search_query != ''
GROUP BY search_query, city
ORDER BY search_count DESC
LIMIT 30;
```

### Zero-Result Searches (Action Required)
**Description:** Searches that need attention  
**Refresh:** Hourly

```sql
SELECT 
  search_query,
  city,
  COUNT(*) as occurrences,
  COUNT(DISTINCT session_id) as unique_sessions,
  MAX(timestamp) as last_occurrence
FROM user_analytics
WHERE event_type = 'search'
  AND results_count = 0
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
  AND search_query IS NOT NULL
GROUP BY search_query, city
HAVING COUNT(*) >= 3
ORDER BY occurrences DESC
LIMIT 20;
```

---

## 🎛️ Filter Usage

### Most Popular Filters (Last 7 Days)
**Description:** How users are filtering content  
**Refresh:** Hourly

```sql
SELECT 
  filter_type,
  filter_value,
  city,
  COUNT(*) as times_applied,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(AVG(results_count), 0) as avg_results,
  COUNT(*) FILTER (WHERE results_count = 0) as zero_results
FROM filter_usage
WHERE applied = TRUE
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY filter_type, filter_value, city
ORDER BY times_applied DESC
LIMIT 25;
```

### Filter Type Distribution
**Description:** Which filters are most used  
**Refresh:** Hourly

```sql
SELECT 
  filter_type,
  COUNT(*) as total_uses,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT filter_value) as unique_values,
  ROUND(AVG(results_count), 0) as avg_results,
  ROUND(
    COUNT(*) FILTER (WHERE results_count = 0)::numeric / 
    COUNT(*) * 100, 
    1
  ) as zero_result_rate
FROM filter_usage
WHERE applied = TRUE
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY filter_type
ORDER BY total_uses DESC;
```

---

## 🌍 Geographic Analysis

### City Engagement
**Description:** Activity by city  
**Refresh:** Hourly

```sql
SELECT 
  city,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE event_type = 'search') as searches,
  COUNT(*) FILTER (WHERE event_type = 'filter_change') as filter_changes,
  MAX(timestamp) as last_activity
FROM user_analytics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY city
ORDER BY sessions DESC;
```

### Popular Communities by City
**Description:** Top communities/regions  
**Refresh:** Daily

```sql
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
ORDER BY city, selections DESC
LIMIT 50;
```

---

## 📈 Growth Metrics

### Week-over-Week Growth
**Description:** Compare current week to last week  
**Refresh:** Daily

```sql
WITH current_week AS (
  SELECT 
    COUNT(DISTINCT session_id) as sessions,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users,
    COUNT(*) as events
  FROM user_analytics
  WHERE timestamp >= DATE_TRUNC('week', CURRENT_DATE)
),
last_week AS (
  SELECT 
    COUNT(DISTINCT session_id) as sessions,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users,
    COUNT(*) as events
  FROM user_analytics
  WHERE timestamp >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
    AND timestamp < DATE_TRUNC('week', CURRENT_DATE)
)
SELECT 
  'Current Week' as period,
  c.sessions,
  c.users,
  c.events,
  ROUND((c.sessions - l.sessions)::numeric / NULLIF(l.sessions, 0) * 100, 1) as session_growth,
  ROUND((c.users - l.users)::numeric / NULLIF(l.users, 0) * 100, 1) as user_growth
FROM current_week c, last_week l
UNION ALL
SELECT 
  'Last Week',
  l.sessions,
  l.users,
  l.events,
  NULL,
  NULL
FROM last_week l;
```

---

## 🚨 Alerts & Anomalies

### Activity Drop Detection
**Description:** Detect unusual drops in activity  
**Refresh:** Every 15 minutes

```sql
WITH daily_stats AS (
  SELECT 
    DATE(timestamp) as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as events
  FROM user_analytics
  WHERE timestamp >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY DATE(timestamp)
),
with_previous AS (
  SELECT 
    date,
    sessions,
    events,
    LAG(sessions) OVER (ORDER BY date) as prev_sessions,
    LAG(events) OVER (ORDER BY date) as prev_events
  FROM daily_stats
)
SELECT 
  date,
  sessions,
  prev_sessions,
  ROUND((sessions - prev_sessions)::numeric / NULLIF(prev_sessions, 0) * 100, 1) as change_pct,
  CASE 
    WHEN sessions < prev_sessions * 0.5 THEN '🚨 Critical Drop (>50%)'
    WHEN sessions < prev_sessions * 0.7 THEN '⚠️ Warning Drop (>30%)'
    WHEN sessions > prev_sessions * 1.5 THEN '📈 Surge (>50%)'
    ELSE '✅ Normal'
  END as status
FROM with_previous
WHERE prev_sessions IS NOT NULL
ORDER BY date DESC
LIMIT 7;
```

### High Bounce Rate Events
**Description:** Events with low engagement  
**Refresh:** Daily

```sql
SELECT 
  event_id,
  city,
  COUNT(*) FILTER (WHERE metric_type = 'view') as views,
  COUNT(*) FILTER (WHERE metric_type = 'click') as clicks,
  ROUND(
    COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) * 100, 
    1
  ) as click_rate
FROM event_metrics
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_id, city
HAVING COUNT(*) FILTER (WHERE metric_type = 'view') >= 20
  AND COUNT(*) FILTER (WHERE metric_type = 'click')::numeric / 
      NULLIF(COUNT(*) FILTER (WHERE metric_type = 'view'), 0) < 0.1
ORDER BY views DESC
LIMIT 15;
```

---

## 💡 User Behavior Insights

### Session Quality Distribution
**Description:** How engaged are sessions  
**Refresh:** Hourly

```sql
SELECT 
  CASE 
    WHEN page_views = 1 THEN '1️⃣ Bounce (1 page)'
    WHEN page_views BETWEEN 2 AND 3 THEN '2️⃣ Low (2-3 pages)'
    WHEN page_views BETWEEN 4 AND 7 THEN '3️⃣ Medium (4-7 pages)'
    WHEN page_views BETWEEN 8 AND 15 THEN '4️⃣ High (8-15 pages)'
    ELSE '5️⃣ Power User (15+ pages)'
  END as engagement_level,
  COUNT(*) as sessions,
  ROUND(AVG(duration_ms) / 1000.0, 0) as avg_duration_sec,
  ROUND(AVG(events_viewed), 1) as avg_events,
  ROUND(AVG(favorites_added), 1) as avg_favorites,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
  AND duration_ms IS NOT NULL
GROUP BY engagement_level
ORDER BY MIN(page_views);
```

### Peak Usage Hours
**Description:** When are users most active  
**Refresh:** Daily

```sql
SELECT 
  EXTRACT(HOUR FROM start_time)::int as hour,
  TO_CHAR(TIMESTAMP '2000-01-01 00:00:00' + (EXTRACT(HOUR FROM start_time) || ' hours')::interval, 'HH12:00 AM') as time_label,
  COUNT(*) as sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  ROUND(AVG(duration_ms) / 1000.0, 0) as avg_duration_sec
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM start_time)
ORDER BY hour;
```

---

## 📱 Platform Analysis

### Platform Performance
**Description:** iOS vs Android vs Web  
**Refresh:** Hourly

```sql
SELECT 
  platform,
  COUNT(*) as sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
  ROUND(AVG(duration_ms) / 1000.0, 0) as avg_duration_sec,
  ROUND(AVG(page_views), 1) as avg_pages,
  ROUND(AVG(events_viewed), 1) as avg_events,
  ROUND(AVG(favorites_added), 2) as avg_favorites,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as platform_share
FROM session_metrics
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY platform
ORDER BY sessions DESC;
```

---

## 🎯 Conversion Funnels

### Homepage to Event Click Funnel
**Description:** Track user journey  
**Refresh:** Hourly

```sql
WITH funnel AS (
  SELECT 
    session_id,
    MAX(CASE WHEN event_type = 'page_view' AND page_path = '/' THEN 1 ELSE 0 END) as viewed_home,
    MAX(CASE WHEN event_type = 'filter_change' THEN 1 ELSE 0 END) as used_filter,
    MAX(CASE WHEN event_type = 'search' THEN 1 ELSE 0 END) as used_search
  FROM user_analytics
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY session_id
),
clicks AS (
  SELECT DISTINCT session_id
  FROM event_metrics
  WHERE metric_type = 'click'
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
  COUNT(*) as total_sessions,
  SUM(viewed_home) as viewed_homepage,
  SUM(used_filter) as applied_filters,
  SUM(used_search) as performed_search,
  COUNT(c.session_id) as clicked_event,
  ROUND(SUM(used_filter)::numeric / NULLIF(SUM(viewed_home), 0) * 100, 1) as home_to_filter_rate,
  ROUND(COUNT(c.session_id)::numeric / NULLIF(SUM(viewed_home), 0) * 100, 1) as home_to_click_rate
FROM funnel f
LEFT JOIN clicks c ON f.session_id = c.session_id;
```

---

## How to Use These Reports

1. **Copy the SQL** from any section above
2. **In Supabase Dashboard:**
   - Go to Reports → New Custom Query
   - Paste the SQL
   - Name it (use the title from above)
   - Set refresh interval
   - Save

3. **Create a Dashboard:**
   - Pin your most important reports
   - Arrange them on the dashboard
   - Set up alerts for anomaly reports

4. **Recommended Dashboard Layout:**
   - **Row 1:** Daily Active Users, Current Week Summary, Average Session Stats
   - **Row 2:** Top Events, Event Engagement by Source
   - **Row 3:** Recent Searches, Popular Filters
   - **Row 4:** Week-over-Week Growth, Activity Drop Detection

