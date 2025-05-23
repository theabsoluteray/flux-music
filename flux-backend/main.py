import vlc
import time
import yt_dlp

def get_youtube_audio_url(youtube_url):
    ydl_opts = {
        'format': 'bestaudio/best',  
        'noplaylist': True,          
        'quiet': True,              
        'default_search': 'ytsearch',
        'extract_flat': True,        
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info_dict = ydl.extract_info(youtube_url, download=False)
            
            if 'entries' in info_dict: 
                audio_url = info_dict['entries'][0]['url']
            else:
                audio_url = info_dict['url']
            return audio_url
        except Exception as e:
            print(f"Error fetching audio URL: {e}")
            return None

def play_audio_stream(stream_url):
    if not stream_url:
        print("No stream URL provided.")
        return

    try:
        instance = vlc.Instance('--no-video')
        player = instance.media_player_new()
        media = instance.media_new(stream_url)
        player.set_media(media)

        player.play()

        while True:
            state = player.get_state()
            if state == vlc.State.Ended or state == vlc.State.Error:
                break
            time.sleep(1) 

        player.stop()
        print("Playback finished.")

    except Exception as e:
        print(f"Error playing audio stream: {e}")


def play_youtube_audio(query_or_url):
    print(f"Searching for and streaming: {query_or_url}")
    audio_url = get_youtube_audio_url(query_or_url)
    if audio_url:
        print(f"Found audio stream URL: {audio_url}")
        play_audio_stream(audio_url)
    else:
        print("Could not find an audio stream for the given input.")


play_youtube_audio("https://www.youtube.com/watch?v=9Zj0JOHJR-s&pp=ygUQbXkgb3JkaW5hcnkgbGlmZQ%3D%3D") # Direct URL