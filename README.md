# Find Local Music: Event Scraping & Display Platform

A web scraping and event display platform that extracts music venue events from Brooklyn (more cities to come in the future!) venues and displays them through a React frontend, with data stored in Supabase.

## Architecture Overview

This project consists of three main components:

1. **Web Scrapers** (`crawlers/`) - Automated event extraction from venue websites
2. **Frontend** (`frontend/`) - React/TypeScript interface for browsing events
3. **Supabase Integration** - Cloud database for event storage and retrieval

## 🕷️ Web Scraping System

The scraping system uses [crawl4ai](https://docs.crawl4ai.com/) with AI-powered schema generation to extract structured event data from venue websites.

### Key Features

- **AI Schema Generation**: Uses OpenAI GPT-4o-mini to automatically generate extraction schemas for new venues
- **JsonCssExtractionStrategy**: Structured data extraction using CSS selectors
- **Venue Configuration**: CSV-based configuration for managing venues and their scraping parameters
- **Schema Caching**: Generated schemas are saved and reused to avoid redundant API calls

### Main Scraper

The primary scraper is located in `crawlers/coding_this_my_goddamn_self.py`:

```python
# Processes venues from Brooklyn_Music_Venues.csv
# Generates schemas using OpenAI if not present
# Extracts event data using crawl4ai
# Automatically updates venue schema status
```

### How It Works

1. **Configuration Loading**: Reads venue data from CSV including URLs and CSS selectors
2. **Schema Check**: Determines if a venue already has a generated schema
3. **Schema Generation**: For new venues, crawls the page and uses AI to create extraction schema
4. **Data Extraction**: Uses the schema to extract structured event data
5. **Schema Persistence**: Saves generated schemas for future use

### Configuration

Venue configurations are stored in `configs/Brooklyn_Music_Venues.csv` with:
- **Venue_Name**: Unique identifier for the venue
- **Start_URL**: Primary URL to scrape events from
- **CSS**: CSS selector to target event container elements
- **Has_Schema**: Auto-updated flag indicating schema availability

### Schema Generation Process

The AI-powered schema generation (`generate_schema_with_openai()`) function:

```python
def generate_schema_with_openai(raw_selected_html: str, name: str) -> dict:
    """
    Generate JsonCssExtractionStrategy schema using OpenAI.
    
    - Uses GPT-4o-mini with temperature 0.2 for consistent results
    - Validates schema structure for required fields
    - Saves schema to scraper_config/schemas/ directory
    """
```

Generated schemas include fields for:
- Event title and description
- Date and time information
- Venue details
- Pricing information
- Additional event metadata

### Schema Management

The system automatically manages schemas through:

```python
def update_scraper_config():
    """
    Updates the Has_Schema column in the CSV based on 
    existing schema files in the schemas/ directory
    """
```

## 🔗 Supabase Integration

### Database Connection

The frontend connects to Supabase using environment variables:

```typescript
// frontend/src/supabase.tsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### Event API

Events are fetched through `frontend/src/api/events.ts`:

```typescript
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('Events')
    .select('*')
    .order('date', { ascending: true });
  // ...
}
```

### Data Migration

Events can be uploaded to Supabase using `data/migrate_to_supabase.py`:

```python
# Uploads/updates events from merged_events.json to Supabase
# Uses upsert to handle duplicates
```

## 🎨 Frontend

A modern React + TypeScript application built with Vite and Material-UI.

### Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Material-UI (MUI)** for component library
- **Date-fns** for date handling
- **Supabase** for backend services

### Key Files

- `frontend/src/main.tsx` - App entry point with theme and date picker providers
- `frontend/src/supabase.tsx` - Supabase client configuration
- `frontend/src/api/events.ts` - Event data fetching
- `frontend/index.html` - HTML template with Google Fonts

### Development

```bash
cd frontend
npm install
npm run dev
```

## 🚀 Setup Instructions

### Prerequisites

- Python 3.9+ with pip
- Node.js 18+ with npm
- Supabase account and project
- OpenAI API key for schema generation

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### Python Dependencies

```bash
pip install -r requirements.txt
```

Key dependencies:
- `crawl4ai` - Web scraping framework
- `openai` - AI schema generation
- `pandas` - Data manipulation
- `supabase` - Database client
- `beautifulsoup4` - HTML parsing
- `python-dotenv` - Environment variable management

### Directory Structure

```
crawlers/
├── coding_this_my_goddamn_self.py    # Main scraper
├── prompts/
│   └── generate_jsoncss_prompt.py    # AI prompt generation
└── scraper_config/
    ├── Brooklyn_Music_Venues.csv     # Venue configuration
    └── schemas/                      # Generated schemas directory
        └── {venue_name}_schema.json  # Individual venue schemas
```

### Running the Scraper

```bash
cd crawlers
python coding_this_my_goddamn_self.py
```

The scraper will:
1. Load venue configurations from CSV
2. Check for existing schemas
3. Generate new schemas for venues without them
4. Extract events using appropriate schemas
5. Display extracted event data

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## 📊 Data Flow

1. **Venue Configuration**: CSV file defines venues, URLs, and CSS selectors
2. **Schema Generation**: AI creates extraction schemas for new venues
3. **Web Scraping**: crawl4ai extracts structured event data using schemas
4. **Data Storage**: Events are uploaded to Supabase database
5. **Frontend Display**: React app fetches and displays events from Supabase

## 🔧 Configuration Management

The scraper automatically manages venue configurations:

- **Auto-detection**: Scans for existing schema files on startup
- **Status Updates**: Updates CSV with current schema availability
- **Error Handling**: Gracefully handles missing URLs, CSS selectors, or API failures
- **Caching**: Reuses generated schemas to minimize API calls

## 🛠️ Current Status

- ✅ Web scraping system with AI schema generation
- ✅ Automated schema management and caching
- ✅ Supabase integration for data storage
- ✅ React frontend with Material-UI
- 🚧 Backend API (placeholder in `main.py`)
- 🚧 Data processing pipeline (in `data/` folder)

The backend FastAPI server and data processing utilities are currently in development and not fully functional.

## 🔍 Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**: Ensure `OPENAI_API_KEY` is set in your environment
2. **Schema Generation Failures**: Check HTML content length and CSS selector accuracy
3. **Missing CSS Selectors**: Verify venue configurations in the CSV file
4. **Crawl Failures**: Some sites may have anti-bot protection or dynamic loading

### Debug Tips

- Set a limit in the main loop (`if _ > 3: continue`) to test with fewer venues
- Check generated schemas in `scraper_config/schemas/` directory
- Monitor console output for extraction results and errors