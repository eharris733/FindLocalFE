# Social Features Testing Guide

This document provides step-by-step instructions for testing all social features implemented in FindLocal.

## Prerequisites

Before testing, ensure:
1. App is running (`npm start`)
2. Database migrations have been applied (see Migration Checklist below)
3. You have at least 2 test accounts to test friend/follow interactions

---

## How to Access Social Features

### From the Profile Modal (Logged In)
1. Tap the **"Account"** button in the top navigation
2. You'll see:
   - **"Edit Profile"** button → Full profile settings page
   - **"Social"** section with links to all social features

### From the Mobile Menu (Hamburger Icon)
1. Tap the ☰ menu icon (top left on mobile)
2. Scroll down to see:
   - **Friends** - Friends page
   - **SOCIAL** section (only when logged in):
     - 🎭 Discover Creators
     - 📰 Following Feed
     - ✉️ My Invitations

### Direct URL Navigation
| Feature | Route |
|---------|-------|
| Full Profile & Settings | `/profile` |
| Friends | `/friends` |
| User Profile | `/user/[username]` |
| Followers | `/followers` |
| Discover Creators | `/discover-creators` |
| Following Activity | `/following-activity` |
| My Invitations | `/my-invites` |
| Event Invites | `/event/[id]` → Invite button |
| RSVP via Link | `/invite/[token]` |

---

## Migration Checklist

Run these migrations in your Supabase SQL editor in order:

1. `database/migration_social_features_phase1.sql` - Friends & Followers tables
2. `database/migration_social_features_phase2.sql` - Event Invitations tables
3. `database/migration_fix_invite_token.sql` - Token generation fix

---

## Phase 1: Friends System

### Test 1.1: Profile Setup
**Route:** `/profile` (tap profile icon in tab bar)

- [ ] Verify profile page loads with your info
- [ ] Tap username to edit → Modal should appear
- [ ] Try setting a username (3-20 chars, letters/numbers/underscores)
- [ ] Check availability indicator (✓ green = available, ✕ red = taken)
- [ ] Save username successfully
- [ ] Toggle between "PERSONAL" and "CREATOR" account types
- [ ] Edit bio (max 150 chars)
- [ ] Tap "Activity Visibility" → Select privacy level

### Test 1.2: Friends Page
**Route:** `/friends` (navigate from profile or direct URL)

- [ ] Page loads with 3 tabs: Friends, Requests, Find Friends
- [ ] "Friends" tab shows list of current friends (empty if none)
- [ ] "Requests" tab shows pending incoming requests
- [ ] "Find Friends" tab shows friend suggestions

### Test 1.3: Send Friend Request
**Prerequisites:** Need a second test account with a username

1. [ ] Log in as User A
2. [ ] Go to Friends page → "Find Friends" tab
3. [ ] Find User B in suggestions (or search)
4. [ ] Tap "Add Friend" button
5. [ ] Verify button changes to "Pending"

### Test 1.4: Accept Friend Request
1. [ ] Log in as User B
2. [ ] Go to Friends page → "Requests" tab
3. [ ] See pending request from User A
4. [ ] Tap "Accept" button
5. [ ] Verify request disappears from Requests tab
6. [ ] Check "Friends" tab - User A should appear
7. [ ] Log back in as User A - verify User B in Friends tab

### Test 1.5: Remove Friend
1. [ ] Go to Friends tab
2. [ ] Find a friend in the list
3. [ ] Tap the friend row or remove button
4. [ ] Confirm removal
5. [ ] Verify friend is removed from list

### Test 1.6: Share Profile Link
1. [ ] Go to Friends page
2. [ ] Tap "Share" button (share icon)
3. [ ] Share sheet should appear with your profile URL
4. [ ] URL format: `https://findlocal.events/user/[username]`

---

## Phase 2: Event Invitations

### Test 2.1: Create Event Invitation
**Route:** `/event/[id]` (tap any event to view details)

1. [ ] Open any event detail page
2. [ ] Tap "Invite" button (share icon near top)
3. [ ] Invite modal opens with options:
   - [ ] Toggle "Require Passcode" → Enter passcode if enabled
   - [ ] Toggle "Allow Anonymous RSVPs"
   - [ ] Toggle "Allow +1"
   - [ ] Set "Max Uses" (optional)
   - [ ] Set "Expires" date (optional)
   - [ ] Add custom message (optional)
4. [ ] Tap "Create Invitation"
5. [ ] Verify share sheet appears with invite link
6. [ ] Link format: `https://findlocal.events/invite/[token]`

### Test 2.2: View Invitation as Non-Logged-In User
1. [ ] Copy the invite link from Test 2.1
2. [ ] Open in incognito/private browser or log out
3. [ ] Navigate to the invite link
4. [ ] Verify invite page shows:
   - [ ] Event details (title, date, image)
   - [ ] Host's message (if any)
   - [ ] RSVP form

### Test 2.3: Anonymous RSVP
**Prerequisites:** Invitation with "Allow Anonymous RSVPs" enabled

1. [ ] Open invite link while logged out
2. [ ] Enter your name in the RSVP form
3. [ ] Select response: "Yes", "Maybe", or "No"
4. [ ] If +1 allowed, adjust plus-one count
5. [ ] Tap "Submit RSVP"
6. [ ] Verify confirmation message

### Test 2.4: Authenticated RSVP
1. [ ] Log in to the app
2. [ ] Open an invite link
3. [ ] Select response (Yes/Maybe/No)
4. [ ] Submit RSVP
5. [ ] Verify your profile name is shown

### Test 2.5: RSVP from Event Page
1. [ ] View an event you've been invited to
2. [ ] Look for "You're invited!" banner or RSVP button
3. [ ] Tap to RSVP directly from event page
4. [ ] Verify RSVP modal appears
5. [ ] Submit response

### Test 2.6: View Event Social Stats
1. [ ] Open an event that has RSVPs
2. [ ] Look for social stats bar showing:
   - [ ] Number of people "Going"
   - [ ] Number of shares
3. [ ] Stats should update after new RSVPs

### Test 2.7: Manage Your Invitations (Host View)
**Route:** `/my-invites`

1. [ ] Navigate to My Invites page (from profile or menu)
2. [ ] See list of invitations you've created
3. [ ] Each invitation shows:
   - [ ] Event name
   - [ ] RSVP counts (Yes/Maybe/No)
   - [ ] Link usage stats
4. [ ] Tap an invitation to expand details
5. [ ] View list of RSVPs with names
6. [ ] Test "Copy Link" button
7. [ ] Test "Deactivate" to disable a link

### Test 2.8: Passcode-Protected Invitation
1. [ ] Create invitation with passcode enabled
2. [ ] Open invite link
3. [ ] Verify passcode prompt appears
4. [ ] Enter wrong passcode → Error message
5. [ ] Enter correct passcode → Proceed to RSVP

---

## Phase 3: Followers System (Creators)

### Test 3.1: Switch to Creator Account
1. [ ] Go to Profile page
2. [ ] Tap "CREATOR" toggle at top
3. [ ] Verify stats row changes to show "FOLLOWERS" and "FOLLOWING"
4. [ ] Tap FOLLOWERS count → Navigate to followers page

### Test 3.2: Public User Profile
**Route:** `/user/[username]`

1. [ ] Navigate to a user's profile via:
   - [ ] Shared profile link
   - [ ] Tapping a user in followers/friends list
   - [ ] Direct URL entry
2. [ ] Verify profile displays:
   - [ ] Avatar (or initials placeholder)
   - [ ] Full name
   - [ ] @username
   - [ ] Bio (if set)
   - [ ] Creator badge (if creator account)
   - [ ] Stats (followers/following for creators, friends for personal)
3. [ ] For creator profiles: "Follow" button visible
4. [ ] For personal profiles: "Add Friend" button visible

### Test 3.3: Follow a Creator
**Prerequisites:** Another account set as "Creator"

1. [ ] Log in as a personal account
2. [ ] Find a creator profile (via Discover or direct link)
3. [ ] Tap "Follow" button
4. [ ] Button changes to "Following"
5. [ ] Creator's follower count increases by 1
6. [ ] Check your Following list - creator should appear

### Test 3.4: Unfollow a Creator
1. [ ] View a creator you're following
2. [ ] Tap "Following" button
3. [ ] Button changes back to "Follow"
4. [ ] Your Following count decreases

### Test 3.5: Followers Page
**Route:** `/followers`

1. [ ] Navigate to Followers page (from profile stats)
2. [ ] **Followers Tab:**
   - [ ] Shows users who follow you
   - [ ] Each row has Follow/Following button
   - [ ] Can follow back a follower
3. [ ] **Following Tab:**
   - [ ] Shows users you follow
   - [ ] Can unfollow from this list
   - [ ] Tap user to view their profile

### Test 3.6: Discover Creators
**Route:** `/discover-creators`

1. [ ] Navigate to Discover Creators page
2. [ ] Page shows grid of creator accounts
3. [ ] Each card displays:
   - [ ] Avatar
   - [ ] Name & username
   - [ ] Bio preview
   - [ ] Follower count
   - [ ] Follow button
4. [ ] Use search bar to filter creators
5. [ ] Tap Follow on any creator
6. [ ] Tap creator card to view full profile
7. [ ] Pull to refresh list

### Test 3.7: Following Activity Feed
**Route:** `/following-activity`

**Prerequisites:** Follow some creators who have shared events

1. [ ] Navigate to Following Activity page
2. [ ] See feed of events shared by followed creators
3. [ ] Each activity shows:
   - [ ] Creator avatar and name
   - [ ] "Shared an event" label
   - [ ] Time ago
   - [ ] Event card with image and details
4. [ ] Tap creator info → Go to creator profile
5. [ ] Tap event card → Go to event details
6. [ ] Pull to refresh

### Test 3.8: Profile Stats Navigation
1. [ ] Go to your profile as a Creator
2. [ ] Tap FOLLOWERS count → Opens followers tab
3. [ ] Tap FOLLOWING count → Opens following tab
4. [ ] Go to profile as Personal account
5. [ ] Tap FRIENDS count → Opens friends page

---

## Cross-Feature Tests

### Test X.1: Complete User Journey
1. [ ] New user signs up
2. [ ] Sets username
3. [ ] Adds bio
4. [ ] Sends friend request to another user
5. [ ] Follows a creator
6. [ ] Views an event
7. [ ] Creates an invitation for the event
8. [ ] Shares the invite link
9. [ ] Another user RSVPs via the link
10. [ ] Original user views RSVP list

### Test X.2: Creator Workflow
1. [ ] Switch account to Creator mode
2. [ ] Share your profile link
3. [ ] Another user follows you
4. [ ] Create event invitations
5. [ ] Check your follower count increased
6. [ ] View your followers list

### Test X.3: Privacy Settings
1. [ ] Set activity visibility to "Friends Only"
2. [ ] Check if non-friends can see your activity
3. [ ] Set to "Private"
4. [ ] Verify activity hidden from all

---

## Error Scenarios to Test

### Authentication Errors
- [ ] Access protected routes while logged out → Redirect to sign in
- [ ] Token expires during session → Handle gracefully

### Network Errors
- [ ] Airplane mode while loading → Show error state
- [ ] Slow connection → Show loading indicators

### Data Validation
- [ ] Invalid username format → Show validation error
- [ ] Duplicate username → Show "taken" error
- [ ] Empty required fields → Prevent submission

### Edge Cases
- [ ] View own profile via public URL → Show "Edit Profile" instead of Follow
- [ ] Send friend request to yourself → Should be prevented
- [ ] Follow yourself → Should be prevented
- [ ] RSVP to expired invitation → Show expired message
- [ ] Use invite link that's hit max uses → Show limit reached

---

## API Endpoints Reference

| Feature | Endpoint/Table | Method |
|---------|---------------|--------|
| Friend Requests | `friend_requests` | INSERT/SELECT/DELETE |
| Friendships | `friendships` | SELECT |
| Followers | `followers` | INSERT/DELETE/SELECT |
| Profiles | `profiles` | SELECT/UPDATE |
| Invitations | `event_invitations` | INSERT/SELECT/UPDATE |
| RSVPs | `event_rsvps` | INSERT/SELECT |
| Social Stats | `event_social_stats` | SELECT |

---

## Troubleshooting

### "User not found" on profile page
- Ensure the username exists in `profiles` table
- Check username is URL-encoded if it has special characters

### Friend request not appearing
- Check RLS policies allow inserting into `friend_requests`
- Verify both users have profiles created

### Invitation link not working
- Verify token was generated (check `event_invitations.invite_token`)
- Ensure `is_active = true` on the invitation
- Check invitation hasn't expired

### Follow button not working
- Ensure target user has `account_type = 'creator'`
- Check RLS policies on `followers` table
- Verify not trying to follow yourself

### Social stats not updating
- RSVPs trigger `update_event_social_stats()` function
- Check function exists and has proper permissions
- May need to refresh the page

---

## Notes

- All database operations use Row Level Security (RLS)
- Anonymous RSVPs store name only, no account required
- Invite tokens use `gen_random_uuid()` for generation
- Following is one-way (for creators), friendships are mutual
