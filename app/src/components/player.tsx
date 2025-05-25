// src/components/Player.tsx
import React, { useState, useRef, useEffect } from 'react';
import './player.css';
import { Song } from '../types';

interface PlayerProps {
  currentSong: Song | null;
  audioSrc: string;
}

const Player: React.FC<PlayerProps> = ({ currentSong, audioSrc }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState<boolean>(false); // For toggling volume slider

  useEffect(() => {
    if (audioRef.current) {
      if (audioSrc) {
        audioRef.current.src = audioSrc;
        audioRef.current.load();
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => setIsPlaying(true))
                     .catch(() => setIsPlaying(false));
        }
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    }
  }, [audioSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (volumeRef.current) {
      volumeRef.current.style.setProperty('--volume-percent', `${volume * 100}%`);
    }
  }, [volume]);

  useEffect(() => {
    if (progressRef.current) {
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      progressRef.current.style.setProperty('--progress-percent', `${progressPercent}%`);
    }
  }, [currentTime, duration]);

  useEffect(() => { // Initialize CSS variables
    if (volumeRef.current) volumeRef.current.style.setProperty('--volume-percent', `${volume * 100}%`);
    if (progressRef.current) progressRef.current.style.setProperty('--progress-percent', '0%');
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.warn("Play error:", e));
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => audioRef.current && setCurrentTime(audioRef.current.currentTime);
  const handleLoadedMetadata = () => audioRef.current && setDuration(audioRef.current.duration);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  // Placeholder for volume icon click to toggle slider visibility
  const toggleVolumeSlider = () => setIsVolumeSliderVisible(prev => !prev);


  return (
    <footer className="player-floating-bar">
      <div className="player-nav-controls">
        <button className="player-control-btn" title="Previous" disabled={!audioSrc}>
          <i className="fas fa-step-backward"></i>
        </button>
        <button className="player-play-pause-btn" onClick={togglePlayPause} title={isPlaying ? "Pause" : "Play"} disabled={!audioSrc}>
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </button>
        <button className="player-control-btn" title="Next" disabled={!audioSrc}>
          <i className="fas fa-step-forward"></i>
        </button>
      </div>

      <div className="player-song-details">
        {currentSong && (
          <img src={currentSong.thumbnail} alt={currentSong.title} className="player-album-art-small" />
        )}
        <div className="player-title-artist-progress">
          <h4>{currentSong?.title || "No song selected"}</h4>
          <p>{currentSong?.artist || "---"}</p>
          <input
            ref={progressRef}
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="player-progress-bar-integrated"
            disabled={!audioSrc || duration === 0}
            title="Seek"
          />
        </div>
        {/* Inline actions next to song info - reference has lock and ... */}
        {currentSong && (
             <div className="player-song-inline-actions">
                <button className="player-control-btn" title="Options" disabled={!audioSrc}>
                    <i className="fas fa-ellipsis-h"></i> 
                </button>
                {/* <button className="player-control-btn" title="Lock"> <i className="fas fa-lock"></i> </button> */}
            </div>
        )}
      </div>

      <div className="player-action-icons">
        <button className="player-control-btn" title="Lyrics" disabled={!audioSrc}>
          <i className="fas fa-comment-alt"></i> {/* Or fa-closed-captioning */}
        </button>
        <button className="player-control-btn" title="Queue" disabled={!audioSrc}>
          <i className="fas fa-list-ul"></i>
        </button>
        <div className="player-volume-control-wrapper">
          <button className="player-control-btn" onClick={toggleVolumeSlider} title="Volume" disabled={!audioSrc}>
            <i className={`fas ${volume === 0 ? 'fa-volume-mute' : volume < 0.5 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
          </button>
          {/* Conditional or always visible compact slider */}
           <input
              ref={volumeRef}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="player-volume-slider-integrated"
              disabled={!audioSrc}
              style={{ display: isVolumeSliderVisible || true ? 'block' : 'none' }} // Control visibility, or always show
            />
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </footer>
  );
};

export default Player;