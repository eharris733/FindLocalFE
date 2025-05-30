import json
import os
import requests
from dotenv import load_dotenv

load_dotenv("../brooklyn-nite-out/.env")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

def upload_events():
    with open("merged_events.json", "r") as f:
        events = json.load(f)
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/events"
    
    for event in events:
        response = requests.post(url, headers=headers, json=event)
        if response.status_code != 201:
            print(f"Error uploading event {event['title']}: {response.text}")
        else:
            print(f"Uploaded: {event['title']}")

if __name__ == "__main__":
    upload_events()