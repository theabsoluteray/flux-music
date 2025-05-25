// src/App.tsx
import React, { useState } from 'react';
import './App.css';
import Player from './components/player'; // Import the Player component
import { Song } from './types'; // Import the Song interface

function App() {
  const [query, setQuery] = useState<string>('');
  const [songs, setSongs] = useState<Song[]>([]); // Type songs array
  const [currentSong, setCurrentSong] = useState<Song | null>(null); // Type currentSong
  const [audioSrc, setAudioSrc] = useState<string>('');

  const handleSearch = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: Song[] = await res.json(); // Explicitly type the incoming data
      setSongs(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setSongs([]); // Clear songs on error
    }
  };

  const playSong = async (song: Song) => { // Type the song parameter
    try {
      setCurrentSong(song); // Set the current song immediately
      const res = await fetch(`http://localhost:5000/api/stream?videoId=${song.videoId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const streamData: { streamUrl: string } = await res.json(); // Type streamData
      setAudioSrc(streamData.streamUrl);
    } catch (error) {
      console.error("Error streaming song:", error);
      setAudioSrc(''); // Clear audio source on error
      setCurrentSong(null); // Clear current song on error
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Flux</h2>
        <nav>
          <button className="nav-link">Home</button>
          <button className="nav-link">Browse</button>
          <button className="nav-link">Library</button>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <input
            type="text"
            placeholder="Search music..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </header>

        <section className="content">
          <h1>Welcome to Flux</h1>
          <p>Your personalized music experience</p>
          <div className="song-list">
            {songs.length > 0 ? (
              songs.map((song: Song) => ( // Type song in map callback
                <div key={song.videoId} className="song-card" onClick={() => playSong(song)}>
                  <img src={song.thumbnail} alt={song.title} />
                  <p>{song.title}</p>
                </div>
              ))
            ) : (
              <p>No songs found. Try searching!</p>
            )}
          </div>
        </section>
      </main>

      {/* Render the new Player component */}
      <Player currentSong={currentSong} audioSrc={audioSrc} />
    </div>
  );
}

export default App;