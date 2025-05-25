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

  useEffect(() => {
    if (audioRef.current) {
      if (audioSrc) {
        audioRef.current.src = audioSrc;
        audioRef.current.load(); 

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.warn("Audio playback prevented or aborted:", error);
            setIsPlaying(false);
          });
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
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (volumeRef.current) {
      const volumePercent = volume * 100;
      volumeRef.current.style.setProperty('--volume-percent', `${volumePercent}%`);
    }
  }, [volume]);

  useEffect(() => {
    if (progressRef.current) {
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      progressRef.current.style.setProperty('--progress-percent', `${progressPercent}%`);
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if (volumeRef.current) {
        const initialVolumePercent = volume * 100;
        volumeRef.current.style.setProperty('--volume-percent', `${initialVolumePercent}%`);
    }
    if (progressRef.current) {
        progressRef.current.style.setProperty('--progress-percent', '0%');
    }
  }, []); 


  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.warn("Play error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (!audioRef.current || !audioSrc || duration === 0) return;
    e.preventDefault();
    const seekAmount = 5;
    let newTime = currentTime;
    if (e.deltaY < 0) {
      newTime = Math.min(duration, currentTime + seekAmount);
    } else {
      newTime = Math.max(0, currentTime - seekAmount);
    }
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
    }
  };

  const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    e.preventDefault();
    const volumeStep = 0.05;
    let newVolume = volume;
    if (e.deltaY < 0) {
      newVolume = Math.min(1, volume + volumeStep);
    } else {
      newVolume = Math.max(0, volume - volumeStep);
    }
    setVolume(newVolume);
  };

  const formatTime = (time: number): string => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <footer className="player">
      <div className="player-left">
        {currentSong && (
          <>
            <img src={currentSong.thumbnail} alt="Album Art" className="album-art" />
            <div className="song-info">
              <h4>{currentSong.title}</h4>
              <p>{currentSong.artist || 'Unknown Artist'}</p>
            </div>
          </>
        )}
      </div>

      <div className="player-center">
        <div className="controls">
          <button className="control-btn"><i className="fas fa-random"></i></button>
          <button className="control-btn"><i className="fas fa-step-backward"></i></button>
          <button className="play-pause-btn" onClick={togglePlayPause} disabled={!audioSrc}>
            <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'}`}></i>
          </button>
          <button className="control-btn"><i className="fas fa-step-forward"></i></button>
          <button className="control-btn"><i className="fas fa-redo-alt"></i></button>
        </div>
        <div className="progress-bar-container">
          <span className="time">{formatTime(currentTime)}</span>
          <input
            ref={progressRef} 
            type="range"
            min="0"
            max={duration || 0} 
            value={currentTime}
            onChange={handleSeek}
            onWheel={handleProgressWheel}
            className="progress-bar"
            disabled={!audioSrc || duration === 0}
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="control-btn"><i className="far fa-heart"></i></button>
        <button className="control-btn"><i className="fas fa-bars"></i></button>
        <div className="volume-control">
          <i className="fas fa-volume-up"></i> 
          <input
            ref={volumeRef} 
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            onWheel={handleVolumeWheel}
            className="volume-slider"
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