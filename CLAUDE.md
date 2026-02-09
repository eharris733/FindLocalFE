# FindLocal Frontend - Developer Documentation

**Last Updated:** February 1, 2026
**React Native Version:** 0.81.5
**Expo SDK:** 54.0.0
**Target Platforms:** iOS, Android, Web

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture & Patterns](#architecture--patterns)
5. [Recent Changes & Fixes](#recent-changes--fixes)
6. [Important Conventions](#important-conventions)
7. [Platform-Specific Implementations](#platform-specific-implementations)
8. [Known Issues & Gotchas](#known-issues--gotchas)
9. [Development Guidelines](#development-guidelines)

---

## Project Overview

FindLocal is a cross-platform event discovery application built with React Native and Expo. It helps users discover local events, connect with venues, and manage their social calendar across Boston and New York City.

**Key Features:**
- Event discovery with advanced filtering (category, location, price, time)
- Multiple view modes: List, Map
- User authentication (Email, Google OAuth, Apple Sign-In)
- Favorites and RSVP management
- Venue following and social features
- Real-time event invitations
- Calendar integration (Google Calendar, Apple Calendar)
- Dark mode support
- Responsive design (mobile, tablet, web)

---

## Technology Stack

### Core Framework
- **React** 19.1.0 with **React Native** 0.81.5
- **Expo** 54.0.0 - Cross-platform development and build system
- **Expo Router** ~6.0.15 - File-based routing (Next.js-style)
- **React Native Web** 0.21.0 - Web platform support
- **TypeScript** ~5.9.2

### State Management
- **React Context API** - Global UI state (Theme, City, Auth, Favorites, etc.)
- **TanStack React Query** ^5.90.20 - Server state caching and synchronization
- **AsyncStorage** 2.2.0 - Local persistence layer

### Backend & Data
- **Supabase** ^2.50.5 - PostgreSQL backend, authentication, real-time subscriptions
- **Expo Auth Session** ^7.0.10 - OAuth 2.0 flows
- **Expo Secure Store** ~15.0.7 - Encrypted credential storage

### Maps & Location
- **React Native Maps** 1.20.1 - Native map views (iOS: Apple Maps)
- **@teovilla/react-native-web-maps** ^0.9.5 - Web map implementation

### UI & Forms
- **React Hook Form** ^7.63.0 - Form state management
- **Expo Vector Icons** ^15.0.3 - Icon library
- **Work Sans** (@expo-google-fonts) - Primary typeface
- **date-fns** ^4.1.0 - Date manipulation

### Development Tools
- **Expo Dev Client** ~6.0.20 - Custom development builds
- **Metro** - JavaScript bundler
- **Babel** - JavaScript transpiler

---

## Project Structure

```
src/
├── app/                           # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Discover/home page
│   ├── (private)/                # Protected routes (auth required)
│   │   ├── profile.tsx
│   │   └── my-invites.tsx
│   ├── user/                     # Authentication pages
│   │   ├── signin.tsx
│   │   ├── signup.tsx
│   │   └── [username].tsx
│   ├── event/[id].tsx            # Event detail page
│   ├── venue/[id].tsx            # Venue detail page
│   ├── create.tsx                # Event creation page
│   └── auth/callback.tsx         # OAuth callback handler
│
├── components/                    # React components
│   ├── ui/                       # Base UI components
│   │   ├── Text.tsx             # Themed text with variants
│   │   ├── Button.tsx           # Multi-variant button
│   │   ├── Input.tsx            # Form inputs
│   │   └── [other ui]
│   ├── EventCard.tsx             # Event list item
│   ├── EventMap.tsx              # Map view with markers
│   ├── CustomMapMarker.tsx       # Map marker component
│   ├── FilterBar.tsx             # Filter UI
│   ├── MainLayout.tsx            # Main content orchestrator
│   ├── TopNavigation.tsx         # Header navigation
│   ├── BottomTabBar.tsx          # Mobile bottom tabs
│   └── [other components]
│
├── context/                       # Global state (React Context)
│   ├── ThemeContext.tsx          # Light/dark theme
│   ├── CityContext.tsx           # City/region selection
│   ├── CommunityContext.tsx      # Interests/communities
│   ├── FavoritesContext.tsx      # Favorite events
│   └── FriendsContext.tsx        # Social connections
│
├── hooks/                         # Custom hooks
│   ├── useAuth.tsx               # Authentication state
│   ├── useDeviceInfo.ts          # Platform detection
│   ├── useEvents.ts              # Event filtering logic
│   └── queries/                  # React Query hooks
│       ├── useEventsQuery.ts
│       ├── useVenuesQuery.ts
│       └── useCommunitiesQuery.ts
│
├── api/                           # Supabase API layer
│   ├── events.ts                 # Event data fetching
│   ├── profiles.ts               # User profiles
│   ├── venues.ts                 # Venue data
│   ├── favorites.ts              # Favorites sync
│   ├── invitations.ts            # Event invitations
│   └── [other apis]
│
├── theme/                         # Design system
│   ├── index.ts                  # Theme exports
│   ├── colors.ts                 # Color palettes
│   ├── spacing.ts                # Spacing scale
│   └── typography.ts             # Font system
│
├── types/                         # TypeScript definitions
│   ├── events.d.ts
│   ├── venues.d.ts
│   └── env.d.ts
│
├── utils/                         # Utility functions
│   ├── logger.ts                 # Dev-only logging
│   ├── analytics.ts              # Event tracking
│   ├── dateUtils.ts
│   └── [other utils]
│
├── constants/                     # App constants
│   ├── storage-keys.ts           # AsyncStorage keys
│   └── eventCategories.ts
│
└── supabase.ts                    # Supabase client config
```

---

## Architecture & Patterns

### State Management Strategy

**Hybrid Approach:** Context API + React Query

#### Global UI State (React Context)

Five main context providers composed in `_layout.tsx`:

1. **ThemeContext** - Light/dark theme management
   ```tsx
   const { theme, isDark, setThemeMode } = useTheme();
   ```

2. **CityContext** - City and region selection
   ```tsx
   const { selectedCity, selectedRegions, onCityChange, onRegionsChange } = useCityLocation();
   ```

3. **CommunityContext** - Interest/category preferences
   ```tsx
   const { selectedCommunities, onCommunitiesChange } = useCommunity();
   ```

4. **FavoritesContext** - Favorite events (dual sync: local + cloud)
   ```tsx
   const { favoriteEventIds, isFavorite, toggleFavorite } = useFavorites();
   ```

5. **FriendsContext** - Social connections

#### Server State (React Query)

Query configuration:
- **Stale time:** 5 minutes
- **Cache time:** 30 minutes
- **Auto refetch:** On window focus, reconnect

Key queries:
- `useEventsQuery(city)` - Event data by city
- `useCommunitiesQuery(city)` - Community taxonomy
- `useVenuesQuery()` - Venue information

### Data Synchronization Pattern

**Favorites Sync (Example):**
1. User toggles favorite → Optimistic UI update
2. Save to AsyncStorage (immediate local persistence)
3. If logged in, sync to Supabase `profiles.favorite_events`
4. On login, merge local + cloud favorites (union)
5. Cloud data takes precedence on conflicts

### Routing Architecture (Expo Router)

File-based routing with dynamic segments:

**Protected Routes:**
```tsx
<Stack.Protected guard={isLoggedIn}>
  <Stack.Screen name="(private)" />
</Stack.Protected>
```

**Dynamic Routes:**
- `/event/[id]` → Event detail page
- `/venue/[id]` → Venue detail page
- `/user/[username]` → User profile
- `/invite/[token]` → Event invitation

**Deep Links:**
- iOS/Android: `findlocal://` scheme
- Web: Standard HTTP URLs

### Component Patterns

#### Compound Components
```tsx
// Text component with variants
<Text variant="h1" color="primary" align="center">Title</Text>
<Text variant="body1" color="secondary">Body</Text>
```

#### Render Props
```tsx
// Filter rendering pattern
{filters.categories.map(category => (
  <CategoryPill key={category} onPress={handleSelect} />
))}
```

#### Platform-Specific Files
```
MapView.native.tsx  // iOS/Android implementation
MapView.web.tsx     // Web implementation
MapView.tsx         // Re-exports based on Platform.OS
```

---

## Recent Changes & Fixes

### Map Implementation (January 2026)

**Issue:** React Native Maps with Google Maps SDK causing errors on iOS
**Solution:** Switched to Apple Maps (default provider)

**Changes made:**
1. Removed `provider="google"` prop from MapView (EventMap.tsx:254)
2. Added `app.config.js` with environment variable support for Google Maps API key
3. Configured Podfile for react-native-maps
4. **Result:** Using Apple Maps on iOS, no additional SDK required

**Files changed:**
- `src/components/EventMap.tsx` - Removed Google Maps provider
- `app.config.js` - Created with env var references
- `ios/Podfile` - Added react-native-maps configuration

### Mobile Map UX Redesign (January 2026)

**Issue:** Map callouts (tooltips) were unreliable on iOS - clipping, state management issues, broken interactions

**Solution:** Native-style bottom sheet for mobile platforms

**Implementation:**
- **Web:** Continues using custom tooltips with Callout component
- **Mobile (iOS/Android):** Bottom sheet slides up from bottom when marker tapped
  - Shows event image, title, venue name
  - Navigation arrows for multiple events
  - "See Event" and "See Venue" buttons
  - Smooth animations, native feel

**Files changed:**
- `src/components/CustomMapMarker.tsx` - Platform-specific callout rendering
- `src/components/EventMap.tsx` - Added bottom sheet state and UI

**Key code:**
```tsx
// Web: Callout with tooltip
{Platform.OS === 'web' && isActive && <Callout tooltip>...</Callout>}

// Mobile: Bottom sheet overlay
{Platform.OS !== 'web' && selectedVenue && (
  <View style={styles.bottomSheet}>...</View>
)}
```

### Map State Management Fix (January 2026)

**Issue:** Map auto-fitting to venues interfering with user interactions, causing unexpected zoom changes

**Solution:** Track user interaction state to prevent auto-fit after manual interaction

**Implementation:**
```tsx
const hasUserInteractedRef = useRef<boolean>(false);

// Mark interaction on:
// - Marker tap
// - Callout toggle
// - Map pan/drag
// - Region change

// Only auto-fit if !hasUserInteractedRef.current
```

**Files changed:**
- `src/components/EventMap.tsx` - Added interaction tracking

### Layout Padding Fixes (January 2026)

**Issue:** Excessive padding between app header and page content (60+ pixels on iOS)

**Root causes:**
1. SafeAreaView adding top insets when Stack navigator already handles layout
2. TopNavigation had bottom padding
3. FilterBar had top padding
4. Event/create pages had hardcoded top padding for iOS

**Solutions:**
1. **Event Detail Page:** Removed SafeAreaView, replaced with regular View
   ```tsx
   // Before: <SafeAreaView edges={['top', 'bottom']}>
   // After:  <View>
   ```

2. **Create Page:** Removed hardcoded iOS paddingTop
   ```tsx
   // Before: paddingTop: Platform.OS === 'ios' ? 60 : 12
   // After:  (removed, using Stack layout)
   ```

3. **TopNavigation:** Removed bottom padding
   ```tsx
   // Before: paddingVertical: 8
   // After:  paddingTop: 8, paddingBottom: 0
   ```

4. **FilterBar:** Removed top padding
   ```tsx
   // Before: paddingVertical: 8
   // After:  paddingTop: 0, paddingBottom: 8
   ```

**Files changed:**
- `src/app/event/[id].tsx` - Removed SafeAreaView import and usage
- `src/app/create.tsx` - Removed iOS-specific paddingTop
- `src/components/TopNavigation.tsx` - Removed bottom padding
- `src/components/FilterBar.tsx` - Removed top padding

**Result:** All pages now sit flush against header with no unwanted spacing

### Feedback Banner Removal (January 2026)

**Issue:** Feedback banner taking up space, creating extra padding

**Solution:** Removed FeedbackBanner component from layout

**Files changed:**
- `src/components/MainLayout.tsx` - Removed FeedbackBanner import and usage
- `src/components/DiscoverPageContent.tsx` - Removed onFeedbackPress prop
- `src/app/index.tsx` - Removed onFeedbackPress from DiscoverPageContent call

**Note:** FeedbackModal still available via other navigation paths

### Navigation UI Simplification (February 2026)

**Changes:** Simplified mobile navigation for beta release

**Mobile navigation (TopNavigation.tsx):**
- Top left: Hamburger menu → City picker button (shows city name + dropdown arrow)
- Top right: Account text → Profile icon (navigates to `/profile` page or `/user/signin`)
- Web navigation unchanged (full nav links remain)

**Bottom tab bar (BottomTabBar.tsx):**
- Replaced Profile tab with Map tab
- Map is now a dedicated route: `/map` (separate page, not a view toggle)
- Tabs: Home, Discover, Create, Friends, Map

**Discover and Map are separate pages:**
- `/` (Discover) - List view only, no view toggle
- `/map` - Map view only, dedicated page
- Removed ViewToggle component usage from FilterBar
- MainLayout now only renders list view (no activeTab state)

**Profile consolidation:**
- Deleted `ProfileModal.tsx`
- All settings/preferences moved to Profile page (`src/app/(private)/profile.tsx`)

**Files changed:**
- `src/components/TopNavigation.tsx` - Mobile city picker + profile icon
- `src/components/BottomTabBar.tsx` - Map tab routes to `/map`
- `src/components/MainLayout.tsx` - List view only, removed view mode switching
- `src/app/map.tsx` - NEW: Dedicated map page
- `src/app/index.tsx` - Simplified, list view only
- Deleted: `GalleryView.tsx`, `ProfileModal.tsx`

### Map Zoom & Safe Area Fixes (February 2026)

**Issue:** Map zooming in too far by default when venues are clustered; bottom sheet not respecting safe area on notched devices; map not auto-fitting on subsequent visits

**Solutions:**
1. Added `minZoomLevel={10}` and `maxZoomLevel={18}` to MapView to constrain zoom range
2. Added `edgePadding` to `fitToCoordinates()` call to prevent extreme zoom when fitting to venues
3. Used `useSafeAreaInsets()` to add proper bottom padding to the mobile bottom sheet
4. Reset `hasUserInteractedRef` when `selectedCity` changes to allow auto-fit on fresh navigations

**Key pattern for overlays on mobile:**
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

// Apply to bottom-positioned elements
<View style={{ paddingBottom: insets.bottom }}>
```

**Files changed:**
- `src/components/EventMap.tsx` - Zoom limits, edge padding, safe area insets, auto-fit reset

---

## Important Conventions

### Icons & Emojis

Use emojis instead of icon libraries (Ionicons, MaterialIcons, etc.) for all UI elements. This applies to navigation, form fields, buttons, and decorative elements. Emojis render consistently across iOS, Android, and web without requiring additional dependencies.

### TypeScript

**Strict mode enabled:**
- All props must have explicit types
- No implicit `any`
- Readonly props interfaces: `Readonly<Props>`

**Type definitions:**
- Events: `src/types/events.d.ts`
- Venues: `src/types/venues.d.ts`
- Environment: `src/types/env.d.ts`

### Component Naming

- **Pages:** `{Name}Route` or `{Name}Page` (e.g., `IndexRoute`, `EventPage`)
- **Contexts:** `{Name}Context` with `{Name}Provider` (e.g., `ThemeContext`, `ThemeProvider`)
- **Hooks:** `use{Name}` (e.g., `useAuth`, `useEvents`)
- **API functions:** Descriptive verbs (e.g., `getEvents`, `updateProfile`)

### File Organization

**Platform-specific files:**
```
Component.tsx           # Default/shared implementation
Component.native.tsx    # iOS/Android specific
Component.web.tsx       # Web specific
```

**Style patterns:**
```tsx
// StyleSheet at bottom of file
const styles = StyleSheet.create({
  container: { flex: 1 },
  // Conditional platform styles
  header: {
    ...Platform.select({
      ios: { paddingTop: 8 },
      android: { paddingTop: 12 },
      web: { paddingTop: 0 },
    }),
  },
});
```

### Theme Usage

**Always use theme colors:**
```tsx
// ✅ Good
<View style={{ backgroundColor: theme.colors.background.primary }}>

// ❌ Bad
<View style={{ backgroundColor: '#FFFFFF' }}>
```

**Typography variants:**
- Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Body: `body1`, `body2`
- Small: `caption`, `overline`
- Interactive: `button`, `link`

### Error Handling

**Development logging:**
```tsx
import { logger } from '../utils/logger';

// Development only - stripped in production
logger.info('User action:', data);
logger.error('API error:', error);
logger.debug('State update:', state);
```

**User-facing errors:**
```tsx
import { showToast } from '../utils/toast';

try {
  await updateProfile(data);
  showToast('Profile updated!', 'success');
} catch (error) {
  logger.error('Update failed:', error);
  showToast('Failed to update profile', 'error');
}
```

---

## Platform-Specific Implementations

### Authentication

**Web:**
- OAuth implicit flow
- Session stored in localStorage
- Redirect URL: `window.location.origin + '/auth/callback'`

**Mobile:**
- OAuth PKCE flow
- Secure token storage via Expo Secure Store
- Deep link redirect: `findlocal://auth/callback`
- Auto token refresh on app state change

### Maps

**iOS/Android:**
- `react-native-maps` with native MapView
- Apple Maps (default provider)
- Native marker clustering
- Gesture handling

**Web:**
- `@teovilla/react-native-web-maps`
- Google Maps JavaScript API
- Custom marker rendering
- DOM-based interactions

### Storage

**Persistent data:**
- Mobile: `@react-native-async-storage/async-storage`
- Web: localStorage wrapper

**Secure credentials:**
- Mobile: `expo-secure-store` (Keychain/Keystore)
- Web: Not available (use session tokens only)

### Navigation

**Mobile:**
- Bottom tab bar for primary navigation
- Native stack navigation with gestures
- Deep link support

**Web:**
- Top navigation only
- Browser back/forward support
- URL-based routing

---

## Known Issues & Gotchas

### Safe Area Handling

**⚠️ Important:** When using Expo Router with Stack navigation, **DO NOT** add SafeAreaView with `top` edge to page components. The Stack navigator already handles safe area layout.

```tsx
// ❌ Wrong - Double safe area
<SafeAreaView edges={['top', 'bottom']}>
  <View>Content</View>
</SafeAreaView>

// ✅ Correct - Stack handles top, we handle bottom only if needed
<View>
  <View>Content</View>
</View>
```

**When to use SafeAreaView:**
- Modals that cover the entire screen
- Custom full-screen overlays
- **Always use `edges={['bottom']}` only** if inside Stack navigation

### Map Performance

**Issue:** Re-rendering all markers on every map move causes performance issues

**Solution:**
- Use `tracksViewChanges={false}` on Marker components
- Memoize marker components
- Limit number of visible markers (cluster or paginate)

**Current implementation:**
```tsx
<Marker tracksViewChanges={false} />
```

### Favorites Sync Conflicts

**Issue:** Local favorites can conflict with cloud favorites after login

**Current behavior:**
- Merges local + cloud (union of both)
- Cloud data takes precedence
- Fresh onboarding data always syncs to cloud

**Edge case:** User favorites event locally, then favorites different events in cloud on another device
- **Result:** Both sets merge (no data loss)

### Theme Switching Flash

**Issue:** Brief white flash when switching from light to dark theme

**Mitigation:**
- Theme persisted to AsyncStorage
- Loaded synchronously on app start
- StatusBar color updates immediately

**Known limitation:** First app launch may show brief flash before theme loads

### Deep Link Handling

**iOS:**
- Custom URL scheme: `findlocal://`
- Universal links: Not configured yet
- OAuth redirect must match exactly: `findlocal://auth/callback`

**Android:**
- Intent filters configured in app.json
- Scheme: `findlocal://`

**Web:**
- Standard HTTP URLs
- No special configuration needed

### Image Loading

**Issue:** Event/venue images may fail to load

**Fallback hierarchy:**
1. Event image (`event.image_url`)
2. Venue image (`venue.image`)
3. Default placeholder (`assets/record.png`)

**Implementation:**
```tsx
const imageSource = event?.image_url
  ? { uri: event.image_url }
  : venue?.image
    ? { uri: venue.image }
    : require('../assets/record.png');
```

### Date Handling

**Timezone considerations:**
- All dates stored in UTC in database
- Display in user's local timezone via `date-fns`
- Event times stored as strings (e.g., "19:00")
- Full datetime constructed from date + time string

**Format functions:**
```tsx
import { format, parseISO } from 'date-fns';

// Display date
format(parseISO(event.event_date), 'MMM d, yyyy');

// Display time
formatMilitaryTime(event.event_time); // "19:00" → "7:00 PM"
```

---

## Development Guidelines

### Adding a New Feature

1. **Plan component structure** - Determine if it's a page, component, or utility
2. **Create types** - Add TypeScript interfaces to `src/types/`
3. **Add API functions** - Create data fetching logic in `src/api/`
4. **Build UI components** - Use theme system, follow naming conventions
5. **Handle state** - Use appropriate state management (Context vs React Query)
6. **Test on all platforms** - Web, iOS simulator, Android emulator
7. **Handle errors** - Add proper error boundaries and user feedback

### Working with Forms

**Preferred library:** React Hook Form

```tsx
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();

const onSubmit = (data) => {
  // Handle form submission
};

<Input
  {...register('email', { required: 'Email is required' })}
  error={errors.email?.message}
/>
```

### Adding a New Route

1. Create file in `src/app/` directory
2. Use naming convention: `[param].tsx` for dynamic routes
3. Wrap in `(group)` folder if auth protection needed
4. Export default component
5. Add to navigation if needed

### Styling Best Practices

1. **Use theme system** - Always reference `theme.colors`, `theme.spacing`, etc.
2. **Responsive design** - Use `useDeviceInfo` for conditional rendering
3. **Platform-specific styles** - Use `Platform.select()` or platform files
4. **Avoid hardcoded values** - Use theme scales
5. **Dark mode support** - Test both light and dark themes

### Performance Optimization

1. **Memoize expensive computations** - Use `useMemo`, `useCallback`
2. **Lazy load components** - Use `React.lazy()` for heavy components
3. **Optimize lists** - Use `FlatList` with `keyExtractor` and `getItemLayout`
4. **Image optimization** - Use appropriate resolutions, lazy load images
5. **Query caching** - Leverage React Query's caching strategies

### Testing Checklist

Before committing:
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator (if Android changes)
- [ ] Tested on web browser
- [ ] Tested light and dark themes
- [ ] Tested mobile and tablet layouts (if layout changes)
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Follows existing code conventions

### Common Commands

```bash
# Development
npm start                    # Start Expo dev server
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npm run web                  # Run web version

# Building
npm run build                # Build for web (production)
npx expo prebuild            # Generate native projects
eas build --platform ios     # Build for iOS (EAS)
eas build --platform android # Build for Android (EAS)

# Utilities
npx expo install [package]   # Install Expo-compatible package
pod install                  # Install iOS dependencies (in ios/ dir)
```

---

## Additional Resources

### Supabase Schema

**Key tables:**
- `events_gold` - Event data with venue relationships
- `profiles` - User profiles with preferences
- `venues` - Venue information
- `communities` - Category taxonomy
- `event_rsvps` - RSVP status tracking
- `event_invitations` - Invitation management
- `friends` - Social relationships

### Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
```

### Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)

---

**Document Maintenance:**
This file should be updated whenever:
- Major architectural changes are made
- New patterns are introduced
- Platform-specific implementations change
- Critical bugs are fixed
- New dependencies are added

Last reviewed: February 1, 2026
