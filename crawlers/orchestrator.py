import asyncio
import json
import sys
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, JsonCssExtractionStrategy, ProxyConfig
import pandas as pd
import os
from datetime import datetime
from config import (
    SCHEMAS_FOLDER,
    SCHEMA_FILE_SUFFIX,
    OUTPUT_FOLDER,
    OUTPUT_FILE_SUFFIX,
    load_scraper_config,
    update_scraper_config
)

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
            data = json.loads(extracted_content)
        else:
            data = {"error": "No content extracted"}
        
        # Add metadata
        data_with_metadata = {
            "venue_name": venue_name,
            "extraction_timestamp": timestamp,
            "data": data
        }
        
        with open(output_file_path, "w", encoding="utf-8") as f:
            json.dump(data_with_metadata, f, indent=2, ensure_ascii=False)
        
        print(f"Data saved to: {output_file_path}")
        
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

async def extract_data_for_venue(venue_name: str):
    """
    Extract data for a specific venue using its schema.
    """
    scraper_config = update_scraper_config()
    if scraper_config is None:
        return
    
    # Find the venue
    venue_row = scraper_config[scraper_config['Venue_Name'] == venue_name]
    if venue_row.empty:
        print(f"Error: Venue '{venue_name}' not found in configuration.")
        return
    
    row = venue_row.iloc[0]
    
    # Check if venue has a schema
    if row.get('Has_Schema', 'N') != 'Y':
        print(f"Error: No schema found for {venue_name}. Run schema_generator.py first.")
        return
    
    url = row['Start_URL']
    css_selector = row['CSS']
    keep_data_attributes = row.get('data_tags_only', 'N') == 'Y'

    if pd.isna(url) or pd.isna(css_selector):
        print(f"Error: Missing URL or CSS selector for {venue_name}.")
        return

    print(f"Extracting data for venue: {venue_name}")
    print(f"URL: {url}")

    # Load the schema
    schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{venue_name}{SCHEMA_FILE_SUFFIX}")
    try:
        with open(schema_file_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
    except FileNotFoundError:
        print(f"Error: Schema file not found at {schema_file_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in schema file {schema_file_path}")
        return

    # # proxy config, should this become neccesary later
    # proxy_config = ProxyConfig(
    #     proxy_type="http",  # or "socks5" if you prefer
    #     proxy_host="your_proxy_host",  # Replace with your proxy host)
    #     proxy_port=8080,  # Replace with your proxy port
    #     proxy_username="your_proxy_username",  # Optional, if your proxy requires authentication
    #     proxy_password="your_proxy_password"  # Optional, if your proxy requires authentication
    # )

    # Base configuration
    base_config = CrawlerRunConfig(
        css_selector=css_selector,
        cache_mode=CacheMode.BYPASS,
        keep_data_attributes=keep_data_attributes,
        wait_for=f"css:{css_selector}"
        # proxy_config=proxy_config
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
            save_extracted_data(venue_name, "")
            return
        print(result.extracted_content[:500] + "..." if len(result.extracted_content) > 500 else result.extracted_content)
        
        # Save the extracted data
        save_extracted_data(venue_name, result.extracted_content)

async def extract_data_for_all():
    """
    Extract data for all venues that have schemas.
    """
    scraper_config = update_scraper_config()
    if scraper_config is None:
        return
    
    # Filter venues that have schemas
    venues_with_schemas = scraper_config[scraper_config['Has_Schema'] == 'Y']
    
    if venues_with_schemas.empty:
        print("No venues with schemas found. Run schema_generator.py first.")
        return
    
    print(f"Found {len(venues_with_schemas)} venues with schemas.")
    
    venues_processed = 0
    for _, row in venues_with_schemas.iterrows():
        venue_name = row['Venue_Name']
        await extract_data_for_venue(venue_name)
        venues_processed += 1
        print(f"Completed {venues_processed}/{len(venues_with_schemas)} venues\n")
    
    print(f"Data extraction completed for {venues_processed} venues!")

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
        asyncio.run(extract_data_for_all())
    elif sys.argv[1] == "--venue" and len(sys.argv) > 2:
        venue_name = sys.argv[2]
        asyncio.run(extract_data_for_venue(venue_name))
    else:
        print("Invalid arguments. Use --all or --venue 'VenueName'")

if __name__ == "__main__":
    main()