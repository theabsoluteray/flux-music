// src/utils/lyricsService.ts
import axios from 'axios';
import { LyricLine } from '../types'; // Import LyricLine type

// Simple function to clean track/artist names for API calls
const cleanName = (name: string): string => {
  if (!name) return '';
  // Remove common suffixes and prefixes, then extra symbols
  return name
    .replace(/\b(Official|Audio|Video|Lyrics|Theme|Soundtrack|Music|Full Version|HD|4K|Visualizer|Radio Edit|Live|Remix|Mix|Extended|Cover|Parody|Performance|Version|Unplugged|Reupload|Explicit|Clean|Deluxe|Bonus|Acoustic|Instrumental)\b/gi, "")
    .replace(/\s*[-_/|()[\]{}:"\u201c\u201d\u2018\u2019]\s*/g, " ") // Added more quote types
    .replace(/[^\w\s&']/g, " ") // Keep alphanumeric, spaces, ampersands, apostrophes
    .replace(/\s+/g, " ")
    .trim();
};

// Function to parse LRC format: [mm:ss.xx]text or [mm:ss.xxx]text
const parseLRC = (lrcText: string): LyricLine[] => {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const parsedLyrics: LyricLine[] = [];
  const timeRegex = /\[(\d{2,}):(\d{2})[.:](\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisecondsOrCentiseconds = match[3];
      const text = match[4].trim();

      let totalSeconds = minutes * 60 + seconds;
      if (millisecondsOrCentiseconds.length === 2) { // centiseconds
        totalSeconds += parseInt(millisecondsOrCentiseconds, 10) / 100;
      } else { // milliseconds
        totalSeconds += parseInt(millisecondsOrCentiseconds, 10) / 1000;
      }
      
      if (text) { // Only add if there's actual text content
        parsedLyrics.push({ time: totalSeconds, text });
      }
    }
  }
  return parsedLyrics.sort((a, b) => a.time - b.time); // Ensure sorted by time
};


export const fetchLyrics = async (trackName?: string, artistName?: string, durationSeconds?: number): Promise<string | LyricLine[] | null> => {
  if (!trackName || !artistName) {
    console.warn("Track name or artist name is missing for lyrics search.");
    return null;
  }
  const cleanedTrack = cleanName(trackName);
  const cleanedArtist = cleanName(artistName);
  if (!cleanedTrack || !cleanedArtist) {
    console.warn("Cleaned track or artist name is empty.");
    return null;
  }

  console.log(`Fetching lyrics for: Track="${cleanedTrack}", Artist="${cleanedArtist}", Duration=${durationSeconds}s`);
  const LYRIC_FETCH_TIMEOUT = 10000; // 10 seconds timeout

  try {
    const source = axios.CancelToken.source();
    const timeoutId = setTimeout(() => {
        source.cancel(`Lyrics fetch timed out after ${LYRIC_FETCH_TIMEOUT / 1000}s`);
    }, LYRIC_FETCH_TIMEOUT);

    let lyricsData: { syncedLyrics?: string; plainLyrics?: string } | null = null;

    if (durationSeconds && durationSeconds > 0) {
      try {
        const response = await axios.get(`https://lrclib.net/api/get`, {
          params: { track_name: cleanedTrack, artist_name: cleanedArtist, duration: durationSeconds },
          timeout: LYRIC_FETCH_TIMEOUT - 1000, 
          cancelToken: source.token,
        });
        if (response.data && (response.data.syncedLyrics || response.data.plainLyrics)) {
          lyricsData = response.data;
        }
      } catch (e:any) { if (axios.isCancel(e)) throw e; }
    }

    if (!lyricsData) {
      try {
        const response = await axios.get(`https://lrclib.net/api/get`, {
          params: { track_name: cleanedTrack, artist_name: cleanedArtist },
          timeout: LYRIC_FETCH_TIMEOUT - (durationSeconds && durationSeconds > 0 ? 3000 : 1000),
          cancelToken: source.token,
        });
        if (response.data && (response.data.syncedLyrics || response.data.plainLyrics)) {
          lyricsData = response.data;
        }
      } catch (e:any) { if (axios.isCancel(e)) throw e; }
    }
    
    clearTimeout(timeoutId);

    if (lyricsData) {
      if (lyricsData.syncedLyrics) {
        console.log("Synced lyrics found.");
        const parsed = parseLRC(lyricsData.syncedLyrics);
        return parsed.length > 0 ? parsed : (lyricsData.plainLyrics || null);
      }
      if (lyricsData.plainLyrics) {
        console.log("Plain lyrics found.");
        return lyricsData.plainLyrics;
      }
    }
    
    console.log(`No lyrics found for ${cleanedTrack} by ${cleanedArtist} on lrclib.net.`);
    return "Lyrics not found for this track."; // Specific message

  } catch (error: any) {
    if (axios.isCancel(error)) {
        console.warn("Lyrics request cancelled (likely timeout):", error.message);
    } else {
        console.error("General error fetching lyrics from lrclib.net:", error.message);
    }
    return "Lyrics not available for this track."; // Return specific message on error/timeout
  }
};