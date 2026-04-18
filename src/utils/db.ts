import type { LeaderboardEntry } from "../types";

const DB_NAME = "sunday-padel-skor-db";
const DB_VERSION = 1;
const STORE_NAME = "game-history";
const EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

interface GameHistoryEntry {
  id?: number;
  leaderboard: LeaderboardEntry[];
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

export async function saveLeaderboard(
  leaderboard: LeaderboardEntry[]
): Promise<void> {
  const hasScores = leaderboard.some((entry) => entry.matchesPlayed > 0);
  if (!hasScores) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const entry: GameHistoryEntry = {
    leaderboard,
    createdAt: Date.now(),
  };

  store.add(entry);
}

export async function getAllLeaderboardEntries(): Promise<GameHistoryEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function clearExpiredHistory(): Promise<void> {
  const db = await openDB();
  const now = Date.now();
  const cutoff = now - EXPIRY_MS;

  const entries = await getAllLeaderboardEntries();
  const toDelete = entries
    .filter((entry) => entry.createdAt < cutoff)
    .map((entry) => entry.id)
    .filter((id): id is number => id !== undefined);

  if (toDelete.length === 0) return;

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  for (const id of toDelete) {
    store.delete(id);
  }
}

export async function clearAllHistory(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
}