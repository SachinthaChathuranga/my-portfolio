import { doc, getDoc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "game_leaderboards";
export const MAX_LEADERBOARD_ENTRIES = 20;

export const LEADERBOARD_GAMES = [
  { id: "vanguard", title: "Vanguard: Frontline Ops", short: "Vanguard Ops", accent: "#34D399" },
  { id: "racer", title: "Apex Horizon: Night Drive", short: "Apex Horizon", accent: "#FF8A1F" },
  { id: "igi", title: "Operation: Neon I.G.I.", short: "Neon I.G.I.", accent: "#00D4FF" },
  { id: "corridor", title: "Neon Corridor: Overdrive", short: "Neon Corridor", accent: "#F012A8" },
];

function sanitizeEntries(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((item) => item && item.playerName && typeof item.score === "number")
    .map((item) => ({
      id: String(item.id || `${item.createdAt || Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
      playerName: String(item.playerName).trim().slice(0, 24),
      score: Math.max(0, Math.floor(Number(item.score) || 0)),
      badge: String(item.badge || "").slice(0, 32),
      meta: String(item.meta || "").slice(0, 64),
      createdAt: Number(item.createdAt || Date.now()),
    }))
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

/**
 * Pure Firebase Firestore one-shot fetch (ZERO device localStorage).
 */
export async function fetchGameLeaderboard(gameId) {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, gameId));
    const entries = snap.exists() ? sanitizeEntries(snap.data()?.entries) : [];
    return { entries, cloudConnected: true, error: "" };
  } catch (err) {
    return {
      entries: [],
      cloudConnected: false,
      error: err?.code || err?.message || "Failed to load Firebase leaderboard",
    };
  }
}

/**
 * Pure Global Real-Time Firebase Firestore Listener (onSnapshot).
 * Every device worldwide sees the exact same live Top 20 leaderboard with zero device localStorage.
 */
export function subscribeGameLeaderboard(gameId, onData) {
  const ref = doc(db, COLLECTION_NAME, gameId);
  let unsub = () => {};

  try {
    unsub = onSnapshot(
      ref,
      (snap) => {
        const entries = snap.exists() ? sanitizeEntries(snap.data()?.entries) : [];
        onData({ entries, cloudConnected: true, error: "" });
      },
      (err) => {
        onData({
          entries: [],
          cloudConnected: false,
          error: err?.code || err?.message || "Firestore connection error",
        });
      }
    );
  } catch (err) {
    onData({
      entries: [],
      cloudConnected: false,
      error: err?.message || "Could not connect to Firebase",
    });
  }

  return () => {
    try {
      unsub();
    } catch {
      // ignore
    }
  };
}

/**
 * Atomically submits a score to Firebase Firestore (`game_leaderboards/{gameId}`).
 * Automatically sorts and prunes entries beyond Top 20 directly in the DB!
 * Never stores leaderboard rows in device localStorage.
 */
export async function submitGameScore({ gameId, playerName, score, badge = "", meta = "" }) {
  const cleanName = String(playerName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (!cleanName) {
    throw new Error("Please enter your name.");
  }

  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerName: cleanName,
    score: Math.max(0, Math.floor(Number(score) || 0)),
    badge: String(badge || "").slice(0, 32),
    meta: String(meta || "").slice(0, 64),
    createdAt: Date.now(),
  };

  const ref = doc(db, COLLECTION_NAME, gameId);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists() ? sanitizeEntries(snap.data()?.entries) : [];

    // Sort all entries descending & strictly keep ONLY Top 20 (rank 21+ auto-removed from DB!)
    const combined = [...existing, entry].sort(
      (a, b) => b.score - a.score || a.createdAt - b.createdAt
    );
    const top20 = combined.slice(0, MAX_LEADERBOARD_ENTRIES);
    const rankIndex = top20.findIndex((item) => item.id === entry.id);

    if (rankIndex === -1) {
      const minTopScore = top20[top20.length - 1]?.score || 0;
      return { madeTop20: false, rank: null, minTopScore, entry };
    }

    tx.set(ref, {
      gameId,
      entries: top20,
      updatedAt: Date.now(),
    });

    return { madeTop20: true, rank: rankIndex + 1, minTopScore: null, entry };
  });

  return result;
}

/**
 * Admin Action (Studio): Remove a single player entry from a game's Firebase leaderboard.
 */
export async function removeLeaderboardEntry(gameId, entryId) {
  const ref = doc(db, COLLECTION_NAME, gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const existing = sanitizeEntries(snap.data()?.entries);
    const filtered = existing.filter((item) => item.id !== entryId);
    tx.set(ref, {
      gameId,
      entries: filtered,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Admin Action (Studio): Clear all leaderboard scores for a game in Firebase.
 */
export async function clearGameLeaderboard(gameId) {
  const ref = doc(db, COLLECTION_NAME, gameId);
  await setDoc(ref, {
    gameId,
    entries: [],
    updatedAt: Date.now(),
  });
}
