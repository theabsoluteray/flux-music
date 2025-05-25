from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
from yt_dlp import YoutubeDL

app = Flask(__name__)
CORS(app)

ytmusic = YTMusic()  

@app.route('/api/search')
def search():
    query = request.args.get('query', '')
    platform = request.args.get('platform', 'ytmusic')  # default to ytmusic

    if not query:
        return jsonify([])

    try:
        results = []

        if platform == 'ytmusic':
            search_results = ytmusic.search(query, filter='songs', limit=10)
            for item in search_results:
                if item['resultType'] != 'song':
                    continue
                results.append({
                    'title': item.get('title'),
                    'videoId': item.get('videoId'),
                    'artist': ', '.join([artist['name'] for artist in item.get('artists', [])]),
                    'album': item.get('album', {}).get('name', ''),
                    'duration': item.get('duration'),
                    'thumbnail': item.get('thumbnails', [{}])[-1].get('url', '')
                })

        elif platform == 'youtube':
            ydl_opts = {
                'format': 'bestaudio/best',
                'noplaylist': True,
                'quiet': True,
                'default_search': 'ytsearch',
                'extract_flat': False,
            }
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch5:{query}", download=False)
                entries = info.get('entries', [])
                for entry in entries:
                    duration = entry.get('duration', 0)
                    if duration >= 60:  # skip Shorts
                        results.append({
                            'title': entry.get('title'),
                            'videoId': entry.get('id'),
                            'duration': duration,
                            'thumbnail': entry.get('thumbnail'),
                            'artist': entry.get('uploader'),
                        })
        else:
            return jsonify({'error': 'Unsupported platform'}), 400

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