// src/components/Player.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import "./player.css";
import { Song, LyricLine } from "../types";

interface PlayerProps {
  currentSong: Song | null;
  audioSrc: string;
  isBuffering: boolean;
  queue: Song[];
  currentQueueIndex: number;
  playSongFromQueue: (song: Song, indexInQueue: number) => void;
  onPlayNext: (isShuffleActive?: boolean) => void;
  onPlayPrevious: () => void;
  onToggleLike: (song: Song) => void;
  onShuffleToggle: (isShuffleOn: boolean) => void;
}

const Player: React.FC<PlayerProps> = React.memo(
  ({
    // Wrapped in React.memo
    currentSong,
    audioSrc,
    isBuffering,
    queue,
    currentQueueIndex,
    playSongFromQueue,
    onPlayNext,
    onPlayPrevious,
    onToggleLike,
    onShuffleToggle,
  }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);
    const volumeRef = useRef<HTMLInputElement>(null);
    const fullscreenProgressRef = useRef<HTMLInputElement>(null);
    const fullscreenVolumeRef = useRef<HTMLInputElement>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.7);
    const [previousVolume, setPreviousVolume] = useState<number>(0.7);

    const [isPlayerVisible, setIsPlayerVisible] = useState<boolean>(false);
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    const [showLyricsPane, setShowLyricsPaneInternal] =
      useState<boolean>(false);
    const [showQueueList, setShowQueueList] = useState<boolean>(false);
    const [isShuffleActivePlayer, setIsShuffleActivePlayer] =
      useState<boolean>(false); // Local UI state for shuffle button
    const [isRepeat, setIsRepeat] = useState<"off" | "one" | "all">("off");
    const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
    const loadedAudioVideoId = useRef<string | null>(null);

    useEffect(() => {
      if (currentSong) {
        setIsPlayerVisible(true);
      } else {
        setIsPlayerVisible(false);
        setIsFullScreen(false);
        setShowQueueList(false);
        setShowLyricsPaneInternal(false);
      }
    }, [currentSong]);

    useEffect(() => {
      const audioElement = audioRef.current;
      if (audioElement) {
        if (audioSrc && currentSong && isPlayerVisible && !isBuffering) {
          if (
            audioElement.src !== audioSrc ||
            loadedAudioVideoId.current !== currentSong.videoId
          ) {
            loadedAudioVideoId.current = currentSong.videoId;
            audioElement.src = audioSrc;
            audioElement.load();
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  /* State managed by event listeners */
                })
                .catch((error) => {
                  console.warn(
                    "Audio playback prevented by browser on load:",
                    error
                  );
                });
            }
          }
        } else if (!audioSrc || isBuffering) {
          audioElement.pause();
          if (!currentSong && !isBuffering) {
            if (audioElement) audioElement.currentTime = 0;
            setCurrentTime(0);
            setDuration(0);
          }
          if (!audioSrc && !isBuffering) loadedAudioVideoId.current = null;
        } else if (!isPlayerVisible) {
          audioElement.pause();
          loadedAudioVideoId.current = null;
        }
      }
    }, [audioSrc, currentSong, isPlayerVisible, isBuffering]);

    useEffect(() => {
      const audioElement = audioRef.current;
      if (!audioElement) return;
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      audioElement.addEventListener("play", handlePlay);
      audioElement.addEventListener("pause", handlePause);
      setIsPlaying(
        !audioElement.paused && audioElement.readyState > 0 && !!audioSrc
      ); // Initial sync
      return () => {
        audioElement.removeEventListener("play", handlePlay);
        audioElement.removeEventListener("pause", handlePause);
      };
    }, [audioSrc]); // Re-attach if audioSrc changes fundamentally

    useEffect(() => {
      if (audioRef.current) audioRef.current.volume = volume;
      const currentVolumeSlider = isFullScreen
        ? fullscreenVolumeRef.current
        : volumeRef.current;
      if (currentVolumeSlider) {
        currentVolumeSlider.style.setProperty(
          "--volume-percent",
          `${volume * 100}%`
        );
      }
    }, [volume, isFullScreen]);

    useEffect(() => {
      const currentProgressSlider = isFullScreen
        ? fullscreenProgressRef.current
        : progressRef.current;
      if (currentProgressSlider) {
        const progressPercent =
          duration > 0 ? (currentTime / duration) * 100 : 0;
        currentProgressSlider.style.setProperty(
          "--progress-percent",
          `${progressPercent}%`
        );
      }
    }, [currentTime, duration, isFullScreen]);

    useEffect(() => {
      const initVolumePercent = `${volume * 100}%`;
      const initProgressPercent =
        duration > 0 && currentTime > 0
          ? `${(currentTime / duration) * 100}%`
          : "0%";
      if (volumeRef.current)
        volumeRef.current.style.setProperty(
          "--volume-percent",
          initVolumePercent
        );
      if (progressRef.current)
        progressRef.current.style.setProperty(
          "--progress-percent",
          initProgressPercent
        );
      if (fullscreenVolumeRef.current)
        fullscreenVolumeRef.current.style.setProperty(
          "--volume-percent",
          initVolumePercent
        );
      if (fullscreenProgressRef.current)
        fullscreenProgressRef.current.style.setProperty(
          "--progress-percent",
          initProgressPercent
        );
    }, [isPlayerVisible, isFullScreen, volume, currentTime, duration]);

    const togglePlayPause = useCallback(
      (e?: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => {
        if (e && "stopPropagation" in e) e.stopPropagation();
        if (!audioRef.current) return;
        if (isBuffering) return; // Don't allow play/pause toggle during buffering

        if (!audioSrc && currentSong) {
          const songIndex = queue.findIndex(
            (s) => s.videoId === currentSong.videoId
          );
          if (songIndex !== -1) playSongFromQueue(currentSong, songIndex);
          return;
        }
        if (!audioSrc) return;

        if (audioRef.current.paused) {
          audioRef.current
            .play()
            .catch((err) => console.warn("Play error on toggle:", err));
        } else {
          audioRef.current.pause();
        }
      },
      [audioSrc, currentSong, queue, playSongFromQueue, isBuffering]
    );

    useEffect(() => {
      const handleSpacebar = (event: KeyboardEvent) => {
        const targetNode = event.target as HTMLElement;
        if (
          targetNode &&
          (targetNode.tagName === "INPUT" ||
            targetNode.tagName === "TEXTAREA" ||
            targetNode.tagName === "BUTTON")
        ) {
          return;
        }
        if (event.code === "Space" || event.key === " ") {
          event.preventDefault();
          togglePlayPause(event);
        }
      };
      if (isFullScreen) document.addEventListener("keydown", handleSpacebar);
      else document.removeEventListener("keydown", handleSpacebar);
      return () => document.removeEventListener("keydown", handleSpacebar);
    }, [isFullScreen, togglePlayPause]);

    useEffect(() => {
      if (
        !isPlaying ||
        !currentSong ||
        !Array.isArray(currentSong.lyrics) ||
        currentSong.lyrics.length === 0
      ) {
        setCurrentLyricIndex(-1);
        return;
      }
      const lyricsArray = currentSong.lyrics as LyricLine[];
      let newLyricIndex = -1;
      for (let i = 0; i < lyricsArray.length; i++) {
        if (lyricsArray[i].time <= currentTime) newLyricIndex = i;
        else break;
      }
      if (newLyricIndex !== currentLyricIndex)
        setCurrentLyricIndex(newLyricIndex);
    }, [currentTime, currentSong, isPlaying]);

    useEffect(() => {
      if (
        isFullScreen &&
        showLyricsPane &&
        currentLyricIndex >= 0 &&
        lyricsContainerRef.current
      ) {
        const activeLineElement = lyricsContainerRef.current.children[
          currentLyricIndex
        ] as HTMLElement;
        if (activeLineElement) {
          const container = lyricsContainerRef.current;
          const scrollAmount =
            activeLineElement.offsetTop -
            container.offsetTop -
            container.clientHeight / 3 +
            activeLineElement.clientHeight / 2;
          container.scrollTo({
            top: Math.max(0, scrollAmount),
            behavior: "smooth",
          });
        }
      }
    }, [currentLyricIndex, isFullScreen, showLyricsPane]);

    const handleOnEnded = () => {
      if (isRepeat === "one" && currentSong) {
        const currentIndexInQueue = queue.findIndex(
          (s) => s.videoId === currentSong.videoId
        );
        if (currentIndexInQueue !== -1)
          playSongFromQueue(queue[currentIndexInQueue], currentIndexInQueue);
        else if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .catch((e) => console.warn("Replay error:", e));
        }
      } else if (isRepeat === "all" || isRepeat === "off") {
        onPlayNext(isShuffleActivePlayer);
      }
    };

    const handleTimeUpdate = () =>
      audioRef.current && setCurrentTime(audioRef.current.currentTime);
    const handleLoadedMetadata = () =>
      audioRef.current && setDuration(audioRef.current.duration);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioRef.current || isBuffering) return;
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleProgressWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (!audioRef.current || !currentSong || duration === 0 || isBuffering)
        return;
      e.preventDefault();
      const seekAmount = e.deltaY < 0 ? 5 : -5;
      const newTime = Math.max(0, Math.min(duration, currentTime + seekAmount));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (newVolume > 0) setPreviousVolume(newVolume);
    };

    const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.preventDefault();
      const volumeStep = e.deltaY < 0 ? 0.05 : -0.05;
      const newVolume = Math.max(0, Math.min(1, volume + volumeStep));
      setVolume(newVolume);
      if (newVolume > 0) setPreviousVolume(newVolume);
    };

    const toggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (volume > 0) {
        setPreviousVolume(volume);
        setVolume(0);
      } else {
        setVolume(previousVolume > 0.01 ? previousVolume : 0.7);
      }
    };

    const handlePlayerClickToFullscreen = (
      e: React.MouseEvent<HTMLElement>
    ) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest('input[type="range"]') ||
        target.closest(".player-song-inline-actions")
      )
        return;
      if (!isFullScreen) {
        setIsFullScreen(true);
        if (
          currentSong?.lyrics &&
          ((Array.isArray(currentSong.lyrics) &&
            currentSong.lyrics.length > 0) ||
            (typeof currentSong.lyrics === "string" &&
              currentSong.lyrics !== "Lyrics not available for this track." &&
              currentSong.lyrics !== "Error loading lyrics or stream." &&
              currentSong.lyrics !== "Lyrics not found for this track."))
        ) {
          setShowLyricsPaneInternal(true);
        } else {
          setShowLyricsPaneInternal(false);
        }
      }
    };
    const handleCompactClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setIsFullScreen(false);
      setShowQueueList(false);
      setShowLyricsPaneInternal(false);
    };

    const toggleLyricsPane = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!isFullScreen) {
        setIsFullScreen(true);
        setShowLyricsPaneInternal(true);
      } else {
        setShowLyricsPaneInternal((prev) => !prev);
      }
    };
    const toggleQueueList = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setShowQueueList((prev) => !prev);
    };

    const handlePlayFromQueueUI = (song: Song, index: number) => {
      playSongFromQueue(song, index);
      setShowQueueList(false);
    };

    const toggleShuffleInternal = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const newShuffleState = !isShuffleActivePlayer;
      setIsShuffleActivePlayer(newShuffleState);
      onShuffleToggle(newShuffleState);
    };
    const cycleRepeat = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setIsRepeat((prev) => {
        if (prev === "off") return "all";
        if (prev === "all") return "one";
        return "off";
      });
    };
    const getRepeatIcon = () => {
      if (isRepeat === "one") return "fa-retweet";
      if (isRepeat === "all") return "fa-redo-alt";
      return "fa-redo-alt";
    };
    const formatTime = (time: number): string => {
      if (isNaN(time) || time < 0) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    const handleLikeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (currentSong) {
        onToggleLike(currentSong);
      }
    };

    const displayTitle = isBuffering
      ? "Buffering..."
      : currentSong?.title || "No Song Playing";

    return (
      <>
        <footer
          className={`
          player-container-base
          ${isPlayerVisible ? "player-visible" : ""}
          ${isFullScreen ? "player-fullscreen-mode" : "player-floating-bar"}
        `}
          onClick={isFullScreen ? undefined : handlePlayerClickToFullscreen}
        >
          {isFullScreen ? (
            <div className="fullscreen-player-content">
              <div className="fullscreen-main-panel">
                <div className="fullscreen-main-panel-content-area">
                  <div className="album-art-fullscreen-wrapper">
                    {currentSong && (
                      <img
                        src={currentSong.thumbnail}
                        alt={currentSong.title}
                        className="album-art-fullscreen"
                      />
                    )}
                  </div>
                  <div className="song-details-fullscreen">
                    <h1>{displayTitle}</h1>
                    <p>
                      {!isBuffering &&
                        (currentSong?.artist || "Unknown Artist")}
                    </p>
                  </div>
                  <div className="controls-fullscreen-wrapper">
                    <div className="progress-bar-container-fullscreen">
                      <span className="time-fullscreen">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        ref={fullscreenProgressRef}
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        onWheel={handleProgressWheel}
                        className="progress-bar-fullscreen"
                        disabled={!currentSong || duration === 0 || isBuffering}
                      />
                      <span className="time-fullscreen">
                        {formatTime(duration)}
                      </span>
                    </div>
                    <div className="player-controls-fullscreen">
                      <button
                        className={`player-control-btn-fs ${
                          isShuffleActivePlayer ? "active-control" : ""
                        }`}
                        title="Shuffle"
                        disabled={!currentSong || isBuffering}
                        onClick={toggleShuffleInternal}
                      >
                        <i className="fas fa-random"></i>
                      </button>
                      <button
                        className="player-control-btn-fs"
                        title="Previous"
                        disabled={
                          !currentSong || queue.length <= 1 || isBuffering
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPrevious();
                        }}
                      >
                        <i className="fas fa-step-backward"></i>
                      </button>
                      <button
                        className="player-play-pause-btn-fs"
                        onClick={togglePlayPause}
                        title={isPlaying ? "Pause" : "Play"}
                        disabled={!currentSong || isBuffering}
                      >
                        <i
                          className={`fas ${
                            isBuffering
                              ? "fa-spinner fa-spin"
                              : isPlaying
                              ? "fa-pause-circle"
                              : "fa-play-circle"
                          }`}
                        ></i>
                      </button>
                      <button
                        className="player-control-btn-fs"
                        title="Next"
                        disabled={
                          !currentSong || queue.length <= 1 || isBuffering
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayNext(isShuffleActivePlayer);
                        }}
                      >
                        <i className="fas fa-step-forward"></i>
                      </button>
                      <button
                        className="player-control-btn-fs like-btn-fs"
                        title={currentSong?.isLiked ? "Unlike" : "Like"}
                        disabled={!currentSong || isBuffering}
                        onClick={handleLikeClick}
                      >
                        <i
                          className={`${
                            currentSong?.isLiked ? "fas" : "far"
                          } fa-heart`}
                        ></i>
                      </button>
                      <button
                        className={`player-control-btn-fs ${
                          isRepeat !== "off" ? "active-control" : ""
                        }`}
                        title={`Repeat: ${isRepeat}`}
                        disabled={!currentSong || isBuffering}
                        onClick={cycleRepeat}
                      >
                        <i className={`fas ${getRepeatIcon()}`}></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="fullscreen-bottom-actions">
                  <div className="volume-control-fullscreen">
                    <button
                      className="player-control-btn-fs"
                      onClick={toggleMute}
                      title={volume > 0 ? "Mute" : "Unmute"}
                      disabled={isBuffering}
                    >
                      <i
                        className={`fas ${
                          volume === 0
                            ? "fa-volume-mute"
                            : volume < 0.5
                            ? "fa-volume-down"
                            : "fa-volume-up"
                        }`}
                      ></i>
                    </button>
                    <input
                      ref={fullscreenVolumeRef}
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      onWheel={handleVolumeWheel}
                      className="volume-slider-fullscreen"
                      disabled={isBuffering}
                    />
                  </div>
                  <div className="right-controls-group">
                    <button
                      className="player-control-btn-fs lyrics-toggle-btn-fs"
                      onClick={toggleLyricsPane}
                      title={showLyricsPane ? "Hide Lyrics" : "Show Lyrics"}
                    >
                      <i
                        className={`fas ${
                          showLyricsPane ? "fa-comment-slash" : "fa-comment-alt"
                        }`}
                      ></i>
                    </button>
                    <button
                      className="player-control-btn-fs queue-toggle-btn-fs"
                      onClick={toggleQueueList}
                      title={showQueueList ? "Hide Queue" : "Show Queue"}
                    >
                      <i className="fas fa-list-ul"></i>
                    </button>
                    <button
                      className="compact-btn-fs player-control-btn-fs"
                      onClick={handleCompactClick}
                      title="Compact View"
                    >
                      <i className="fas fa-compress-alt"></i>
                    </button>
                  </div>
                </div>
              </div>

              <aside
                className={`lyrics-pane-fullscreen ${
                  !showLyricsPane ? "hidden" : ""
                }`}
              >
                <h3>Lyrics</h3>
                <div className="lyrics-content" ref={lyricsContainerRef}>
                  {currentSong?.lyrics ? (
                    Array.isArray(currentSong.lyrics) &&
                    currentSong.lyrics.length > 0 ? (
                      currentSong.lyrics.map((line, index) => (
                        <p
                          key={index}
                          className={`lyric-line ${
                            index === currentLyricIndex ? "active-lyric" : ""
                          }`}
                        >
                          {line.text || "\u00A0"}
                        </p>
                      ))
                    ) : typeof currentSong.lyrics === "string" ? (
                      <p className="lyric-line">{currentSong.lyrics}</p>
                    ) : (
                      <p className="lyric-line">Lyrics not available.</p>
                    )
                  ) : (
                    <p className="lyric-line">Lyrics not available.</p>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            // Floating Player
            <>
              <div className="player-nav-controls">
                <button
                  className="player-control-btn"
                  title="Previous"
                  disabled={!currentSong || queue.length <= 1 || isBuffering}
                  onClick={onPlayPrevious}
                >
                  <i className="fas fa-step-backward"></i>
                </button>
                <button
                  className="player-play-pause-btn"
                  onClick={togglePlayPause}
                  title={isPlaying ? "Pause" : "Play"}
                  disabled={!currentSong || isBuffering}
                >
                  <i
                    className={`fas ${
                      isBuffering
                        ? "fa-spinner fa-spin"
                        : isPlaying
                        ? "fa-pause"
                        : "fa-play"
                    }`}
                  ></i>
                </button>
                <button
                  className="player-control-btn"
                  title="Next"
                  disabled={!currentSong || queue.length <= 1 || isBuffering}
                  onClick={() => onPlayNext(isShuffleActivePlayer)}
                >
                  <i className="fas fa-step-forward"></i>
                </button>
              </div>

              <div className="player-song-details">
                {currentSong && (
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="player-album-art-small"
                  />
                )}
                <div className="player-title-artist-progress">
                  <h4>{displayTitle}</h4>
                  <p>{!isBuffering && (currentSong?.artist || " ")}</p>
                  <input
                    ref={progressRef}
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    onWheel={handleProgressWheel}
                    className="player-progress-bar-integrated"
                    disabled={!currentSong || duration === 0 || isBuffering}
                    title="Seek"
                  />
                </div>
                {currentSong && !isBuffering && (
                  <div className="player-song-inline-actions">
                    <button
                      className={`player-control-btn ${
                        isShuffleActivePlayer ? "active-control" : ""
                      }`}
                      title="Shuffle"
                      disabled={!currentSong}
                      onClick={toggleShuffleInternal}
                    >
                      <i className="fas fa-random"></i>
                    </button>
                    <button
                      className="player-control-btn"
                      title={currentSong.isLiked ? "Unlike" : "Like"}
                      disabled={!currentSong}
                      onClick={handleLikeClick}
                    >
                      <i
                        className={`${
                          currentSong.isLiked ? "fas" : "far"
                        } fa-heart`}
                      ></i>
                    </button>
                  </div>
                )}
              </div>

              <div className="player-action-icons">
                <button
                  className="player-control-btn"
                  onClick={toggleLyricsPane}
                  title="Lyrics"
                  disabled={!currentSong || isBuffering}
                >
                  <i className="fas fa-comment-alt"></i>
                </button>
                <button
                  className="player-control-btn"
                  onClick={toggleQueueList}
                  title="Queue"
                  disabled={!currentSong || isBuffering}
                >
                  <i className="fas fa-list-ul"></i>
                </button>
                <div className="player-volume-control-wrapper">
                  <button
                    className="player-control-btn"
                    onClick={toggleMute}
                    title={volume > 0 ? "Mute" : "Unmute"}
                    disabled={isBuffering}
                  >
                    <i
                      className={`fas ${
                        volume === 0
                          ? "fa-volume-mute"
                          : volume < 0.5
                          ? "fa-volume-down"
                          : "fa-volume-up"
                      }`}
                    ></i>
                  </button>
                  <input
                    ref={volumeRef}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    onWheel={handleVolumeWheel}
                    className="player-volume-slider-integrated"
                    disabled={isBuffering}
                  />
                </div>
              </div>
            </>
          )}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleOnEnded}
          />
        </footer>

        {isPlayerVisible && (
          <div
            className={`queue-list-overlay ${showQueueList ? "active" : ""} ${
              isFullScreen
                ? "queue-list-fullscreen-style"
                : "queue-list-floating-style"
            }`}
          >
            <div className="queue-list-header">
              <h3>Up Next</h3>
              <button
                onClick={toggleQueueList}
                className="close-queue-btn"
                title="Close Queue"
              >
                ×
              </button>
            </div>
            <ul className="queue-items">
              {queue.length > 0 ? (
                queue.map((song, index) => (
                  <li
                    key={song.videoId + "-" + index + "-queue"}
                    className={`queue-item ${
                      currentSong?.videoId === song.videoId ? "playing-now" : ""
                    }`}
                    onClick={() => handlePlayFromQueueUI(song, index)}
                  >
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="queue-item-thumbnail"
                    />
                    <div className="queue-item-details">
                      <span className="queue-item-title">{song.title}</span>
                      <span className="queue-item-artist">
                        {song.artist || "Unknown Artist"}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <li className="queue-empty">Queue is empty.</li>
              )}
            </ul>
          </div>
        )}
      </>
    );
  }
);

export default Player;
