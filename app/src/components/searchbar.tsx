import React, { useState, useEffect, useCallback } from 'react';
import './searchbar.css';

// Type definition for a Song (adjust this if you use a different structure)
interface Song {
  title: string;
  videoId: string;
  artist?: string;
  album?: string;
  duration?: number | string;
  thumbnail: string;
  streamUrl?: string;
}

// Props for the SearchBar component
interface SearchBarProps {
  onSearch: (songs: Song[]) => void; // callback to pass back results
  cacheSearchResults: (songs: Song[]) => void; // for pre-caching
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, cacheSearchResults }) => {
  const [query, setQuery] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch songs and their stream URLs
  const fetchSearchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(searchQuery)}`);
      const songs: Song[] = await res.json();

      // Pre-fetch stream URLs in parallel
      const enrichedSongs = await Promise.all(
        songs.map(async (song) => {
          try {
            const res = await fetch(`http://localhost:5000/api/stream?videoId=${song.videoId}`);
            const data = await res.json();
            return { ...song, streamUrl: data.streamUrl };
          } catch {
            return { ...song, streamUrl: '' };
          }
        })
      );

      // Pass back results and cache
      onSearch(enrichedSongs);
      cacheSearchResults(enrichedSongs);
    } catch (err) {
      console.error('Failed to fetch search results', err);
    }
  }, [onSearch, cacheSearchResults]);

  // Trigger search after 400ms of inactivity (debounced input)
  useEffect(() => {
    if (typingTimeout) clearTimeout(typingTimeout);
    if (query.trim() === '') return;

    const timeout = setTimeout(() => {
      fetchSearchResults(query);
    }, 400);

    setTypingTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [query, fetchSearchResults, typingTimeout]);

  return (
    <form className="search-bar" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Search songs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="button" onClick={() => fetchSearchResults(query)}>Search</button>
    </form>
  );
};

export default SearchBar;

