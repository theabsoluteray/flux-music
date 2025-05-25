// src/components/Player.tsx
import React, { useState, useRef, useEffect } from 'react';
import './player.css'; // Make sure Player.css is in the same directory
import { Song } from '../types'; // Import the Song interface

interface PlayerProps {
  currentSong: Song | null;
  audioSrc: string; // Add audioSrc as a prop
}

const Player: React.FC<PlayerProps> = ({ currentSong, audioSrc }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7); // Initialized volume state

  // Effect to handle changing audio source and initiating playback
  useEffect(() => {
    if (audioRef.current) {
      if (audioSrc) {
        audioRef.current.src = audioSrc;
        audioRef.current.load(); // Load the new audio

        // Attempt to play immediately
        const playPromise = audioRef.current.play();

        // Handle the play promise to catch autoplay issues or aborted plays
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.warn("Audio playback prevented or aborted:", error);
            setIsPlaying(false);
            // Consider showing a message to the user here, e.g., "Browser prevented autoplay."
          });
        }
      } else {
        // No audio source, ensure it's paused and reset
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [audioSrc]); // Dependency array: only re-run when audioSrc changes

  // Effect to set initial volume when component mounts or volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]); // Only set volume when component mounts or volume state changes

  // Toggles play/pause state
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Updates current playback time as audio plays
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Sets total duration when audio metadata is loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handles seeking by dragging the progress bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handles mouse wheel control for the progress bar
  const handleProgressWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (!audioRef.current || !audioSrc) return; // Only if audio is loaded
    e.preventDefault(); // Prevent page scrolling when wheeling over the slider

    const seekAmount = 5; // Seek 5 seconds at a time
    let newTime = currentTime;

    if (e.deltaY < 0) { // Wheel up (scroll forward)
      newTime = Math.min(duration, currentTime + seekAmount);
    } else { // Wheel down (scroll backward)
      newTime = Math.max(0, currentTime - seekAmount);
    }

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handles volume change by dragging the volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newVolume = parseFloat(e.target.value);
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // Handles mouse wheel control for the volume slider
  const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    e.preventDefault(); // Prevent page scrolling when wheeling over the slider

    const volumeStep = 0.05; // Adjust volume by 5% at a time
    let newVolume = volume;

    if (e.deltaY < 0) { // Wheel up (increase volume)
      newVolume = Math.min(1, volume + volumeStep);
    } else { // Wheel down (decrease volume)
      newVolume = Math.max(0, volume - volumeStep);
    }

    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  // Formats time (e.g., 3:45) for display
  const formatTime = (time: number): string => {
    if (isNaN(time) || time < 0) return '0:00'; // Handle invalid time
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
              <p>{currentSong.artist || 'Unknown Artist'}</p> {/* Uses optional artist, falls back to 'Unknown Artist' */}
            </div>
          </>
        )}
      </div>

      <div className="player-center">
        <div className="controls">
          <button className="control-btn"><i className="fas fa-random"></i></button>
          <button className="control-btn"><i className="fas fa-step-backward"></i></button>
          <button className="play-pause-btn" onClick={togglePlayPause}>
            <i className={`fas ${isPlaying ? 'fa-pause-circle' : 'fa-play-circle'}`}></i>
          </button>
          <button className="control-btn"><i className="fas fa-step-forward"></i></button>
          <button className="control-btn"><i className="fas fa-redo-alt"></i></button>
        </div>
        <div className="progress-bar-container">
          <span className="time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            onWheel={handleProgressWheel}
            className="progress-bar"
            disabled={!audioSrc} // Disable if no song is loaded
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

      {/* The actual audio element, controlled by the component's state and props */}
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