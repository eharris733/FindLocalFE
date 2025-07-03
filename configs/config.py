import os
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

# File path constants
ENV_FILE_PATH = "frontend/.env"
DEFAULT_SCRAPER_CONFIG_PATH = "configs/Brooklyn_Music_Venues.csv"
SCHEMAS_FOLDER = "configs/schemas"
SCHEMA_FILE_SUFFIX = "_schema.json"
OUTPUT_FOLDER = "extracted_data"
OUTPUT_FILE_SUFFIX = "_data.json"

# Load environment variables
load_dotenv(os.path.expanduser(ENV_FILE_PATH))

def get_openai_client():
    """
    Get OpenAI client with API key validation.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set.")
        exit()
    return OpenAI(api_key=api_key)

def load_scraper_config(path=DEFAULT_SCRAPER_CONFIG_PATH):
    """
    Load scraper configuration from CSV file.
    """
    try:
        df = pd.read_csv(path)
        return df
    except FileNotFoundError:
        print(f"Error: The file {path} was not found.")
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

def update_scraper_config(scraper_config_path=DEFAULT_SCRAPER_CONFIG_PATH):
    """
    Update the scraper config to mark which venues have schemas.
    """
    scraper_config = load_scraper_config(scraper_config_path)
    if scraper_config is None:
        return None
    
    venues_with_schemas = []
    if os.path.exists(SCHEMAS_FOLDER):
        for file in os.listdir(SCHEMAS_FOLDER):
            if file.endswith(SCHEMA_FILE_SUFFIX):
                venues_with_schemas.append(file.replace(SCHEMA_FILE_SUFFIX, ""))
    
    # Update the 'Has_Schema' column based on the presence of schema files
    scraper_config['Has_Schema'] = 'N'  # Default to 'N'
    for venue in venues_with_schemas:
        scraper_config.loc[scraper_config['Venue_Name'] == venue, 'Has_Schema'] = 'Y'
    
    # Save the updated scraper_config DataFrame
    scraper_config.to_csv(scraper_config_path, index=False)
    return scraper_config