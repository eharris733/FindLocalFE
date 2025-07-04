# Find Local Music: Frontend Application

A modern React + TypeScript frontend application for browsing local music events in Brooklyn. This app displays events scraped from venue websites and stored in Supabase.

## 🎨 Frontend Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Material-UI (MUI)** for component library
- **Date-fns** for date handling
- **Supabase** for backend services and data fetching

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ with npm
- Supabase project with events data

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
FindLocalFE/
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── README.md              # This file
├── main.py                # Backend API placeholder (development)
├── frontend/              # React application
│   ├── src/
│   │   ├── main.tsx       # App entry point
│   │   ├── supabase.tsx   # Supabase client configuration
│   │   ├── api/
│   │   │   └── events.ts  # Event data fetching
│   │   └── components/    # React components
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
└── screenshots/           # App screenshots
```

## 🔗 Supabase Integration

### Database Connection

The app connects to Supabase using environment variables:

```typescript
// frontend/src/supabase.tsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### Event API

Events are fetched through the events API:

```typescript
// frontend/src/api/events.ts
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('Events')
    .select('*')
    .order('date', { ascending: true });
  // ...
}
```

## 🎯 Features

- **Event Browsing**: View upcoming music events from Brooklyn venues
- **Date Filtering**: Filter events by date ranges
- **Responsive Design**: Mobile-friendly interface using Material-UI
- **Real-time Data**: Events fetched from Supabase database
- **Search & Sort**: Find events by venue, date, or event details

## 🛠️ Development

### Key Files

- [`frontend/src/main.tsx`](frontend/src/main.tsx) - App entry point with theme and providers
- [`frontend/src/supabase.tsx`](frontend/src/supabase.tsx) - Supabase client configuration
- [`frontend/src/api/events.ts`](frontend/src/api/events.ts) - Event data fetching logic
- [`frontend/index.html`](frontend/index.html) - HTML template with Google Fonts

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📊 Data Flow

1. **Event Data**: Events are stored in Supabase database (populated by separate scraping system)
2. **Frontend Fetch**: React app fetches events via Supabase client
3. **Real-time Display**: Events are displayed with filtering and sorting capabilities
4. **User Interaction**: Users can browse, search, and filter events

## 🔧 Configuration

### Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Supabase Setup

The app expects a `Events` table in Supabase with the following structure:

- Event title and description
- Date and time information
- Venue details
- Pricing information
- Additional event metadata

## 🚧 Current Status

- ✅ React frontend with Material-UI
- ✅ Supabase integration for data fetching
- ✅ Event browsing and filtering
- ✅ Responsive design
- 🚧 Backend API (placeholder in `main.py`)

## 🔍 Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Ensure `.env` file is properly configured
2. **Supabase Connection**: Verify your Supabase URL and API key
3. **Build Errors**: Check Node.js version (18+ required)
4. **No Events Displaying**: Verify events exist in your Supabase database

### Debug Tips

- Check browser console for network errors
- Verify Supabase connection in developer tools
- Ensure environment variables are loaded (check `import.meta.env`)

## 📝 License

This project is part of the Find Local Music platform for discovering local music events.