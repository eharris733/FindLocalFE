import asyncio
import sys
from data_extractor import extract_data_for_all, extract_data_for_venue
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.upload_to_supabase import upload_events_to_supabase

async def extract_and_upload_all():
    """
    Extract data for all venues and upload to Supabase.
    """
    print("Starting full extraction and upload process...")
    
    # Extract data from all venues
    all_events = await extract_data_for_all()
    
    if not all_events:
        print("No events extracted. Exiting.")
        return
    
    print(f"\nExtracted {len(all_events)} events total.")
    print("Proceeding to upload to Supabase...")
    
    # Upload to Supabase
    stats = upload_events_to_supabase(all_events)
    
    print("\n" + "="*60)
    print("COMPLETE PROCESS SUMMARY")
    print("="*60)
    print(f"Total events extracted: {len(all_events)}")
    print(f"Successfully uploaded: {stats['uploaded']}")
    print(f"Updated existing: {stats['updated']}")
    print(f"Errors: {stats['errors']}")
    print(f"Skipped: {stats['skipped']}")
    print("="*60)

async def extract_and_upload_venue(venue_name: str):
    """
    Extract data for a specific venue and upload to Supabase.
    """
    print(f"Starting extraction and upload for venue: {venue_name}")
    
    # Extract data for the venue
    events = await extract_data_for_venue(venue_name)
    
    if not events:
        print(f"No events extracted for {venue_name}. Exiting.")
        return
    
    print(f"\nExtracted {len(events)} events for {venue_name}.")
    print("Proceeding to upload to Supabase...")
    
    # Upload to Supabase
    stats = upload_events_to_supabase(events)
    
    print("\n" + "="*60)
    print(f"SUMMARY FOR {venue_name}")
    print("="*60)
    print(f"Total events extracted: {len(events)}")
    print(f"Successfully uploaded: {stats['uploaded']}")
    print(f"Updated existing: {stats['updated']}")
    print(f"Errors: {stats['errors']}")
    print(f"Skipped: {stats['skipped']}")
    print("="*60)

def main():
    """
    Main function to handle command line arguments.
    """
    if len(sys.argv) == 1:
        print("Usage:")
        print("  python extract_and_upload.py --all                 # Extract and upload all venues")
        print("  python extract_and_upload.py --venue 'VenueName'   # Extract and upload specific venue")
        return
    
    if sys.argv[1] == "--all":
        asyncio.run(extract_and_upload_all())
    elif sys.argv[1] == "--venue" and len(sys.argv) > 2:
        venue_name = sys.argv[2]
        asyncio.run(extract_and_upload_venue(venue_name))
    else:
        print("Invalid arguments. Use --all or --venue 'VenueName'")

if __name__ == "__main__":
    main()