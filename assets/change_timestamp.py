import json
from datetime import datetime, timezone

with open("data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

ii = 10;
i=0
for word_data in data["dict"].values():
    if "time" in word_data:
        dt = datetime.fromtimestamp(
            word_data["time"] / 1000,
            tz=timezone.utc
        )

        try:
            dt = dt.replace(year=dt.year - 1)
        except ValueError:
            # February 29 → February 28
            dt = dt.replace(year=dt.year - 1, day=28)

        word_data["time"] = int(dt.timestamp() * 1000) - ii*i
        i=i+1;

with open("data-timestamp.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
