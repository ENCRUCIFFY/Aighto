import { parseTrackFromFilename } from "./musicPresets";

const DB_NAME = "aighto_user_music_vault_v1";
const STORE_NAME = "user_tracks";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load all user-imported songs from local IndexedDB
 */
export async function getUserTracksFromDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        const formatted = records.map((rec) => ({
          id: rec.id,
          name: rec.name,
          artist: rec.artist,
          genre: "Local Audio",
          url: URL.createObjectURL(rec.blob),
          filename: rec.filename,
          size: rec.size,
          isUserLocal: true,
          dateAdded: rec.dateAdded,
        }));
        resolve(formatted);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to load user tracks from IndexedDB:", err);
    return [];
  }
}

/**
 * Save a new user audio file to IndexedDB
 */
export async function saveUserTrackToDB(file) {
  const db = await openDB();
  const parsed = parseTrackFromFilename(file.name);
  const trackId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const record = {
    id: trackId,
    name: parsed.name,
    artist: parsed.artist,
    filename: file.name,
    size: file.size,
    blob: file,
    dateAdded: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => {
      resolve({
        id: record.id,
        name: record.name,
        artist: record.artist,
        genre: "Local Audio",
        url: URL.createObjectURL(record.blob),
        filename: record.filename,
        size: record.size,
        isUserLocal: true,
        dateAdded: record.dateAdded,
      });
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a user track from IndexedDB
 */
export async function deleteUserTrackFromDB(trackId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(trackId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to delete user track from IndexedDB:", err);
    return false;
  }
}
