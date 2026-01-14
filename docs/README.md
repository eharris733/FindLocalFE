# FindLocal - Discover Local Events

A React Native mobile app (iOS, Android, and Web) for discovering local events, powered by Expo and Supabase.

## 🎯 Features

### Event Discovery
- **Browse Events**: View upcoming events from multiple cities (Boston, New York)
- **Smart Filtering**: Filter by category, date range, location, and search terms
- **Multiple Views**: Switch between list, gallery, and map views
- **Event Details**: Rich event information including venue details, pricing, and descriptions
- **Favorites**: Save events to your favorites (synced across devices when logged in)

### Personalization
- **City Selection**: Choose your preferred city for personalized event recommendations
- **Region Filtering**: Narrow down events by specific neighborhoods/regions
- **Theme Support**: Light and dark mode
- **Responsive Design**: Optimized for mobile, tablet, and web

### Account Features
- **Sign Up/Sign In**: Email authentication with optional Apple Sign In
- **Profile Management**: Manage preferences, marketing opt-in, and account settings
- **Privacy Controls**: Full control over your data with GDPR/CCPA compliance
- **Account Deletion**: Complete account deletion with automatic data cleanup
- **Favorites Sync**: Favorites automatically sync to cloud when logged in

### Additional Features
- **Feedback System**: Submit bugs, feature requests, or general feedback
- **Beta Testing**: Join the beta program for early access to new features
- **Venue Information**: Detailed venue profiles with capacity, type, and location
- **Direct Links**: Quick access to event ticketing and venue websites

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FindLocalFE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Set up Supabase**
   
   Run the SQL scripts in your Supabase SQL Editor:
   ```bash
   database/migration_add_agreed_to_terms_date.sql
   database/sync_user_metadata_to_profile.sql
   database/setup_cascade_delete.sql
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

## 📱 Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web
```bash
npm run web
```

## 🏗️ Project Structure

```
FindLocalFE/
├── src/
│   ├── app/                    # Expo Router pages
│   │   ├── index.tsx           # Home page
│   │   ├── about.tsx           # About page
│   │   ├── privacy.tsx         # Privacy policy
│   │   ├── terms.tsx           # Terms of service
│   │   └── user/               # Auth pages
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── user/               # Auth components
│   │   ├── MainLayout.tsx      # Main app layout
│   │   ├── EventModal.tsx      # Event detail modal
│   │   ├── VenueModal.tsx      # Venue detail modal
│   │   ├── ProfileModal.tsx    # User profile modal
│   │   └── FeedbackModal.tsx   # Feedback submission
│   ├── context/                # React Context providers
│   │   ├── ThemeContext.tsx    # Theme management
│   │   ├── CityContext.tsx     # City/region selection
│   │   └── FavoritesContext.tsx # Favorites management
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.tsx         # Authentication hook
│   │   ├── useEvents.tsx       # Event data hook
│   │   └── useDeviceInfo.tsx   # Device detection
│   ├── api/                    # Supabase API functions
│   │   ├── events.ts           # Event queries
│   │   ├── venues.ts           # Venue queries
│   │   ├── profiles.ts         # User profile operations
│   │   ├── favorites.ts        # Favorites sync
│   │   └── feedback.ts         # Feedback submission
│   ├── providers/              # App-level providers
│   │   └── auth-provider.tsx   # Auth context provider
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Utility functions
│   │   ├── logger.ts           # Logging utility
│   │   └── cityUtils.ts        # City helpers
│   ├── theme.ts                # Theme configuration
│   └── supabase.ts             # Supabase client
├── database/                   # SQL migration scripts
├── assets/                     # Static assets
├── .env                        # Environment variables
├── app.json                    # Expo configuration
├── babel.config.js             # Babel configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## 🗄️ Database Schema

### Main Tables
- **events_gold**: Event data (title, date, venue, pricing, etc.)
- **venues**: Venue information (name, address, capacity, type)
- **profiles**: User profiles (preferences, favorites, marketing opt-in)
- **user_feedback**: User feedback submissions
- **account_deletions**: Audit log for deleted accounts

### Key Features
- **Row Level Security (RLS)**: Secure data access per user
- **Cascade Deletes**: Automatic cleanup on account deletion
- **Database Functions**: Server-side logic for data integrity
- **Real-time Subscriptions**: Live updates via Supabase Realtime

## 🔧 Configuration

### Expo Configuration

Key settings in [`app.json`](app.json):
- iOS Bundle ID: `com.yourcompany.findlocal`
- Android Package: `com.yourcompany.findlocal`
- Custom URL Scheme: `findlocal://`
- Supported platforms: iOS, Android, Web

### Authentication

Supported auth methods:
- Email/Password (with email verification)
- Apple Sign In (iOS only)
- Google Sign In (coming soon)

### Environment-Specific Behavior

The app adapts based on platform:
- **iOS**: Native Apple Sign In, platform-specific UI
- **Android**: Material Design components
- **Web**: Responsive design with desktop optimizations

## 📊 Data Flow

### Event Loading
1. User selects city/region in [`CityContext`](src/context/CityContext.tsx)
2. [`useEvents`](src/hooks/useEvents.tsx) hook fetches events via [`src/api/events.ts`](src/api/events.ts)
3. Events filtered and sorted based on user preferences
4. Displayed in [`MainLayout`](src/components/MainLayout.tsx) (list, gallery, or map view)

### Favorites Management
1. User toggles favorite on event
2. [`FavoritesContext`](src/context/FavoritesContext.tsx) updates local state
3. Saved to AsyncStorage for offline access
4. Synced to Supabase if user is authenticated
5. Merged with cloud favorites on login

### Authentication Flow
1. User signs up/in via [`SignUp`](src/components/user/SignUp.tsx) or [`SignIn`](src/components/user/SignIn.tsx)
2. Auth state managed by [`AuthProvider`](src/providers/auth-provider.tsx)
3. Email verification via [`AuthCallback`](src/components/AuthCallback.tsx)
4. Profile data synced between `auth.users` metadata and `profiles` table
5. Session persisted across app restarts

## 🧪 Testing

### Account Features Testing
Follow the comprehensive guide in [`ACCOUNT_FEATURES_TESTING.md`](ACCOUNT_FEATURES_TESTING.md) for testing:
- Sign up/sign in flows
- Email verification
- Profile management
- Marketing preferences
- Account deletion
- Edge cases

### Logging
The app uses a custom logger ([`src/utils/logger.ts`](src/utils/logger.ts)) for debugging:
```typescript
import { logger } from './utils/logger';

logger.info('User signed in');
logger.error('Failed to fetch events', error);
logger.debug('Event data:', event);
```

See [`LOGGER_USAGE.md`](LOGGER_USAGE.md) for best practices.

## 🚧 Current Status

### ✅ Completed
- React Native app with Expo Router
- Supabase integration for all data
- Multi-city support (Boston, New York)
- Event filtering and search
- Multiple view modes (list, gallery, map)
- User authentication (email, Apple)
- Profile management
- Favorites system with cloud sync
- Theme support (light/dark)
- Feedback system
- Account deletion with audit trail
- Privacy policy and terms of service

### 🚧 In Progress
- Additional cities
- Google Sign In
- Friend system
- Event invitations
- Artist event promotion

### 📋 Planned
- Push notifications
- Calendar integration
- Venue reviews and ratings
- Event recommendations
- Social sharing

## 🔍 Troubleshooting

### Common Issues

1. **Supabase Connection Errors**
   - Verify environment variables in `.env`
   - Check Supabase project status
   - Ensure RLS policies are correctly configured

2. **Authentication Issues**
   - Clear app data/cache
   - Check email verification status in Supabase
   - Verify redirect URLs in Supabase settings

3. **Missing Events**
   - Verify events exist for selected city
   - Check date filters
   - Review console for API errors

4. **Map Not Loading (Web)**
   - Verify Google Maps API key
   - Check API key restrictions in Google Cloud Console

### Debug Tips

- Enable debug logs: Set `enableDebugLogs: true` in [`app.json`](app.json) extra config
- Check Supabase logs: Auth, Realtime, and Database tabs
- Use React Native Debugger for detailed inspection
- Review network requests in browser DevTools (web)

## 📄 Documentation

- [`ACCOUNT_FEATURES_TESTING.md`](ACCOUNT_FEATURES_TESTING.md) - Testing guide for account features
- [`LOGGER_USAGE.md`](LOGGER_USAGE.md) - Logging best practices

## 📝 License

This project is part of the FindLocal platform for discovering local events.

## 🤝 Contributing

Interested in contributing? Email [findlocalinternal@gmail.com](mailto:findlocalinternal@gmail.com)

## 📧 Contact

- Email: [findlocalinternal@gmail.com](mailto:findlocalinternal@gmail.com)
- Instagram: [@findl0cal](https://www.instagram.com/findl0cal/)
- Beta Testing: [Sign Up Form](https://forms.gle/diBZKyejuUXsdQu46)