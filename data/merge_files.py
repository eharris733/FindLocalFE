import json

# Input file paths
file1 = "data/sunnys_events.json"
file2 = "data/jalopy_events.json"

# Output file path
output_file = "data/merged_events.json"

# Load data from both files
with open(file1, "r") as f1:
    data1 = json.load(f1)

with open(file2, "r") as f2:
    data2 = json.load(f2)

# Combine the lists
merged_data = data1 + data2

# Optional: Deduplicate based on title + date
# seen = set()
# deduped_data = []
# for event in merged_data:
#     key = (event["title"], event["date"])
#     if key not in seen:
#         deduped_data.append(event)
#         seen.add(key)
# merged_data = deduped_data

# Write to output
with open(output_file, "w") as out:
    json.dump(merged_data, out, ensure_ascii=False, indent=2)

print(f"✅ Merged {len(merged_data)} events into {output_file}")
