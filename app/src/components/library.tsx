// src/components/library.tsx
import React, { useState } from 'react';
import { Song } from '../types';
import './library.css';

interface LibraryProps {
  onPlaySong: (song: Song) => void;
}

const Library: React.FC<LibraryProps> = ({ onPlaySong }) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'artists' | 'albums' | 'liked'>('playlists');

  // Mock data for library items
  const playlists = [
    {
      id: 1,
      name: "My Favorites",
      songCount: 47,
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      lastUpdated: "2 days ago",
      isLiked: true
    },
    {
      id: 2,
      name: "Road Trip Mix",
      songCount: 23,
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      lastUpdated: "1 week ago",
      isLiked: false
    },
    {
      id: 3,
      name: "Study Sessions",
      songCount: 31,
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
      lastUpdated: "3 days ago",
      isLiked: true
    },
    {
      id: 4,
      name: "Party Hits",
      songCount: 56,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop",
      lastUpdated: "5 days ago",
      isLiked: false
    }
  ];

  const artists = [
    {
      id: 1,
      name: "The Weeknd",
      songCount: 12,
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      isFollowing: true
    },
    {
      id: 2,
      name: "Billie Eilish",
      songCount: 8,
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      isFollowing: true
    },
    {
      id: 3,
      name: "Dua Lipa",
      songCount: 15,
      image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
      isFollowing: false
    }
  ];

  const albums = [
    {
      id: 1,
      name: "After Hours",
      artist: "The Weeknd",
      year: 2020,
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      songCount: 14
    },
    {
      id: 2,
      name: "Happier Than Ever",
      artist: "Billie Eilish",
      year: 2021,
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      songCount: 16
    }
  ];

  const likedSongs = [
    {
      videoId: "1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      duration: "3:20",
      addedDate: "2 days ago"
    },
    {
      videoId: "2",
      title: "Bad Guy",
      artist: "Billie Eilish",
      thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      duration: "3:14",
      addedDate: "1 week ago"
    },
    {
      videoId: "3",
      title: "Levitating",
      artist: "Dua Lipa",
      thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop",
      duration: "3:23",
      addedDate: "3 days ago"
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'playlists':
        return (
          <div className="library-grid">
            {playlists.map(playlist => (
              <div key={playlist.id} className="library-item playlist-item">
                <div className="item-image">
                  <img src={playlist.image} alt={playlist.name} />
                  <div className="item-overlay">
                    <button className="play-btn">
                      <i className="fas fa-play"></i>
                    </button>
                  </div>
                </div>
                <div className="item-info">
                  <h3>{playlist.name}</h3>
                  <p>{playlist.songCount} songs</p>
                  <span className="last-updated">Updated {playlist.lastUpdated}</span>
                </div>
                <div className="item-actions">
                  <button className={`like-btn ${playlist.isLiked ? 'liked' : ''}`}>
                    <i className={`${playlist.isLiked ? 'fas' : 'far'} fa-heart`}></i>
                  </button>
                  <button className="more-btn">
                    <i className="fas fa-ellipsis-h"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'artists':
        return (
          <div className="library-grid">
            {artists.map(artist => (
              <div key={artist.id} className="library-item artist-item">
                <div className="item-image artist-image">
                  <img src={artist.image} alt={artist.name} />
                </div>
                <div className="item-info">
                  <h3>{artist.name}</h3>
                  <p>{artist.songCount} songs in library</p>
                </div>
                <div className="item-actions">
                  <button className={`follow-btn ${artist.isFollowing ? 'following' : ''}`}>
                    {artist.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'albums':
        return (
          <div className="library-grid">
            {albums.map(album => (
              <div key={album.id} className="library-item album-item">
                <div className="item-image">
                  <img src={album.image} alt={album.name} />
                  <div className="item-overlay">
                    <button className="play-btn">
                      <i className="fas fa-play"></i>
                    </button>
                  </div>
                </div>
                <div className="item-info">
                  <h3>{album.name}</h3>
                  <p>{album.artist}</p>
                  <span className="album-year">{album.year} • {album.songCount} songs</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'liked':
        return (
          <div className="liked-songs-list">
            <div className="liked-header">
              <div className="liked-info">
                <i className="fas fa-heart liked-icon"></i>
                <div>
                  <h2>Liked Songs</h2>
                  <p>{likedSongs.length} songs</p>
                </div>
              </div>
              <button className="play-all-btn">
                <i className="fas fa-play"></i>
                Play All
              </button>
            </div>
            <div className="song-table">
              {likedSongs.map((song, index) => (
                <div key={song.videoId} className="song-row" onClick={() => onPlaySong(song)}>
                  <div className="song-index">{index + 1}</div>
                  <div className="song-details">
                    <img src={song.thumbnail} alt={song.title} />
                    <div>
                      <p className="song-title">{song.title}</p>
                      <p className="song-artist">{song.artist}</p>
                    </div>
                  </div>
                  <div className="song-duration">{song.duration}</div>
                  <div className="song-added">{song.addedDate}</div>
                  <div className="song-actions">
                    <button className="like-btn liked">
                      <i className="fas fa-heart"></i>
                    </button>
                    <button className="more-btn">
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>Your Library</h1>
        <div className="library-actions">
          <button className="create-btn">
            <i className="fas fa-plus"></i>
            Create Playlist
          </button>
        </div>
      </div>

      <div className="library-tabs">
        {[
          { key: 'playlists', label: 'Playlists', icon: 'fas fa-list' },
          { key: 'artists', label: 'Artists', icon: 'fas fa-user' },
          { key: 'albums', label: 'Albums', icon: 'fas fa-compact-disc' },
          { key: 'liked', label: 'Liked Songs', icon: 'fas fa-heart' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            <i className={tab.icon}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="library-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Library;