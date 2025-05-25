// src/App.tsx
import React, { useState } from 'react';
import './App.css';
import Player from './components/player';
import { Song } from './types';

const dummyPlaylists = [
  { id: 'pl1', name: 'Good Vibes Only', icon: 'fa-grin-beam' },
  { id: 'pl2', name: 'Indie Anthems', icon: 'fa-guitar' },
  { id: 'pl3', name: 'Workout Beats', icon: 'fa-dumbbell' },
];

function App() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('all-music');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isMiddlePaneCollapsed, setIsMiddlePaneCollapsed] = useState<boolean>(false); // State for collapse

  const toggleMiddlePane = () => {
    setIsMiddlePaneCollapsed(prev => !prev);
  };

  const handleSongSearch = async (query: string) => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: Song[] = await res.json();
      setSongs(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setSongs([]);
    }
  };

  const playSong = async (song: Song) => {
    try {
      setCurrentSong(song);
      const res = await fetch(`http://localhost:5000/api/stream?videoId=${song.videoId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const streamData: { streamUrl: string } = await res.json();
      setAudioSrc(streamData.streamUrl);
    } catch (error) {
      console.error("Error streaming song:", error);
      setAudioSrc('');
      setCurrentSong(null);
    }
  };

  const handleMiddlePaneSelection = (view: string, playlistId?: string) => {
    setActiveView(view);
    setActivePlaylistId(playlistId || null);
    if (view !== 'search-triggered') {
        setSongs([]);
        setSearchQuery('');
    }
  
  };

  let currentContentTitle = "Music";
  if (activeView === 'all-music') currentContentTitle = "All Music";
  else if (activeView === 'recently-added') currentContentTitle = "Recently Added";
  else if (activeView === 'artist') currentContentTitle = "Artists";
  else if (activeView === 'albums') currentContentTitle = "Albums";
  else if (activeView === 'songs') currentContentTitle = "Songs";
  else if (activeView === 'made-for-you') currentContentTitle = "Made For You";
  else if (activePlaylistId) {
    const pl = dummyPlaylists.find(p => p.id === activePlaylistId);
    if (pl) currentContentTitle = pl.name;
  }

  return (
    <div className={`main-ui-window ${isMiddlePaneCollapsed ? 'middle-pane-collapsed' : ''}`}>
      {/* Left Sidebar */}
      <nav className="left-sidebar">
        <div> {/* Wrapper for main icons to allow collapse button at bottom */}
            <button className={`sidebar-icon-btn ${activeView === 'all-music' ? 'active' : ''}`} title="Library" onClick={() => handleMiddlePaneSelection('all-music')}>
            <i className="fas fa-play-circle"></i>
            </button>
            <button className="sidebar-icon-btn" title="Browse">
            <i className="fas fa-compass"></i>
            </button>
            <button className="sidebar-icon-btn" title="Search">
            <i className="fas fa-search"></i>
            </button>
        </div>
        <button
          className="sidebar-icon-btn collapse-toggle-btn"
          title={isMiddlePaneCollapsed ? "Expand Library" : "Collapse Library"}
          onClick={toggleMiddlePane}
        >
          <i className={`fas ${isMiddlePaneCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
        </button>
      </nav>

      {/* Middle Pane */}
      <section className="middle-pane">
        <h2>Library</h2>
        <div className={`library-category ${activeView === 'all-music' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('all-music')}>
            <i className="fas fa-grip-horizontal"></i>All Music
        </div>
        <div className={`library-category ${activeView === 'recently-added' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('recently-added')}>
            <i className="fas fa-history"></i>Recently Added
        </div>
        <div className={`library-category ${activeView === 'artist' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('artist')}>
            <i className="fas fa-user"></i>Artist
        </div>
        <div className={`library-category ${activeView === 'albums' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('albums')}>
            <i className="fas fa-album"></i>Albums
        </div>
        <div className={`library-category ${activeView === 'songs' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('songs')}>
            <i className="fas fa-music"></i>Songs
        </div>
        <div className={`library-category ${activeView === 'made-for-you' ? 'active' : ''}`} onClick={() => handleMiddlePaneSelection('made-for-you')}>
            <i className="fas fa-headphones-alt"></i>Made For You
        </div>
        
        <h3 className="section-title">Playlists</h3>
        {dummyPlaylists.map(pl => (
           <div 
              key={pl.id} 
              className={`playlist-item ${activePlaylistId === pl.id ? 'active' : ''}`}
              onClick={() => handleMiddlePaneSelection('playlist', pl.id)}
          >
              <i className={`fas ${pl.icon}`}></i>{pl.name}
          </div>
        ))}
         <div className="library-category" style={{marginTop: '15px'}} onClick={() => console.log("Add Playlist clicked")}>
            <i className="fas fa-plus"></i>Add Playlist
        </div>
      </section>

      {/* Right Main Content */}
      <main className="right-main-content">
        <div className="content-header-sticky">
          <div className="content-top-bar">
            <div className="title-section">
              <h1>{currentContentTitle}</h1>
              <p>{songs.length > 0 ? `${songs.length} Songs` : "No songs"}</p>
            </div>
            <div className="actions-section">
              <div className="search-in-content">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSongSearch(searchQuery);
                        handleMiddlePaneSelection('search-triggered');
                    }
                  }}
                />
              </div>
              <button className="view-options-btn" title="More options">
                  <i className="fas fa-ellipsis-h"></i>
              </button>
               <button className="view-options-btn" title="View as List/Grid">
                  <i className="fas fa-th-list"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="actual-content-area">
          {songs.length > 0 ? (
            <div className="song-list-grid">
              {songs.map((song) => (
                <div key={song.videoId} className="song-card" onClick={() => playSong(song)}>
                  <img src={song.thumbnail} alt={song.title} className="song-card-thumbnail" />
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist || 'Unknown Artist'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#8e8e93', marginTop: '50px'}}>
              {activeView === 'search-triggered' && !searchQuery ? "Enter a search term." :
               activeView === 'search-triggered' && searchQuery ? "No results found for your search." :
               "Select a category or playlist to view music."}
            </p>
          )}
        </div>
      </main>
      
      {audioSrc && <Player currentSong={currentSong} audioSrc={audioSrc} />}
    </div>
  );
}

export default App;