from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
from yt_dlp import YoutubeDL

app = Flask(__name__)
CORS(app)

ytmusic = YTMusic()  # no auth needed for public info

@app.route('/api/search')
def search():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])


    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'default_search': 'ytsearch',
        'extract_flat': True 
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"ytsearch10:{query}", download=False)
        entries = info.get('entries', [])
    try:
        search_results = ytmusic.search(query, filter='songs', limit=10)
        results = []

        for item in search_results:
            if item['resultType'] != 'song':
                continue

            results.append({
                'title': item.get('title'),
                'videoId': item.get('videoId'),
                'artist': ', '.join([artist['name'] for artist in item.get('artists', [])]),
                'album': item.get('album', {}).get('name', ''),
                'duration': item.get('duration'),
                'thumbnail': item.get('thumbnails', [{}])[-1].get('url', ''),
                'lyrics': item.get('lyrics', 'lyrics not available')
            })

            return jsonify(results)

    except Exception as e:
            return jsonify({'error': str(e)}), 500

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

    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info['url']
            return jsonify({'streamUrl': stream_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@app.route('/')
def index():
    return "Flux Python Backend is Running"

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
