import asyncio
import json
import sys
import re
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, JsonCssExtractionStrategy
import pandas as pd
import os
from datetime import datetime
from dateutil import parser
from typing import Dict, List, Optional, Any
from configs.config import (
    SCHEMAS_FOLDER,
    SCHEMA_FILE_SUFFIX,
    OUTPUT_FOLDER,
    OUTPUT_FILE_SUFFIX,
    update_scraper_config
)

def clean_and_validate_event_data(raw_data: Dict[str, Any], venue_name: str) -> Optional[Dict[str, Any]]:
    """
    Clean and validate extracted event data with sanity checks.
    
    Args:
        raw_data: Raw extracted event data
        venue_name: Name of the venue for context
        
    Returns:
        Cleaned and validated event data or None if validation fails
    """
    try:
        # Initialize cleaned event with default values
        cleaned_event = {
            "venue_name": venue_name,
            "title": "N/A",
            "description": "N/A",
            "event_date": None,
            "start_time": None,
            "end_time": None,
            "price": "N/A",
            "image": None,
            "url": None,
            "extraction_timestamp": datetime.now().isoformat()
        }
        
        # Clean title
        if "title" in raw_data and raw_data["title"]:
            title = str(raw_data["title"]).strip()
            if title and title != "N/A" and len(title) > 2:
                cleaned_event["title"] = title
        
        # Clean description
        if "description" in raw_data and raw_data["description"]:
            description = str(raw_data["description"]).strip()
            if description and description != "N/A" and len(description) > 5:
                cleaned_event["description"] = description
        
        # Extract and clean date/time information
        date_info = extract_date_time_info(raw_data)
        if date_info:
            cleaned_event.update(date_info)
        
        # Clean price
        if "price" in raw_data and raw_data["price"]:
            price = clean_price(raw_data["price"])
            if price:
                cleaned_event["price"] = price
        
        # Clean image URL
        if "image" in raw_data and raw_data["image"]:
            image_url = clean_url(raw_data["image"])
            if image_url:
                cleaned_event["image"] = image_url
        
        # Clean event URL
        if "url" in raw_data and raw_data["url"]:
            event_url = clean_url(raw_data["url"])
            if event_url:
                cleaned_event["url"] = event_url
        
        # Sanity checks
        if not validate_event_data(cleaned_event):
            return None
            
        return cleaned_event
        
    except Exception as e:
        print(f"Error cleaning event data: {e}")
        return None

def extract_date_time_info(raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract and normalize date/time information from raw event data.
    
    Args:
        raw_data: Raw event data containing date/time fields
        
    Returns:
        Dictionary with cleaned date/time information
    """
    date_time_info = {}
    
    # Try to extract from various possible fields
    date_fields = ["eventDate", "date", "event_date", "startTime", "start_time"]
    time_fields = ["startTime", "start_time", "endTime", "end_time", "time"]
    
    raw_date_str = None
    raw_time_str = None
    
    # Find date string
    for field in date_fields:
        if field in raw_data and raw_data[field]:
            raw_date_str = str(raw_data[field]).strip()
            break
    
    # Find time string
    for field in time_fields:
        if field in raw_data and raw_data[field]:
            raw_time_str = str(raw_data[field]).strip()
            break
    
    # If we have a combined date-time string, try to parse it
    if raw_date_str:
        parsed_info = parse_date_time_string(raw_date_str)
        if parsed_info:
            date_time_info.update(parsed_info)
    
    # If we have separate time string, extract times
    if raw_time_str and raw_time_str != raw_date_str:
        time_info = extract_start_end_times(raw_time_str)
        if time_info:
            date_time_info.update(time_info)
    
    return date_time_info if date_time_info else None

def parse_date_time_string(date_str: str) -> Optional[Dict[str, Any]]:
    """
    Parse a date/time string and extract structured information.
    
    Args:
        date_str: Raw date/time string like "Apr 20th 8:00pm - 12:00am"
        
    Returns:
        Dictionary with parsed date/time information
    """
    if not date_str or date_str.strip() in ["N/A", "", "null"]:
        return None
    
    try:
        result = {}
        
        # Extract times first (before parsing date)
        time_info = extract_start_end_times(date_str)
        if time_info:
            result.update(time_info)
        
        # Try to parse the date portion
        # Remove time information to isolate date
        date_only = re.sub(r'\d{1,2}:\d{2}\s*(am|pm|AM|PM)', '', date_str)
        date_only = re.sub(r'\d{1,2}\s*(am|pm|AM|PM)', '', date_only)
        date_only = re.sub(r'\s*-\s*.*$', '', date_only).strip()
        
        if date_only:
            try:
                # Handle ordinal indicators (1st, 2nd, 3rd, etc.)
                date_clean = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_only)
                parsed_date = parser.parse(date_clean, fuzzy=True)
                result["event_date"] = parsed_date.strftime("%Y-%m-%d")
            except:
                # If parsing fails, store the original string
                result["event_date"] = date_only
        
        return result if result else None
        
    except Exception as e:
        print(f"Error parsing date/time string '{date_str}': {e}")
        return None

def extract_start_end_times(time_str: str) -> Optional[Dict[str, str]]:
    """
    Extract start and end times from a time string and convert to military time.
    
    Args:
        time_str: Time string like "8:00pm - 12:00am" or "Apr 20th 8:00pm - 12:00am"
        
    Returns:
        Dictionary with start_time and end_time in military format
    """
    if not time_str:
        return None
    
    try:
        # Regex to find time patterns
        time_pattern = re.compile(r'\b(\d{1,2}(?::\d{2})?)\s*(am|pm|AM|PM)\b')
        matches = time_pattern.findall(time_str)
        
        if not matches:
            return None
        
        result = {}
        
        # Extract start time (first match)
        if len(matches) >= 1:
            start_time_str = f"{matches[0][0]} {matches[0][1]}"
            military_start = convert_to_military_time(start_time_str)
            if military_start:
                result["start_time"] = military_start
        
        # Extract end time (second match, if exists)
        if len(matches) >= 2:
            end_time_str = f"{matches[1][0]} {matches[1][1]}"
            military_end = convert_to_military_time(end_time_str)
            if military_end:
                result["end_time"] = military_end
        
        return result if result else None
        
    except Exception as e:
        print(f"Error extracting times from '{time_str}': {e}")
        return None

def convert_to_military_time(time_str: str) -> Optional[str]:
    """
    Convert time string to military time format (HH:MM).
    
    Args:
        time_str: Time string like "8:00pm" or "8pm"
        
    Returns:
        Military time string like "20:00" or None if parsing fails
    """
    try:
        # Parse the time
        dt = parser.parse(time_str)
        return dt.strftime("%H:%M")
    except Exception as e:
        print(f"Could not convert time '{time_str}' to military format: {e}")
        return None

def clean_price(price_str: str) -> Optional[str]:
    """
    Clean and standardize price information.
    
    Args:
        price_str: Raw price string
        
    Returns:
        Cleaned price string or None
    """
    if not price_str or str(price_str).strip() in ["N/A", "", "null"]:
        return None
    
    # Remove extra whitespace and normalize
    price = str(price_str).strip()
    
    # If it contains "free" (case insensitive), return "Free"
    if re.search(r'\bfree\b', price, re.IGNORECASE):
        return "Free"
    
    # Extract price patterns like $10, $10.00, $10-$20, etc.
    price_pattern = re.compile(r'\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?')
    match = price_pattern.search(price)
    
    if match:
        return match.group()
    
    return price

def clean_url(url_str: str) -> Optional[str]:
    """
    Clean and validate URL.
    
    Args:
        url_str: Raw URL string
        
    Returns:
        Cleaned URL or None
    """
    if not url_str or str(url_str).strip() in ["N/A", "", "null"]:
        return None
    
    url = str(url_str).strip()
    
    # Add https:// if missing
    if url.startswith('//'):
        url = 'https:' + url
    elif not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    # Basic URL validation
    if re.match(r'https?://[^\s]+', url):
        return url
    
    return None

def validate_event_data(event: Dict[str, Any]) -> bool:
    """
    Perform sanity checks on cleaned event data.
    
    Args:
        event: Cleaned event data
        
    Returns:
        True if event passes validation, False otherwise
    """
    # Must have a title
    if not event.get("title") or event["title"] == "N/A":
        print("Validation failed: No title")
        return False
    
    # Title should be reasonable length
    if len(event["title"]) > 200:
        print("Validation failed: Title too long")
        return False
    
    # Must have venue name
    if not event.get("venue_name"):
        print("Validation failed: No venue name")
        return False
    
    # If we have start and end times, end should be after start
    if event.get("start_time") and event.get("end_time"):
        try:
            start = datetime.strptime(event["start_time"], "%H:%M")
            end = datetime.strptime(event["end_time"], "%H:%M")
            # Handle overnight events (end time next day)
            if end < start:
                # This could be valid for overnight events
                pass
        except:
            print("Validation failed: Invalid time format")
            return False
    
    return True

def save_extracted_data(venue_name: str, extracted_content: str):
    """
    Save extracted data to a JSON file.
    """
    # Ensure output folder exists
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file_path = os.path.join(OUTPUT_FOLDER, f"{venue_name}_{timestamp}{OUTPUT_FILE_SUFFIX}")
    
    try:
        # Parse the extracted content as JSON if possible
        if extracted_content:
            raw_data = json.loads(extracted_content)
        else:
            raw_data = {"error": "No content extracted"}
        
        # Clean and validate the data
        cleaned_events = []
        if isinstance(raw_data, list):
            for item in raw_data:
                cleaned_event = clean_and_validate_event_data(item, venue_name)
                if cleaned_event:
                    cleaned_events.append(cleaned_event)
        elif isinstance(raw_data, dict):
            cleaned_event = clean_and_validate_event_data(raw_data, venue_name)
            if cleaned_event:
                cleaned_events.append(cleaned_event)
        
        # Add metadata
        data_with_metadata = {
            "venue_name": venue_name,
            "extraction_timestamp": timestamp,
            "raw_data": raw_data,
            "cleaned_events": cleaned_events,
            "events_count": len(cleaned_events)
        }
        
        with open(output_file_path, "w", encoding="utf-8") as f:
            json.dump(data_with_metadata, f, indent=2, ensure_ascii=False)
        
        print(f"Data saved to: {output_file_path}")
        print(f"Extracted {len(cleaned_events)} valid events")
        
        return cleaned_events
        
    except json.JSONDecodeError:
        # If content is not valid JSON, save as text
        data_with_metadata = {
            "venue_name": venue_name,
            "extraction_timestamp": timestamp,
            "raw_content": extracted_content,
            "error": "Content could not be parsed as JSON"
        }
        
        with open(output_file_path, "w", encoding="utf-8") as f:
            json.dump(data_with_metadata, f, indent=2, ensure_ascii=False)
        
        print(f"Raw data saved to: {output_file_path}")
        return []

async def extract_data_for_venue(venue_name: str) -> List[Dict[str, Any]]:
    """
    Extract data for a specific venue using its schema.
    
    Returns:
        List of cleaned event data
    """
    scraper_config = update_scraper_config()
    if scraper_config is None:
        return []
    
    # Find the venue
    venue_row = scraper_config[scraper_config['Venue_Name'] == venue_name]
    if venue_row.empty:
        print(f"Error: Venue '{venue_name}' not found in configuration.")
        return []
    
    row = venue_row.iloc[0]
    
    # Check if venue has a schema
    if row.get('Has_Schema', 'N') != 'Y':
        print(f"Error: No schema found for {venue_name}. Run schema_generator.py first.")
        return []
    
    url = row['Start_URL']
    css_selector = row['CSS']
    keep_data_attributes = row.get('data_tags_only', 'N') == 'Y'

    if pd.isna(url) or pd.isna(css_selector):
        print(f"Error: Missing URL or CSS selector for {venue_name}.")
        return []

    print(f"Extracting data for venue: {venue_name}")
    print(f"URL: {url}")

    # Load the schema
    schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{venue_name}{SCHEMA_FILE_SUFFIX}")
    try:
        with open(schema_file_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
    except FileNotFoundError:
        print(f"Error: Schema file not found at {schema_file_path}")
        return []
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in schema file {schema_file_path}")
        return []

    # Base configuration
    base_config = CrawlerRunConfig(
        css_selector=css_selector,
        cache_mode=CacheMode.BYPASS,
        keep_data_attributes=keep_data_attributes,
        wait_for=f"css:{css_selector}"
    )

    # Create config with extraction strategy
    extraction_strategy = JsonCssExtractionStrategy(schema)
    config_with_extraction = base_config.clone()
    config_with_extraction.extraction_strategy = extraction_strategy

    async with AsyncWebCrawler() as crawler:
        # Run crawler with extraction strategy
        result = await crawler.arun(url=url, config=config_with_extraction)
        
        print(f"Extracted content for {venue_name}:")
        print(f"HTML length: {len(result.html)}")
        print("Extracted data preview:")
        if not result.extracted_content:
            print("No content extracted.")
            return []
        
        print(result.extracted_content[:500] + "..." if len(result.extracted_content) > 500 else result.extracted_content)
        
        # Save and clean the extracted data
        cleaned_events = save_extracted_data(venue_name, result.extracted_content)
        return cleaned_events

async def extract_data_for_all() -> List[Dict[str, Any]]:
    """
    Extract data for all venues that have schemas.
    
    Returns:
        List of all cleaned events from all venues
    """
    scraper_config = update_scraper_config()
    if scraper_config is None:
        return []
    
    # Filter venues that have schemas
    venues_with_schemas = scraper_config[scraper_config['Has_Schema'] == 'Y']
    
    if venues_with_schemas.empty:
        print("No venues with schemas found. Run schema_generator.py first.")
        return []
    
    print(f"Found {len(venues_with_schemas)} venues with schemas.")
    
    all_events = []
    venues_processed = 0
    
    for _, row in venues_with_schemas.iterrows():
        venue_name = row['Venue_Name']
        venue_events = await extract_data_for_venue(venue_name)
        all_events.extend(venue_events)
        venues_processed += 1
        print(f"Completed {venues_processed}/{len(venues_with_schemas)} venues\n")
    
    print(f"Data extraction completed for {venues_processed} venues!")
    print(f"Total events extracted: {len(all_events)}")
    
    return all_events

def main():
    """
    Main function to handle command line arguments and run data extraction.
    """
    if len(sys.argv) == 1:
        print("Usage:")
        print("  python data_extractor.py --all                 # Extract data for all venues with schemas")
        print("  python data_extractor.py --venue 'VenueName'   # Extract data for specific venue")
        return
    
    if sys.argv[1] == "--all":
        events = asyncio.run(extract_data_for_all())
        print(f"\nExtracted {len(events)} total events across all venues")
    elif sys.argv[1] == "--venue" and len(sys.argv) > 2:
        venue_name = sys.argv[2]
        events = asyncio.run(extract_data_for_venue(venue_name))
        print(f"\nExtracted {len(events)} events for {venue_name}")
    else:
        print("Invalid arguments. Use --all or --venue 'VenueName'")

if __name__ == "__main__":
    main()