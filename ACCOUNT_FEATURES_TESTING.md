# Account Features Testing Checklist

## 🎯 Overview
This document provides a comprehensive testing guide for all account-related features implemented in FindLocal.

---

## 📋 Pre-Test Setup

### 1. Database Setup
- [ ] Run `database/sync_user_metadata_to_profile.sql` in Supabase SQL Editor
- [ ] Run `database/setup_cascade_delete.sql` in Supabase SQL Editor
- [ ] Verify tables exist:
  ```sql
  SELECT * FROM public.profiles LIMIT 1;
  SELECT * FROM public.account_deletions LIMIT 1;
  ```
- [ ] Verify functions exist:
  ```sql
  SELECT proname FROM pg_proc WHERE proname IN ('handle_new_user', 'delete_user_account', 'log_account_deletion');
  ```

### 2. Environment Check
- [ ] App is running (`npm start`)
- [ ] Can access Supabase Dashboard
- [ ] Have test email addresses ready (use + trick: `yourname+test1@gmail.com`)

---

## 🧪 Test Suite

## 1. Sign Up Flow

### Test 1.1: Email Sign Up - Basic
**Steps:**
1. Navigate to Sign Up page
2. Fill in email: `test+signup1@example.com`
3. Fill in password: `TestPass123!`
4. Fill in confirm password: `TestPass123!`
5. Check "I agree to Terms of Service" checkbox
6. Leave marketing opt-in unchecked
7. Click "Create Account"

**Expected Results:**
- [ ] Success message shown
- [ ] "Check your email for verification" message displayed
- [ ] Email sent to inbox
- [ ] No errors in console

**Verify in Supabase:**
```sql
SELECT * FROM auth.users WHERE email = 'test+signup1@example.com';
-- Check raw_user_meta_data contains: marketing_opt_in: false, agreed_to_terms: true
```

### Test 1.2: Email Sign Up - With Marketing Opt-In
**Steps:**
1. Navigate to Sign Up page
2. Fill in email: `test+signup2@example.com`
3. Fill in password: `TestPass123!`
4. Fill in confirm password: `TestPass123!`
5. Check "I agree to Terms of Service" checkbox
6. **Check "Send me personalized event recommendations" checkbox**
7. Click "Create Account"

**Expected Results:**
- [ ] Success message shown
- [ ] Email sent to inbox
- [ ] Marketing opt-in stored in metadata

**Verify in Supabase:**
```sql
SELECT raw_user_meta_data FROM auth.users WHERE email = 'test+signup2@example.com';
-- Should show: {"marketing_opt_in": true, "agreed_to_terms": true, ...}
```

### Test 1.3: Email Confirmation
**Steps:**
1. Open verification email
2. Click verification link
3. Wait for redirect

**Expected Results:**
- [ ] Redirected to `/auth/callback`
- [ ] "Completing sign in..." loading screen shown
- [ ] Redirected to home page (`/`)
- [ ] User is logged in
- [ ] Profile created in database

**Verify in Supabase:**
```sql
SELECT * FROM public.profiles WHERE email = 'test+signup2@example.com';
-- Should have: marketing_opt_in = true, email, id, created_at
```

### Test 1.4: Sign Up - Password Visibility Toggle
**Steps:**
1. Navigate to Sign Up page
2. Start typing password
3. Click eye icon on password field
4. Click eye icon again
5. Repeat for confirm password field

**Expected Results:**
- [ ] Password hidden by default (dots)
- [ ] Clicking eye shows password text
- [ ] Clicking again hides password
- [ ] Eye icon changes from eye-outline to eye-off-outline
- [ ] Both password fields work independently

### Test 1.5: Sign Up - Validation Errors
**Steps:**
1. Try to submit with empty fields
2. Try invalid email format
3. Try password < 6 characters
4. Try mismatched passwords
5. Try without checking terms checkbox

**Expected Results:**
- [ ] Red error messages shown below each field
- [ ] Form cannot be submitted until valid
- [ ] Errors clear when fields are corrected

### Test 1.6: Google Sign Up
**Steps:**
1. Click "Continue with Google" button
2. Follow OAuth flow
3. Grant permissions

**Expected Results:**
- [ ] Google logo shown on button
- [ ] OAuth popup/redirect works
- [ ] User created in database
- [ ] Redirected to home page
- [ ] Profile created automatically

**Note:** Google sign up doesn't capture marketing opt-in (no UI for it in OAuth flow)

---

## 2. Sign In Flow

### Test 2.1: Email Sign In - Success
**Steps:**
1. Navigate to Sign In page
2. Enter email: `test+signup2@example.com`
3. Enter correct password
4. Click "Sign In"

**Expected Results:**
- [ ] Loading state shown
- [ ] No errors
- [ ] Redirected to home page
- [ ] User is logged in
- [ ] Profile data loaded

### Test 2.2: Email Sign In - Wrong Password
**Steps:**
1. Navigate to Sign In page
2. Enter email: `test+signup2@example.com`
3. Enter wrong password
4. Click "Sign In"

**Expected Results:**
- [ ] Error message shown: "Invalid login credentials"
- [ ] User stays on sign in page
- [ ] Form is cleared/reset

### Test 2.3: Sign In - Password Visibility Toggle
**Steps:**
1. Navigate to Sign In page
2. Start typing password
3. Click eye icon

**Expected Results:**
- [ ] Password toggles between hidden/visible
- [ ] Eye icon changes appropriately

### Test 2.4: Google Sign In
**Steps:**
1. Click "Continue with Google" button
2. Select account

**Expected Results:**
- [ ] Google logo shown on button
- [ ] Sign in successful
- [ ] Redirected to home page

### Test 2.5: "Forgot Password" Link
**Steps:**
1. Navigate to Sign In page
2. Verify "Forgot Password?" link is directly below password field (left-aligned)
3. Click link

**Expected Results:**
- [ ] Link is below password field
- [ ] Link is left-aligned
- [ ] Navigates to password reset page

---

## 3. Password Reset Flow

### Test 3.1: Request Password Reset
**Steps:**
1. Navigate to Sign In page
2. Click "Forgot Password?"
3. Enter email: `test+signup2@example.com`
4. Click "Send Reset Link"

**Expected Results:**
- [ ] Success message: "Password reset email sent"
- [ ] Email received
- [ ] No errors in console

### Test 3.2: Complete Password Reset
**Steps:**
1. Open password reset email
2. Click reset link
3. Wait for redirect to `/user/reset`
4. Enter new password: `NewPass123!`
5. Confirm new password: `NewPass123!`
6. Click "Reset Password"

**Expected Results:**
- [ ] Redirected to `/auth/callback` first
- [ ] Then redirected to `/user/reset` page
- [ ] Both password fields have visibility toggles
- [ ] Success message shown after reset
- [ ] Auto-redirected to home page (`/`)
- [ ] User is logged in with new password
- [ ] No "Go to Home" button (it auto-redirects)

### Test 3.3: Password Reset - Validation
**Steps:**
1. Get to reset password page
2. Try mismatched passwords
3. Try password < 6 characters

**Expected Results:**
- [ ] Validation errors shown
- [ ] Cannot submit until valid
- [ ] Both password fields have eye toggles

### Test 3.4: Password Reset - Old Link
**Steps:**
1. Request password reset
2. Request another one immediately
3. Try to use first link

**Expected Results:**
- [ ] Error message about expired link
- [ ] Redirected to sign in page
- [ ] Suggestion to request new link

---

## 4. Profile Modal - Basic Features

### Test 4.1: Open Profile Modal - Logged Out
**Steps:**
1. Sign out if logged in
2. Click "Sign In" button in top navigation

**Expected Results:**
- [ ] Navigated to `/user/signin` page (not modal)
- [ ] Or modal opens with sign in/sign up buttons

### Test 4.2: Open Profile Modal - Logged In
**Steps:**
1. Sign in first
2. Click "Account" button in top navigation

**Expected Results:**
- [ ] Profile modal opens
- [ ] Shows user email
- [ ] Shows all sections: Profile, Preferences, Appearance, Help Us Improve, Legal
- [ ] Close button (X icon) in top right
- [ ] No emoji icons (all using Ionicons)

### Test 4.3: Close Profile Modal
**Steps:**
1. Open profile modal
2. Click X button
3. Open again
4. Swipe down (mobile) or click outside (web if applicable)

**Expected Results:**
- [ ] Modal closes on X click
- [ ] Modal closes on swipe down (mobile)
- [ ] Returns to previous screen

### Test 4.4: Sign Out
**Steps:**
1. Open profile modal
2. Click "Sign Out" button
3. Confirm if prompted

**Expected Results:**
- [ ] User is signed out
- [ ] Modal closes
- [ ] Top nav button changes from "Account" to "Sign In"
- [ ] Redirected appropriately

---

## 5. Profile Modal - City Picker

### Test 5.1: View Default Location
**Steps:**
1. Open profile modal
2. Find "Preferences" section
3. Look at "Default Location"

**Expected Results:**
- [ ] Shows label: "Default Location"
- [ ] Shows compact city badge (like top nav)
- [ ] Badge has: location pin icon (Ionicons) + city name + down arrow
- [ ] Badge is styled with border, rounded corners
- [ ] No separate "Select Your City" section (combined into one)

### Test 5.2: Change City
**Steps:**
1. Click city badge in Preferences section
2. City picker modal opens
3. Select different city (e.g., "New York")
4. Close city picker

**Expected Results:**
- [ ] City picker modal opens with full city list
- [ ] Can expand cities to see neighborhoods
- [ ] Selected city shows checkmark
- [ ] Closing picker updates badge to show new city
- [ ] Change persists if you close and reopen profile modal

**Verify in Supabase:**
```sql
SELECT preferred_city FROM public.profiles WHERE email = 'test+signup2@example.com';
-- Should show new city in lowercase (e.g., 'new york')
```

### Test 5.3: City Badge Matches Top Nav
**Steps:**
1. Note city in top navigation (desktop)
2. Open profile modal
3. Check city badge in Preferences

**Expected Results:**
- [ ] Same icon style (Ionicons location-outline)
- [ ] Same badge styling (rounded, border)
- [ ] Shows same city name
- [ ] Same interactive behavior

---

## 6. Profile Modal - Email Preferences

### Test 6.1: View Marketing Opt-In Status
**Steps:**
1. Sign in with account that has marketing_opt_in = true
2. Open profile modal
3. Scroll to Preferences section
4. Look for "Email Preferences"

**Expected Results:**
- [ ] Section visible under city picker
- [ ] Checkbox is checked (if opted in)
- [ ] Text: "Send me personalized event recommendations and FindLocal updates"
- [ ] Only visible for logged-in users

### Test 6.2: Toggle Marketing Opt-In ON
**Steps:**
1. Sign in with account that has marketing_opt_in = false
2. Open profile modal
3. Click marketing opt-in checkbox
4. Wait for save

**Expected Results:**
- [ ] Checkbox checks immediately (optimistic update)
- [ ] Loading spinner appears briefly
- [ ] No errors
- [ ] Stays checked after closing/reopening modal

**Verify in Supabase:**
```sql
SELECT marketing_opt_in FROM public.profiles WHERE email = 'your-email@example.com';
-- Should be true
```

### Test 6.3: Toggle Marketing Opt-In OFF
**Steps:**
1. Sign in with account that has marketing_opt_in = true
2. Open profile modal
3. Click checkbox to uncheck
4. Wait for save

**Expected Results:**
- [ ] Checkbox unchecks immediately
- [ ] Loading spinner appears
- [ ] Stays unchecked after reopen

**Verify in Supabase:**
```sql
SELECT marketing_opt_in FROM public.profiles WHERE email = 'your-email@example.com';
-- Should be false
```

### Test 6.4: Error Handling
**Steps:**
1. Disconnect internet or block Supabase
2. Try to toggle marketing opt-in
3. Check console for errors

**Expected Results:**
- [ ] Error logged to console
- [ ] Checkbox reverts to previous state
- [ ] No app crash
- [ ] User can try again

---

## 7. Profile Modal - Theme Toggle

### Test 7.1: Switch to Dark Mode
**Steps:**
1. Start in light mode
2. Open profile modal
3. Find "Appearance" section
4. Toggle theme switch

**Expected Results:**
- [ ] Toggle switches to dark
- [ ] Entire app switches to dark mode immediately
- [ ] Profile modal updates colors
- [ ] Icons remain visible (proper contrast)

### Test 7.2: Switch to Light Mode
**Steps:**
1. Start in dark mode
2. Toggle theme to light

**Expected Results:**
- [ ] App switches to light mode
- [ ] All colors update properly
- [ ] Text remains readable
- [ ] Icons visible

### Test 7.3: Theme Persistence
**Steps:**
1. Switch to dark mode
2. Close app/refresh page
3. Reopen app

**Expected Results:**
- [ ] Theme preference persists
- [ ] App opens in dark mode
- [ ] No flash of light mode

---

## 8. Profile Modal - Legal Links

### Test 8.1: Terms of Service Link (Web)
**Steps:**
1. Open profile modal on web browser
2. Click "Terms of Service"

**Expected Results:**
- [ ] Opens in NEW tab
- [ ] Shows terms page
- [ ] Profile modal stays open in original tab
- [ ] Chevron icon (not emoji) shown

### Test 8.2: Privacy Policy Link (Web)
**Steps:**
1. Open profile modal on web
2. Click "Privacy Policy"

**Expected Results:**
- [ ] Opens in NEW tab
- [ ] Shows privacy page
- [ ] Original tab unchanged

### Test 8.3: Legal Links (Mobile)
**Steps:**
1. Open profile modal on mobile
2. Click "Terms of Service"
3. Go back
4. Click "Privacy Policy"

**Expected Results:**
- [ ] Navigates within app (same window)
- [ ] Can go back to profile modal
- [ ] No new tabs opened (mobile doesn't support it)

---

## 9. Account Deletion

### Test 9.1: View Danger Zone
**Steps:**
1. Sign in
2. Open profile modal
3. Scroll to bottom

**Expected Results:**
- [ ] "Danger Zone" section visible
- [ ] Red border around section
- [ ] Warning text about permanence
- [ ] "Delete Account" button (outline style)
- [ ] Only visible for logged-in users

### Test 9.2: Delete Account - Cancel (Web)
**Steps:**
1. Click "Delete Account" button
2. Read confirmation dialog
3. Click "Cancel"

**Expected Results:**
- [ ] Browser confirm dialog appears
- [ ] Lists data that will be deleted
- [ ] Clicking Cancel closes dialog
- [ ] No deletion occurs
- [ ] Still logged in

### Test 9.3: Delete Account - Cancel (Mobile)
**Steps:**
1. Click "Delete Account" button
2. Read Alert dialog
3. Tap "Cancel"

**Expected Results:**
- [ ] Native Alert appears
- [ ] Shows warning message
- [ ] "Cancel" and "Delete Account" buttons
- [ ] Delete button is red (destructive style)
- [ ] Cancel works, no deletion

### Test 9.4: Delete Account - Confirm (CRITICAL TEST)
**⚠️ Use a test account you can lose!**

**Steps:**
1. Sign in with test account
2. Note the user ID and email
3. Open profile modal
4. Scroll to Danger Zone
5. Click "Delete Account"
6. Click "Delete Account" in confirmation
7. Wait for completion

**Expected Results:**
- [ ] Confirmation dialog appears
- [ ] Clicking confirm shows loading state
- [ ] "Deleting your account..." text appears
- [ ] Loading spinner shown
- [ ] Success message appears
- [ ] User is signed out automatically
- [ ] Redirected to home page (`/`)
- [ ] Top nav shows "Sign In" (not "Account")
- [ ] Cannot sign in with deleted credentials

**Verify in Supabase:**
```sql
-- User should be gone from auth
SELECT * FROM auth.users WHERE email = 'deleted-test@example.com';
-- Should return 0 rows

-- Profile should be gone (CASCADE DELETE)
SELECT * FROM public.profiles WHERE email = 'deleted-test@example.com';
-- Should return 0 rows

-- Deletion should be logged
SELECT * FROM public.account_deletions 
WHERE user_email = 'deleted-test@example.com'
ORDER BY deleted_at DESC LIMIT 1;
-- Should show deletion log entry
```

### Test 9.5: Delete Account - Error Handling
**Steps:**
1. Disconnect internet
2. Try to delete account
3. Confirm deletion

**Expected Results:**
- [ ] Error message appears
- [ ] User NOT signed out
- [ ] Can retry after reconnecting
- [ ] No partial deletion

---

## 10. Icon Consistency

### Test 10.1: Check All Icons
**Go through app and verify NO emojis, only Ionicons:**

**Top Navigation:**
- [ ] Menu/hamburger: `menu-outline` icon (not ☰ emoji)
- [ ] Close: `close-outline` icon (not ✕ emoji)
- [ ] Location badge: `location-outline` icon (not 📍 emoji)

**Event Cards:**
- [ ] Location: `location-outline` (not 📍)
- [ ] Date: `calendar-outline` (not 📅)
- [ ] Time: `time-outline` (not 🕐)

**Event Modal:**
- [ ] Close: `close` (not ✕)
- [ ] Calendar: `calendar-outline` (not 📅)
- [ ] Time: `time-outline` (not 🕐)
- [ ] Location: `location-outline` (not 📍)

**Event Bottom Sheet (mobile):**
- [ ] Same as Event Modal

**Profile Modal:**
- [ ] Close: `close` (not ✕)
- [ ] City picker: `location-outline` (not 📍)
- [ ] Legal chevrons: `chevron-forward` (not ›)

---

## 11. Auth Callback & Metadata Sync

### Test 11.1: New Signup - Metadata Sync
**Steps:**
1. Sign up new account with marketing opt-in checked
2. Verify email
3. Complete email confirmation

**Expected Results:**
- [ ] Redirected through `/auth/callback`
- [ ] "Completing sign in..." shown
- [ ] Redirected to home page
- [ ] No errors in console

**Verify in Supabase:**
```sql
-- Check auth metadata
SELECT raw_user_meta_data->'marketing_opt_in' as metadata_optin
FROM auth.users 
WHERE email = 'new-test@example.com';

-- Check profile table (should match metadata)
SELECT marketing_opt_in as profile_optin 
FROM public.profiles 
WHERE email = 'new-test@example.com';

-- Both should be TRUE
```

### Test 11.2: Existing User - No Metadata
**Steps:**
1. Sign in with old account (created before marketing opt-in feature)
2. Open profile modal
3. Check Email Preferences

**Expected Results:**
- [ ] Checkbox is unchecked (defaults to false)
- [ ] Can toggle it on
- [ ] Saves successfully

---

## 12. Cross-Platform Testing

### Test 12.1: Web Browser Testing
**Test in multiple browsers:**
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge (if available)

**Check:**
- [ ] All dialogs work (confirm, alert)
- [ ] Terms/Privacy open in new tabs
- [ ] Theme persists across refreshes
- [ ] City picker modal works

### Test 12.2: Mobile Testing (if available)
**Test on:**
- [ ] iOS device/simulator
- [ ] Android device/emulator

**Check:**
- [ ] React Native Alerts work
- [ ] Password toggles work
- [ ] Theme toggle works
- [ ] City picker works
- [ ] Account deletion works
- [ ] Swipe to close modals works

---

## 13. Data Persistence

### Test 13.1: Sign Out and Back In
**Steps:**
1. Set city to "Brooklyn"
2. Enable marketing opt-in
3. Switch to dark mode
4. Sign out
5. Sign back in
6. Open profile modal

**Expected Results:**
- [ ] City is still "Brooklyn"
- [ ] Marketing opt-in still checked
- [ ] Dark mode still active
- [ ] All preferences persisted

### Test 13.2: Multiple Devices
**Steps:**
1. Sign in on Device A
2. Change city to "Boston"
3. Sign in on Device B with same account

**Expected Results:**
- [ ] Device B shows "Boston" as city
- [ ] Marketing preferences match
- [ ] Profile data synced

---

## 14. Edge Cases

### Test 14.1: Rapid Toggling
**Steps:**
1. Click marketing opt-in checkbox rapidly 5 times
2. Wait for all requests to complete

**Expected Results:**
- [ ] Final state matches last click
- [ ] No errors in console
- [ ] Database shows correct final state

### Test 14.2: Offline Mode
**Steps:**
1. Open app while online
2. Disconnect internet
3. Try to change preferences
4. Reconnect internet

**Expected Results:**
- [ ] Changes attempted while offline show errors
- [ ] App doesn't crash
- [ ] Can retry after reconnecting

### Test 14.3: Long Session
**Steps:**
1. Sign in
2. Leave app open for 1+ hours
3. Try to change preferences

**Expected Results:**
- [ ] Session stays valid (Supabase handles refresh)
- [ ] Changes work without re-login
- [ ] Or gracefully prompts re-login if needed

---

## 15. Console Error Check

**Throughout ALL tests, monitor browser console:**
- [ ] No red errors during sign up
- [ ] No red errors during sign in
- [ ] No red errors during password reset
- [ ] No red errors when opening profile modal
- [ ] No red errors when changing preferences
- [ ] No red errors when deleting account
- [ ] Only expected warnings (if any)

---

## ✅ Final Checklist

After completing all tests:

### Database Verification
```sql
-- Check all triggers exist
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%user%';

-- Check all functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'handle_new_user',
  'handle_user_metadata_update', 
  'delete_user_account',
  'log_account_deletion'
);

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'account_deletions');

-- Verify no orphaned profiles
SELECT COUNT(*) as orphaned_count
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;
-- Should return 0
```

### Code Review
- [ ] No `console.log` left in production code
- [ ] All emojis replaced with Ionicons
- [ ] All Platform.OS checks in place for dialogs
- [ ] Error handling on all async operations
- [ ] Loading states on all buttons/actions
- [ ] Optimistic UI updates with error rollback

### Documentation
- [ ] `ACCOUNT_DELETION.md` read and understood
- [ ] `ACCOUNT_DELETION_QUICKSTART.md` reviewed
- [ ] SQL scripts documented in `database/` folder
- [ ] Team knows how to add CASCADE DELETE to new tables

---

## 🐛 Bug Report Template

If you find issues during testing:

**Issue Title:** [Component] Brief description

**Priority:** High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Screenshots/Console Errors:**

**Environment:**
- Device: Web / iOS / Android
- Browser: 
- Account: test+xxx@example.com

**Database State:**
```sql
-- Relevant query showing issue
```

---

## 📊 Test Results Summary

**Date:** ___________
**Tester:** ___________

**Pass Rate:** ___ / ___ tests passed

**Critical Issues Found:**
- 

**Minor Issues Found:**
- 

**Notes:**


---

## 🎉 Success Criteria

All tests pass, which means:
✅ Users can sign up with email or Google  
✅ Users can sign in and reset passwords  
✅ Password visibility toggles work  
✅ Email verification flows work  
✅ Marketing opt-in is captured and stored  
✅ Profile modal opens and closes properly  
✅ City picker works and persists  
✅ Email preferences can be toggled  
✅ Theme switching works  
✅ Legal links open correctly per platform  
✅ Account deletion works and cascades  
✅ No console errors  
✅ Data persists across sessions  
✅ Compliance audit trail exists  

**Ready for production! 🚀**
