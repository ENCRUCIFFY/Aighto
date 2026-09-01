/**
 * Official App Radio Stations & Curated Music Playlist
 * 
 * You can add tracks here or drag & drop .mp3 files directly into
 * the 'music' storage bucket in your Supabase Dashboard.
 */

export const SUPABASE_STORAGE_BASE_URL =
  "https://wszyjsirtuwoxfqsrbiq.supabase.co/storage/v1/object/public/music";

export const OFFICIAL_RADIO = [
  {
    id: "preset-chillsynth-fm",
    name: "CHILLSYNTH FM",
    artist: "24/7 Live Stream",
    genre: "Synthwave / Chill",
    url: "https://stream.nightride.fm/chillsynth.mp3",
    isRadio: true,
  },
];

/**
 * Official Curated Playlist Tracks
 * You can define custom titles and artists for files in Supabase Storage here.
 */
export const OFFICIAL_PLAYLIST = [
  // Example entry format:
  // {
  //   id: "track-1",
  //   name: "Resonance",
  //   artist: "HOME",
  //   genre: "Chillwave",
  //   url: `${SUPABASE_STORAGE_BASE_URL}/resonance.mp3`,
  // },
];

/**
 * Helper to parse artist & song name from an mp3 filename
 * Supports formats like:
 * "Artist - Song Name.mp3" -> { artist: "Artist", name: "Song Name" }
 * "Song_Name.mp3" -> { artist: "Curated Artist", name: "Song Name" }
 */
export function parseTrackFromFilename(filename) {
  if (!filename) return { artist: "Aighto Artist", name: "Untitled Track" };

  // Only strip actual audio file extensions at the end of the string, preserving all periods in titles (e.g., feat., pt., vs.)
  const cleanName = filename.replace(/\.(mp3|flac|wav|m4a|ogg|aac|webm|opus|wma|aiff)$/i, "");

  if (cleanName.includes(" - ")) {
    const [artist, ...titleParts] = cleanName.split(" - ");
    return {
      artist: artist.trim() || "Aighto Artist",
      name: titleParts.join(" - ").trim() || "Untitled Track",
    };
  }

  return {
    artist: "Curated Artist",
    name: cleanName.replace(/[_]/g, " ").trim() || "Untitled Track",
  };
}
