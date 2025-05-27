import json
import re
from dateutil import parser
from datetime import datetime

def normalize_date(date_str):
    try:
        dt = parser.parse(date_str, fuzzy=True, dayfirst=False)
        return dt.strftime("%Y-%m-%d")
    except Exception as e:
        print(f"❌ Could not parse date: {date_str} — {e}")
        return date_str

def extract_and_normalize_time(time_str):
    # Regex: match patterns like 8pm, 8:30PM, 9pm–12am, 7:00 pm, etc.
    time_pattern = re.compile(r'\b\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)\b')
    matches = time_pattern.findall(time_str)
    
    if matches:
        # Use the first matched time
        match = time_pattern.search(time_str)
        raw_time = match.group()
        try:
            dt = parser.parse(raw_time)
            return dt.strftime("%H:%M")  # 24-hour format
        except Exception as e:
            print(f"❌ Could not parse time: {raw_time} — {e}")
            return time_str
    else:
        return time_str  # Return original if no time found

# Load your merged events
with open("data/merged_events.json", "r", encoding="utf-8") as f:
    events = json.load(f)

# Normalize date and time
for event in events:
    if "date" in event:
        event["date"] = normalize_date(event["date"])
    if "time" in event:
        event["time"] = extract_and_normalize_time(event["time"])

# Save back
with open("data/merged_events.json", "w", encoding="utf-8") as f:
    json.dump(events, f, indent=2, ensure_ascii=False)

print("✅ Dates and times normalized.")
