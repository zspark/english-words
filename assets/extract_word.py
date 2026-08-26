import re

with open("GRE_8000_Words.txt", "r", encoding="utf-8") as f:
    text = f.read()

words = re.findall(r"^[A-Za-z]+", text, re.MULTILINE)

with open("extracted_words.txt", "w", encoding="utf-8") as f:
    f.write(", ".join(words))
