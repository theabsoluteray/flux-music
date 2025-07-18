from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from yt_dlp import YoutubeDL
from youtube_search import YoutubeSearch
from concurrent.futures import ThreadPoolExecutor
import threading
import time
import json
import os
import atexit

app = Flask(__name__)
CORS(app)
Compress(app)

executor = ThreadPoolExecutor(max_workers=4)
CACHE_FILE = "stream_cache.json"
CACHE_DURATION = 300  # 5 minutes
stream_cache = {}
first_chunk_cache = {}

# Load cache on startup
def load_cache():
    global stream_cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                data = json.load(f)
                stream_cache = {k: (v[0], v[1]) for k, v in data.items()}
                print(f"Loaded {len(stream_cache)} cached URLs")
        except Exception as e:
            print(f"[Cache Load Error] {e}")

# Save cache on exit
def save_cache():
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump({k: [v[0], v[1]] for k, v in stream_cache.items()}, f)
    except Exception as e:
        print(f"[Cache Save Error] {e}")

# Periodically clean expired entries
def clean_expired_cache():
    now = time.time()
    expired = [k for k, (_, expiry) in stream_cache.items() if expiry < now]
    for k in expired:
        del stream_cache[k]

    # Schedule again after 5 min
    threading.Timer(300, clean_expired_cache).start()

load_cache()
atexit.register(save_cache)
clean_expired_cache()



from flask import Response, send_file
import requests
from io import BytesIO

@app.route('/api/stream_direct')
def stream_direct():
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"error": "Missing videoId"}), 400

    stream_url = fetch_stream_url(video_id)
    if not stream_url:
        return jsonify({"error": "Failed to fetch stream URL"}), 500

    chunk_size = int(request.args.get("chunkSize", 4096))
    range_header = request.headers.get('Range', None)
    headers = {
        "User-Agent": request.headers.get("User-Agent")
    }
    if range_header:
        headers["Range"] = range_header  # Forward the Range header

    try:
        r = requests.get(stream_url, headers=headers, stream=True, timeout=10)
        content_type = r.headers.get('Content-Type', 'audio/mpeg')
        content_length = r.headers.get('Content-Length')
        status_code = r.status_code if range_header else 200

        def get_first_chunk():
            if stream_url in first_chunk_cache:
                return first_chunk_cache[stream_url]
            chunk = next(r.iter_content(chunk_size=chunk_size))
            first_chunk_cache[stream_url] = chunk
            return chunk

        def generate():
            first_chunk = get_first_chunk()
            yield first_chunk
            for chunk in r.iter_content(chunk_size=chunk_size):
                if chunk != first_chunk:
                    yield chunk

        resp = Response(generate(), status=status_code, content_type=content_type)
        if range_header and "Content-Range" in r.headers:
            resp.headers['Content-Range'] = r.headers['Content-Range']
            resp.headers['Accept-Ranges'] = 'bytes'
            resp.headers['Content-Length'] = r.headers.get('Content-Length')
        return resp
    except Exception as e:
        return jsonify({"error": f"Streaming failed: {e}"}), 500

# Core stream fetch function
def fetch_stream_url(video_id):
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
    except Exception as e:
        print(f"[Stream Error] {video_id}: {e}")
        return None

# 🎧 Get stream URL
@app.route('/api/stream')
def stream():
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"error": "Missing videoId"}), 400

    stream_url = fetch_stream_url(video_id)
    if stream_url:
        return jsonify({"streamUrl": stream_url})
    return jsonify({"error": "Failed to fetch stream URL"}), 500

# 🔍 Search and preload
@app.route('/api/search')
def search_youtube():
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

    def preload_streams():
        for song in songs:
            fetch_stream_url(song['videoId'])

    executor.submit(preload_streams)
    return jsonify(songs)

# 🔁 Similar songs (for autoplay)
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