import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

const LOCAL_LB_KEY = "smsc_arcade_leaderboards_v1";
const PLAYER_NAME_KEY = "smsc_arcade_player_name_v1";
const COLLECTION_NAME = "game_leaderboards";

export const LEADERBOARD_GAMES = [
  { id: "vanguard", title: "Vanguard: Frontline Ops", short: "Vanguard Ops", accent: "#34D399" },
  { id: "racer", title: "Apex Horizon: Night Drive", short: "Apex Horizon", accent: "#FF8A1F" },
  { id: "igi", title: "Operation: Neon I.G.I.", short: "Neon I.G.I.", accent: "#00D4FF" },
  { id: "corridor", title: "Neon Corridor: Overdrive", short: "Neon Corridor", accent: "#F012A8" },
];

export function getSavedPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function savePlayerName(name) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // ignore
  }
}

function readLocalAll() {
  try {
    const raw = localStorage.getItem(LOCAL_LB_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalAll(data) {
  try {
    localStorage.setItem(LOCAL_LB_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function mergeAndSort(cloudList, localList, maxCount = 15) {
  const seen = new Map();
  for (const item of [...cloudList, ...localList]) {
    if (!item || !item.playerName) continue;
    const key = item.clientId || `${item.playerName}_${item.score}_${item.createdAt}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.createdAt || 0) - (b.createdAt || 0))
    .slice(0, maxCount);
}

/**
 * Fetch top leaderboard entries for a specific game.
 * Queries Firestore without needing a composite index + merges local cache seamlessly.
 */
export async function fetchGameLeaderboard(gameId, maxCount = 15) {
  const localAll = readLocalAll();
  const localEntries = Array.isArray(localAll[gameId]) ? localAll[gameId] : [];

  try {
    const q = query(collection(db, COLLECTION_NAME), where("gameId", "==", gameId));
    const snap = await getDocs(q);
    const cloudEntries = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && typeof d.score === "number" && d.playerName) {
        cloudEntries.push({
          id: docSnap.id,
          clientId: d.clientId || docSnap.id,
          gameId: d.gameId,
          playerName: String(d.playerName).slice(0, 24),
          score: Math.floor(d.score),
          badge: d.badge || "",
          meta: d.meta || "",
          createdAt: Number(d.createdAt || Date.now()),
        });
      }
    });
    return {
      entries: mergeAndSort(cloudEntries, localEntries, maxCount),
      cloudConnected: true,
    };
  } catch {
    return {
      entries: mergeAndSort([], localEntries, maxCount),
      cloudConnected: false,
    };
  }
}

/**
 * Submit a player's score & name to both localStorage (instant) and Firestore (global).
 */
export async function submitGameScore({ gameId, playerName, score, badge = "", meta = "" }) {
  const cleanName = String(playerName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (!cleanName) {
    throw new Error("Please enter your name.");
  }

  savePlayerName(cleanName);

  const entry = {
    clientId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    playerName: cleanName,
    score: Math.max(0, Math.floor(Number(score) || 0)),
    badge: String(badge || "").slice(0, 32),
    meta: String(meta || "").slice(0, 64),
    createdAt: Date.now(),
  };

  // 1. Always save locally for instant UI feedback
  const localAll = readLocalAll();
  const prev = Array.isArray(localAll[gameId]) ? localAll[gameId] : [];
  localAll[gameId] = mergeAndSort([], [entry, ...prev], 30);
  writeLocalAll(localAll);

  // 2. Push to Firebase Firestore global leaderboard
  let syncedToCloud = false;
  try {
    await addDoc(collection(db, COLLECTION_NAME), entry);
    syncedToCloud = true;
  } catch {
    syncedToCloud = false;
  }

  // 3. Notify live GameLeaderboard panel to refresh immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("smsc-leaderboard-updated", { detail: { gameId } }));
  }

  return { entry, syncedToCloud };
}
