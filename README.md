# Brooklyn Nite Out

A web application to discover and explore events in Brooklyn, powered by React, TypeScript, and Supabase.

## Project Overview

Brooklyn Nite Out aggregates event information from various Brooklyn venues into a single, easy-to-use interface. The application scrapes event data from venue websites, normalizes it, and stores it in a Supabase database for seamless access through the web application.

## Repository Structure

```
brooklyn-nite-out/      # Frontend React application
data/                   # Event data and data processing scripts
scraping/               # Web scraping scripts for venue websites
screenshots/            # Application screenshots
```

## Features

- Browse upcoming events from multiple Brooklyn venues
- Filter events by venue, date, and other criteria
- Dynamic UI with responsive design
- Backend powered by Supabase for reliable data storage

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL database)
- **Data Collection**: Python web scraping scripts
- **Data Processing**: Python data normalization and migration scripts

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python 3.9+
- Supabase account

### Frontend Setup

1. Navigate to the application directory:
   ```bash
   cd brooklyn-nite-out
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Data Processing and Migration

1. Install required Python packages:
   ```bash
   pip install requests python-dotenv
   ```

2. To scrape new event data:
   ```bash
   cd scraping
   python Jalopy.py
   python Sunnys.py
   ```

3. To merge and normalize scraped data:
   ```bash
   cd data
   python merge_files.py
   python normalize_time.py
   ```

4. To migrate data to Supabase:
   ```bash
   cd data
   python migrate_to_supabase.py
   ```

## Database Schema

The application uses a simple database schema in Supabase:

```sql
create table public."Events" (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  title text not null,
  date date not null,
  time time without time zone null,
  venue text not null,
  category text not null,
  url text not null,
  image text null,
  description text null,
  constraint Events_pkey primary key (id)
) TABLESPACE pg_default;
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


