// src/types.ts
export interface Song {
  videoId: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number | string;
  thumbnail: string;
  lyrics?: string | LyricLine[]; 
  isLiked?: boolean; // Optional, will be derived/added in App.tsx
}

export interface LyricLine {
  time: number; 
  text: string;
}