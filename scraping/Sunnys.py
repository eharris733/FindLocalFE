from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import json
import os
import time


# Configure Selenium to run headless (optional)
options = Options()
# options.add_argument('--headless')  # Comment this out if you want to see the browser
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
 

  #Automatically downloads and sets the right ChromeDriver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

# Target URL
url = 'https://tockify.com/sunnysmusic/pinboard'
display_url = 'https://www.sunnysredhook.com/calendar2/'

driver.get(url)

# Wait for the dynamic content to load (adjust the class name as needed)
try:
    time.sleep(5)  # Wait for initial load
    WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.CLASS_NAME, "tkf-body"))
)
    print("Calendar content loaded successfully.")
except:
    print("Timed out waiting for calendar content.")
    driver.quit()

# Now extract page source and parse with BeautifulSoup
soup = BeautifulSoup(driver.page_source, 'html.parser')

pincards = soup.find_all('div', class_='pincard')

extracted_data = []

for card in pincards:
    title = card.find('h3', class_='d-titleText').text.strip() if card.find('h3', class_='d-titleText') else 'N/A'
    
    datetime_info = card.find('div', class_='d-when').text.strip() if card.find('div', class_='d-when') else 'N/A'
    
    # Extract date and time from the datetime_info string
    date_part = ' '.join(datetime_info.split(' ')[0:3]).strip()
    time_part = ' '.join(datetime_info.split(' ')[3:]).strip()
    
    description = card.find('div', class_='pincard__main__preview').text.strip() if card.find('div', class_='pincard__main__preview') else 'N/A'
    
    preview_image = card.find('img', class_='pincard__imageSection__image')
    image_url = preview_image['src'] if preview_image and 'src' in preview_image.attrs else 'N/A'
    
    # Ensure image URL has proper format
    if image_url != 'N/A':
        if image_url.startswith('//'):
            image_url = 'https:' + image_url
        elif not image_url.startswith(('http://', 'https://')):
            image_url = 'https://' + image_url
    
    extracted_data.append({
        'title': title,
        'date': date_part,
        'time': time_part,
        'description': description,
        'preview_image': image_url,
        'venue': 'Sunny\'s Music',
        'category': 'Music',
        'url': display_url,
        'id': title + ' ' + date_part  # Unique ID based on title and date
    })

# Create output directory if it doesn't exist
output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
os.makedirs(output_dir, exist_ok=True)

# Write events to JSON file
output_file = os.path.join(output_dir, 'sunnys_events.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(extracted_data, f, ensure_ascii=False, indent=2)

print(f"Scraped {len(extracted_data)} events and saved to {output_file}")

# Close the browser
driver.quit()