from flask import Flask, request, jsonify
from flask_cors import CORS
from yt_dlp import YoutubeDL
import time
from youtube_search import YoutubeSearch
app = Flask(__name__)
CORS(app)

# Simple in-memory cache: { video_id: (stream_url, expiry_timestamp) }
stream_cache = {}
CACHE_DURATION = 300  # seconds (5 minutes)

@app.route('/api/stream')
def stream():
    video_id = request.args.get('videoId')
    if not video_id:
        return jsonify({'error': 'Missing videoId'}), 400

    url = f'https://www.youtube.com/watch?v={video_id}'

    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info['url']
            return jsonify({'streamUrl': stream_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search')
def search_youtube_fast():
    query = request.args.get("query")
    if not query:
        return jsonify({'error': 'Missing query parameter'}), 400

    try:
        results = YoutubeSearch(query, max_results=20).to_dict()
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

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
    app.run(port=5000)