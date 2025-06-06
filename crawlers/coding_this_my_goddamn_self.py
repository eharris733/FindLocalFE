import asyncio
import json
from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, JsonCssExtractionStrategy
import pandas as pd
from openai import OpenAI
import os
from dotenv import load_dotenv
from prompts.generate_jsoncss_prompt import generate_jsoncss_extraction_prompt

# File path constants
ENV_FILE_PATH = "frontend/.env"
DEFAULT_SCRAPER_CONFIG_PATH = "configs/Brooklyn_Music_Venues.csv"
SCHEMAS_FOLDER = "configs/schemas"
SCHEMA_FILE_SUFFIX = "_schema.json"

# Load environment variables
load_dotenv(os.path.expanduser(ENV_FILE_PATH))
# Check for OpenAI API Key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: OPENAI_API_KEY environment variable not set.")
    exit()

client = OpenAI(api_key=api_key)

def load_scraper_config(path):
    try:
        df = pd.read_csv(path)
        return df
    except FileNotFoundError:
        print("Error: The file 'scraper_config/Brooklyn_Music_Venues' was not found.")
        return None
    except pd.errors.EmptyDataError:
        print("Error: The file is empty.")
        return None
    except pd.errors.ParserError:
        print("Error: The file could not be parsed as CSV.")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None
    

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
        # write the result to a file
        schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{name}{SCHEMA_FILE_SUFFIX}")
        with open(schema_file_path, "w", encoding="utf-8") as f:
            json.dump(openai_schema, f, indent=2)

    except Exception as e:
        print(f"Error generating schema with OpenAI: {e}")

def update_scraper_config(scraper_config_path=DEFAULT_SCRAPER_CONFIG_PATH):
    # load the scraper_config DataFrame
    scraper_config = load_scraper_config(scraper_config_path)
    venues_with_schemas = []
    for file in os.listdir(SCHEMAS_FOLDER):
        if file.endswith(SCHEMA_FILE_SUFFIX):
            venues_with_schemas.append(file.replace(SCHEMA_FILE_SUFFIX, ""))
    # Update the 'Has_Schema' column based on the presence of schema files
    scraper_config['Has_Schema'] = 'N'  # Default to 'N'
    for venue in venues_with_schemas:
        scraper_config.loc[scraper_config['Venue_Name'] == venue, 'Has_Schema'] = 'Y'
    # Save the updated scraper_config DataFrame
    scraper_config.to_csv(DEFAULT_SCRAPER_CONFIG_PATH, index=False)
    return scraper_config



async def main():
    # Load the scraper configuration, which contains the venues and their respective URLs and CSS selectors, default path is already set in
    scraper_config = update_scraper_config(DEFAULT_SCRAPER_CONFIG_PATH)
    # loop through the scraper_config for each venue
    for _, row in scraper_config.iterrows():
        venue_name = row['Venue_Name']
        print(f"Processing venue: {venue_name}")
        url = row['Start_URL']
        css_selector = row['CSS']
        keep_data_attributes = row.get('data_tags_only', 'N') == 'Y'
        cleaned_html = row.get('clean_html', 'N') == 'Y'

        if pd.isna(url) or pd.isna(css_selector):
            print(f"Skipping {venue_name} due to missing URL or CSS selector.")
            continue

        # Base configuration that will be used for all crawling operations
        base_config = CrawlerRunConfig(
            css_selector=css_selector,
            cache_mode=CacheMode.BYPASS,
            keep_data_attributes=keep_data_attributes,
            wait_for=f"css:{css_selector}"  # Ensure the CSS selector is applied before returning HTML
        )

        # if we have a schema for this venue, we will use it
        if row['Has_Schema'] == 'Y':
            print(f"Using schema for {venue_name}")
            schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{venue_name}{SCHEMA_FILE_SUFFIX}")
            with open(schema_file_path, "r", encoding="utf-8") as f:
                generated_schema = json.load(f)
            extraction_strategy = JsonCssExtractionStrategy(generated_schema)
            # Create new config with generated schema
            config_with_extraction = base_config.clone()
            config_with_extraction.extraction_strategy = extraction_strategy
            
            async with AsyncWebCrawler() as crawler:
                # Run crawler with extraction strategy
                result = await crawler.arun(url=url, config=config_with_extraction)
                # Print the extracted content
            print(f"\nExtracted content for {venue_name}:")
            print(len(result.html))
            print(result.extracted_content)
        else:
            # If no schema is found, we will generate it using AI
            print(f"No schema found for {venue_name}, using AI to generate schema.")

            async with AsyncWebCrawler() as crawler:
                # Initial crawl to get HTML
                initial_result = await crawler.arun(url=url, config=base_config)
                
                # Generate schema using OpenAI
                print("Generating schema with OpenAI...")
                html = initial_result.html
                if cleaned_html:
                    html = initial_result.cleaned_html  # Use cleaned HTML if available
                if len(html) > 100000:
                    html = html[:100000]  # Truncate to first 100,000 characters if too long
                generate_schema_with_openai(html, venue_name)

                # Load the generated schema from file
                schema_file_path = os.path.join(SCHEMAS_FOLDER, f"{venue_name}{SCHEMA_FILE_SUFFIX}")
                with open(schema_file_path, "r", encoding="utf-8") as f:
                    generated_schema = json.load(f)
                
                # Create new config with generated schema using clone
                config_with_extraction = base_config.clone()
                config_with_extraction.extraction_strategy = JsonCssExtractionStrategy(generated_schema)
                
                # Run crawler again with extraction strategy
                result = await crawler.arun(url=url, config=config_with_extraction)

                # Print the extracted content
                print("\nExtracted content:")
                print(result.extracted_content[:1000])


# Run the async main function
asyncio.run(main())
