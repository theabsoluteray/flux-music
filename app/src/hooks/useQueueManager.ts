// Optimized useQueueManager.ts for near-zero latency
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

  // Immediately fetch stream URL and cache it
  const fetchStreamUrl = useCallback(async (videoId: string) => {
    if (streamUrlCache.current.has(videoId)) {
      return streamUrlCache.current.get(videoId);
    }
    try {
      const res = await fetch(`http://localhost:5000/api/stream?videoId=${videoId}`);
      const data = await res.json();
      streamUrlCache.current.set(videoId, data.streamUrl);
      return data.streamUrl;
    } catch {
      return null;
    }
  }, []);

  // Preload stream URLs ahead of time (eager caching)
  const preCacheStreamUrls = useCallback(async (songs: Song[]) => {
    await Promise.all(
      songs.slice(0, 20).map(async song => {
        if (!streamUrlCache.current.has(song.videoId)) {
          await fetchStreamUrl(song.videoId);
        }
      })
    );
  }, [fetchStreamUrl]);

  const cacheSearchResults = (songs: Song[]) => {
    preCacheStreamUrls(songs);
  };

  const playSong = useCallback(async (song: Song, index?: number, newList?: Song[]) => {
    const cachedUrl = streamUrlCache.current.get(song.videoId);
    if (!cachedUrl) setIsBuffering(true);
    setAudioSrc('');
    setCurrentSong({ ...song, isLiked: likedSongs.has(song.videoId), lyrics: 'Loading lyrics...' });

    let newQueue = newList ? [...newList] : [...queue];
    if (newList) {
      originalQueueOrder.current = [...newList];
      if (isShuffleActiveRef.current) newQueue = shuffleArray(newQueue);
      preCacheStreamUrls(newQueue);
    }

    let songIndex = index ?? newQueue.findIndex(s => s.videoId === song.videoId);
    if (songIndex === -1 && currentQueueIndex >= 0) {
      newQueue.splice(currentQueueIndex + 1, 0, song);
      songIndex = currentQueueIndex + 1;
      originalQueueOrder.current = [...newQueue];
    }

    setQueue(newQueue);
    setCurrentQueueIndex(songIndex);

    const lyrics = await fetchLyrics(song.title, song.artist, song.duration as number).catch(() => 'Lyrics not available');
    const finalSong = { ...song, isLiked: likedSongs.has(song.videoId), lyrics };
    setCurrentSong(finalSong);

    const streamUrl = cachedUrl ?? await fetchStreamUrl(song.videoId);
    setAudioSrc(streamUrl || '');
    setIsBuffering(false);
  }, [queue, currentQueueIndex, likedSongs, fetchStreamUrl, preCacheStreamUrls]);

  const playNextInQueue = useCallback(() => {
    if (!queue.length) return;
    let nextIndex = (currentQueueIndex + 1) % queue.length;
    if (isShuffleActiveRef.current && queue.length > 1) {
      do { nextIndex = Math.floor(Math.random() * queue.length); }
      while (nextIndex === currentQueueIndex);
    }
    playSong(queue[nextIndex], nextIndex);
  }, [queue, currentQueueIndex, playSong]);

  const playPreviousInQueue = useCallback(() => {
    if (!queue.length) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    playSong(queue[prevIndex], prevIndex);
  }, [queue, currentQueueIndex, playSong]);

  const addToQueue = (song: Song) => {
    setQueue(prev => {
      if (prev.find(s => s.videoId === song.videoId)) return prev;
      const newQueue = [...prev, song];
      originalQueueOrder.current = [...newQueue];
      fetchStreamUrl(song.videoId);
      return newQueue;
    });
  };

  const playSongNext = (song: Song) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(currentQueueIndex + 1, 0, song);
      originalQueueOrder.current = [...newQueue];
      fetchStreamUrl(song.videoId);
      return newQueue;
    });
  };

  const handleShuffleToggleApp = (isShuffle: boolean) => {
    isShuffleActiveRef.current = isShuffle;
    if (!queue.length) return;
    const baseQueue = isShuffle ? shuffleArray(queue) : [...originalQueueOrder.current];
    setQueue(baseQueue);
    const newIndex = baseQueue.findIndex(s => s.videoId === currentSong?.videoId);
    setCurrentQueueIndex(newIndex >= 0 ? newIndex : 0);
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
    cacheSearchResults,
  };
}
