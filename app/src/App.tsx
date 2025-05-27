// src/App.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import "./App.css";
import Player from "./components/player";
import { Song } from "./types";
import { fetchLyrics } from "./utils/lyricsService";

const dummyPlaylists = [
  { id: "pl1", name: "Good Vibes Only", icon: "fa-grin-beam" },
  { id: "pl2", name: "Indie Anthems", icon: "fa-guitar" },
  { id: "pl3", name: "Workout Beats", icon: "fa-dumbbell" },
];

// Debounce helper function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

const LIKED_SONGS_STORAGE_KEY = "fluxMusicLikedSongs";

// Fisher-Yates (aka Knuth) Shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]; // Create a copy to avoid mutating the original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
  }
  return newArray;
}

function App() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [songsFromSearch, setSongsFromSearch] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>("all-music");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isMiddlePaneCollapsed, setIsMiddlePaneCollapsed] =
    useState<boolean>(false);

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

  const [queue, setQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const originalQueueOrder = useRef<Song[]>([]);
  const isShuffleActiveRef = useRef<boolean>(false);

  const toggleMiddlePane = () => setIsMiddlePaneCollapsed((prev) => !prev);

  const fetchSearchResults = async (query: string) => {
    if (!query.trim()) {
      setSongsFromSearch([]);
      return;
    }
    // setActiveView('search-results'); // Handled by onFocus or input change
    try {
      const res = await fetch(
        `http://localhost:5000/api/search?query=${encodeURIComponent(
          query
        )}&platform=ytmusic`
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: Song[] = await res.json();
      setSongsFromSearch(data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setSongsFromSearch([]);
    }
  };

  const debouncedSearch = useRef(debounce(fetchSearchResults, 400)).current;

  useEffect(() => {
    if (activeView === "search-results" && searchQuery.trim().length > 0) {
      debouncedSearch(searchQuery);
    } else if (activeView === "search-results" && !searchQuery.trim()) {
      setSongsFromSearch([]);
    }
  }, [searchQuery, activeView, debouncedSearch]);

  const playSong = useCallback(
    async (
      songToPlay: Song,
      indexInList?: number,
      playFromNewList?: Song[]
    ) => {
      setIsBuffering(true);
      setAudioSrc("");
      setCurrentSong({
        ...songToPlay,
        isLiked: likedSongs.has(songToPlay.videoId),
        lyrics: "Loading lyrics...",
      });

      let newQueue = playFromNewList ? [...playFromNewList] : [...queue];
      let songIndexInNewQueue = -1;
      const existingIndexInCurrentQueue = newQueue.findIndex(
        (s) => s.videoId === songToPlay.videoId
      );

      if (playFromNewList) {
        newQueue = [...playFromNewList];
        if (isShuffleActiveRef.current) {
          originalQueueOrder.current = [...newQueue]; // Save original order of the new list
          newQueue = shuffleArray(newQueue); // Shuffle it if shuffle is on
        } else {
          originalQueueOrder.current = [...newQueue];
        }
        const foundIndex = newQueue.findIndex(
          (s) => s.videoId === songToPlay.videoId
        );
        songIndexInNewQueue =
          foundIndex !== -1 ? foundIndex : newQueue.length > 0 ? 0 : -1;
      } else if (
        indexInList !== undefined &&
        newQueue[indexInList]?.videoId === songToPlay.videoId
      ) {
        songIndexInNewQueue = indexInList;
      } else if (existingIndexInCurrentQueue !== -1) {
        songIndexInNewQueue = existingIndexInCurrentQueue;
      } else {
        const insertAfter =
          currentQueueIndex >= 0 && currentQueueIndex < newQueue.length
            ? currentQueueIndex
            : newQueue.length - 1;
        newQueue.splice(insertAfter + 1, 0, songToPlay);
        if (!isShuffleActiveRef.current) {
          // If not shuffling, update original order
          originalQueueOrder.current = [...newQueue];
        }
        songIndexInNewQueue = insertAfter + 1;
      }

      if (songIndexInNewQueue === -1 && newQueue.length > 0)
        songIndexInNewQueue = 0;

      setQueue(newQueue);
      setCurrentQueueIndex(songIndexInNewQueue);

      const songDataForPlayer = newQueue[songIndexInNewQueue];
      if (!songDataForPlayer) {
        console.error("Could not find song in queue for playback.");
        setIsBuffering(false);
        setCurrentSong(null); // No song to play
        return;
      }

      const songForPlayerState = {
        ...songDataForPlayer,
        isLiked: likedSongs.has(songDataForPlayer.videoId),
      };

      let lyricsResult: string | import("./types").LyricLine[] | null =
        "Loading lyrics...";
      try {
        lyricsResult = await fetchLyrics(
          songForPlayerState.title,
          songForPlayerState.artist,
          typeof songForPlayerState.duration === "number"
            ? songForPlayerState.duration
            : undefined
        );
      } catch (lyricsError) {
        console.error("Error fetching lyrics:", lyricsError);
        lyricsResult = "Lyrics not available for this track.";
      }
      const finalSongObject = {
        ...songForPlayerState,
        lyrics: lyricsResult || "Lyrics not available for this track.",
      };
      setCurrentSong(finalSongObject);

      setTimeout(async () => {
        try {
          const res = await fetch(
            `http://localhost:5000/api/stream?videoId=${songForPlayerState.videoId}`
          );
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(
              errorData.error || `HTTP error! status: ${res.status}`
            );
          }
          const streamData: { streamUrl: string } = await res.json();
          setAudioSrc(streamData.streamUrl);
        } catch (error) {
          console.error("Error fetching stream after buffering:", error);
          setAudioSrc("");
          setCurrentSong((prev) =>
            prev
              ? { ...prev, lyrics: prev.lyrics || "Error loading stream." }
              : { ...finalSongObject, lyrics: "Error loading stream." }
          );
        } finally {
          setIsBuffering(false);
        }
      }, 1000); // Reduced buffering to 1 second for quicker testing, adjust as needed
    },
    [queue, currentQueueIndex, likedSongs]
  );

  const playNextInQueue = useCallback(() => {
    if (queue.length === 0) return;
    let nextIndex;
    if (isShuffleActiveRef.current && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentQueueIndex && queue.length > 1);
    } else {
      nextIndex = (currentQueueIndex + 1) % queue.length;
    }
    if (queue[nextIndex]) playSong(queue[nextIndex], nextIndex);
    else if (queue.length > 0) playSong(queue[0], 0);
  }, [queue, currentQueueIndex, playSong]);

  const playPreviousInQueue = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (currentQueueIndex - 1 + queue.length) % queue.length;
    if (queue[prevIndex]) playSong(queue[prevIndex], prevIndex);
  }, [queue, currentQueueIndex, playSong]);

  const addToQueue = (song: Song) => {
    setQueue((prevQueue) => {
      if (prevQueue.find((s) => s.videoId === song.videoId)) {
        return prevQueue;
      }
      const newQueue = [...prevQueue, song];
      if (!isShuffleActiveRef.current) {
        originalQueueOrder.current = [...newQueue];
      }
      return newQueue;
    });
    console.log(`${song.title} added to queue.`);
  };

  const playSongNext = (song: Song) => {
    setQueue((prevQueue) => {
      const newQueue = [...prevQueue];
      const insertAtIndex =
        currentQueueIndex >= 0 && currentQueueIndex < newQueue.length
          ? currentQueueIndex + 1
          : newQueue.length;
      newQueue.splice(insertAtIndex, 0, song);
      if (!isShuffleActiveRef.current) {
        originalQueueOrder.current = [...newQueue];
      }
      return newQueue;
    });
    console.log(`${song.title} will play next.`);
  };

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
      const searchInput = document.querySelector(
        ".search-in-content input"
      ) as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }
  };

  const toggleLikeSong = (songToToggle: Song) => {
    setLikedSongs((prevLiked) => {
      const newLiked = new Map(prevLiked);
      if (newLiked.has(songToToggle.videoId)) {
        newLiked.delete(songToToggle.videoId);
      } else {
        const { lyrics, ...songWithoutLyrics } = songToToggle;
        newLiked.set(songToToggle.videoId, songWithoutLyrics);
      }
      localStorage.setItem(
        LIKED_SONGS_STORAGE_KEY,
        JSON.stringify(Array.from(newLiked.entries()))
      );
      if (currentSong && currentSong.videoId === songToToggle.videoId) {
        setCurrentSong((prevCS) =>
          prevCS
            ? { ...prevCS, isLiked: newLiked.has(songToToggle.videoId) }
            : null
        );
      }
      if (activeView === "liked-songs") {
        setSongsFromSearch(Array.from(newLiked.values()));
      }
      return newLiked;
    });
  };

  useEffect(() => {
    const storedLiked = localStorage.getItem(LIKED_SONGS_STORAGE_KEY);
    if (storedLiked) {
      try {
        const parsedLikedArray = JSON.parse(storedLiked);
        if (Array.isArray(parsedLikedArray)) {
          setLikedSongs(new Map(parsedLikedArray as [string, Song][]));
        }
      } catch (e) {
        console.error("Error parsing liked songs from localStorage", e);
      }
    }
  }, []);

  const exportLikedSongs = () => {
    const dataStr = JSON.stringify(Array.from(likedSongs.entries()), null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "flux-music-liked-songs.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
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
            localStorage.setItem(
              LIKED_SONGS_STORAGE_KEY,
              JSON.stringify(Array.from(newLikedMap.entries()))
            );
            if (activeView === "liked-songs") {
              setSongsFromSearch(Array.from(newLikedMap.values()));
            }
            alert("Liked songs imported successfully!");
          } else {
            throw new Error("Invalid file format.");
          }
        } catch (err) {
          console.error("Error importing liked songs:", err);
          alert(
            "Failed to import liked songs. Invalid file format or content."
          );
        }
      };
      reader.readAsText(file);
    }
    if (event.target) event.target.value = "";
  };

  const handleShuffleToggleApp = (isShuffleOn: boolean) => {
    isShuffleActiveRef.current = isShuffleOn;
    if (isShuffleOn) {
      if (queue.length > 0) {
        // Save original order only if it hasn't been saved yet or if current queue IS the original order
        if (
          originalQueueOrder.current.length !== queue.length ||
          !originalQueueOrder.current.every(
            (val, idx) => val.videoId === queue[idx].videoId
          )
        ) {
          originalQueueOrder.current = [...queue];
        }
        const shuffledQueue = shuffleArray(queue);
        setQueue(shuffledQueue);
        if (currentSong) {
          const newIdx = shuffledQueue.findIndex(
            (s) => s.videoId === currentSong.videoId
          );
          setCurrentQueueIndex(newIdx !== -1 ? newIdx : 0);
        } else if (shuffledQueue.length > 0) {
          setCurrentQueueIndex(0);
        }
      }
    } else {
      if (originalQueueOrder.current.length > 0) {
        setQueue([...originalQueueOrder.current]);
        if (currentSong) {
          const newIdx = originalQueueOrder.current.findIndex(
            (s) => s.videoId === currentSong.videoId
          );
          setCurrentQueueIndex(newIdx !== -1 ? newIdx : 0);
        } else if (originalQueueOrder.current.length > 0) {
          setCurrentQueueIndex(0);
        }
      }
    }
  };

  let currentContentTitle = "Music";
  if (activeView === "liked-songs") currentContentTitle = "Liked Songs";
  else if (activeView === "all-music") currentContentTitle = "All Music";
  else if (activeView === "search-results" && searchQuery)
    currentContentTitle = `Search Results for "${searchQuery}"`;
  else if (activeView === "search-results" && !searchQuery)
    currentContentTitle = "Search";
  else if (activeView === "browse") currentContentTitle = "Browse";
  else if (activeView === "artist") currentContentTitle = "Artists";
  else if (activeView === "albums") currentContentTitle = "Albums";
  else if (activeView === "songs") currentContentTitle = "Songs";
  else if (activeView === "made-for-you") currentContentTitle = "Made For You";
  else if (activePlaylistId) {
    const pl = dummyPlaylists.find((p) => p.id === activePlaylistId);
    if (pl) currentContentTitle = pl.name;
  }

  return (
    <div
      className={`main-ui-window ${
        isMiddlePaneCollapsed ? "middle-pane-collapsed" : ""
      }`}
    >
      <nav className="left-sidebar">
        <div>
          <button
            className={`sidebar-icon-btn ${
              activeView === "all-music" ||
              activeView.startsWith("playlist_") ||
              activeView === "liked-songs"
                ? "active"
                : ""
            }`}
            title="Library"
            onClick={() => handleMiddlePaneSelection("all-music")}
          >
            <i className="fas fa-swatchbook"></i>
          </button>
          <button
            className={`sidebar-icon-btn ${
              activeView === "browse" ? "active" : ""
            }`}
            title="Browse"
            onClick={() => handleMiddlePaneSelection("browse")}
          >
            <i className="fas fa-compass"></i>
          </button>
          <button
            className={`sidebar-icon-btn ${
              activeView === "search-results" ? "active" : ""
            }`}
            title="Search"
            onClick={() => {
              handleMiddlePaneSelection("search-results");
              const searchInput = document.querySelector(
                ".search-in-content input"
              ) as HTMLInputElement;
              if (searchInput) searchInput.focus();
            }}
          >
            <i className="fas fa-search"></i>
          </button>
        </div>
        <button
          className="sidebar-icon-btn collapse-toggle-btn"
          title={isMiddlePaneCollapsed ? "Expand Library" : "Collapse Library"}
          onClick={toggleMiddlePane}
        >
          <i
            className={`fas ${
              isMiddlePaneCollapsed
                ? "fa-angle-double-right"
                : "fa-angle-double-left"
            }`}
          ></i>
        </button>
      </nav>

      <section className="middle-pane">
        <h2>Library</h2>
        <div
          className={`library-category ${
            activeView === "all-music" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("all-music")}
        >
          <i className="fas fa-grip-horizontal"></i>All Music
        </div>
        <div
          className={`library-category ${
            activeView === "recently-added" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("recently-added")}
        >
          <i className="fas fa-history"></i>Recently Added
        </div>
        <div
          className={`library-category ${
            activeView === "artist" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("artist")}
        >
          <i className="fas fa-user"></i>Artist
        </div>
        <div
          className={`library-category ${
            activeView === "albums" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("albums")}
        >
          <i className="fas fa-album"></i>Albums
        </div>
        <div
          className={`library-category ${
            activeView === "songs" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("songs")}
        >
          <i className="fas fa-music"></i>Songs
        </div>
        <div
          className={`library-category ${
            activeView === "made-for-you" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("made-for-you")}
        >
          <i className="fas fa-headphones-alt"></i>Made For You
        </div>
        <div
          className={`library-category ${
            activeView === "liked-songs" ? "active" : ""
          }`}
          onClick={() => handleMiddlePaneSelection("liked-songs")}
        >
          <i className="fas fa-heart"></i>Liked Songs
        </div>

        <h3 className="section-title">Playlists</h3>
        {dummyPlaylists.map((pl) => (
          <div
            key={pl.id}
            className={`playlist-item ${
              activePlaylistId === pl.id ? "active" : ""
            }`}
            onClick={() =>
              handleMiddlePaneSelection(`playlist_${pl.id}`, pl.id)
            }
          >
            <i className={`fas ${pl.icon}`}></i>
            {pl.name}
          </div>
        ))}
        <div
          className="library-category"
          style={{ marginTop: "15px" }}
          onClick={() => console.log("Add Playlist clicked")}
        >
          <i className="fas fa-plus"></i>Add Playlist
        </div>
        <div
          className="library-actions"
          style={{ marginTop: "auto", paddingTop: "20px" }}
        >
          <button onClick={exportLikedSongs} className="sidebar-action-btn">
            Export Liked
          </button>
          <input
            type="file"
            id="import-liked"
            onChange={importLikedSongs}
            style={{ display: "none" }}
            accept=".json"
          />
          <label htmlFor="import-liked" className="sidebar-action-btn">
            Import Liked
          </label>
        </div>
      </section>

      <main className="right-main-content">
        <div className="content-header-sticky">
          <div className="content-top-bar">
            <div className="title-section">
              <h1>{currentContentTitle}</h1>
              <p>
                {(activeView === "search-results" ||
                  activeView === "liked-songs") &&
                songsFromSearch.length > 0
                  ? `${songsFromSearch.length} Songs`
                  : " "}
              </p>
            </div>
            <div className="actions-section">
              <div className="search-in-content">
                <input
                  type="text"
                  placeholder="Search songs, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (activeView !== "search-results")
                      setActiveView("search-results");
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
          {(activeView === "search-results" || activeView === "liked-songs") &&
          songsFromSearch.length > 0 ? (
            <div className="song-list-grid">
              {songsFromSearch.map((song, index) => (
                <div
                  key={song.videoId + "_" + activeView + "_" + index}
                  className="song-card"
                >
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="song-card-thumbnail"
                    onClick={() => playSong(song, index, songsFromSearch)}
                  />
                  <div className="song-card-info">
                    <div
                      className="song-title"
                      onClick={() => playSong(song, index, songsFromSearch)}
                    >
                      {song.title}
                    </div>
                    <div className="song-artist">
                      {song.artist || "Unknown Artist"}
                    </div>
                  </div>
                  <div className="song-card-actions">
                    <button
                      title={likedSongs.has(song.videoId) ? "Unlike" : "Like"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeSong(song);
                      }}
                    >
                      <i
                        className={`${
                          likedSongs.has(song.videoId) ? "fas" : "far"
                        } fa-heart`}
                      ></i>
                    </button>
                    <button
                      title="Play Next"
                      onClick={(e) => {
                        e.stopPropagation();
                        playSongNext(song);
                      }}
                    >
                      <i className="fas fa-stream"></i>
                    </button>
                    <button
                      title="Add to Queue"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(song);
                      }}
                    >
                      <i className="fas fa-plus-circle"></i>
                    </button>
                    <button
                      title="More Options"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("More options for", song.title);
                      }}
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : activeView === "search-results" ||
            activeView === "liked-songs" ? (
            <p
              style={{
                textAlign: "center",
                color: "#8e8e93",
                marginTop: "50px",
              }}
            >
              {activeView === "liked-songs"
                ? "You haven't liked any songs yet. Like some songs to see them here!"
                : searchQuery.trim()
                ? "No results found. Try a different search term."
                : "Type in the search bar above to find music."}
            </p>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#8e8e93",
                marginTop: "50px",
              }}
            >
              Content for "{currentContentTitle}" would appear here. Select from
              Library or Search.
            </p>
          )}
        </div>
      </main>

      {currentSong && (
        <Player
          currentSong={currentSong}
          audioSrc={audioSrc}
          isBuffering={isBuffering}
          queue={queue}
          currentQueueIndex={currentQueueIndex}
          playSongFromQueue={playSong}
          onPlayNext={playNextInQueue}
          onPlayPrevious={playPreviousInQueue}
          onToggleLike={toggleLikeSong}
          onShuffleToggle={handleShuffleToggleApp}
        />
      )}
    </div>
  );
}

export default App;
