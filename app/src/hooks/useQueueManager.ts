// src/hooks/useQueueManager.ts
import { useState, useCallback, useRef } from 'react';
import { Song } from '../types';
import { fetchLyrics } from '../utils/lyricsService';
import { shuffleArray } from '../utils/arrayUtils'; 

export function useQueueManager(
    likedSongs: Map<string, Song>, 
    initialCurrentSong: Song | null,
    initialAudioSrc: string
) {
  const [currentSong, setCurrentSong] = useState<Song | null>(initialCurrentSong);
  const [audioSrc, setAudioSrc] = useState<string>(initialAudioSrc);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  const [queue, setQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const originalQueueOrder = useRef<Song[]>([]);
  const isShuffleActiveRef = useRef<boolean>(false);
  const streamUrlCache = useRef<Map<string, string>>(new Map());

  const fetchStreamUrl = async (videoId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/stream?videoId=${videoId}`);
      if (!res.ok) { 
        const errorData = await res.json(); 
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`); 
      }
      const streamData: { streamUrl: string } = await res.json();
      streamUrlCache.current.set(videoId, streamData.streamUrl);
      return streamData.streamUrl;
    } catch (error) {
      console.error('Error fetching stream URL:', error);
      return null;
    }
  };

  const preCacheStreamUrls = async (songs: Song[]) => {
    // Pre-fetch first 5 songs' stream URLs
    const songsToCache = songs.slice(0, 5);
    for (const song of songsToCache) {
      if (!streamUrlCache.current.has(song.videoId)) {
        fetchStreamUrl(song.videoId);
      }
    }
  };

  const playSong = useCallback(async (songToPlay: Song, indexInList?: number, playFromNewList?: Song[]) => {
    setIsBuffering(true);
    setAudioSrc('');
    setCurrentSong({...songToPlay, isLiked: likedSongs.has(songToPlay.videoId), lyrics: "Loading lyrics..."});

    let newQueue = playFromNewList ? [...playFromNewList] : [...queue];
    let songIndexInNewQueue = -1;
    const existingIndexInCurrentQueue = newQueue.findIndex(s => s.videoId === songToPlay.videoId);

    if (playFromNewList) {
        newQueue = [...playFromNewList];
        if (isShuffleActiveRef.current) {
            originalQueueOrder.current = [...newQueue];
            newQueue = shuffleArray(newQueue);
        } else {
            originalQueueOrder.current = [...newQueue];
        }
        const foundIndex = newQueue.findIndex(s => s.videoId === songToPlay.videoId);
        songIndexInNewQueue = foundIndex !== -1 ? foundIndex : (newQueue.length > 0 ? 0 : -1);
        
        // Pre-cache stream URLs for the new queue
        preCacheStreamUrls(newQueue);
    } else if (indexInList !== undefined && newQueue[indexInList]?.videoId === songToPlay.videoId) { 
        songIndexInNewQueue = indexInList;
    } else if (existingIndexInCurrentQueue !== -1) { 
        songIndexInNewQueue = existingIndexInCurrentQueue;
    } else { 
        const insertAfter = currentQueueIndex >= 0 && currentQueueIndex < newQueue.length ? currentQueueIndex : newQueue.length -1;
        newQueue.splice(insertAfter + 1, 0, songToPlay);
        if (!isShuffleActiveRef.current) originalQueueOrder.current = [...newQueue];
        songIndexInNewQueue = insertAfter + 1;
    }
    
    if(songIndexInNewQueue === -1 && newQueue.length > 0) songIndexInNewQueue = 0;
    
    setQueue(newQueue);
    setCurrentQueueIndex(songIndexInNewQueue);
    
    const songDataForPlayer = newQueue[songIndexInNewQueue];
    if (!songDataForPlayer) {
        setIsBuffering(false);
        setCurrentSong(null);
        return;
    }
    
    const songForPlayerState = { ...songDataForPlayer, isLiked: likedSongs.has(songDataForPlayer.videoId) };

    let lyricsResult: string | import("../types").LyricLine[] | null = "Loading lyrics...";
    try {
        lyricsResult = await fetchLyrics(
            songForPlayerState.title, songForPlayerState.artist,
            typeof songForPlayerState.duration === 'number' ? songForPlayerState.duration : undefined );
    } catch (lyricsError) { lyricsResult = "Lyrics not available for this track."; }
    
    const finalSongObject = {...songForPlayerState, lyrics: lyricsResult || "Lyrics not available for this track."};
    setCurrentSong(finalSongObject);

    // Check cache first for stream URL
    let streamUrl = streamUrlCache.current.get(songForPlayerState.videoId);
    if (!streamUrl) {
      streamUrl = await fetchStreamUrl(songForPlayerState.videoId);
    }

    if (streamUrl) {
      setAudioSrc(streamUrl);
    } else {
      setAudioSrc('');
      setCurrentSong(prev => prev ? {...prev, lyrics: prev.lyrics || "Error loading stream." } : {...finalSongObject, lyrics: "Error loading stream." });
    }
    setIsBuffering(false);
  }, [queue, currentQueueIndex, likedSongs]);

  const playNextInQueue = useCallback(() => {
    if (queue.length === 0) return;
    let nextIndex;
    if (isShuffleActiveRef.current && queue.length > 1) {
        do { nextIndex = Math.floor(Math.random() * queue.length); }
        while (nextIndex === currentQueueIndex && queue.length > 1);
    } else { nextIndex = (currentQueueIndex + 1) % queue.length; }
    if (queue[nextIndex]) playSong(queue[nextIndex], nextIndex);
    else if (queue.length > 0) playSong(queue[0],0);
  }, [queue, currentQueueIndex, playSong]);

  const playPreviousInQueue = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
     if (queue[prevIndex]) playSong(queue[prevIndex], prevIndex);
  }, [queue, currentQueueIndex, playSong]);

  const addToQueue = (song: Song) => {
    setQueue(prevQueue => {
      if (prevQueue.find(s => s.videoId === song.videoId)) return prevQueue;
      const newQueue = [...prevQueue, song];
      if (!isShuffleActiveRef.current) originalQueueOrder.current = [...newQueue];
      // Pre-cache the stream URL for the added song
      if (!streamUrlCache.current.has(song.videoId)) {
        fetchStreamUrl(song.videoId);
      }
      return newQueue;
    });
  };

  const playSongNext = (song: Song) => {
    setQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const insertAtIndex = currentQueueIndex >= 0 && currentQueueIndex < newQueue.length ? currentQueueIndex + 1 : newQueue.length;
      newQueue.splice(insertAtIndex, 0, song);
      if (!isShuffleActiveRef.current) originalQueueOrder.current = [...newQueue];
      // Pre-cache the stream URL for the song to be played next
      if (!streamUrlCache.current.has(song.videoId)) {
        fetchStreamUrl(song.videoId);
      }
      return newQueue;
    });
  };

  const handleShuffleToggleApp = (isShuffleOn: boolean) => {
    isShuffleActiveRef.current = isShuffleOn;
    if (isShuffleOn) {
        if (queue.length > 0) {
            if (originalQueueOrder.current.length !== queue.length || !originalQueueOrder.current.every((val, idx) => val.videoId === queue[idx].videoId)) {
                originalQueueOrder.current = [...queue];
            }
            const shuffledQueue = shuffleArray(queue);
            setQueue(shuffledQueue);
            if (currentSong) {
                const newIdx = shuffledQueue.findIndex(s => s.videoId === currentSong.videoId);
                setCurrentQueueIndex(newIdx !== -1 ? newIdx : 0);
            } else if (shuffledQueue.length > 0) setCurrentQueueIndex(0);
        }
    } else { 
        if (originalQueueOrder.current.length > 0) {
            setQueue([...originalQueueOrder.current]);
            if (currentSong) {
                const newIdx = originalQueueOrder.current.findIndex(s => s.videoId === currentSong.videoId);
                 setCurrentQueueIndex(newIdx !== -1 ? newIdx : 0);
            } else if (originalQueueOrder.current.length > 0) setCurrentQueueIndex(0);
        }
    }
  };

  return {
    currentSong,
    setCurrentSong, 
    audioSrc,
    isBuffering,
    queue,
    currentQueueIndex,
    playSong,
    playNextInQueue,
    playPreviousInQueue,
    addToQueue,
    playSongNext,
    handleShuffleToggleApp,
  };
}