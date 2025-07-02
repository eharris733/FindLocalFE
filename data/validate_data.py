# Goes through all the json data in extracted_data folder and checks if the data is reasonable
# first check to see if anything was extracted
# Then see if the data is reasonable using ai (i.e, is the start time a time, is it in the future, etc.)
# if the data is always in a consistent format (i.e, startime is always time:time MON DAY - time:time MON DAY, we always want to substring the first time:time MON DAY)

import os
import json
from datetime import datetime
from ..crawlers.config import (
    OUTPUT_FOLDER,
    OUTPUT_FILE_SUFFIX,
    load_scraper_config
)

def validate_extracted_data():
    """
    Validate the extracted data in the OUTPUT_FOLDER.
    """
    if not os.path.exists(OUTPUT_FOLDER):
        print(f"No extracted data found in {OUTPUT_FOLDER}.")
        return
    
    for file in os.listdir(OUTPUT_FOLDER):
        if file.endswith(OUTPUT_FILE_SUFFIX):
            file_path = os.path.join(OUTPUT_FOLDER, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Check if the data has the expected structure
                if "venue_name" not in data or "extraction_timestamp" not in data or "data" not in data:
                    print(f"Invalid structure in {file_path}. Skipping.")
                    continue
                
                # Validate the timestamp
                try:
                    datetime.strptime(data["extraction_timestamp"], "%Y%m%d_%H%M%S")
                except ValueError:
                    print(f"Invalid timestamp format in {file_path}. Skipping.")
                    continue
                
                # Here you can add more specific validations based on your schema
                print(f"Valid data found in {file_path}.")
            
            except json.JSONDecodeError:
                print(f"Error decoding JSON in {file_path}. Skipping.")
            except Exception as e:
                print(f"Unexpected error processing {file_path}: {e}")

if __name__ == "__main__":
    validate_extracted_data()
    print("Data validation complete.")

