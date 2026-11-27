import { addDoc, collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
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

function parseSnapshot(snap) {
  const list = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (d && typeof d.score === "number" && d.playerName) {
      list.push({
        id: docSnap.id,
        clientId: d.clientId || docSnap.id,
        gameId: d.gameId,
        playerName: String(d.playerName).slice(0, 24),
        score: Math.floor(d.score),
        badge: d.badge || "",
        meta: d.meta || "",
        createdAt: Number(d.createdAt || Date.now()),
        fromCloud: true,
      });
    }
  });
  return list;
}

function mergeAndSort(cloudList, localList, maxCount = 15) {
  const seen = new Map();
  // Prefer cloud records first so `fromCloud` flag stays true
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
 * One-shot fetch (used for manual refresh button).
 */
export async function fetchGameLeaderboard(gameId, maxCount = 15) {
  const localAll = readLocalAll();
  const localEntries = Array.isArray(localAll[gameId]) ? localAll[gameId] : [];

  try {
    const q = query(collection(db, COLLECTION_NAME), where("gameId", "==", gameId));
    const snap = await getDocs(q);
    const cloudEntries = parseSnapshot(snap);
    return {
      entries: mergeAndSort(cloudEntries, localEntries, maxCount),
      cloudConnected: true,
      error: "",
    };
  } catch (err) {
    return {
      entries: mergeAndSort([], localEntries, maxCount),
      cloudConnected: false,
      error: err?.code || err?.message || "offline",
    };
  }
}

/**
 * Real-time Firebase Firestore listener (onSnapshot) for instant live leaderboard updates
 * across all players and devices!
 */
export function subscribeGameLeaderboard(gameId, onData, maxCount = 15) {
  const getLocal = () => {
    const all = readLocalAll();
    return Array.isArray(all[gameId]) ? all[gameId] : [];
  };

  let lastCloudEntries = [];
  let isCloudLive = false;

  const emitLocalRefresh = () => {
    onData({
      entries: mergeAndSort(lastCloudEntries, getLocal(), maxCount),
      cloudConnected: isCloudLive,
      error: "",
    });
  };

  // Emit cached local entries immediately for zero-flicker render
  emitLocalRefresh();

  const onLocalEvent = (e) => {
    if (!e?.detail?.gameId || e.detail.gameId === gameId) {
      emitLocalRefresh();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("smsc-leaderboard-updated", onLocalEvent);
  }

  let unsub = () => {};
  try {
    const q = query(collection(db, COLLECTION_NAME), where("gameId", "==", gameId));
    unsub = onSnapshot(
      q,
      (snap) => {
        isCloudLive = true;
        lastCloudEntries = parseSnapshot(snap);
        onData({
          entries: mergeAndSort(lastCloudEntries, getLocal(), maxCount),
          cloudConnected: true,
          error: "",
        });
      },
      (err) => {
        isCloudLive = false;
        onData({
          entries: mergeAndSort([], getLocal(), maxCount),
          cloudConnected: false,
          error: err?.code || err?.message || "firestore-error",
        });
      }
    );
  } catch (err) {
    onData({
      entries: mergeAndSort([], getLocal(), maxCount),
      cloudConnected: false,
      error: err?.message || "init-error",
    });
  }

  return () => {
    try {
      unsub();
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("smsc-leaderboard-updated", onLocalEvent);
    }
  };
}

/**
 * Submit a player's score & name to both localStorage (instant) and Firebase Firestore (live global).
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

  // 1. Save locally for instant feedback
  const localAll = readLocalAll();
  const prev = Array.isArray(localAll[gameId]) ? localAll[gameId] : [];
  localAll[gameId] = mergeAndSort([], [entry, ...prev], 30);
  writeLocalAll(localAll);

  // 2. Push to Firebase Firestore (`game_leaderboards` collection)
  let syncedToCloud = false;
  let cloudError = "";
  try {
    await addDoc(collection(db, COLLECTION_NAME), entry);
    syncedToCloud = true;
  } catch (err) {
    syncedToCloud = false;
    cloudError = err?.code || err?.message || "permission-denied";
    console.warn("[Leaderboard Firebase write skipped]", cloudError);
  }

  // 3. Notify local listeners immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("smsc-leaderboard-updated", { detail: { gameId } }));
  }

  return { entry, syncedToCloud, cloudError };
}
