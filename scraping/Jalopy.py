from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import re
import json
import os


# Configure Selenium to run headless (optional)
options = Options()
# options.add_argument('--headless')  # Comment this out if you want to see the browser
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
 

  #Automatically downloads and sets the right ChromeDriver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

# Target URL
url = 'https://jalopytheatre.netlify.app/performances'

driver.get(url)

# Wait for the dynamic content to load (adjust the class name as needed)
try:
    WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.CLASS_NAME, "api-data"))
)
    print("Calendar content loaded successfully.")
except:
    print("Timed out waiting for calendar content.")
    driver.quit()


def parse_jalopy_performances_with_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')

    events = []
    # The main container for each event is a div with class "event-card"
    event_cards = soup.find_all('div', class_='event-card')

    for card in event_cards:
        event = {}

        # 1. Image URL
        image_element = card.find('img')
        if image_element and 'src' in image_element.attrs:
            image_url = image_element['src']
            # Ensure the URL has proper format
            if image_url.startswith('//'):
                event['preview_image'] = 'https:' + image_url
            elif not image_url.startswith(('http://', 'https://')):
                event['preview_image'] = 'https://' + image_url
            else:
                event['preview_image'] = image_url
        else:
            event['preview_image'] = 'N/A'

        # The "info" div contains most of the text details
        info_div = card.find('div', class_='info')
        if info_div:
            # 2. Title
            title_element = info_div.find('p', class_='title')
            if title_element:
                event['title'] = title_element.text.strip()
            else:
                event['title'] = 'N/A'

            # 3. Description
            description_element = info_div.find('p', class_='description')
            if description_element:
                event['description'] = description_element.text.strip()
            else:
                event['description'] = 'N/A'

            # 4. Date (from .date class)
            date_element = info_div.find('p', class_='date')
            if date_element:
                event['date'] = date_element.text.strip()
            else:
                event['date'] = 'N/A'

            # 5. Time (This is a bit trickier as it's often embedded in the description)
            # We'll try to extract it from the description using regex.
            # Common patterns: "7:30pm", "8pm-late", "9pm-12am", "3:30pm"
            time_pattern = re.compile(r'\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|PM|AM)?(?:[-–—]\d{1,2}(?::\d{2})?\s*(?:am|pm|PM|AM)?)?)\b|\b\d{1,2}(?:am|pm)\b', re.IGNORECASE)
            # Search within the description first
            time_match = time_pattern.findall(event['description'])
            if time_match:
                # Join multiple matches if they exist, or just take the first one
                event['time'] = ", ".join(sorted(list(set([t.strip() for t in time_match])))) # Use set to remove duplicates, then sort for consistency
            else:
                # If no time found in description, check if it's explicitly part of the title or date string
                # This is less likely given the provided structure, but good for robustness
                time_in_title = time_pattern.findall(event['title'])
                if time_in_title:
                    event['time'] = ", ".join(sorted(list(set([t.strip() for t in time_in_title]))))
                else:
                    event['time'] = 'N/A'
        else:
            event['title'] = 'N/A'
            event['description'] = 'N/A'
            event['date'] = 'N/A'
            event['time'] = 'N/A'

        events.append(event)
    return events


events = parse_jalopy_performances_with_html(driver.page_source)

# Convert to the desired format
formatted_events = []
for event in events:
    formatted_event = {
        'title': event['title'],
        'date': event['date'],
        'time': event['time'],
        'description': event['description'],
        'preview_image': event['preview_image'],
        'venue': 'Jalopy Theatre',
        'category': 'Music',  # Assuming all events are music-related
        'url': url,  # Adding the URL for reference
        'id': event['title'] + ' ' + event['date']  # Unique ID based on title and date
        
    }
    formatted_events.append(formatted_event)

# Create output directory if it doesn't exist
output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
os.makedirs(output_dir, exist_ok=True)

# Write events to JSON file
output_file = os.path.join(output_dir, 'jalopy_events.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(formatted_events, f, ensure_ascii=False, indent=2)

print(f"Scraped {len(formatted_events)} events and saved to {output_file}")

# Close the browser
driver.quit()