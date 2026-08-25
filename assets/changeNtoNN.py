import json

with open("english_words_cache.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for info in data["dict"].values():
    if "note" in info:
        info["note"] = info["note"].replace("\n", "\n\n")

with open("english_words_cache.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)
