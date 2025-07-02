import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv("frontend/.env")

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase environment variables not found.")
    print("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in frontend/.env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def transform_event_for_supabase(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform cleaned event data to match Supabase Events table schema.
    
    Args:
        event: Cleaned event data from data extractor
        
    Returns:
        Event data formatted for Supabase
    """
    # Map our cleaned event format to Supabase schema
    supabase_event = {
        "title": event.get("title", "N/A"),
        "description": event.get("description", "N/A"),
        "venue": event.get("venue_name"),
        "date": event.get("event_date"),
        "start_time": event.get("start_time"),
        "end_time": event.get("end_time"),
        "price": event.get("price", "N/A"),
        "image_url": event.get("image"),
        "event_url": event.get("url"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # Create a unique identifier for deduplication
    # Combine venue, title, and date for uniqueness
    unique_key = f"{event.get('venue_name', '')}-{event.get('title', '')}-{event.get('event_date', '')}"
    supabase_event["unique_key"] = unique_key
    
    return supabase_event

def upload_events_to_supabase(events: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Upload events to Supabase with deduplication.
    
    Args:
        events: List of cleaned event data
        
    Returns:
        Dictionary with upload statistics
    """
    stats = {
        "total": len(events),
        "uploaded": 0,
        "updated": 0,
        "errors": 0,
        "skipped": 0
    }
    
    print(f"Starting upload of {len(events)} events to Supabase...")
    
    for event in events:
        try:
            # Transform event for Supabase
            supabase_event = transform_event_for_supabase(event)
            
            # Skip events with missing critical data
            if not supabase_event.get("title") or supabase_event["title"] == "N/A":
                print(f"Skipping event with missing title from {event.get('venue_name')}")
                stats["skipped"] += 1
                continue
            
            if not supabase_event.get("venue"):
                print(f"Skipping event '{supabase_event['title']}' with missing venue")
                stats["skipped"] += 1
                continue
            
            # Use upsert to insert or update
            response = (
                supabase.table("Events")
                .upsert(supabase_event, on_conflict="unique_key")
                .execute()
            )
            
            if response.data:
                if len(response.data) > 0:
                    # Check if this was an insert or update
                    # This is a simplification - in practice you might want more sophisticated logic
                    stats["uploaded"] += 1
                    print(f"✅ Uploaded: {supabase_event['title']} at {supabase_event['venue']}")
                else:
                    stats["updated"] += 1
                    print(f"🔄 Updated: {supabase_event['title']} at {supabase_event['venue']}")
            
        except Exception as e:
            stats["errors"] += 1
            print(f"❌ Error uploading {event.get('title', 'Unknown')}: {str(e)}")
    
    return stats

def upload_from_extracted_data_folder(folder_path: str = "extracted_data"):
    """
    Upload events from all files in the extracted_data folder.
    
    Args:
        folder_path: Path to the extracted data folder
    """
    if not os.path.exists(folder_path):
        print(f"Error: Folder {folder_path} does not exist")
        return
    
    all_events = []
    
    # Process all JSON files in the extracted_data folder
    for filename in os.listdir(folder_path):
        if filename.endswith(".json"):
            file_path = os.path.join(folder_path, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Extract cleaned events from the file
                if "cleaned_events" in data:
                    events = data["cleaned_events"]
                    all_events.extend(events)
                    print(f"Loaded {len(events)} events from {filename}")
                else:
                    print(f"No cleaned_events found in {filename}")
                    
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    
    if all_events:
        print(f"\nTotal events to upload: {len(all_events)}")
        stats = upload_events_to_supabase(all_events)
        
        print("\n" + "="*50)
        print("UPLOAD SUMMARY")
        print("="*50)
        print(f"Total events processed: {stats['total']}")
        print(f"Successfully uploaded: {stats['uploaded']}")
        print(f"Updated existing: {stats['updated']}")
        print(f"Errors: {stats['errors']}")
        print(f"Skipped: {stats['skipped']}")
        print("="*50)
    else:
        print("No events found to upload")

def upload_from_json_file(file_path: str):
    """
    Upload events from a specific JSON file.
    
    Args:
        file_path: Path to the JSON file containing events
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        events = []
        if isinstance(data, list):
            events = data
        elif "cleaned_events" in data:
            events = data["cleaned_events"]
        else:
            print("No events found in the specified format")
            return
        
        if events:
            stats = upload_events_to_supabase(events)
            
            print("\n" + "="*50)
            print("UPLOAD SUMMARY")
            print("="*50)
            print(f"Total events processed: {stats['total']}")
            print(f"Successfully uploaded: {stats['uploaded']}")
            print(f"Updated existing: {stats['updated']}")
            print(f"Errors: {stats['errors']}")
            print(f"Skipped: {stats['skipped']}")
            print("="*50)
        
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")

def main():
    """
    Main function to handle command line arguments.
    """
    if len(sys.argv) == 1:
        print("Usage:")
        print("  python upload_to_supabase.py --all                    # Upload from extracted_data folder")
        print("  python upload_to_supabase.py --file path/to/file.json # Upload from specific file")
        return
    
    if sys.argv[1] == "--all":
        upload_from_extracted_data_folder()
    elif sys.argv[1] == "--file" and len(sys.argv) > 2:
        file_path = sys.argv[2]
        upload_from_json_file(file_path)
    else:
        print("Invalid arguments. Use --all or --file path/to/file.json")

if __name__ == "__main__":
    main()