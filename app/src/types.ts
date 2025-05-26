// src/types.ts

export interface Song {
  videoId: string;
  title: string;
  thumbnail: string; // URL for the thumbnail image
  artist :string;
  lyrics? :string;// You can add more properties from your backend if available, e.g., artist
}