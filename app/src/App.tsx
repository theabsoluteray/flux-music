// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Player from './components/player';
import { Song } from './types';
import { useLikedSongs } from './hooks/useLikedSongs';    
import { useQueueManager } from './hooks/useQueueManager'; 

const dummyPlaylists = [
  { id: 'pl1', name: 'Good Vibes Only', icon: 'fa-grin-beam' },
  { id: 'pl2', name: 'Indie Anthems', icon: 'fa-guitar' },
  { id: 'pl3', name: 'Workout Beats', icon: 'fa-dumbbell' },
];

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) { clearTimeout(timeout); timeout = null; }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

function App() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [songsFromSearch, setSongsFromSearch] = useState<Song[]>([]);
  const [activeView, setActiveView] = useState<string>('all-music');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isMiddlePaneCollapsed, setIsMiddlePaneCollapsed] = useState<boolean>(false);

  // Call useLikedSongs first to get likedSongs map and setCurrentSong from it
  // Note: useQueueManager will also have a setCurrentSong. We need to decide which one "wins"
  // or pass App's setCurrentSong to useLikedSongs. For now, useLikedSongs updates App's currentSong.
  const [appCurrentSong, setAppCurrentSong] = useState<Song | null>(null); // App's version of currentSong

  const { likedSongs, toggleLikeSong, exportLikedSongs, importLikedSongs } = useLikedSongs(
    appCurrentSong, 
    setAppCurrentSong, // Allow useLikedSongs to update App's currentSong's isLiked status
    activeView, 
    setSongsFromSearch
  );

  const {
    currentSong, // This will be the currentSong from useQueueManager
    setCurrentSong, // This is useQueueManager's setCurrentSong
    audioSrc,
    isBuffering,
    queue,
    currentQueueIndex,
    playSong,
    playNextInQueue,
    playPreviousInQueue,
    addToQueue,
    playSongNext,
    handleShuffleToggleApp
  } = useQueueManager(
    likedSongs,         // Argument 1: Pass the likedSongs map
    appCurrentSong,     // Argument 2: Initial current song
    ""                  // Argument 3: Initial audio source
  );

  // Sync App's current song with the one from QueueManager if it changes there
  useEffect(() => {
    if(currentSong?.videoId !== appCurrentSong?.videoId || currentSong?.isLiked !== appCurrentSong?.isLiked) {
        setAppCurrentSong(currentSong);
    }
  }, [currentSong, appCurrentSong]);


  const toggleMiddlePane = () => setIsMiddlePaneCollapsed((prev) => !prev);

  const fetchSearchResults = async (query: string) => {
    if (!query.trim()) { setSongsFromSearch([]); return; }
    setActiveView('search-results');
    try {
      const res = await fetch(`http://localhost:5000/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: Song[] = await res.json();
      setSongsFromSearch(data);
    } catch (error) { console.error("Error fetching search results:", error); setSongsFromSearch([]); }
  };

  const debouncedSearch = useRef(debounce(fetchSearchResults, 400)).current;

  useEffect(() => {
    if (activeView === "search-results" && searchQuery.trim().length > 0) {
      debouncedSearch(searchQuery);
    } else if (activeView === "search-results" && !searchQuery.trim()) {
      setSongsFromSearch([]);
    }
  }, [searchQuery, activeView, debouncedSearch]);
  
  const handleMiddlePaneSelection = (view: string, playlistId?: string) => {
    setActiveView(view);
    setActivePlaylistId(playlistId || null);
    if (view === "liked-songs") {
      setSongsFromSearch(Array.from(likedSongs.values()));
      setSearchQuery("");
    } else if (view !== "search-results" && view !== "browse") {
      setSearchQuery("");
      setSongsFromSearch([]);
    } else if (view === "browse") {
      setSongsFromSearch([]);
    }
    if (view === "search-results") {
      const searchInput = document.querySelector(".search-in-content input") as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }
  };
  
  let currentContentTitle = "Music";
  if (activeView === "liked-songs") currentContentTitle = "Liked Songs";
  else if (activeView === "all-music") currentContentTitle = "All Music";
  else if (activeView === "search-results" && searchQuery) currentContentTitle = `Search Results for "${searchQuery}"`;
  else if (activeView === "search-results" && !searchQuery) currentContentTitle = "Search";
  else if (activeView === "browse") currentContentTitle = "Browse";
  else if (activePlaylistId) { const pl = dummyPlaylists.find((p) => p.id === activePlaylistId); if (pl) currentContentTitle = pl.name; }


  return (
    <div className={`main-ui-window ${isMiddlePaneCollapsed ? "middle-pane-collapsed" : ""}`}>
      <nav className="left-sidebar">
        <div>
          <button className={`sidebar-icon-btn ${ activeView === "all-music" || activeView.startsWith("playlist_") || activeView === "liked-songs" ? "active" : "" }`} title="Library" onClick={() => handleMiddlePaneSelection("all-music")}>
            <i className="fas fa-swatchbook"></i>
          </button>
          <button className={`sidebar-icon-btn ${activeView === "browse" ? "active" : ""}`} title="Browse" onClick={() => handleMiddlePaneSelection("browse")}>
            <i className="fas fa-compass"></i>
          </button>
          <button className={`sidebar-icon-btn ${activeView === "search-results" ? "active" : ""}`} title="Search" onClick={() => { handleMiddlePaneSelection("search-results"); const searchInput = document.querySelector(".search-in-content input") as HTMLInputElement; if (searchInput) searchInput.focus(); }}>
            <i className="fas fa-search"></i>
          </button>
        </div>
        <button className="sidebar-icon-btn collapse-toggle-btn" title={isMiddlePaneCollapsed ? "Expand Library" : "Collapse Library"} onClick={toggleMiddlePane}>
          <i className={`fas ${ isMiddlePaneCollapsed ? "fa-angle-double-right" : "fa-angle-double-left" }`}></i>
        </button>
      </nav>

      <section className="middle-pane">
        <h2>Library</h2>
        <div className={`library-category ${activeView === "all-music" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("all-music")}> <i className="fas fa-grip-horizontal"></i>All Music </div>
        <div className={`library-category ${activeView === "recently-added" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("recently-added")}> <i className="fas fa-history"></i>Recently Added </div>
        <div className={`library-category ${activeView === "artist" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("artist")}> <i className="fas fa-user"></i>Artist </div>
        <div className={`library-category ${activeView === "albums" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("albums")}> <i className="fas fa-album"></i>Albums </div>
        <div className={`library-category ${activeView === "songs" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("songs")}> <i className="fas fa-music"></i>Songs </div>
        <div className={`library-category ${activeView === "made-for-you" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("made-for-you")}> <i className="fas fa-headphones-alt"></i>Made For You </div>
        <div className={`library-category ${activeView === "liked-songs" ? "active" : ""}`} onClick={() => handleMiddlePaneSelection("liked-songs")}> <i className="fas fa-heart"></i>Liked Songs </div>
        <h3 className="section-title">Playlists</h3>
        {dummyPlaylists.map((pl) => ( <div key={pl.id} className={`playlist-item ${activePlaylistId === pl.id ? "active" : ""}`} onClick={() => handleMiddlePaneSelection(`playlist_${pl.id}`, pl.id)}> <i className={`fas ${pl.icon}`}></i> {pl.name} </div> ))}
        <div className="library-category" style={{ marginTop: "15px" }} onClick={() => console.log("Add Playlist clicked")}> <i className="fas fa-plus"></i>Add Playlist </div>
        <div className="library-actions" style={{ marginTop: "auto", paddingTop: "20px" }}>
          <button onClick={exportLikedSongs} className="sidebar-action-btn"> Export Liked </button>
          <input type="file" id="import-liked" onChange={importLikedSongs} style={{ display: "none" }} accept=".json"/>
          <label htmlFor="import-liked" className="sidebar-action-btn"> Import Liked </label>
        </div>
      </section>

      <main className="right-main-content">
        <div className="content-header-sticky">
          <div className="content-top-bar">
            <div className="title-section">
              <h1>{currentContentTitle}</h1>
              <p>{(activeView === "search-results" || activeView === "liked-songs") && songsFromSearch.length > 0 ? `${songsFromSearch.length} Songs` : " "}</p>
            </div>
            <div className="actions-section">
              <div className="search-in-content">
                <input type="text" placeholder="Search songs, artists..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { if (activeView !== "search-results") setActiveView("search-results"); }}/>
              </div>
              <button className="view-options-btn" title="More options"> <i className="fas fa-ellipsis-h"></i> </button>
              <button className="view-options-btn" title="View as List/Grid"> <i className="fas fa-th-list"></i> </button>
            </div>
          </div>
        </div>
        <div className="actual-content-area">
          {(activeView === "search-results" || activeView === "liked-songs") && songsFromSearch.length > 0 ? (
            <div className="song-list-grid">
              {songsFromSearch.map((song, index) => (
                <div key={song.videoId + "_" + activeView + "_" + index} className="song-card">
                  <img src={song.thumbnail} alt={song.title} className="song-card-thumbnail" onClick={() => playSong(song, index, songsFromSearch)}/>
                  <div className="song-card-info">
                    <div className="song-title" onClick={() => playSong(song, index, songsFromSearch)}>{song.title}</div>
                    <div className="song-artist">{song.artist || "Unknown Artist"}</div>
                  </div>
                  <div className="song-card-actions">
                    <button title={likedSongs.has(song.videoId) ? "Unlike" : "Like"} onClick={(e) => { e.stopPropagation(); toggleLikeSong(song); }}> <i className={`${likedSongs.has(song.videoId) ? "fas" : "far"} fa-heart`}></i> </button>
                    <button title="Play Next" onClick={(e) => { e.stopPropagation(); playSongNext(song); }}><i className="fas fa-stream"></i></button>
                    <button title="Add to Queue" onClick={(e) => { e.stopPropagation(); addToQueue(song); }}><i className="fas fa-plus-circle"></i></button>
                    <button title="More Options" onClick={(e) => { e.stopPropagation(); console.log("More options for", song.title); }}><i className="fas fa-ellipsis-v"></i></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (activeView === "search-results" || activeView === "liked-songs") ? (
            <p style={{ textAlign: "center", color: "#8e8e93", marginTop: "50px" }}>
              {activeView === "liked-songs" ? "You haven't liked any songs yet. Like some songs to see them here!" : searchQuery.trim() ? "No results found. Try a different search term." : "Type in the search bar above to find music."}
            </p>
          ) : ( <p style={{ textAlign: "center", color: "#8e8e93", marginTop: "50px" }}> Content for "{currentContentTitle}" would appear here. Select from Library or Search. </p> )}
        </div>
      </main>

      {currentSong && ( // Use currentSong from useQueueManager for rendering Player
        <Player
          currentSong={currentSong} // This currentSong has isLiked status from useQueueManager
          audioSrc={audioSrc}
          isBuffering={isBuffering}
          queue={queue}
          currentQueueIndex={currentQueueIndex}
          playSongFromQueue={playSong}
          onPlayNext={playNextInQueue}
          onPlayPrevious={playPreviousInQueue}
          onToggleLike={toggleLikeSong} // Pass App's toggleLikeSong
          onShuffleToggle={handleShuffleToggleApp}
        />
      )}
    </div>
  );
}
export default App;