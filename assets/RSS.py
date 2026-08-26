
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json
import re


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/140.0 Safari/537.36"
    )
}


def get_first_rss_article(rss_url):
    response = requests.get(rss_url, headers=HEADERS, timeout=15)
    response.raise_for_status()

    root = ET.fromstring(response.content)

    item = root.find(".//item")

    if item is None:
        raise RuntimeError("No RSS article found")

    return {
        "title": item.findtext("title"),
        "link": item.findtext("link"),
        "pub_date": item.findtext("pubDate"),
        "description": item.findtext("description"),
    }


def clean_text(text):
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove surrounding whitespace
    return text.strip()


def extract_from_article(soup):
    article = soup.find("article")

    if not article:
        return None

    paragraphs = []

    for p in article.find_all("p"):
        text = clean_text(p.get_text(" ", strip=True))

        if not text:
            continue

        # Ignore very short fragments
        if len(text) < 30:
            continue

        paragraphs.append(text)

    if not paragraphs:
        return None

    return paragraphs


def extract_from_json_ld(soup):
    """
    Fallback: some news sites expose articleBody through JSON-LD.
    """

    for script in soup.find_all("script", type="application/ld+json"):

        try:
            data = json.loads(script.string or script.get_text())
        except (json.JSONDecodeError, TypeError):
            continue

        objects = data if isinstance(data, list) else [data]

        for obj in objects:

            if not isinstance(obj, dict):
                continue

            article_body = obj.get("articleBody")

            if article_body:
                paragraphs = [
                    clean_text(x)
                    for x in re.split(r"\n+", article_body)
                    if len(clean_text(x)) >= 30
                ]

                if paragraphs:
                    return paragraphs

    return None


def get_article_content(url):
    response = requests.get(
        url,
        headers=HEADERS,
        timeout=15
    )

    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")

    # First choice: actual article paragraphs
    paragraphs = extract_from_article(soup)

    if paragraphs:
        return paragraphs

    # Fallback: JSON-LD articleBody
    paragraphs = extract_from_json_ld(soup)

    if paragraphs:
        return paragraphs

    raise RuntimeError("Could not find article content")


# --------------------------------------------------
# Main
# --------------------------------------------------

rss_url = "https://www.rnz.co.nz/rss/national.xml"

article = get_first_rss_article(rss_url)

print("TITLE:")
print(article["title"])

print("\nURL:")
print(article["link"])

print("\nDATE:")
print(article["pub_date"])

print("\nARTICLE:")
print("-" * 80)

paragraphs = get_article_content(article["link"])

for paragraph in paragraphs:
    print(paragraph)
    print()
