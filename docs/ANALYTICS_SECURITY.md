# Analytics Security Model

## Overview

Analytics tables are in the **public schema** with **strict Row Level Security (RLS) policies** to control access. This allows client-side analytics tracking while preventing unauthorized access to other users' data.

## Security Approach

Since we're using the **client-side Supabase client** (anon key), tables must be in the public schema. Security is enforced through RLS policies.

## Schema Structure

### Public Schema Tables (with RLS)
All tables are in `public` schema but protected by RLS:

**Tables:**
- `event_metrics` - Event interaction tracking
- `venue_metrics` - Venue interaction tracking  
- `user_analytics` - General user behavior
- `session_metrics` - Session aggregates
- `filter_usage` - Filter interaction tracking

**Views:**
- `popular_events_7d`
- `popular_venues_7d`
- `daily_engagement`
- `session_summary`
- `popular_filters`
- `popular_communities`

## RLS Policies Applied

### INSERT Policies
Users can **only insert** analytics records where:
- They are the record owner (`auth.uid() = user_id`), OR
- Record is anonymous (`user_id IS NULL`)

### SELECT Policies
Users can **only view** their own analytics data:
- `auth.uid() = user_id` OR `user_id IS NULL`

### UPDATE Policies
Only `session_metrics` allows updates (for session tracking):
- Users can only update their own sessions

### DELETE Policies
**No DELETE policies** = users cannot delete analytics data
- Only admins via service_role can delete

## Security Benefits

1. ✅ **Users can only see their own data** - Cannot query other users' analytics
2. ✅ **Users cannot delete analytics** - Audit trail preserved
3. ✅ **Anonymous tracking supported** - `user_id IS NULL` allowed
4. ✅ **No overly permissive policies** - Each operation explicitly controlled

## Migration Applied

Run `migration_secure_analytics_with_rls.sql` to:
1. Drop old permissive policies (`USING (true)`)
2. Enable RLS on all analytics tables
3. Create granular INSERT/SELECT/UPDATE policies
4. Block DELETE operations for regular users

## Client-Side Usage (Current Implementation)

Your app uses the standard Supabase client with anon key:

```typescript
// Works because tables are in public schema with RLS
await supabase.from('session_metrics').insert({
  session_id: this.sessionId,
  user_id: user?.id || null,
  // ... other fields
});
```

RLS automatically enforces that users can only insert/view their own data.

## Admin Queries (Service Role)

For admin dashboards or analytics aggregation, use service_role:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Bypasses RLS
);

// Get ALL analytics data (admin only)
const { data } = await supabaseAdmin
  .from('session_metrics')
  .select('*');
```

## What Changed

### Before (Insecure)
```sql
CREATE POLICY "Allow service role full access" 
  ON session_metrics
  FOR ALL USING (true); -- ❌ Anyone could read everything!
```

### After (Secure)
```sql
-- Users can only insert their own data
CREATE POLICY "Users can insert their own session metrics"
  ON session_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can only view their own data  
CREATE POLICY "Users can view their own session metrics"
  ON session_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
```

## Important Notes

✅ **Client-Side Tracking Enabled**
- Users can track their own analytics via the app
- Anonymous tracking works (`user_id IS NULL`)
- RLS prevents cross-user data access

⚠️ **Service Role for Admin**
- Use service_role key for admin queries/dashboards
- Never expose service_role key in client code
- Store in backend environment variables only

📊 **Aggregated Views**
- Views in public schema aggregate data across users
- Safe for public consumption (no PII exposure)
- Users can see trends without accessing raw data
