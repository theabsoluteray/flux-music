// src/types.ts
// in types.ts
export interface Song {
  videoId: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number | string;
  thumbnail: string;
  isLiked?: boolean;
  lyrics?: string | LyricLine[] | null; 
  streamUrl?: string;
}


export interface LyricLine {
  time: number; 
  text: string;
}