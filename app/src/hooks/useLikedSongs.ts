// src/hooks/useLikedSongs.ts
import { useState, useEffect, useCallback } from 'react';
import { Song } from '../types';

const LIKED_SONGS_STORAGE_KEY = 'fluxMusicLikedSongs';

export function useLikedSongs(
    currentSong: Song | null,
    setCurrentSong: React.Dispatch<React.SetStateAction<Song | null>>,
    activeView: string,
    setSongsFromSearch: React.Dispatch<React.SetStateAction<Song[]>> // To update UI when liked songs list changes
) {
  const [likedSongs, setLikedSongs] = useState<Map<string, Song>>(() => {
    const storedLiked = localStorage.getItem(LIKED_SONGS_STORAGE_KEY);
    if (storedLiked) {
      try {
        const parsed = JSON.parse(storedLiked);
        if (Array.isArray(parsed)) {
          return new Map(parsed as [string, Song][]);
        }
      } catch (e) {
        console.error("Failed to parse liked songs from localStorage", e);
      }
    }
    return new Map();
  });

  const toggleLikeSong = useCallback((songToToggle: Song) => {
    setLikedSongs(prevLiked => {
      const newLiked = new Map(prevLiked);
      if (newLiked.has(songToToggle.videoId)) {
        newLiked.delete(songToToggle.videoId);
      } else {
        const { lyrics, ...songWithoutLyrics } = songToToggle; // Don't store full lyrics in liked list
        newLiked.set(songToToggle.videoId, songWithoutLyrics);
      }
      localStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(Array.from(newLiked.entries())));
      
      // Update currentSong's liked status if it's the one being toggled
      if (currentSong && currentSong.videoId === songToToggle.videoId) {
        setCurrentSong(prevCS => prevCS ? { ...prevCS, isLiked: newLiked.has(songToToggle.videoId) } : null);
      }
      // If viewing liked songs, update the displayed list
      if (activeView === 'liked-songs') {
        setSongsFromSearch(Array.from(newLiked.values()));
      }
      return newLiked;
    });
  }, [currentSong, activeView, setCurrentSong, setSongsFromSearch]);

  useEffect(() => { // Load liked songs from localStorage on initial mount
    const storedLiked = localStorage.getItem(LIKED_SONGS_STORAGE_KEY);
    if (storedLiked) {
      try {
        const parsedLikedArray = JSON.parse(storedLiked);
        if (Array.isArray(parsedLikedArray)) {
          setLikedSongs(new Map(parsedLikedArray as [string, Song][]));
        }
      } catch (e) { console.error("Error parsing liked songs from localStorage", e); }
    }
  }, []);

  const exportLikedSongs = () => {
    const dataStr = JSON.stringify(Array.from(likedSongs.entries()), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'flux-music-liked-songs.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importLikedSongs = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (Array.isArray(imported)) {
            const newLikedMap = new Map(imported as [string, Song][]);
            setLikedSongs(newLikedMap);
            localStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(Array.from(newLikedMap.entries())));
            if (activeView === 'liked-songs') {
                setSongsFromSearch(Array.from(newLikedMap.values()));
            }
            alert("Liked songs imported successfully!");
          } else { throw new Error("Invalid file format."); }
        } catch (err) {
          console.error("Error importing liked songs:", err);
          alert("Failed to import liked songs. Invalid file format or content.");
        }
      };
      reader.readAsText(file);
    }
    if(event.target) event.target.value = ''; // Reset file input
  };

  return {
    likedSongs,
    toggleLikeSong,
    exportLikedSongs,
    importLikedSongs,
  };
}