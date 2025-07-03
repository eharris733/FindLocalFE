import asyncio
import json
import sys
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, JsonCssExtractionStrategy
import pandas as pd
import os
from prompts.generate_jsoncss_events_prompt import generate_jsoncss_extraction_prompt
from configs.config import (
    SCHEMAS_FOLDER, 
    SCHEMA_FILE_SUFFIX, 
    get_openai_client, 
    load_scraper_config, 
    update_scraper_config
)

client = get_openai_client()

def generate_schema_with_openai(raw_selected_html: str, name: str) -> dict:
    """
    Generate JsonCssExtractionStrategy schema using OpenAI.
    
    Args:
        raw_selected_html (str): The HTML content from crawl result with css selector applied.
        name (str): The name of the venue or context for the schema.
        
    Returns:
        dict: The generated schema dictionary
    """
    try:
        prompt = generate_jsoncss_extraction_prompt(raw_selected_html)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use gpt-4o-mini for better performance
            temperature=0.2,  # Lower temperature for more deterministic output
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        
        # Extract the schema from the response
        schema_text = response.choices[0].message.content
        print("Generated schema from OpenAI:")
        print(schema_text)
        if '```json' in schema_text:
            # Extract JSON from code block
            json_start = schema_text.find('{')
            json_end = schema_text.rfind('}') + 1
            json_text = schema_text[json_start:json_end]
        else:
            json_text = schema_text.strip()
        
        openai_schema = json.loads(json_text)
        # Validate the schema structure
        if not isinstance(openai_schema, dict) or 'name' not in openai_schema or 'baseSelector' not in openai_schema or 'fields' not in openai_schema:
            raise ValueError("Invalid schema format returned by OpenAI.")
        # Ensure fields is a list
        if not isinstance(openai_schema['fields'], list):
            raise ValueError("Fields should be a list in the schema.")
        
        # Ensure schemas folder exists
        os.makedirs(SCHEMAS_FOLDER, exist_ok=True)
        
        # write the result to a file
        schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{name}{SCHEMA_FILE_SUFFIX}")
        with open(schema_file_path, "w", encoding="utf-8") as f:
            json.dump(openai_schema, f, indent=2)
        
        print(f"Schema saved to: {schema_file_path}")
        return openai_schema

    except Exception as e:
        print(f"Error generating schema with OpenAI: {e}")
        return None

async def test_schema_extraction(venue_name: str, url: str, css_selector: str, schema: dict, keep_data_attributes: bool = False, cleaned_html: bool = False):
    """
    Test the generated schema by running extraction on the venue.
    """
    print(f"\n=== Testing schema for {venue_name} ===")
    
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
        print("Extracted data:")
        print(result.extracted_content)
        print("=" * 50)

async def generate_schema_for_venue(venue_name: str):
    """
    Generate schema for a specific venue.
    """
    scraper_config = load_scraper_config()
    if scraper_config is None:
        return
    
    # Find the venue
    venue_row = scraper_config[scraper_config['Venue_Name'] == venue_name]
    if venue_row.empty:
        print(f"Error: Venue '{venue_name}' not found in configuration.")
        return
    
    row = venue_row.iloc[0]
    url = row['Start_URL']
    css_selector = row['CSS']
    keep_data_attributes = row.get('data_tags_only', 'N') == 'Y'
    cleaned_html = row.get('clean_html', 'N') == 'Y'

    if pd.isna(url) or pd.isna(css_selector):
        print(f"Error: Missing URL or CSS selector for {venue_name}.")
        return

    print(f"Generating schema for venue: {venue_name}")
    print(f"URL: {url}")
    print(f"CSS Selector: {css_selector}")

    # Base configuration
    base_config = CrawlerRunConfig(
        css_selector=css_selector,
        cache_mode=CacheMode.BYPASS,
        keep_data_attributes=keep_data_attributes,
        wait_for=f"css:{css_selector}"
    )

    async with AsyncWebCrawler() as crawler:
        # Initial crawl to get HTML
        initial_result = await crawler.arun(url=url, config=base_config)
        
        # Generate schema using OpenAI
        print("Generating schema with OpenAI...")
        html = initial_result.html
        if cleaned_html:
            html = initial_result.cleaned_html
        if len(html) > 100000:
            html = html[:100000]  # Truncate to first 100,000 characters if too long
        
        schema = generate_schema_with_openai(html, venue_name)
        
        if schema:
            # Test the generated schema
            await test_schema_extraction(venue_name, url, css_selector, schema, keep_data_attributes, cleaned_html)

async def generate_schemas_for_all():
    """
    Generate schemas for all venues that don't have them.
    """
    scraper_config = load_scraper_config()
    if scraper_config is None:
        return
    
    # Get venues that already have schemas
    venues_with_schemas = set()
    if os.path.exists(SCHEMAS_FOLDER):
        for file in os.listdir(SCHEMAS_FOLDER):
            if file.endswith(SCHEMA_FILE_SUFFIX):
                venues_with_schemas.add(file.replace(SCHEMA_FILE_SUFFIX, ""))
    
    venues_processed = 0
    for _, row in scraper_config.iterrows():
        venue_name = row['Venue_Name']
        
        # Skip if schema already exists
        if venue_name in venues_with_schemas:
            print(f"Schema already exists for {venue_name}, skipping...")
            continue
        
        
        await generate_schema_for_venue(venue_name)
        venues_processed += 1
    
    print(f"\nCompleted! Generated schemas for {venues_processed} venues.")

def main():
    """
    Main function to handle command line arguments and run schema generation.
    """
    if len(sys.argv) == 1:
        print("Usage:")
        print("  python schema_generator.py --all                 # Generate schemas for all venues")
        print("  python schema_generator.py --venue 'VenueName'   # Generate schema for specific venue")
        return
    
    if sys.argv[1] == "--all":
        asyncio.run(generate_schemas_for_all())
    elif sys.argv[1] == "--venue" and len(sys.argv) > 2:
        venue_name = sys.argv[2]
        asyncio.run(generate_schema_for_venue(venue_name))
    else:
        print("Invalid arguments. Use --all or --venue 'VenueName'")

if __name__ == "__main__":
    main()