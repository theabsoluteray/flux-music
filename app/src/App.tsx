import React, { useState } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<any[]>([]);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [audioSrc, setAudioSrc] = useState('');

  const handleSearch = async () => {
    const res = await fetch(`http://localhost:3001/api/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSongs(data);
  };

  const playSong = async (song: any) => {
    const res = await fetch(`http://localhost:3001/api/stream?videoId=${song.videoId}`);
    const streamData = await res.json();
    setAudioSrc(streamData.streamUrl);
    setCurrentSong(song);
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
            {songs.map((song, idx) => (
              <div key={idx} className="song-card" onClick={() => playSong(song)}>
                <img src={song.thumbnail} alt={song.title} />
                <p>{song.title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="player">
        <p>Now playing: {currentSong ? currentSong.title : 'No song selected'}</p>
        {audioSrc && <audio controls autoPlay src={audioSrc} />}
      </footer>
    </div>
  );
}

export default App;
