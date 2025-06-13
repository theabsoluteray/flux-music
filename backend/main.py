from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from yt_dlp import YoutubeDL
import time
from youtube_search import YoutubeSearch
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app)
Compress(app)

# Simple in-memory stream cache
stream_cache = {}
CACHE_DURATION = 300  # 5 minutes
executor = ThreadPoolExecutor(max_workers=4)

def fetch_stream_url(video_id):
    """Fetch and cache the stream URL for a given video ID."""
    if video_id in stream_cache:
        url, expiry = stream_cache[video_id]
        if time.time() < expiry:
            return url

    try:
        with YoutubeDL({
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
        }) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            url = info['url']
            stream_cache[video_id] = (url, time.time() + CACHE_DURATION)
            return url
    except:
        return None

@app.route('/api/stream')
def stream():
    """Returns stream URL for a single videoId"""
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"error": "Missing videoId"}), 400

    stream_url = fetch_stream_url(video_id)
    if stream_url:
        return jsonify({"streamUrl": stream_url})
    return jsonify({"error": "Failed to fetch stream URL"}), 500

@app.route('/api/search')
def search_youtube():
    """Search and auto-pre-cache stream URLs for all 10 songs."""
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Missing query parameter"}), 400

    try:
        results = YoutubeSearch(query, max_results=10).to_dict()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    songs = []
    for video in results:
        duration = video.get('duration', '0:00')
        try:
            minutes, seconds = map(int, duration.split(":"))
            total_seconds = minutes * 60 + seconds
        except:
            continue
        if total_seconds < 100:
            continue

        songs.append({
            "title": video['title'],
            "videoId": video['id'],
            "thumbnail": video['thumbnails'][0],
            "artist": video['channel'],
            "duration": duration
        })

    # ⏩ Background pre-caching stream URLs (non-blocking)
    def preload_streams():
        for song in songs:
            fetch_stream_url(song['videoId'])

    executor.submit(preload_streams)

    return jsonify(songs)
@app.route('/api/similar')
def similar():
    title = request.args.get("title")
    artist = request.args.get("artist")
    if not title and not artist:
        return jsonify({'error': 'Missing title or artist'}), 400

    query = f"{title} {artist}" if artist else title
    try:
        results = YoutubeSearch(query, max_results=10).to_dict()
    except Exception as e:
        return jsonify({'error': f'Similar search failed: {str(e)}'}), 500

    songs = []
    for video in results:
        duration = video.get('duration', '0:00')
        try:
            minutes, seconds = map(int, duration.split(':'))
        except ValueError:
            continue
        if (minutes * 60 + seconds) < 100:
            continue
        songs.append({
            'title': video['title'],
            'videoId': video['id'],
            'thumbnail': video['thumbnails'][0],
            'artist': video['channel'],
            'duration': duration,
        })
    return jsonify(songs)

if __name__ == "__main__":
    app.run(port=5000, debug=True)
1