-- ============================================
-- FindLocal Social Features - SQL Observability Queries
-- ============================================
-- Use these queries in Supabase Dashboard for monitoring social feature usage
-- These queries can be added to the SQL Editor or used in custom dashboards
-- Run migration_add_social_analytics.sql before using metrics queries
-- ============================================

-- ============================================
-- 1. OVERVIEW DASHBOARD QUERIES
-- ============================================

-- 1.1 Total Social Connections Summary
-- Shows total counts for all social relationship types
SELECT 
  (SELECT COUNT(*) FROM friendships) as total_friendships,
  (SELECT COUNT(*) FROM followers) as total_follows,
  (SELECT COUNT(*) FROM venue_follows) as total_venue_follows,
  (SELECT COUNT(*) FROM event_invitations) as total_invitations,
  (SELECT COUNT(*) FROM event_rsvps) as total_rsvps;

-- 1.2 Social Metrics Summary (from analytics table)
-- Requires running migration_add_social_analytics.sql first
SELECT 
  action_type,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as unique_users
FROM social_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action_type
ORDER BY total_actions DESC;

-- 1.3 Creator vs Personal Account Distribution
SELECT 
  account_type,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM profiles
WHERE account_type IS NOT NULL
GROUP BY account_type;

-- ============================================
-- 2. FRIENDS ANALYTICS
-- ============================================

-- 2.1 Daily New Friendships (Last 30 Days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_friendships
FROM friendships 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2.2 Friend Request Status Distribution
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM friend_requests
GROUP BY status;

-- 2.3 Friend Request Acceptance Rate
SELECT 
  ROUND(
    100.0 * SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as acceptance_rate_percent,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
FROM friend_requests;

-- 2.4 Users with Most Friends
SELECT 
  p.username,
  p.full_name,
  COUNT(*) as friend_count
FROM friendships f
JOIN profiles p ON (f.user_id_1 = p.id OR f.user_id_2 = p.id)
GROUP BY p.id, p.username, p.full_name
ORDER BY friend_count DESC
LIMIT 20;

-- 2.5 Average Friends per User
SELECT 
  ROUND(AVG(friend_count), 2) as avg_friends_per_user
FROM (
  SELECT 
    user_id,
    COUNT(*) as friend_count
  FROM (
    SELECT user_id_1 as user_id FROM friendships
    UNION ALL
    SELECT user_id_2 as user_id FROM friendships
  ) all_friendships
  GROUP BY user_id
) user_friend_counts;

-- ============================================
-- 3. FOLLOWERS ANALYTICS
-- ============================================

-- 3.1 Daily New Follows (Last 30 Days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_follows
FROM followers 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 3.2 Most Followed Creators
SELECT 
  p.username,
  p.full_name,
  COUNT(*) as follower_count
FROM followers f
JOIN profiles p ON f.following_id = p.id
GROUP BY p.id, p.username, p.full_name
ORDER BY follower_count DESC
LIMIT 20;

-- 3.3 Creator Accounts with No Followers
SELECT 
  p.username,
  p.full_name,
  p.created_at
FROM profiles p
LEFT JOIN followers f ON f.following_id = p.id
WHERE p.account_type = 'creator'
AND f.id IS NULL
ORDER BY p.created_at DESC;

-- 3.4 Follow/Following Ratio by User
SELECT 
  p.username,
  p.full_name,
  COALESCE(followers.count, 0) as follower_count,
  COALESCE(following.count, 0) as following_count,
  CASE 
    WHEN COALESCE(following.count, 0) = 0 THEN NULL
    ELSE ROUND(COALESCE(followers.count, 0)::numeric / following.count, 2)
  END as follower_ratio
FROM profiles p
LEFT JOIN (
  SELECT following_id, COUNT(*) as count
  FROM followers
  GROUP BY following_id
) followers ON p.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count
  FROM followers
  GROUP BY follower_id
) following ON p.id = following.follower_id
WHERE p.account_type = 'creator'
ORDER BY follower_count DESC
LIMIT 20;

-- ============================================
-- 4. VENUE FOLLOWS ANALYTICS
-- ============================================

-- 4.1 Daily New Venue Follows (Last 30 Days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_venue_follows
FROM venue_follows 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 4.2 Most Followed Venues
SELECT 
  v.name as venue_name,
  v.city,
  COUNT(*) as follower_count
FROM venue_follows vf
JOIN venues v ON vf.venue_id = v.id
GROUP BY v.id, v.name, v.city
ORDER BY follower_count DESC
LIMIT 20;

-- 4.3 Users Following Most Venues
SELECT 
  p.username,
  p.full_name,
  COUNT(*) as venues_followed
FROM venue_follows vf
JOIN profiles p ON vf.user_id = p.id
GROUP BY p.id, p.username, p.full_name
ORDER BY venues_followed DESC
LIMIT 20;

-- 4.4 Venue Follow Distribution by City
SELECT 
  v.city,
  COUNT(*) as total_follows,
  COUNT(DISTINCT vf.venue_id) as venues_with_followers,
  COUNT(DISTINCT vf.user_id) as users_following
FROM venue_follows vf
JOIN venues v ON vf.venue_id = v.id
GROUP BY v.city
ORDER BY total_follows DESC;

-- ============================================
-- 5. INVITATIONS ANALYTICS
-- ============================================

-- 5.1 Daily Invitations Created (Last 30 Days)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as invitations_created
FROM event_invitations 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 5.2 Invitation Conversion Rate
SELECT 
  COUNT(DISTINCT i.id) as total_invitations,
  COUNT(DISTINCT r.invitation_id) as invitations_with_rsvp,
  ROUND(
    100.0 * COUNT(DISTINCT r.invitation_id) / NULLIF(COUNT(DISTINCT i.id), 0), 
    2
  ) as rsvp_rate_percent
FROM event_invitations i
LEFT JOIN event_rsvps r ON i.id = r.invitation_id;

-- 5.3 RSVP Response Distribution
SELECT 
  response,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM event_rsvps
GROUP BY response
ORDER BY count DESC;

-- 5.4 Most Active Inviters
SELECT 
  p.username,
  p.full_name,
  COUNT(*) as invitations_sent
FROM event_invitations i
JOIN profiles p ON i.inviter_id = p.id
GROUP BY p.id, p.username, p.full_name
ORDER BY invitations_sent DESC
LIMIT 20;

-- 5.5 Events with Most Invitations
SELECT 
  e.title as event_title,
  e.start_date,
  COUNT(DISTINCT i.id) as invitation_count,
  COUNT(DISTINCT r.id) as rsvp_count,
  SUM(CASE WHEN r.response = 'yes' THEN 1 ELSE 0 END) as yes_count
FROM event_invitations i
JOIN events e ON i.event_id = e.id
LEFT JOIN event_rsvps r ON i.id = r.invitation_id
GROUP BY e.id, e.title, e.start_date
ORDER BY invitation_count DESC
LIMIT 20;

-- 5.6 Average Time to RSVP (in hours)
SELECT 
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (r.created_at - i.created_at)) / 3600
    ), 
    2
  ) as avg_hours_to_rsvp
FROM event_rsvps r
JOIN event_invitations i ON r.invitation_id = i.id
WHERE r.created_at >= i.created_at;

-- ============================================
-- 6. SOCIAL METRICS ANALYTICS (from social_metrics table)
-- ============================================

-- 6.1 Social Actions by Hour (for peak usage analysis)
SELECT 
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  action_type,
  COUNT(*) as action_count
FROM social_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at), action_type
ORDER BY hour_of_day, action_count DESC;

-- 6.2 Social Actions by Day of Week
SELECT 
  TO_CHAR(created_at, 'Day') as day_of_week,
  EXTRACT(DOW FROM created_at) as day_num,
  COUNT(*) as action_count
FROM social_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
ORDER BY day_num;

-- 6.3 User Engagement Funnel
SELECT 
  'Sent Friend Request' as step,
  COUNT(DISTINCT user_id) as users
FROM social_metrics WHERE action_type = 'friend_request_sent'
UNION ALL
SELECT 'Followed User', COUNT(DISTINCT user_id)
FROM social_metrics WHERE action_type = 'user_followed'
UNION ALL
SELECT 'Followed Venue', COUNT(DISTINCT user_id)
FROM social_metrics WHERE action_type = 'venue_followed'
UNION ALL
SELECT 'Created Invitation', COUNT(DISTINCT user_id)
FROM social_metrics WHERE action_type = 'invitation_created'
UNION ALL
SELECT 'Submitted RSVP', COUNT(DISTINCT user_id)
FROM social_metrics WHERE action_type = 'rsvp_submitted';

-- 6.4 Action Source Distribution (where actions are triggered from)
SELECT 
  source,
  COUNT(*) as action_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM social_metrics
WHERE source IS NOT NULL
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY source
ORDER BY action_count DESC;

-- ============================================
-- 7. GROWTH & TRENDS
-- ============================================

-- 7.1 Weekly Active Social Users
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(DISTINCT user_id) as active_social_users
FROM social_metrics
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- 7.2 Monthly Social Feature Adoption
SELECT 
  DATE_TRUNC('month', p.created_at) as month,
  COUNT(*) as new_users,
  SUM(CASE WHEN p.account_type = 'creator' THEN 1 ELSE 0 END) as new_creators,
  SUM(CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_friends
FROM profiles p
LEFT JOIN (
  SELECT DISTINCT user_id_1 as user_id FROM friendships
  UNION
  SELECT DISTINCT user_id_2 FROM friendships
) f ON p.id = f.user_id
WHERE p.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

-- 7.3 Social Feature Retention (users who return after first action)
WITH first_actions AS (
  SELECT 
    user_id,
    MIN(created_at) as first_action_date
  FROM social_metrics
  GROUP BY user_id
),
return_actions AS (
  SELECT 
    fa.user_id,
    fa.first_action_date,
    COUNT(sm.id) as subsequent_actions
  FROM first_actions fa
  LEFT JOIN social_metrics sm ON fa.user_id = sm.user_id 
    AND sm.created_at > fa.first_action_date + INTERVAL '1 day'
    AND sm.created_at < fa.first_action_date + INTERVAL '7 days'
  GROUP BY fa.user_id, fa.first_action_date
)
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  SUM(CASE WHEN subsequent_actions > 0 THEN 1 ELSE 0 END) as returning_users,
  ROUND(
    100.0 * SUM(CASE WHEN subsequent_actions > 0 THEN 1 ELSE 0 END) / 
    NULLIF(COUNT(DISTINCT user_id), 0),
    2
  ) as retention_rate_percent
FROM return_actions;

-- ============================================
-- 8. HEALTH CHECKS
-- ============================================

-- 8.1 Orphaned Records Check
SELECT 
  'friend_requests with invalid sender' as check_name,
  COUNT(*) as count
FROM friend_requests fr
LEFT JOIN profiles p ON fr.requester_id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT 
  'friendships with invalid users',
  COUNT(*)
FROM friendships f
LEFT JOIN profiles p1 ON f.user_id_1 = p1.id
LEFT JOIN profiles p2 ON f.user_id_2 = p2.id
WHERE p1.id IS NULL OR p2.id IS NULL
UNION ALL
SELECT 
  'followers with invalid users',
  COUNT(*)
FROM followers f
LEFT JOIN profiles p1 ON f.follower_id = p1.id
LEFT JOIN profiles p2 ON f.following_id = p2.id
WHERE p1.id IS NULL OR p2.id IS NULL
UNION ALL
SELECT 
  'venue_follows with invalid venue',
  COUNT(*)
FROM venue_follows vf
LEFT JOIN venues v ON vf.venue_id = v.id
WHERE v.id IS NULL;

-- 8.2 Duplicate Check
SELECT 
  'Duplicate friendships' as check_name,
  COUNT(*) as count
FROM (
  SELECT 
    LEAST(user_id_1, user_id_2) as u1,
    GREATEST(user_id_1, user_id_2) as u2,
    COUNT(*) as cnt
  FROM friendships
  GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
  HAVING COUNT(*) > 1
) dupes
UNION ALL
SELECT 
  'Duplicate follows',
  COUNT(*)
FROM (
  SELECT follower_id, following_id, COUNT(*)
  FROM followers
  GROUP BY follower_id, following_id
  HAVING COUNT(*) > 1
) dupes;

-- ============================================
-- 9. QUICK VIEWS (Optional - Run once to create)
-- ============================================

-- Uncomment and run to create helpful views

-- CREATE OR REPLACE VIEW social_dashboard_summary AS
-- SELECT 
--   (SELECT COUNT(*) FROM friendships) as total_friendships,
--   (SELECT COUNT(*) FROM followers) as total_follows,
--   (SELECT COUNT(*) FROM venue_follows) as total_venue_follows,
--   (SELECT COUNT(*) FROM event_invitations) as total_invitations,
--   (SELECT COUNT(*) FROM profiles WHERE account_type = 'creator') as total_creators;

-- CREATE OR REPLACE VIEW daily_social_activity AS
-- SELECT 
--   DATE(created_at) as date,
--   action_type,
--   COUNT(*) as action_count
-- FROM social_metrics
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY DATE(created_at), action_type
-- ORDER BY date DESC, action_count DESC;

-- ============================================
-- END OF SOCIAL ANALYTICS QUERIES
-- ============================================
