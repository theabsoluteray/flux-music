// src/components/home.tsx
import React from 'react';
import { Song } from '../types';
import './home.css';

interface HomeProps {
  songs: Song[];
  onPlaySong: (song: Song) => void;
}

const Home: React.FC<HomeProps> = ({ songs, onPlaySong }) => {
  // Mock data for featured playlists and trending songs
  const featuredPlaylists = [
    {
      id: 1,
      name: "Today's Hits",
      description: "The biggest songs right now",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=faces"
    },
    {
      id: 2,
      name: "Chill Vibes",
      description: "Relax and unwind with these tracks",
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop&crop=faces"
    },
    {
      id: 3,
      name: "Workout Mix",
      description: "High energy songs for your workout",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop&crop=faces"
    },
    {
      id: 4,
      name: "Indie Favorites",
      description: "Discover amazing indie artists",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=300&fit=crop&crop=faces"
    }
  ];

  const quickAccess = [
    { name: "Recently Played", icon: "fas fa-history" },
    { name: "Liked Songs", icon: "fas fa-heart" },
    { name: "Downloaded", icon: "fas fa-download" },
    { name: "Made for You", icon: "fas fa-user-circle" }
  ];

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Good evening</h1>
        <p>Ready to discover your next favorite song?</p>
      </div>

      {/* Quick Access Section */}
      <section className="quick-access-section">
        <div className="quick-access-grid">
          {quickAccess.map((item, index) => (
            <div key={index} className="quick-access-card">
              <i className={item.icon}></i>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Playlists */}
      <section className="section">
        <div className="section-header">
          <h2>Featured Playlists</h2>
          <button className="see-all-btn">See all</button>
        </div>
        <div className="playlist-grid">
          {featuredPlaylists.map(playlist => (
            <div key={playlist.id} className="playlist-card">
              <div className="playlist-image">
                <img src={playlist.image} alt={playlist.name} />
                <div className="play-overlay">
                  <i className="fas fa-play"></i>
                </div>
              </div>
              <div className="playlist-info">
                <h3>{playlist.name}</h3>
                <p>{playlist.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Search Results / Recently Searched */}
      {songs.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Search Results</h2>
          </div>
          <div className="song-list">
            {songs.slice(0, 12).map((song: Song) => (
              <div key={song.videoId} className="song-card" onClick={() => onPlaySong(song)}>
                <img src={song.thumbnail} alt={song.title} />
                <div className="song-info">
                  <p className="song-title">{song.title}</p>
                  <p className="song-artist">{song.artist || 'Unknown Artist'}</p>
                </div>
                <div className="song-actions">
                  <button className="play-btn">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Now */}
      <section className="section">
        <div className="section-header">
          <h2>Trending Now</h2>
          <button className="see-all-btn">See all</button>
        </div>
        <div className="trending-container">
          <div className="trending-info">
            <h3>Discover what's hot</h3>
            <p>Explore the most popular tracks and artists right now</p>
            <button className="explore-btn">
              <i className="fas fa-fire"></i>
              Explore Trending
            </button>
          </div>
          <div className="trending-visual">
            <div className="pulse-circle"></div>
            <div className="pulse-circle delay-1"></div>
            <div className="pulse-circle delay-2"></div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;