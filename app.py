from flask import Flask, jsonify, render_template, request
import feedparser
import requests
import time
import os

app = Flask(__name__)

# Cache configuration
CACHE_DURATION_SEC = 3600  # Cache for 1 hour
feed_cache = {
    "data": None,
    "last_fetched": 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    
    # Return cached data if valid and refresh not forced
    if not force_refresh and feed_cache["data"] and (now - feed_cache["last_fetched"] < CACHE_DURATION_SEC):
        return feed_cache["data"], False

    try:
        # Fetch the feed
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse feed with feedparser
        parsed = feedparser.parse(response.content)
        
        # Extract relevant fields
        entries = []
        for entry in parsed.entries:
            content_val = ""
            if "content" in entry and len(entry.content) > 0:
                content_val = entry.content[0].value
            elif "summary" in entry:
                content_val = entry.summary
                
            entries.append({
                "id": entry.get("id", ""),
                "title": entry.get("title", ""),  # Usually the date (e.g. "July 01, 2026")
                "link": entry.get("link", ""),
                "updated": entry.get("updated", ""),
                "content": content_val
            })
            
        feed_data = {
            "title": parsed.feed.get("title", "BigQuery Release Notes"),
            "subtitle": parsed.feed.get("subtitle", "Release notes for Google Cloud BigQuery"),
            "link": parsed.feed.get("link", "https://cloud.google.com/bigquery/docs/release-notes"),
            "entries": entries,
            "fetched_at": now
        }
        
        # Update cache
        feed_cache["data"] = feed_data
        feed_cache["last_fetched"] = now
        return feed_data, True
        
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If we have cached data, return it even if expired rather than failing completely
        if feed_cache["data"]:
            return feed_cache["data"], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        feed_data, was_refreshed = fetch_and_parse_feed(force_refresh)
        return jsonify({
            "status": "success",
            "refreshed": was_refreshed,
            "data": feed_data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Default Flask port
    app.run(debug=True, host='0.0.0.0', port=5001)
