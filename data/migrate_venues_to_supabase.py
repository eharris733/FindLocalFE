import pandas as pd
import os
from supabase import create_client, Client
from typing import Dict, Any, List
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv("../.env")  # Adjust path as needed

# Supabase configuration
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPERBASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables not found.")
    print("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in your environment.")
    exit(1)

def create_supabase_client() -> Client:
    """Create and return Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_venue_data(csv_path: str) -> pd.DataFrame:
    """Load venue data from CSV file."""
    try:
        df = pd.read_csv(csv_path)
        print(f"Loaded {len(df)} venues from {csv_path}")
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        raise

def clean_venue_data(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Clean and transform venue data for Supabase upload."""
    venues = []
    
    for _, row in df.iterrows():
        # Skip rows with empty venue names
        if pd.isna(row['Venue_Name']) or row['Venue_Name'].strip() == '':
            continue
            
        venue = {
            'name': row['Venue_Name'].strip(),
            'url': row['URL'] if pd.notna(row['URL']) else None,
            'start_url': row['Start_URL'] if pd.notna(row['Start_URL']) else None,
            'css_selector': row['CSS'] if pd.notna(row['CSS']) else None,
            'address': row['Address'] if pd.notna(row['Address']) else None,
            'description': row['Description'] if pd.notna(row['Description']) else None,
            'image_url': row['Image'] if pd.notna(row['Image']) and row['Image'] != 'unavailable' else None,
            'venue_type': row['Type'] if pd.notna(row['Type']) else 'Music',
            'has_schema': row['Has_Schema'] == 'Y' if pd.notna(row['Has_Schema']) else False,
            'successful_schema_gen': row['Successful_schema_gen'] == 'Y' if pd.notna(row['Successful_schema_gen']) else False,
            'clean_html': row['clean_html'] == 'Y' if pd.notna(row['clean_html']) else False,
            'data_tags_only': row['data_tags_only'] == 'Y' if pd.notna(row['data_tags_only']) else False,
            'notes': row['Notes'] if pd.notna(row['Notes']) else None,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        venues.append(venue)
    
    print(f"Cleaned {len(venues)} venues for upload")
    return venues

def upload_venues(supabase: Client, venues: List[Dict[str, Any]]) -> Dict[str, int]:
    """Upload venues to Supabase and return name to id mapping."""
    venue_id_map = {}
    
    try:
        # Use upsert to handle duplicates
        response = supabase.table('venues').upsert(
            venues,
            on_conflict='name'
        ).execute()
        
        if response.data:
            print(f"Successfully uploaded {len(response.data)} venues")
            
            # Create mapping of venue names to IDs
            for venue in response.data:
                venue_id_map[venue['name']] = venue['id']
                
        else:
            print("No data returned from venues upload")
            
    except Exception as e:
        print(f"Error uploading venues: {e}")
        raise
    
    return venue_id_map

def update_events_with_venue_ids(supabase: Client, venue_id_map: Dict[str, int]):
    """Update existing events with venue_id based on venue name matching."""
    try:
        # Get all events
        events_response = supabase.table('events').select('*').execute()
        
        if not events_response.data:
            print("No events found to update")
            return
        
        events_to_update = []
        matched_count = 0
        
        for event in events_response.data:
            venue_name = event.get('venue')
            if venue_name and venue_name in venue_id_map:
                events_to_update.append({
                    'id': event['id'],
                    'venue_id': venue_id_map[venue_name]
                })
                matched_count += 1
        
        if events_to_update:
            # Update events in batches
            batch_size = 100
            for i in range(0, len(events_to_update), batch_size):
                batch = events_to_update[i:i + batch_size]
                
                update_response = supabase.table('events').upsert(
                    batch,
                    on_conflict='id'
                ).execute()
                
                if not update_response.data:
                    print(f"Warning: Batch {i//batch_size + 1} update returned no data")
            
            print(f"Updated {matched_count} events with venue_id")
            print(f"Total events processed: {len(events_response.data)}")
            
        else:
            print("No events matched with venue names")
            
    except Exception as e:
        print(f"Error updating events with venue_ids: {e}")
        raise

def main():
    """Main function to orchestrate the venue upload process."""
    csv_path = '../configs/Brooklyn_Music_Venues.csv'
    
    # Check if CSV file exists
    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        return
    
    try:
        # Load and clean data
        df = load_venue_data(csv_path)
        venues = clean_venue_data(df)
        
        if not venues:
            print("No valid venues to upload")
            return
        
        # Create Supabase client
        supabase = create_supabase_client()
        
        # Upload venues
        venue_id_map = upload_venues(supabase, venues)
        
        if venue_id_map:
            print(f"Created venue ID mapping for {len(venue_id_map)} venues")
            
            # Update events with venue_ids
            update_events_with_venue_ids(supabase, venue_id_map)
            
            # Save venue mapping for reference
            with open('venue_id_mapping.json', 'w') as f:
                json.dump(venue_id_map, f, indent=2)
            print("Venue ID mapping saved to venue_id_mapping.json")
        
        print("Venue upload and event linking completed successfully!")
        
    except Exception as e:
        print(f"Error in main process: {e}")
        raise

if __name__ == "__main__":
    main()