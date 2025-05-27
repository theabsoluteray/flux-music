from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from yt_dlp import YoutubeDL
from youtube_search import YoutubeSearch

app = Flask(__name__)
CORS(app)


def parse_duration(duration_str):
    try:
        parts = duration_str.split(':')
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds = int(parts[1])
            return minutes * 60 + seconds
        elif len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = int(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        else:
            return 0
    except:
        return 0

@app.route('/api/search')
def search():
    query = request.args.get('query', '')
    if not query:
        return jsonify([])

    try:
        raw_results = YoutubeSearch(query, max_results=20).to_dict()
        results = []

        for video in raw_results:
            duration_str = video.get('duration', '')
            duration_sec = parse_duration(duration_str)

            if duration_sec < 100:  
                continue

            results.append({
                'title': video.get('title'),
                'videoId': video.get('id'),
                'thumbnail': f"https://i.ytimg.com/vi/{video.get('id')}/hqdefault.jpg",
                'artist': video.get('channel'),
                'duration': duration_str
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
        'extract_flat': False,
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
