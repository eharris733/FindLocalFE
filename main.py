### This file sets up a FastAPI application with CORS enabled and serves event data from a JSON file. The current app doesn't use a backend so this is just a placeholder.


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5173",  # This is the origin of your React app
    # Add any other origins that need to access your API
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Load event data from JSON file
with open("data/merged_events.json", "r") as f:
    event_data = json.load(f)

@app.get("/events")
def get_events():
    return event_data
