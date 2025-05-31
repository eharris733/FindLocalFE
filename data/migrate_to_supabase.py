import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("brooklyn-nite-out/.env")  # Adjust path as needed

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPERBASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)


def upload_events():
    with open("data/merged_events.json", "r") as f:
        events = json.load(f)

    for event in events:
        try:
            # Attempt to update the event, and if it doesn't exist, insert it.
            response = (
                supabase.table("Events")
                .upsert(event)  # Use the upsert method to insert or update
                .execute()
                .raise_when_api_error(True)
            )


            print(f"Uploaded/Updated: {event.get('title', 'Unknown')}")

        except Exception as e:
            print(f"error on: {event.get('title', 'Unknown')}")
            print(f"{str(e)}")
            


if __name__ == "__main__":
    upload_events()