# FindLocal Social Features - Complete Implementation Guide

> **Last Updated:** January 2025
> **Version:** 2.0.0

This document provides a comprehensive overview of all social, creator, venue following, and community features implemented in FindLocal. Use this guide for reference, testing, QA, and observability purposes.

---

## Table of Contents

1. [Features Overview](#1-features-overview)
2. [Friends System](#2-friends-system)
3. [Event Invitations](#3-event-invitations)
4. [Followers & Creators System](#4-followers--creators-system)
5. [Venue Following](#5-venue-following)
6. [Navigation & UI Features](#6-navigation--ui-features)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Analytics Events](#9-analytics-events)
10. [Testing Checklist](#10-testing-checklist)
11. [SQL Observability Queries](#11-sql-observability-queries)

---

## 1. Features Overview

### Summary Table

| Feature Category | Features | Pages | Main Files |
|-----------------|----------|-------|------------|
| **Friends** | Send/accept/reject requests, view friends, remove friends | `/friends` | `src/app/friends.tsx`, `src/api/friends.ts` |
| **Invitations** | Invite friends to events, RSVP (accept/decline/maybe) | `/invitations`, `/invite/[token]` | `src/app/invitations.tsx`, `src/api/invitations.ts` |
| **Followers** | Follow/unfollow users, activity feed, discover creators | `/following`, `/followers`, `/discover-creators`, `/activity-feed` | `src/api/friends.ts` |
| **Venue Following** | Follow/unfollow venues, venue detail pages | `/followed-venues`, `/venue/[id]` | `src/app/venue/[id].tsx`, `src/app/followed-venues.tsx` |
| **Creator Mode** | Public profile toggle, creator badge display | `/profile` | `TopNavigation.tsx`, `ProfileModal.tsx` |

---

## 2. Friends System

### 2.1 Feature Description

The friends system allows users to build private social connections. Friends can see each other's profiles and send event invitations to each other.

### 2.2 User Flows

#### Send Friend Request
1. User navigates to another user's profile (`/user/[username]`)
2. User clicks "Add Friend" button
3. System creates `friend_request` with status `pending`
4. Recipient sees request in Friends page → Requests tab

#### Accept Friend Request
1. User navigates to Friends page (`/friends`)
2. User switches to "Requests" tab
3. User clicks "Accept" on a pending request
4. System creates bidirectional `friendship` entries
5. System updates `friend_request` status to `accepted`
6. Both users now appear in each other's friends list

#### Reject Friend Request
1. User clicks "Reject" on a pending request
2. System updates `friend_request` status to `rejected`
3. Request is removed from UI

#### Remove Friend
1. User navigates to Friends page
2. User clicks remove button on a friend
3. System deletes both `friendship` records
4. Users no longer appear in each other's friends list

### 2.3 Business Rules

- Cannot send friend request to self
- Cannot send duplicate friend request (pending or accepted)
- Cannot send request to existing friend
- Removing friend is bidirectional (removes both sides)

### 2.4 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| FriendsPage | `src/app/friends.tsx` | Main friends management |
| FriendsList | Tab in FriendsPage | Display accepted friends |
| RequestsList | Tab in FriendsPage | Display pending requests |
| AddFriendButton | User profile page | Initiate friend request |

---

## 3. Event Invitations

### 3.1 Feature Description

Users can invite their friends to events. Recipients can RSVP with accept, decline, or maybe responses.

### 3.2 User Flows

#### Send Invitation
1. User views an event detail page (`/event/[id]`)
2. User clicks "Invite Friends" button
3. InviteModal opens showing list of friends
4. User selects one or more friends
5. User optionally adds a personal message
6. User clicks "Send Invites"
7. System creates `event_invitation` records with unique tokens

#### RSVP to Invitation
1. User navigates to Invitations page (`/invitations`)
2. User sees received invitations in "Received" tab
3. User clicks Accept, Decline, or Maybe
4. System updates invitation status and `responded_at`

#### RSVP via Direct Link
1. User clicks invitation link (`/invite/[token]`)
2. System validates token and shows event details
3. User selects RSVP response
4. System updates invitation status

### 3.3 Business Rules

- Can only invite friends (not all users)
- Cannot send duplicate invitation for same event to same user
- Each invitation has unique token for direct link access
- RSVP status options: `pending`, `accepted`, `declined`, `maybe`

### 3.4 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| InvitationsPage | `src/app/invitations.tsx` | Manage all invitations |
| InviteModal | `src/components/InviteModal.tsx` | Select friends to invite |
| RsvpModal | `src/components/RsvpModal.tsx` | Quick RSVP response |
| InviteResponsePage | `src/app/invite/[token].tsx` | Direct link RSVP |

---

## 4. Followers & Creators System

### 4.1 Feature Description

Users can enable "creator mode" to make their profile publicly visible. Other users can follow creators to see their activity in their feed.

### 4.2 User Flows

#### Enable Creator Mode
1. User navigates to Profile page (`/profile`)
2. User toggles "Show my profile publicly" switch
3. System sets `is_public_profile = true` on profile
4. User sees "★ Creator" badge in navigation
5. User appears in Discover Creators page

#### Follow a Creator
1. User browses Discover Creators (`/discover-creators`)
2. User clicks "Follow" button on a creator profile
3. System creates `follower` record
4. Creator's activity now appears in user's Activity Feed

#### Unfollow a Creator
1. User navigates to Following page (`/following`)
2. User clicks "Unfollow" button
3. System deletes `follower` record
4. Creator's activity no longer in feed

#### View Activity Feed
1. User navigates to Activity Feed (`/activity-feed`)
2. System fetches recent favorites from followed users
3. User sees events that followed creators have favorited

### 4.3 Business Rules

- Only public profiles appear in Discover Creators
- Anyone can follow a public profile
- Following is unidirectional (unlike friendships)
- Activity feed shows favorites from followed users only

### 4.4 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| DiscoverCreatorsPage | `src/app/discover-creators.tsx` | Browse public profiles |
| FollowingPage | `src/app/following.tsx` | Manage followed users |
| FollowersPage | `src/app/followers.tsx` | View your followers |
| ActivityFeedPage | `src/app/activity-feed.tsx` | See followed users' activity |
| UserProfilePage | `src/app/user/[username].tsx` | Public user profile |
| CreatorBadge | `TopNavigation.tsx` | Display creator status |

---

## 5. Venue Following

### 5.1 Feature Description

Users can follow their favorite venues to easily find them and discover their upcoming events.

### 5.2 User Flows

#### Follow a Venue
1. User views an event detail page (`/event/[id]`)
2. User sees venue section with venue name
3. User clicks "Follow" button next to venue
4. System creates `venue_follow` record
5. Button changes to "Following ✓"

#### View Followed Venues
1. User navigates to Followed Venues (`/followed-venues`)
2. System displays list of all followed venues
3. Each item shows venue name, address, follower count

#### View Venue Detail Page
1. User clicks on venue name (from event page or followed venues)
2. System navigates to `/venue/[id]`
3. Page shows venue info and next 3 upcoming events
4. User can follow/unfollow from this page

### 5.3 Business Rules

- Any logged-in user can follow any venue
- Venue detail shows max 3 upcoming events (within 7 days)
- Venue name on event pages links to venue detail

### 5.4 UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| VenueDetailPage | `src/app/venue/[id].tsx` | Venue info + upcoming events |
| FollowedVenuesPage | `src/app/followed-venues.tsx` | List of followed venues |
| VenueFollowButton | Event detail page | Follow/unfollow venue |

---

## 6. Navigation & UI Features

### 6.1 Navigation Structure (Logged In)

#### Desktop Navigation (≥1024px)
```
[Logo] [Favorites] [Search] [City] ... [MENU DROPDOWN] [Creator Badge] [Account]

MENU DROPDOWN:
├── DISCOVER
│   └── Discover Creators
├── FOLLOWING
│   ├── Activity Feed
│   ├── People
│   ├── Venues
│   └── My Invitations
└── SOCIAL
    └── Friends
```

#### Mobile/Tablet Navigation (<1024px)
```
[☰ Hamburger] ... [Logo] ... [Favorites] [Account]

HAMBURGER MENU:
├── ★ Creator Account (if creator)
├── DISCOVER
│   └── Discover Creators
├── FOLLOWING
│   ├── Activity Feed
│   ├── People
│   ├── Venues
│   └── My Invitations
└── SOCIAL
    └── Friends
```

### 6.2 Creator Indicator

| Location | Display | Condition |
|----------|---------|-----------|
| Desktop Nav | Orange "★ Creator" button | `is_public_profile = true` |
| Mobile Menu | Orange "★ Creator Account" banner | `is_public_profile = true` |

### 6.3 Profile Modal Sections

```
PROFILE MODAL:
├── [Avatar] [Edit Profile]
├── SOCIAL
│   ├── Friends
│   ├── Discover Creators
│   └── My Invitations
└── FOLLOWING
    ├── Activity Feed
    ├── People
    └── Venues
```

---

## 7. Database Schema

### 7.1 Tables Overview

```
profiles (existing, extended)
├── is_public_profile: boolean
├── bio: text
└── username: text (unique)

friendships
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── friend_id: uuid (FK → auth.users)
└── created_at: timestamp

friend_requests
├── id: uuid (PK)
├── sender_id: uuid (FK → auth.users)
├── recipient_id: uuid (FK → auth.users)
├── status: text (pending/accepted/rejected)
└── created_at: timestamp

followers
├── id: uuid (PK)
├── follower_id: uuid (FK → auth.users)
├── following_id: uuid (FK → auth.users)
└── created_at: timestamp

event_invitations
├── id: uuid (PK)
├── event_id: uuid (FK → events)
├── sender_id: uuid (FK → auth.users)
├── recipient_id: uuid (FK → auth.users)
├── message: text (optional)
├── status: text (pending/accepted/declined/maybe)
├── invite_token: text (unique)
├── created_at: timestamp
└── responded_at: timestamp

venue_follows
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── venue_id: uuid (FK → venues)
└── created_at: timestamp
```

### 7.2 Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can read their own data
- Users can read data where they are participants
- Users can insert their own records
- Users can update their own records
- Users can delete their own records

---

## 8. API Reference

### 8.1 Friends API

```typescript
// src/api/friends.ts

// Friend Requests
sendFriendRequest(recipientId: string): Promise<FriendRequest>
acceptFriendRequest(requestId: string): Promise<void>
rejectFriendRequest(requestId: string): Promise<void>
getPendingRequests(): Promise<FriendRequest[]>
getSentRequests(): Promise<FriendRequest[]>

// Friendships
getFriends(): Promise<Friendship[]>
removeFriend(friendId: string): Promise<void>
checkFriendship(userId: string): Promise<boolean>
checkPendingRequest(userId: string): Promise<FriendRequest | null>
```

### 8.2 Followers API

```typescript
// src/api/friends.ts

followUser(followingId: string): Promise<FollowerRelation>
unfollowUser(followingId: string): Promise<void>
getFollowers(userId: string): Promise<FollowerRelation[]>
getFollowing(userId: string): Promise<FollowerRelation[]>
checkFollowing(followingId: string): Promise<boolean>
getFollowerCount(userId: string): Promise<number>
getFollowingCount(userId: string): Promise<number>
```

### 8.3 Invitations API

```typescript
// src/api/invitations.ts

sendInvitation(eventId: string, recipientId: string, message?: string): Promise<Invitation>
respondToInvitation(invitationId: string, response: 'accepted' | 'declined' | 'maybe'): Promise<void>
getReceivedInvitations(): Promise<Invitation[]>
getSentInvitations(): Promise<Invitation[]>
getEventInvitations(eventId: string): Promise<Invitation[]>
checkInvitation(eventId: string): Promise<Invitation | null>
getInvitationByToken(token: string): Promise<Invitation | null>
```

### 8.4 Venue Follow API

```typescript
// src/api/friends.ts

followVenue(venueId: string): Promise<VenueFollow>
unfollowVenue(venueId: string): Promise<void>
checkFollowingVenue(venueId: string): Promise<boolean>
getFollowedVenues(): Promise<VenueFollow[]>
getVenueFollowerCount(venueId: string): Promise<number>
```

### 8.5 Events API (Social)

```typescript
// src/api/events.ts

getUpcomingEventsForVenue(venueId: string, limit?: number): Promise<Event[]>
```

---

## 9. Analytics Events

### 9.1 Social Action Events

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `social_friend_request_sent` | Send friend request | `recipient_id` |
| `social_friend_request_accepted` | Accept friend request | `sender_id`, `request_id` |
| `social_friend_request_rejected` | Reject friend request | `sender_id`, `request_id` |
| `social_friendship_removed` | Remove friend | `friend_id` |
| `social_user_followed` | Follow user | `following_id` |
| `social_user_unfollowed` | Unfollow user | `following_id` |
| `social_invitation_sent` | Send event invitation | `event_id`, `recipient_id` |
| `social_invitation_response` | RSVP to invitation | `invitation_id`, `event_id`, `response` |
| `social_venue_followed` | Follow venue | `venue_id`, `venue_name` |
| `social_venue_unfollowed` | Unfollow venue | `venue_id` |
| `social_creator_mode_enabled` | Enable public profile | - |
| `social_creator_mode_disabled` | Disable public profile | - |

### 9.2 Page View Events

| Page | Path | Event Name |
|------|------|------------|
| Friends | `/friends` | `page_view` with `pagePath: '/friends'` |
| Invitations | `/invitations` | `page_view` with `pagePath: '/invitations'` |
| Following | `/following` | `page_view` with `pagePath: '/following'` |
| Followers | `/followers` | `page_view` with `pagePath: '/followers'` |
| Discover Creators | `/discover-creators` | `page_view` with `pagePath: '/discover-creators'` |
| Activity Feed | `/activity-feed` | `page_view` with `pagePath: '/activity-feed'` |
| Followed Venues | `/followed-venues` | `page_view` with `pagePath: '/followed-venues'` |
| Venue Detail | `/venue/[id]` | `page_view` with `pagePath: '/venue/[id]'`, `venue_id` |
| User Profile | `/user/[username]` | `page_view` with `pagePath: '/user/[username]'`, `profile_user_id` |

---

## 10. Testing Checklist

### 10.1 Friends System

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| FR-01 | Send friend request | Request created, appears in recipient's requests |
| FR-02 | Send duplicate request | Error shown, no duplicate created |
| FR-03 | Accept friend request | Friendship created, both see each other |
| FR-04 | Reject friend request | Request removed, no friendship |
| FR-05 | Remove friend | Both users no longer friends |
| FR-06 | View pending requests | List of incoming requests shown |
| FR-07 | View friends list | All friends displayed with info |

### 10.2 Event Invitations

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IN-01 | Open invite modal | Modal shows friends list |
| IN-02 | Send single invitation | Invitation created, token generated |
| IN-03 | Send multiple invitations | All invitations created |
| IN-04 | RSVP Accept | Status updated to accepted |
| IN-05 | RSVP Decline | Status updated to declined |
| IN-06 | RSVP Maybe | Status updated to maybe |
| IN-07 | View received invitations | All received invites shown |
| IN-08 | View sent invitations | All sent invites with status |

### 10.3 Followers & Creators

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CR-01 | Enable creator mode | Badge appears, profile public |
| CR-02 | Disable creator mode | Badge hidden, profile private |
| CR-03 | Follow creator | Added to following list |
| CR-04 | Unfollow creator | Removed from following |
| CR-05 | View activity feed | Shows followed users' favorites |
| CR-06 | View discover creators | Shows public profiles |

### 10.4 Venue Following

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| VF-01 | Follow venue | Added to followed venues |
| VF-02 | Unfollow venue | Removed from followed |
| VF-03 | View venue detail | Shows venue info + events |
| VF-04 | Click venue name | Navigates to venue page |
| VF-05 | View followed venues list | All followed venues shown |

---

## 11. SQL Observability Queries

See [database/analytics_queries.sql](../database/analytics_queries.sql) for comprehensive SQL queries to monitor social feature usage in Supabase dashboard.

### Quick Reference Queries

#### Total Social Connections
```sql
SELECT 
  (SELECT COUNT(*) FROM friendships) as total_friendships,
  (SELECT COUNT(*) FROM followers) as total_follows,
  (SELECT COUNT(*) FROM venue_follows) as total_venue_follows,
  (SELECT COUNT(*) FROM event_invitations) as total_invitations;
```

#### Daily Social Activity
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_friendships
FROM friendships 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Related Documentation

- [SOCIAL_FEATURES.MD](./SOCIAL_FEATURES.MD) - Original specification
- [SOCIAL_FEATURES_TESTING.md](./SOCIAL_FEATURES_TESTING.md) - Testing procedures
- [ANALYTICS_IMPLEMENTATION_GUIDE.md](./ANALYTICS_IMPLEMENTATION_GUIDE.md) - Analytics setup

## Migration Files

- `database/migration_social_features_phase1.sql` - Friends & Followers
- `database/migration_social_features_phase2.sql` - Invitations
- `database/migration_venue_follows.sql` - Venue follows
