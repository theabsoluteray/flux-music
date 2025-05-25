import  request, jsonify
import yt_dlp

def search_youtube(query):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'noplaylist': True,
        'default_search': 'ytsearch10',  # Top 10 results
        'extract_flat': True
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(query, download=False)
            results = info.get('entries', []) if 'entries' in info else [info]
            return [
                {
                    'title': r['title'],
                    'id': r['id'],
                    'url': f"https://www.youtube.com/watch?v={r['id']}"
                } for r in results
            ]
        except Exception as e:
            print(f"Error: {e}")
            return []

