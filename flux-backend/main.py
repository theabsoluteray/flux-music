from flask import Flask, request, jsonify
from flask_cors import CORS
from yt_dlp import YoutubeDL

app = Flask(__name__)
CORS(app) 

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
        'extract_flat': False  
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"ytsearch10:{query}", download=False)
        entries = info.get('entries', [])
        results = []
        for entry in entries:
            duration = entry.get('duration', 0)
            if 'id' in entry and duration >= 60:
                results.append({
                    'title': entry.get('title'),
                    'videoId': entry['id'],
                    'duration': duration,
                    'thumbnail': f"https://i.ytimg.com/vi/{entry['id']}/hqdefault.jpg"
                })
        return jsonify(results)


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

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        stream_url = info['url']
        return jsonify({'streamUrl': stream_url})


@app.route('/')
def index():
    return "Flux Python Backend is Running"

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
