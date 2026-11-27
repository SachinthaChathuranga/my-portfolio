import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Crosshair,
  Shield,
  Target,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronRight,
  Eye,
  Bomb,
  ListChecks,
  MapPin,
  CloudRain,
} from "lucide-react";
import { VANGUARD_MISSIONS } from "./vanguardMissions";
import { createVanguardTextures } from "./vanguardTextures";
import {
  buildMissionWorld,
  createWebGLRenderer,
  drawSoldier3D,
  mat4LookAt,
  mat4Perspective,
  mat4Transform,
} from "./vanguardEngine";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const CAMPAIGN_STORAGE_KEY = "smsc_vanguard_army_campaign_v1";

function loadCampaign() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return { unlockedCount: 1, records: {} };
    const parsed = JSON.parse(raw);
    return {
      unlockedCount: Math.max(1, Math.min(VANGUARD_MISSIONS.length, Number(parsed.unlockedCount || 1))),
      records: parsed.records || {},
    };
  } catch {
    return { unlockedCount: 1, records: {} };
  }
}

function saveCampaign(data) {
  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

const ARMY_WEAPONS = [
  {
    id: 0,
    key: "1",
    name: "M4A1 SOPMOD",
    short: "M4A1",
    damage: 32,
    pellets: 1,
    fireRate: 0.11,
    magSize: 30,
    reserveStart: 150,
    reloadTime: 1.5,
    spread: 0.014,
    adsSpread: 0.004,
    adsFov: 48,
    noiseRadius: 18,
    auto: true,
    accent: "#FF8A1F",
  },
  {
    id: 1,
    key: "2",
    name: "MP5SD Suppressed",
    short: "MP5SD",
    damage: 25,
    pellets: 1,
    fireRate: 0.085,
    magSize: 30,
    reserveStart: 150,
    reloadTime: 1.3,
    spread: 0.018,
    adsSpread: 0.007,
    adsFov: 52,
    noiseRadius: 5.5, // Stealth CQB room clearer!
    auto: true,
    accent: "#00D4FF",
  },
  {
    id: 2,
    key: "3",
    name: "M24 Tactical Sniper",
    short: "M24",
    damage: 125,
    pellets: 1,
    fireRate: 0.92,
    magSize: 5,
    reserveStart: 25,
    reloadTime: 1.9,
    spread: 0.025,
    adsSpread: 0.001,
    adsFov: 21, // High-power sniper scope!
    noiseRadius: 24,
    auto: false,
    isSniper: true,
    accent: "#F012A8",
  },
  {
    id: 3,
    key: "4",
    name: "M870 Combat Shotgun",
    short: "M870",
    damage: 24,
    pellets: 6,
    fireRate: 0.68,
    magSize: 8,
    reserveStart: 32,
    reloadTime: 1.7,
    spread: 0.068,
    adsSpread: 0.045,
    adsFov: 56,
    noiseRadius: 21,
    auto: false,
    accent: "#FACC15",
  },
];

/** Cross-browser rounded rect helper for 2D HUD */
function rrect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Realistic Military Web Audio Engine (rifles, suppressor, shotgun boom, frag explosion, reload, headshot) */
function createArmyAudio() {
  let ctx = null;
  const ensure = () => {
    try {
      if (typeof window === "undefined") return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  };

  const burst = (dur, f0, f1, vol, type = "bandpass") => {
    try {
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const len = Math.max(256, Math.floor((c.sampleRate || 44100) * dur));
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.85);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const flt = c.createBiquadFilter();
      flt.type = type;
      flt.frequency.setValueAtTime(f0, now);
      flt.frequency.exponentialRampToValueAtTime(Math.max(45, f1), now + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(flt).connect(g).connect(c.destination);
      src.start(now);
    } catch {
      // ignore
    }
  };

  return {
    shoot(wId, muted) {
      if (muted) return;
      if (wId === 0) burst(0.12, 1600, 220, 0.24);
      else if (wId === 1) burst(0.075, 2400, 720, 0.13); // Suppressed MP5SD
      else if (wId === 2) burst(0.32, 980, 75, 0.36, "lowpass"); // M24 Sniper crack
      else burst(0.24, 1100, 95, 0.34, "lowpass"); // M870 Shotgun blast
    },
    enemyShot(muted) {
      if (muted) return;
      burst(0.11, 1250, 220, 0.14);
    },
    explosion(muted) {
      if (muted) return;
      burst(0.75, 420, 42, 0.45, "lowpass");
    },
    reload(muted) {
      try {
        if (muted) return;
        const c = ensure();
        if (!c) return;
        const now = c.currentTime;
        [360, 560, 720].forEach((f, idx) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(f, now + idx * 0.1);
          g.gain.setValueAtTime(0.075, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.08);
          o.connect(g).connect(c.destination);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.09);
        });
      } catch {
        // ignore
      }
    },
    hit(muted, headshot) {
      try {
        if (muted) return;
        const c = ensure();
        if (!c) return;
        const now = c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = headshot ? "triangle" : "sine";
        o.frequency.setValueAtTime(headshot ? 1480 : 780, now);
        o.frequency.exponentialRampToValueAtTime(headshot ? 700 : 340, now + 0.075);
        g.gain.setValueAtTime(headshot ? 0.16 : 0.095, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        o.connect(g).connect(c.destination);
        o.start(now);
        o.stop(now + 0.085);
      } catch {
        // ignore
      }
    },
    pickup(muted) {
      try {
        if (muted) return;
        const c = ensure();
        if (!c) return;
        const now = c.currentTime;
        [523, 784, 1046].forEach((f, idx) => {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(f, now + idx * 0.06);
          g.gain.setValueAtTime(0.085, now + idx * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.13);
          o.connect(g).connect(c.destination);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.14);
        });
      } catch {
        // ignore
      }
    },
  };
}

// ================= 3D COLLISION & RAYCAST HELPERS =================
function collidesWalk(colliders, x, z, radius = 0.42) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.blocksWalk) continue;
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

/** Ray-vs-AABB intersection returning distance t >= 0 or Infinity */
function rayAABB(ox, oy, oz, dx, dy, dz, minX, maxX, minY, maxY, minZ, maxZ) {
  let tmin = -Infinity;
  let tmax = Infinity;

  if (Math.abs(dx) < 1e-6) {
    if (ox < minX || ox > maxX) return Infinity;
  } else {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }

  if (Math.abs(dy) < 1e-6) {
    if (oy < minY || oy > maxY) return Infinity;
  } else {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }

  if (Math.abs(dz) < 1e-6) {
    if (oz < minZ || oz > maxZ) return Infinity;
  } else {
    let t1 = (minZ - oz) / dz;
    let t2 = (maxZ - oz) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }

  if (tmax < 0 || tmin > tmax) return Infinity;
  return tmin >= 0 ? tmin : tmax;
}

function raycastWalls(colliders, ox, oy, oz, dx, dy, dz, maxDist = 55) {
  let best = maxDist;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const t = rayAABB(ox, oy, oz, dx, dy, dz, c.minX, c.maxX, c.minBulletY, c.maxBulletY, c.minZ, c.maxZ);
    if (t < best) best = t;
  }
  return best;
}

function hasLineOfSight3D(colliders, x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.05) return true;
  const hit = raycastWalls(colliders, x1, y1, z1, dx / dist, dy / dist, dz / dist, dist);
  return hit >= dist - 0.15;
}

function findBuildingAt(buildings, x, z) {
  for (const b of buildings) {
    if (x >= b.x && x <= b.x + b.w && z >= b.z && z <= b.z + b.d) {
      return b;
    }
  }
  return null;
}

function createRuntimeState(mission) {
  return {
    mission,
    px: mission.playerStart.x,
    pz: mission.playerStart.z,
    yaw: mission.playerStart.yaw || 0,
    pitch: 0,
    hp: 100,
    weaponId: 0,
    mags: ARMY_WEAPONS.map((w) => w.magSize),
    reserves: ARMY_WEAPONS.map((w) => w.reserveStart),
    grenades: 3,
    reloading: 0,
    fireCd: 0,
    ads: false,
    adsLerp: 0,
    crouched: false,
    crouchLerp: 0,
    muzzleFlash: 0,
    recoil: 0,
    walkBob: 0,
    hitMarker: 0,
    headshotFlash: 0,
    damageFlash: 0,
    damageAngle: 0,
    shake: 0,
    kills: 0,
    headshots: 0,
    elapsed: 0,
    lightningFlash: 0,
    alertText: `DEPLOYED TO ${mission.theater.toUpperCase()} — BREACH BUILDINGS & COMPLETE OBJECTIVES`,
    killFeed: [],
    mouseDown: false,
    dragging: false,
    lastDragX: 0,
    lastDragY: 0,
    activeGrenades: [],
    explosions: [],
    tracers: [],
    impacts: [],
    enemies: mission.enemies.map((e) => ({
      ...e,
      maxHp: e.hp,
      yaw: Math.random() * Math.PI * 2,
      state: "patrol",
      patrolOriginX: e.x,
      patrolOriginZ: e.z,
      patrolDir: Math.random() * Math.PI * 2,
      shootCd: 0.7 + Math.random() * 0.8,
      hitFlash: 0,
      muzzleFlash: 0,
      walkCycle: Math.random() * Math.PI * 2,
      alive: true,
      deathAnim: 0,
    })),
    pickups: mission.pickups.map((p) => ({ ...p, taken: false })),
    objectives: mission.objectives.map((o) => ({ ...o, completed: false, progress: 0 })),
    extraction: { ...mission.extraction },
    weatherDrops: Array.from({ length: 85 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.5 + Math.random() * 0.8,
      size: 1.2 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 0.25,
    })),
  };
}

/** Project 3D point into 2D viewport screen coordinates (or null if behind camera) */
function projectToScreen(wx, wy, wz, viewMat, projMat, w, h) {
  const vx = viewMat[0] * wx + viewMat[4] * wy + viewMat[8] * wz + viewMat[12];
  const vy = viewMat[1] * wx + viewMat[5] * wy + viewMat[9] * wz + viewMat[13];
  const vz = viewMat[2] * wx + viewMat[6] * wy + viewMat[10] * wz + viewMat[14];
  const vw = viewMat[3] * wx + viewMat[7] * wy + viewMat[11] * wz + viewMat[15];

  const cx = projMat[0] * vx + projMat[4] * vy + projMat[8] * vz + projMat[12] * vw;
  const cy = projMat[1] * vx + projMat[5] * vy + projMat[9] * vz + projMat[13] * vw;
  const cw = projMat[3] * vx + projMat[7] * vy + projMat[11] * vz + projMat[15] * vw;

  if (cw <= 0.1) return null;
  const ndcX = cx / cw;
  const ndcY = cy / cw;
  return {
    x: (ndcX * 0.5 + 0.5) * w,
    y: (-ndcY * 0.5 + 0.5) * h,
    visible: ndcX >= -1.05 && ndcX <= 1.05 && ndcY >= -1.05 && ndcY <= 1.05,
  };
}

export default function VanguardArmy3D() {
  const containerRef = useRef(null);
  const glCanvasRef = useRef(null);
  const hudCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const rendererRef = useRef(null);
  const texturesRef = useRef(null);
  const worldRef = useRef(null);

  if (!audioRef.current) audioRef.current = createArmyAudio();

  const [campaign, setCampaign] = useState(() => loadCampaign());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState("briefing"); // "briefing" | "playing" | "victory" | "failed"
  const [muted, setMuted] = useState(false);
  const [nvg, setNvg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [justUnlockedTitle, setJustUnlockedTitle] = useState("");
  const [webglError, setWebglError] = useState(false);

  const selectedMission = VANGUARD_MISSIONS[selectedIdx] || VANGUARD_MISSIONS[0];

  const [hud, setHud] = useState(() => ({
    hp: 100,
    weaponId: 0,
    ammo: 30,
    reserve: 150,
    grenades: 3,
    reloading: false,
    ads: false,
    crouched: false,
    insideBuilding: null,
    allObjectivesDone: false,
    objectives: selectedMission.objectives.map((o) => ({
      id: o.id,
      label: o.label,
      completed: false,
      dist: 0,
    })),
    nearInteract: null,
    kills: 0,
    headshots: 0,
    totalHostiles: selectedMission.enemies.length,
    elapsed: 0,
    rank: "A",
    alertText: "SELECT OPERATION & DEPLOY",
    killFeed: [],
  }));

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const nvgRef = useRef(nvg);
  nvgRef.current = nvg;
  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;

  const simRef = useRef(null);
  if (!simRef.current) {
    simRef.current = {
      width: 960,
      height: 560,
      keys: {},
      codes: {},
      ...createRuntimeState(VANGUARD_MISSIONS[0]),
    };
  }

  const rebuildWorldForMission = useCallback((mission) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (worldRef.current) {
      worldRef.current.dispose();
    }
    worldRef.current = buildMissionWorld(renderer.gl, mission);
  }, []);

  const syncHud = useCallback((finalRank = "A") => {
    const s = simRef.current;
    if (!s) return;
    const allObjectivesDone = s.objectives.every((o) => o.completed);
    const bldg = findBuildingAt(s.mission.buildings, s.px, s.pz);

    let nearInteract = null;
    const objList = s.objectives.map((o) => {
      let ox = o.x;
      let oz = o.z;
      if (o.type === "eliminate" && o.targetId) {
        const t = s.enemies.find((e) => e.id === o.targetId);
        if (t && t.alive) {
          ox = t.x;
          oz = t.z;
        }
      }
      const dist = Math.hypot(ox - s.px, oz - s.pz);
      if (!o.completed && o.type === "interact" && dist < 2.8) {
        nearInteract = {
          verb: o.actionVerb,
          progress: Math.round(o.progress * 100),
        };
      }
      return {
        id: o.id,
        label: o.label,
        completed: o.completed,
        dist: Math.round(dist),
      };
    });

    setHud({
      hp: Math.max(0, Math.ceil(s.hp)),
      weaponId: s.weaponId,
      ammo: s.mags[s.weaponId],
      reserve: s.reserves[s.weaponId],
      grenades: s.grenades,
      reloading: s.reloading > 0,
      ads: s.ads,
      crouched: s.crouched,
      insideBuilding: bldg ? bldg.label : null,
      allObjectivesDone,
      objectives: objList,
      nearInteract,
      kills: s.kills,
      headshots: s.headshots,
      totalHostiles: s.enemies.length,
      elapsed: Math.floor(s.elapsed),
      rank: finalRank,
      alertText: s.alertText,
      killFeed: [...s.killFeed],
    });
  }, []);

  const selectMission = useCallback(
    (idx) => {
      // Strictly enforce sequential mission unlocking!
      if (idx >= campaign.unlockedCount) return;
      const m = VANGUARD_MISSIONS[idx] || VANGUARD_MISSIONS[0];
      setSelectedIdx(idx);
      selectedIdxRef.current = idx;
      setJustUnlockedTitle("");
      setNvg(false);
      nvgRef.current = false;
      Object.assign(simRef.current, createRuntimeState(m));
      rebuildWorldForMission(m);
      phaseRef.current = "briefing";
      setPhase("briefing");
      document.exitPointerLock?.();
      syncHud();
    },
    [campaign.unlockedCount, rebuildWorldForMission, syncHud]
  );

  const deployMission = useCallback(
    (overrideIdx = null) => {
      const idx = typeof overrideIdx === "number" ? overrideIdx : selectedIdxRef.current;
      const m = VANGUARD_MISSIONS[idx] || VANGUARD_MISSIONS[0];
      setSelectedIdx(idx);
      selectedIdxRef.current = idx;
      setJustUnlockedTitle("");

      Object.assign(simRef.current, {
        ...createRuntimeState(m),
        keys: {},
        codes: {},
      });
      rebuildWorldForMission(m);

      phaseRef.current = "playing";
      setPhase("playing");
      syncHud();

      try {
        glCanvasRef.current?.requestPointerLock?.();
      } catch {
        // fallback drag-look works smoothly
      }
    },
    [rebuildWorldForMission, syncHud]
  );

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onPl = () => setPointerLocked(document.pointerLockElement === glCanvasRef.current);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("pointerlockchange", onPl);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("pointerlockchange", onPl);
    };
  }, []);

  // Throw 3D Frag Grenade Helper
  const throwGrenade = useCallback(() => {
    const s = simRef.current;
    if (!s || phaseRef.current !== "playing" || s.grenades <= 0) return;
    s.grenades -= 1;
    const eyeY = s.crouched ? 1.05 : 1.6;
    const fx = Math.sin(s.yaw) * Math.cos(s.pitch);
    const fy = Math.sin(s.pitch) + 0.28;
    const fz = -Math.cos(s.yaw) * Math.cos(s.pitch);
    s.activeGrenades.push({
      x: s.px + fx * 0.5,
      y: eyeY - 0.1,
      z: s.pz + fz * 0.5,
      vx: fx * 14.5,
      vy: fy * 9.5,
      vz: fz * 14.5,
      fuse: 1.65,
    });
    s.alertText = "FRAG OUT! TAKE COVER!";
    syncHud();
  }, [syncHud]);

  // Keyboard & Mouse Listeners (Yaw + Pitch Look, Weapons 1-4, Grenade G, Crouch C, NVG N, Reload R)
  useEffect(() => {
    const s = simRef.current;
    const onKeyDown = (e) => {
      const k = (e.key || "").toLowerCase();
      const c = e.code || "";
      s.keys[k] = true;
      s.codes[c] = true;

      if (phaseRef.current !== "playing") return;

      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) ||
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(c)
      ) {
        e.preventDefault();
      }

      const wMap = { "1": 0, Digit1: 0, "2": 1, Digit2: 1, "3": 2, Digit3: 2, "4": 3, Digit4: 3 };
      const picked = wMap[c] !== undefined ? wMap[c] : wMap[k];
      if (picked !== undefined && picked !== s.weaponId) {
        s.weaponId = picked;
        s.reloading = 0;
        s.ads = false;
        syncHud();
      }

      if (k === "r" || c === "KeyR") {
        const wp = ARMY_WEAPONS[s.weaponId];
        if (s.reloading <= 0 && s.mags[s.weaponId] < wp.magSize && s.reserves[s.weaponId] > 0) {
          s.reloading = wp.reloadTime;
          s.ads = false;
          audioRef.current?.reload(mutedRef.current);
          syncHud();
        }
      }
      if (k === "c" || c === "KeyC") {
        s.crouched = !s.crouched;
        syncHud();
      }
      if (k === "n" || c === "KeyN") {
        setNvg((prev) => {
          nvgRef.current = !prev;
          return !prev;
        });
      }
      if (k === "g" || c === "KeyG") {
        throwGrenade();
      }
      if (k === "f" || c === "KeyF") {
        s.ads = !s.ads;
        syncHud();
      }
    };

    const onKeyUp = (e) => {
      s.keys[(e.key || "").toLowerCase()] = false;
      s.codes[e.code || ""] = false;
    };

    const onBlur = () => {
      s.keys = {};
      s.codes = {};
      s.mouseDown = false;
      s.dragging = false;
    };

    const onMouseMove = (e) => {
      if (phaseRef.current !== "playing") return;
      const sens = s.ads && ARMY_WEAPONS[s.weaponId].isSniper ? 0.001 : s.ads ? 0.0017 : 0.0025;
      if (document.pointerLockElement === glCanvasRef.current) {
        s.yaw += e.movementX * sens;
        s.pitch = Math.max(-0.52, Math.min(0.52, s.pitch - e.movementY * sens));
      } else if (s.dragging) {
        const dx = e.clientX - s.lastDragX;
        const dy = e.clientY - s.lastDragY;
        s.lastDragX = e.clientX;
        s.lastDragY = e.clientY;
        s.yaw += dx * sens * 1.8;
        s.pitch = Math.max(-0.52, Math.min(0.52, s.pitch - dy * sens * 1.4));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [syncHud, throwGrenade]);

  // ================= MAIN 60FPS WEBGL 3D + TACTICAL HUD ENGINE =================
  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    if (!glCanvas || !hudCanvas) return;

    const renderer = createWebGLRenderer(glCanvas);
    if (!renderer) {
      setWebglError(true);
      return;
    }
    rendererRef.current = renderer;
    const { gl, prog, loc, unitBox, drawMesh } = renderer;
    const textures = createVanguardTextures(gl);
    texturesRef.current = textures;
    worldRef.current = buildMissionWorld(gl, simRef.current.mission);

    const hudCtx = hudCanvas.getContext("2d");

    const resize = () => {
      const rect = glCanvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.floor(rect.width || glCanvas.parentElement?.clientWidth || 960));
      const cssH = Math.max(260, Math.floor(rect.height || glCanvas.parentElement?.clientHeight || 560));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pw = Math.floor(cssW * dpr);
      const ph = Math.floor(cssH * dpr);
      if (glCanvas.width !== pw || glCanvas.height !== ph) {
        glCanvas.width = pw;
        glCanvas.height = ph;
      }
      if (hudCanvas.width !== pw || hudCanvas.height !== ph) {
        hudCanvas.width = pw;
        hudCanvas.height = ph;
      }
      hudCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.width = cssW;
      simRef.current.height = cssH;
    };

    resize();
    window.addEventListener("resize", resize);
    let ro = null;
    if (typeof ResizeObserver !== "undefined" && glCanvas.parentElement) {
      ro = new ResizeObserver(resize);
      ro.observe(glCanvas.parentElement);
    }

    const pushKillFeed = (s, text, color = "#FFC247") => {
      s.killFeed.unshift({ id: Date.now() + Math.random(), text, color, ttl: 4.0 });
      if (s.killFeed.length > 4) s.killFeed.pop();
    };

    const triggerExplosion = (s, world, ex, ey, ez, radius, causeLabel) => {
      audioRef.current?.explosion(mutedRef.current);
      s.explosions.push({ x: ex, y: ey, z: ez, life: 1.0, maxRadius: radius * 0.55 });
      const distP = Math.hypot(s.px - ex, s.pz - ez);
      if (distP < 14) {
        s.shake = Math.max(s.shake, (1 - distP / 14) * 18);
      }
      if (distP < radius * 0.72) {
        const selfDmg = Math.round((1 - distP / (radius * 0.72)) * 38);
        s.hp = Math.max(0, s.hp - selfDmg);
        s.damageFlash = 1;
      }

      // Blast nearby enemies!
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - ex, e.z - ez);
        if (d < radius) {
          const dmg = Math.round((1 - d / radius) * 260);
          e.hp -= dmg;
          e.hitFlash = 1;
          e.state = "combat";
          if (e.hp <= 0) {
            e.alive = false;
            e.deathAnim = 0.05;
            s.kills++;
            pushKillFeed(s, `💥 ${causeLabel} • ${e.kind.toUpperCase()} KIA`, "#FF8A1F");
            for (const o of s.objectives) {
              if (o.type === "eliminate" && o.targetId === e.id && !o.completed) {
                o.completed = true;
                o.progress = 1;
                audioRef.current?.pickup(mutedRef.current);
              }
            }
          }
        }
      }

      // Chain-detonate nearby explosive barrels!
      for (const b of world.barrels) {
        if (!b.intact) continue;
        if (Math.hypot(b.x - ex, b.z - ez) < radius * 0.85) {
          b.intact = false;
          triggerExplosion(s, world, b.x, 0.7, b.z, 6.2, "CHAIN BARREL");
        }
      }
    };

    const fireWeapon = (s, world) => {
      const wp = ARMY_WEAPONS[s.weaponId];
      if (s.fireCd > 0 || s.reloading > 0) return;
      if (s.mags[s.weaponId] <= 0) {
        if (s.reserves[s.weaponId] > 0) {
          s.reloading = wp.reloadTime;
          s.ads = false;
          audioRef.current?.reload(mutedRef.current);
        }
        return;
      }

      s.mags[s.weaponId] -= 1;
      s.fireCd = wp.fireRate;
      s.muzzleFlash = 1;
      s.recoil = wp.id === 2 || wp.id === 3 ? 1.25 : 0.85;
      audioRef.current?.shoot(s.weaponId, mutedRef.current);

      // Alert enemies within gunshot hearing range
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - s.px, e.z - s.pz) <= wp.noiseRadius) {
          e.state = "combat";
        }
      }

      const eyeY = 1.65 - s.crouchLerp * 0.58;
      const spread = (s.ads ? wp.adsSpread : wp.spread) * (s.crouched ? 0.7 : 1);

      for (let p = 0; p < wp.pellets; p++) {
        const syaw = s.yaw + (Math.random() - 0.5) * spread * 2;
        const spitch = s.pitch + (Math.random() - 0.5) * spread * 2;
        const dx = Math.sin(syaw) * Math.cos(spitch);
        const dy = Math.sin(spitch);
        const dz = -Math.cos(syaw) * Math.cos(spitch);

        const wallDist = raycastWalls(world.colliders, s.px, eyeY, s.pz, dx, dy, dz, 55);

        // Check explosive barrels first
        let bestBarrel = null;
        let bestBarrelT = wallDist;
        for (const b of world.barrels) {
          if (!b.intact) continue;
          const t = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, b.x - 0.48, b.x + 0.48, 0, 1.28, b.z - 0.48, b.z + 0.48);
          if (t < bestBarrelT) {
            bestBarrelT = t;
            bestBarrel = b;
          }
        }

        // Check true 3D articulated soldier head & body hitboxes!
        let bestEnemy = null;
        let bestEnemyT = bestBarrelT;
        let hitHead = false;
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const r = e.kind === "heavy" ? 0.44 : 0.36;
          const tHead = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, e.x - 0.24, e.x + 0.24, 1.36, 1.82, e.z - 0.24, e.z + 0.24);
          if (tHead < bestEnemyT) {
            bestEnemyT = tHead;
            bestEnemy = e;
            hitHead = true;
          }
          const tBody = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, e.x - r, e.x + r, 0.05, 1.38, e.z - r, e.z + r);
          if (tBody < bestEnemyT) {
            bestEnemyT = tBody;
            bestEnemy = e;
            hitHead = false;
          }
        }

        if (bestEnemy) {
          const dmg = wp.damage * (hitHead ? 2.4 : 1.0);
          bestEnemy.hp -= dmg;
          bestEnemy.hitFlash = 1;
          bestEnemy.state = "combat";
          s.hitMarker = 1;
          if (hitHead) s.headshotFlash = 1;
          audioRef.current?.hit(mutedRef.current, hitHead);
          s.impacts.push({
            x: s.px + dx * bestEnemyT,
            y: eyeY + dy * bestEnemyT,
            z: s.pz + dz * bestEnemyT,
            color: [0.95, 0.2, 0.25],
            life: 0.35,
          });

          if (bestEnemy.hp <= 0) {
            bestEnemy.alive = false;
            bestEnemy.deathAnim = 0.04;
            s.kills++;
            if (hitHead) s.headshots++;
            const tag =
              bestEnemy.kind === "officer"
                ? "COMMANDER HVT"
                : bestEnemy.kind === "heavy"
                ? "HEAVY TROOPER"
                : bestEnemy.kind === "sniper"
                ? "SNIPER"
                : "SOLDIER";
            pushKillFeed(
              s,
              hitHead ? `★ HEADSHOT • ${tag} KIA` : `☠ ${tag} NEUTRALIZED`,
              hitHead ? "#FACC15" : "#00D4FF"
            );
            for (const o of s.objectives) {
              if (o.type === "eliminate" && o.targetId === bestEnemy.id && !o.completed) {
                o.completed = true;
                o.progress = 1;
                audioRef.current?.pickup(mutedRef.current);
              }
            }
          }
        } else if (bestBarrel) {
          bestBarrel.hp -= wp.damage;
          s.hitMarker = 0.8;
          s.impacts.push({
            x: s.px + dx * bestBarrelT,
            y: eyeY + dy * bestBarrelT,
            z: s.pz + dz * bestBarrelT,
            color: [1.0, 0.65, 0.2],
            life: 0.35,
          });
          if (bestBarrel.hp <= 0) {
            bestBarrel.intact = false;
            triggerExplosion(s, world, bestBarrel.x, 0.75, bestBarrel.z, 6.2, "FUEL BARREL");
          }
        } else if (wallDist < 50) {
          // 3D Bullet wall impact spark puff
          s.impacts.push({
            x: s.px + dx * (wallDist - 0.08),
            y: eyeY + dy * (wallDist - 0.08),
            z: s.pz + dz * (wallDist - 0.08),
            color: [1.0, 0.85, 0.55],
            life: 0.28,
          });
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    let hudTick = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      try {
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        const s = simRef.current;
        const world = worldRef.current;
        if (!s || !world) return;

        if (s.width < 50 || s.height < 50) resize();
        const w = Math.max(320, s.width);
        const h = Math.max(260, s.height);
        const env = s.mission.env;

        // Animate weather particles
        for (const wd of s.weatherDrops) {
          const speedMult = env.weather === "rain" || env.weather === "storm" ? 1.85 : 0.26;
          wd.y += dt * speedMult * wd.speed;
          wd.x += dt * (env.weather === "dust" ? 0.38 : wd.drift);
          if (wd.y > 1) {
            wd.y = 0;
            wd.x = Math.random();
          }
          if (wd.x > 1) wd.x -= 1;
          if (wd.x < 0) wd.x += 1;
        }

        // Occasional lightning flash in Midnight Fortress storm
        if (env.weather === "storm") {
          s.lightningFlash = Math.max(0, s.lightningFlash - dt * 3.5);
          if (Math.random() < dt * 0.14) s.lightningFlash = 0.85;
        } else {
          s.lightningFlash = 0;
        }

        // ================= GAMEPLAY SIMULATION =================
        if (phaseRef.current === "playing") {
          s.elapsed += dt;
          s.fireCd = Math.max(0, s.fireCd - dt);
          s.muzzleFlash = Math.max(0, s.muzzleFlash - dt * 11);
          s.recoil = Math.max(0, s.recoil - dt * 7);
          s.hitMarker = Math.max(0, s.hitMarker - dt * 5);
          s.headshotFlash = Math.max(0, s.headshotFlash - dt * 2.2);
          s.damageFlash = Math.max(0, s.damageFlash - dt * 2.4);
          s.shake = Math.max(0, s.shake - dt * 34);
          s.adsLerp += ((s.ads ? 1 : 0) - s.adsLerp) * Math.min(1, dt * 14);
          s.crouchLerp += ((s.crouched ? 1 : 0) - s.crouchLerp) * Math.min(1, dt * 11);

          for (let k = s.killFeed.length - 1; k >= 0; k--) {
            s.killFeed[k].ttl -= dt;
            if (s.killFeed[k].ttl <= 0) s.killFeed.splice(k, 1);
          }

          if (s.reloading > 0) {
            s.reloading -= dt;
            if (s.reloading <= 0) {
              const wp = ARMY_WEAPONS[s.weaponId];
              const need = wp.magSize - s.mags[s.weaponId];
              const take = Math.min(need, s.reserves[s.weaponId]);
              s.mags[s.weaponId] += take;
              s.reserves[s.weaponId] -= take;
            }
          }

          // Keyboard Look Fallback (ArrowLeft / ArrowRight / Q)
          const turnSpd = s.ads ? 1.25 : 2.35;
          if (s.keys["arrowleft"] || s.codes["ArrowLeft"] || s.keys["q"] || s.codes["KeyQ"]) s.yaw -= turnSpd * dt;
          if (s.keys["arrowright"] || s.codes["ArrowRight"]) s.yaw += turnSpd * dt;

          // Movement (WASD / Arrows + Sprint + Crouch)
          let mf = 0;
          let ms = 0;
          if (s.keys["w"] || s.codes["KeyW"] || s.keys["arrowup"] || s.codes["ArrowUp"]) mf += 1;
          if (s.keys["s"] || s.codes["KeyS"] || s.keys["arrowdown"] || s.codes["ArrowDown"]) mf -= 1;
          if (s.keys["a"] || s.codes["KeyA"]) ms -= 1;
          if (s.keys["d"] || s.codes["KeyD"]) ms += 1;

          const sprinting = Boolean((s.keys["shift"] || s.codes["ShiftLeft"] || s.codes["ShiftRight"]) && !s.ads);
          const spd = s.ads ? 3.2 : s.crouched ? 3.4 : sprinting ? 7.4 : 5.4;

          if (mf !== 0 || ms !== 0) {
            const len = Math.hypot(mf, ms);
            mf /= len;
            ms /= len;
            const fx = Math.sin(s.yaw);
            const fz = -Math.cos(s.yaw);
            const rx = Math.cos(s.yaw);
            const rz = Math.sin(s.yaw);
            const vx = (fx * mf + rx * ms) * spd * dt;
            const vz = (fz * mf + rz * ms) * spd * dt;
            if (!collidesWalk(world.colliders, s.px + vx, s.pz)) s.px += vx;
            if (!collidesWalk(world.colliders, s.px, s.pz + vz)) s.pz += vz;
            s.walkBob += dt * (sprinting ? 12 : s.crouched ? 5.5 : 8.5);
          }

          // Animate Enterable Building Doors (auto-swing open when player or soldier approaches!)
          for (const d of world.doors) {
            const nearPlayer = Math.hypot(s.px - d.cx, s.pz - d.cz) < 3.4;
            const nearEnemy = s.enemies.some((e) => e.alive && Math.hypot(e.x - d.cx, e.z - d.cz) < 2.6);
            const target = nearPlayer || nearEnemy ? 1 : 0;
            d.openAmount += (target - d.openAmount) * Math.min(1, dt * 6.5);
          }

          // Weapon Fire
          if (s.mouseDown || s.keys[" "] || s.codes["Space"]) {
            fireWeapon(s, world);
            if (!ARMY_WEAPONS[s.weaponId].auto) s.mouseDown = false;
          }

          // Physics 3D Frag Grenades
          for (let gi = s.activeGrenades.length - 1; gi >= 0; gi--) {
            const g = s.activeGrenades[gi];
            g.fuse -= dt;
            g.vy -= 18 * dt;
            const nx = g.x + g.vx * dt;
            const nz = g.z + g.vz * dt;
            if (collidesWalk(world.colliders, nx, g.z, 0.2)) g.vx *= -0.45;
            else g.x = nx;
            if (collidesWalk(world.colliders, g.x, nz, 0.2)) g.vz *= -0.45;
            else g.z = nz;
            g.y += g.vy * dt;
            if (g.y < 0.16) {
              g.y = 0.16;
              g.vy = Math.abs(g.vy) * 0.35;
              g.vx *= 0.65;
              g.vz *= 0.65;
            }
            if (g.fuse <= 0) {
              triggerExplosion(s, world, g.x, g.y + 0.4, g.z, 6.8, "FRAG GRENADE");
              s.activeGrenades.splice(gi, 1);
            }
          }

          // Update Explosions, Impacts & Tracers
          for (let i = s.explosions.length - 1; i >= 0; i--) {
            s.explosions[i].life -= dt * 1.9;
            if (s.explosions[i].life <= 0) s.explosions.splice(i, 1);
          }
          for (let i = s.impacts.length - 1; i >= 0; i--) {
            s.impacts[i].life -= dt;
            if (s.impacts[i].life <= 0) s.impacts.splice(i, 1);
          }
          for (let i = s.tracers.length - 1; i >= 0; i--) {
            s.tracers[i].life -= dt * 6;
            if (s.tracers[i].life <= 0) s.tracers.splice(i, 1);
          }

          // Pickups (Medkits & Ammo/Grenade Resupply)
          for (const pk of s.pickups) {
            if (pk.taken) continue;
            if (Math.hypot(pk.x - s.px, pk.z - s.pz) < 1.3) {
              if (pk.kind === "medkit" && s.hp < 100) {
                pk.taken = true;
                s.hp = Math.min(100, s.hp + 45);
                s.alertText = "FIELD MEDKIT APPLIED (+45% HEALTH)";
                audioRef.current?.pickup(mutedRef.current);
              } else if (pk.kind === "ammo") {
                pk.taken = true;
                s.reserves[0] += 60;
                s.reserves[1] += 60;
                s.reserves[2] += 10;
                s.reserves[3] += 16;
                s.grenades = Math.min(5, s.grenades + 2);
                s.alertText = "AMMO & +2 FRAG GRENADES RESUPPLIED";
                audioRef.current?.pickup(mutedRef.current);
              }
            }
          }

          // Objectives Interaction (Inside Buildings!)
          const holdingE = Boolean(s.keys["e"] || s.codes["KeyE"]);
          for (const o of s.objectives) {
            if (o.completed || o.type !== "interact") continue;
            const dObj = Math.hypot(o.x - s.px, o.z - s.pz);
            if (dObj < 2.8 && (holdingE || dObj < 1.6)) {
              o.progress = Math.min(1, o.progress + dt / (o.duration || 2.1));
              s.alertText = `${o.actionVerb}... ${Math.round(o.progress * 100)}%`;
              if (o.progress >= 1) {
                o.completed = true;
                audioRef.current?.pickup(mutedRef.current);
                const allDone = s.objectives.every((x) => x.completed);
                s.alertText = allDone
                  ? `ALL OBJECTIVES COMPLETE! EXTRACT AT ${s.extraction.label}`
                  : `OBJECTIVE COMPLETED: ${o.label.toUpperCase()}`;
                // Alert nearby hostiles
                s.enemies.forEach((en) => {
                  if (en.alive && Math.hypot(en.x - o.x, en.z - o.z) < 16) en.state = "combat";
                });
              }
            }
          }

          // Extraction Victory Check + Sequential Mission Unlocking!
          const allDone = s.objectives.every((o) => o.completed);
          if (allDone && Math.hypot(s.px - s.extraction.x, s.pz - s.extraction.z) < 2.3) {
            const rank = s.hp >= 70 ? "S" : s.hp >= 40 ? "A" : "B";
            const current = loadCampaign();
            const nextUnlocked = Math.max(
              current.unlockedCount,
              Math.min(VANGUARD_MISSIONS.length, s.mission.index + 2)
            );
            const newlyUnlocked =
              nextUnlocked > current.unlockedCount && VANGUARD_MISSIONS[s.mission.index + 1]
                ? `${VANGUARD_MISSIONS[s.mission.index + 1].code}: ${VANGUARD_MISSIONS[s.mission.index + 1].title}`
                : "";

            const updated = {
              unlockedCount: nextUnlocked,
              records: {
                ...current.records,
                [s.mission.id]: {
                  cleared: true,
                  rank,
                  bestTime: Math.min(current.records[s.mission.id]?.bestTime || 9999, Math.floor(s.elapsed)),
                },
              },
            };
            saveCampaign(updated);
            setCampaign(updated);
            setJustUnlockedTitle(newlyUnlocked);

            phaseRef.current = "victory";
            setPhase("victory");
            document.exitPointerLock?.();
            audioRef.current?.pickup(mutedRef.current);
            syncHud(rank);
          }

          // Articulated 3D Soldier Tactical AI
          const playerEyeY = 1.65 - s.crouchLerp * 0.58;
          const stealthMult = s.crouched ? 0.72 : 1;

          for (const e of s.enemies) {
            if (!e.alive) {
              if (e.deathAnim < 1) e.deathAnim = Math.min(1, e.deathAnim + dt * 3.0);
              continue;
            }
            e.hitFlash = Math.max(0, e.hitFlash - dt * 7);
            e.muzzleFlash = Math.max(0, e.muzzleFlash - dt * 10);

            const dx = s.px - e.x;
            const dz = s.pz - e.z;
            const dist = Math.hypot(dx, dz);
            const sightRange = (e.kind === "sniper" ? 24 : 18) * stealthMult;
            const canSee =
              dist < sightRange &&
              hasLineOfSight3D(world.colliders, e.x, 1.45, e.z, s.px, playerEyeY, s.pz);

            if (canSee) e.state = "combat";

            if (e.state === "patrol") {
              const vx = Math.sin(e.patrolDir) * e.speed * 0.45 * dt;
              const vz = Math.cos(e.patrolDir) * e.speed * 0.45 * dt;
              const dOrigin = Math.hypot(e.x + vx - e.patrolOriginX, e.z + vz - e.patrolOriginZ);
              if (dOrigin < 3.6 && !collidesWalk(world.colliders, e.x + vx, e.z + vz, 0.48)) {
                e.x += vx;
                e.z += vz;
                e.yaw = e.patrolDir;
                e.walkCycle += dt * 5.2;
              } else {
                e.patrolDir += Math.PI * 0.55 + (Math.random() - 0.5) * 0.6;
              }
            } else if (e.state === "combat") {
              e.yaw = Math.atan2(dx, dz);
              const idealRange = e.kind === "sniper" ? 11.5 : 5.5;
              if (dist > idealRange && dist < 26) {
                const mx = (dx / dist) * e.speed * dt;
                const mz = (dz / dist) * e.speed * dt;
                let moved = false;
                if (!collidesWalk(world.colliders, e.x + mx, e.z, 0.45)) {
                  e.x += mx;
                  moved = true;
                }
                if (!collidesWalk(world.colliders, e.x, e.z + mz, 0.45)) {
                  e.z += mz;
                  moved = true;
                }
                if (moved) e.walkCycle += dt * 7.5;
              }

              if (canSee) {
                e.shootCd -= dt;
                if (e.shootCd <= 0) {
                  e.shootCd =
                    e.kind === "heavy"
                      ? 0.62
                      : e.kind === "officer"
                      ? 0.65
                      : e.kind === "sniper"
                      ? 1.55
                      : 0.98;
                  e.muzzleFlash = 1;
                  audioRef.current?.enemyShot(mutedRef.current);

                  s.tracers.push({
                    x: e.x,
                    y: 1.35,
                    z: e.z,
                    tx: s.px + (Math.random() - 0.5) * 0.6,
                    ty: playerEyeY - 0.25,
                    tz: s.pz + (Math.random() - 0.5) * 0.6,
                    life: 1.0,
                  });

                  const hitChance = Math.max(0.18, (0.72 - dist * 0.028) * (s.crouched ? 0.72 : 1));
                  if (Math.random() < hitChance) {
                    const dmg =
                      e.kind === "sniper" ? 15 : e.kind === "officer" ? 12 : e.kind === "heavy" ? 10 : 7;
                    s.hp -= dmg;
                    s.damageFlash = 1;
                    s.damageAngle = Math.atan2(e.x - s.px, -(e.z - s.pz)) - s.yaw;
                    if (s.hp <= 0) {
                      s.hp = 0;
                      phaseRef.current = "failed";
                      setPhase("failed");
                      document.exitPointerLock?.();
                      syncHud();
                    }
                  }
                }
              }
            }
          }

          hudTick += dt;
          if (hudTick > 0.08) {
            hudTick = 0;
            syncHud();
          }
        }

        // ================= 3D WEBGL WORLD RENDER PASS =================
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);

        // Clear sky background (with lightning flash if stormy)
        const lf = s.lightningFlash * 0.55;
        gl.clearColor(
          Math.min(1, env.skyHorizon[0] + lf),
          Math.min(1, env.skyHorizon[1] + lf),
          Math.min(1, env.skyHorizon[2] + lf * 1.1),
          1.0
        );
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(prog);

        // Compute Camera Matrices (Live orbit preview in Briefing, First-Person in Playing!)
        let eye;
        let target;
        let fovDeg = 68;

        if (phaseRef.current === "briefing") {
          const orbitA = now * 0.00022;
          const mid = s.mission.size * 0.5;
          eye = [mid + Math.cos(orbitA) * 18, 9.5, mid + Math.sin(orbitA) * 18];
          target = [mid, 1.8, mid];
        } else {
          const wp = ARMY_WEAPONS[s.weaponId];
          fovDeg = 68 + (wp.adsFov - 68) * s.adsLerp;
          const bobY = Math.sin(s.walkBob * 2) * 0.032 * (1 - s.adsLerp * 0.7);
          const shakeX = (Math.random() - 0.5) * s.shake * 0.012;
          const shakeY = (Math.random() - 0.5) * s.shake * 0.012;
          const eyeY = 1.65 - s.crouchLerp * 0.58 + bobY + shakeY;
          eye = [s.px + shakeX, eyeY, s.pz];
          const lx = Math.sin(s.yaw) * Math.cos(s.pitch);
          const ly = Math.sin(s.pitch);
          const lz = -Math.cos(s.yaw) * Math.cos(s.pitch);
          target = [eye[0] + lx, eye[1] + ly, eye[2] + lz];
        }

        const projMat = mat4Perspective((fovDeg * Math.PI) / 180, w / Math.max(1, h), 0.12, 130);
        const viewMat = mat4LookAt(eye, target, [0, 1, 0]);

        gl.uniformMatrix4fv(loc.uProj, false, projMat);
        gl.uniformMatrix4fv(loc.uView, false, viewMat);
        gl.uniform3fv(loc.uCamPos, eye);
        gl.uniform3fv(loc.uSunDir, env.sunDir);
        gl.uniform3fv(loc.uSunColor, [
          Math.min(1.4, env.sunColor[0] + lf),
          Math.min(1.4, env.sunColor[1] + lf),
          Math.min(1.5, env.sunColor[2] + lf * 1.15),
        ]);
        gl.uniform3fv(loc.uAmbient, [
          env.ambient[0] + lf * 0.4,
          env.ambient[1] + lf * 0.4,
          env.ambient[2] + lf * 0.45,
        ]);
        gl.uniform3fv(loc.uFogColor, env.fogColor);
        gl.uniform1f(loc.uFogDensity, env.fogDensity);
        gl.uniform1f(loc.uNvg, nvgRef.current ? 1.0 : 0.0);

        // Choose strongest dynamic point light (Explosion -> Muzzle Flash -> Nearest Indoor Building Lamp!)
        let ptPos = [0, -50, 0];
        let ptCol = [1, 0.8, 0.5];
        let ptInt = 0;

        if (s.explosions.length > 0) {
          const ex = s.explosions[0];
          ptPos = [ex.x, ex.y + 0.5, ex.z];
          ptCol = [1.0, 0.55, 0.15];
          ptInt = ex.life * 6.5;
        } else if (s.muzzleFlash > 0.15 && phaseRef.current === "playing") {
          ptPos = [eye[0] + Math.sin(s.yaw) * 0.8, eye[1], eye[2] - Math.cos(s.yaw) * 0.8];
          ptCol = [1.0, 0.78, 0.42];
          ptInt = s.muzzleFlash * 2.4;
        } else {
          // Nearest indoor building ceiling lamp or streetlamp illuminates nearby rooms!
          let nearLamp = null;
          let nearDist = 11;
          for (const lm of world.lamps) {
            const d = Math.hypot(lm.x - eye[0], lm.z - eye[2]);
            if (d < nearDist) {
              nearDist = d;
              nearLamp = lm;
            }
          }
          if (nearLamp) {
            ptPos = [nearLamp.x, nearLamp.y, nearLamp.z];
            ptCol = nearLamp.color;
            ptInt = 1.65;
          }
        }
        gl.uniform3fv(loc.uPointPos, ptPos);
        gl.uniform3fv(loc.uPointColor, ptCol);
        gl.uniform1f(loc.uPointIntensity, ptInt);

        // 1. Static Textured World Meshes (Ground, Buildings, Roofs, Indoor Floors, Vehicles, Cover!)
        for (const sm of world.staticMeshes) {
          drawMesh(sm.mesh, null, textures[sm.texName], [1, 1, 1], 0, 1);
        }
        drawMesh(world.solidMesh, null, null, [1, 1, 1], 0, 1);
        drawMesh(world.emissiveMesh, null, null, [1, 1, 1], 1.0, 1);

        // 2. Animated Hinged Building Doors
        for (const d of world.doors) {
          const ang = d.baseAngle + d.openAmount * 1.52;
          const dx = d.hingeX + Math.cos(ang) * (d.w * 0.5);
          const dz = d.hingeZ - Math.sin(ang) * (d.w * 0.5);
          drawMesh(unitBox, mat4Transform(dx, d.h * 0.5, dz, ang, d.w, d.h, 0.12), textures.door, [1, 1, 1], 0, 1);
        }

        // 3. Intact Explosive Red Fuel Barrels
        for (const b of world.barrels) {
          if (!b.intact) continue;
          drawMesh(unitBox, mat4Transform(b.x, 0.62, b.z, 0, 0.72, 1.24, 0.72), textures.barrel, [1, 1, 1], 0, 1);
        }

        // 4. Medkits & Military Ammo Crates (gently hovering/rotating)
        for (const pk of s.pickups) {
          if (pk.taken) continue;
          const hover = 0.34 + Math.sin(now * 0.004 + pk.x) * 0.06;
          if (pk.kind === "medkit") {
            drawMesh(unitBox, mat4Transform(pk.x, hover, pk.z, now * 0.0012, 0.56, 0.38, 0.38), null, [0.92, 0.94, 0.96], 0.15, 1);
            drawMesh(unitBox, mat4Transform(pk.x, hover + 0.01, pk.z, now * 0.0012, 0.28, 0.40, 0.12), null, [0.9, 0.14, 0.18], 0.5, 1);
          } else {
            drawMesh(unitBox, mat4Transform(pk.x, hover, pk.z, now * 0.001, 0.62, 0.42, 0.42), textures.crate, [1, 1, 1], 0.1, 1);
          }
        }

        // 5. Glowing 3D Objective & Extraction Beacon Columns
        const allDone = s.objectives.every((o) => o.completed);
        if (!allDone) {
          for (const o of s.objectives) {
            if (o.completed || o.type !== "interact") continue;
            const pulse = 0.28 + Math.sin(now * 0.006) * 0.08;
            drawMesh(unitBox, mat4Transform(o.x, 1.15, o.z, now * 0.002, 0.42, 2.2, 0.42), null, [0.05, 0.85, 1.0], 1.0, pulse);
          }
        } else {
          const pulse = 0.32 + Math.sin(now * 0.007) * 0.1;
          drawMesh(
            unitBox,
            mat4Transform(s.extraction.x, 3.0, s.extraction.z, now * 0.0015, 1.2, 6.0, 1.2),
            null,
            [0.2, 0.95, 0.55],
            1.0,
            pulse
          );
        }

        // 6. Articulated True-3D Army Soldiers!
        for (const e of s.enemies) {
          drawSoldier3D(renderer, e, env.uniform);
        }

        // 7. Active 3D Flying Grenades, Bullet Impacts, Tracers & Fireball Explosions!
        for (const g of s.activeGrenades) {
          drawMesh(unitBox, mat4Transform(g.x, g.y, g.z, now * 0.01, 0.22, 0.26, 0.22), null, [0.22, 0.35, 0.2], 0.2, 1);
          if (Math.floor(now / 120) % 2 === 0) {
            drawMesh(unitBox, mat4Transform(g.x, g.y + 0.16, g.z, 0, 0.1, 0.1, 0.1), null, [1.0, 0.15, 0.15], 1.0, 1);
          }
        }
        for (const imp of s.impacts) {
          drawMesh(unitBox, mat4Transform(imp.x, imp.y, imp.z, now * 0.01, 0.16, 0.16, 0.16), null, imp.color, 1.0, imp.life * 2.5);
        }
        for (const tr of s.tracers) {
          const t = 1 - tr.life;
          const bx = tr.x + (tr.tx - tr.x) * t;
          const by = tr.y + (tr.ty - tr.y) * t;
          const bz = tr.z + (tr.tz - tr.z) * t;
          drawMesh(unitBox, mat4Transform(bx, by, bz, 0, 0.08, 0.08, 0.6), null, [1.0, 0.88, 0.38], 1.0, tr.life);
        }
        for (const ex of s.explosions) {
          const progE = 1 - ex.life;
          const rad = 0.8 + progE * ex.maxRadius * 1.4;
          drawMesh(unitBox, mat4Transform(ex.x, ex.y + progE * 1.1, ex.z, progE * 3, rad, rad, rad), null, [1.0, 0.52, 0.1], 1.0, ex.life * 0.85);
          drawMesh(unitBox, mat4Transform(ex.x, ex.y + progE * 0.8, ex.z, -progE * 2, rad * 0.65, rad * 0.65, rad * 0.65), null, [1.0, 0.94, 0.6], 1.0, ex.life);
        }

        // ================= 2D TACTICAL HUD, COMPASS, WEAPON & WEATHER OVERLAY =================
        if (hudCtx) {
          hudCtx.clearRect(0, 0, w, h);

          // Weather Visor Particles (paused cleanly when player steps INSIDE a roofed building!)
          const indoors = phaseRef.current === "playing" && Boolean(findBuildingAt(s.mission.buildings, s.px, s.pz));
          if (!indoors) {
            if (env.weather === "rain" || env.weather === "storm") {
              hudCtx.strokeStyle = "rgba(186, 230, 253, 0.3)";
              hudCtx.lineWidth = 1.2;
              hudCtx.beginPath();
              for (const wd of s.weatherDrops) {
                const rx = wd.x * w;
                const ry = wd.y * h;
                hudCtx.moveTo(rx, ry);
                hudCtx.lineTo(rx - 5, ry + 20);
              }
              hudCtx.stroke();
            } else if (env.weather === "snow") {
              hudCtx.fillStyle = "rgba(241, 245, 249, 0.78)";
              for (const wd of s.weatherDrops) {
                hudCtx.beginPath();
                hudCtx.arc(wd.x * w, wd.y * h, wd.size, 0, Math.PI * 2);
                hudCtx.fill();
              }
            } else if (env.weather === "dust") {
              hudCtx.fillStyle = "rgba(245, 195, 120, 0.25)";
              for (const wd of s.weatherDrops) {
                hudCtx.beginPath();
                hudCtx.arc(wd.x * w, wd.y * h, wd.size * 1.3, 0, Math.PI * 2);
                hudCtx.fill();
              }
            } else if (env.weather === "embers") {
              hudCtx.fillStyle = "rgba(255, 138, 31, 0.65)";
              for (const wd of s.weatherDrops) {
                hudCtx.beginPath();
                hudCtx.arc(wd.x * w, (1 - wd.y) * h, wd.size * 0.95, 0, Math.PI * 2);
                hudCtx.fill();
              }
            }
          }

          if (phaseRef.current === "playing") {
            // 1. Projected 3D Objective / Extraction / Boss Waypoint Diamonds
            const markers = [];
            if (!allDone) {
              for (const o of s.objectives) {
                if (o.completed) continue;
                let ox = o.x;
                let oz = o.z;
                if (o.type === "eliminate" && o.targetId) {
                  const t = s.enemies.find((en) => en.id === o.targetId);
                  if (t && t.alive) {
                    ox = t.x;
                    oz = t.z;
                  }
                }
                markers.push({ x: ox, y: 2.1, z: oz, color: o.color || "#00D4FF", label: `${Math.round(Math.hypot(ox - s.px, oz - s.pz))}m` });
              }
            } else {
              markers.push({
                x: s.extraction.x,
                y: 2.4,
                z: s.extraction.z,
                color: "#34D399",
                label: `EXFIL ${Math.round(Math.hypot(s.extraction.x - s.px, s.extraction.z - s.pz))}m`,
              });
            }

            for (const mk of markers) {
              const p2 = projectToScreen(mk.x, mk.y, mk.z, viewMat, projMat, w, h);
              if (p2 && p2.visible) {
                hudCtx.save();
                hudCtx.translate(p2.x, p2.y);
                hudCtx.strokeStyle = mk.color;
                hudCtx.fillStyle = "rgba(6, 10, 18, 0.72)";
                hudCtx.lineWidth = 2;
                hudCtx.beginPath();
                hudCtx.moveTo(0, -10);
                hudCtx.lineTo(10, 0);
                hudCtx.lineTo(0, 10);
                hudCtx.lineTo(-10, 0);
                hudCtx.closePath();
                hudCtx.fill();
                hudCtx.stroke();
                hudCtx.fillStyle = mk.color;
                hudCtx.font = "700 10px 'JetBrains Mono', monospace";
                hudCtx.textAlign = "center";
                hudCtx.fillText(mk.label, 0, -15);
                hudCtx.restore();
              }
            }

            // 2. Call-of-Duty Top Tactical Compass Strip
            const compW = Math.min(340, w * 0.42);
            const compX = (w - compW) * 0.5;
            const compY = 14;
            hudCtx.save();
            hudCtx.fillStyle = "rgba(6, 10, 18, 0.68)";
            rrect(hudCtx, compX, compY, compW, 24, 12);
            hudCtx.fill();
            hudCtx.strokeStyle = "rgba(255,255,255,0.14)";
            hudCtx.stroke();
            hudCtx.beginPath();
            hudCtx.rect(compX + 8, compY, compW - 16, 24);
            hudCtx.clip();

            const dirs = [
              { a: 0, t: "N" },
              { a: Math.PI * 0.25, t: "NE" },
              { a: Math.PI * 0.5, t: "E" },
              { a: Math.PI * 0.75, t: "SE" },
              { a: Math.PI, t: "S" },
              { a: -Math.PI * 0.75, t: "SW" },
              { a: -Math.PI * 0.5, t: "W" },
              { a: -Math.PI * 0.25, t: "NW" },
            ];
            hudCtx.font = "700 10px 'JetBrains Mono', monospace";
            hudCtx.textAlign = "center";
            for (const d of dirs) {
              let diff = d.a - s.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const px = w * 0.5 + (diff / (Math.PI * 0.55)) * (compW * 0.5);
              hudCtx.fillStyle = d.t === "N" ? "#FF8A1F" : "rgba(226,232,240,0.85)";
              hudCtx.fillText(d.t, px, compY + 15);
            }
            hudCtx.restore();

            // 3. Sniper Scope OR Dynamic First-Person Weapon + Crosshair
            const wp = ARMY_WEAPONS[s.weaponId];
            if (wp.isSniper && s.adsLerp > 0.65) {
              const rad = Math.min(w, h) * 0.43;
              hudCtx.save();
              hudCtx.fillStyle = "rgba(3, 5, 10, 0.95)";
              hudCtx.beginPath();
              hudCtx.rect(0, 0, w, h);
              hudCtx.arc(w / 2, h / 2, rad, 0, Math.PI * 2, true);
              hudCtx.fill();
              hudCtx.strokeStyle = "#334155";
              hudCtx.lineWidth = 5;
              hudCtx.beginPath();
              hudCtx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
              hudCtx.stroke();

              hudCtx.strokeStyle = "rgba(0, 212, 255, 0.9)";
              hudCtx.lineWidth = 1.2;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - rad, h / 2);
              hudCtx.lineTo(w / 2 + rad, h / 2);
              hudCtx.moveTo(w / 2, h / 2 - rad);
              hudCtx.lineTo(w / 2, h / 2 + rad);
              hudCtx.stroke();
              for (let m = -4; m <= 4; m++) {
                if (m === 0) continue;
                hudCtx.fillStyle = "#FF2E63";
                hudCtx.fillRect(w / 2 + m * 24 - 1, h / 2 - 4, 2, 8);
                hudCtx.fillRect(w / 2 - 4, h / 2 + m * 24 - 1, 8, 2);
              }
              hudCtx.restore();
            } else {
              // Crosshair + Hitmarker
              hudCtx.save();
              const gap = (s.ads ? 4 : s.crouched ? 6 : 9) + s.recoil * 10;
              hudCtx.strokeStyle =
                s.headshotFlash > 0 ? "#FACC15" : s.hitMarker > 0 ? "#FF2E63" : nvgRef.current ? "#4ADE80" : "#FFFFFF";
              hudCtx.lineWidth = 1.8;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - gap - 9, h / 2);
              hudCtx.lineTo(w / 2 - gap, h / 2);
              hudCtx.moveTo(w / 2 + gap, h / 2);
              hudCtx.lineTo(w / 2 + gap + 9, h / 2);
              hudCtx.moveTo(w / 2, h / 2 - gap - 9);
              hudCtx.lineTo(w / 2, h / 2 - gap);
              hudCtx.moveTo(w / 2, h / 2 + gap);
              hudCtx.lineTo(w / 2, h / 2 + gap + 9);
              hudCtx.stroke();

              if (s.hitMarker > 0.15) {
                hudCtx.strokeStyle = s.headshotFlash > 0 ? "#FACC15" : "#FF2E63";
                hudCtx.lineWidth = 2.2;
                hudCtx.beginPath();
                hudCtx.moveTo(w / 2 - 10, h / 2 - 10);
                hudCtx.lineTo(w / 2 - 4, h / 2 - 4);
                hudCtx.moveTo(w / 2 + 10, h / 2 - 10);
                hudCtx.lineTo(w / 2 + 4, h / 2 - 4);
                hudCtx.moveTo(w / 2 - 10, h / 2 + 10);
                hudCtx.lineTo(w / 2 - 4, h / 2 + 4);
                hudCtx.moveTo(w / 2 + 10, h / 2 + 10);
                hudCtx.lineTo(w / 2 + 4, h / 2 + 4);
                hudCtx.stroke();
              }
              if (s.headshotFlash > 0.2) {
                hudCtx.fillStyle = "#FACC15";
                hudCtx.font = "800 12px 'JetBrains Mono', monospace";
                hudCtx.textAlign = "center";
                hudCtx.fillText("HEADSHOT!", w / 2, h / 2 - 28);
              }
              hudCtx.restore();

              // Sculpted First-Person Army Weapon (glides smoothly to center when Right-Click ADS!)
              const bobX = Math.cos(s.walkBob) * 7 * (1 - s.adsLerp * 0.75);
              const bobY =
                Math.abs(Math.sin(s.walkBob)) * 7 * (1 - s.adsLerp * 0.75) +
                s.recoil * 22 +
                (s.reloading > 0 ? Math.sin(s.reloading * 5) * 16 + 60 : 0);
              const gx = w * (0.68 - s.adsLerp * 0.18) + bobX;
              const gy = h - (108 + s.adsLerp * 34) + bobY;

              hudCtx.save();
              // Gloved soldier forearm & grip
              hudCtx.fillStyle = "#181C24";
              rrect(hudCtx, gx - 34, gy + 28, 68, 96, 14);
              hudCtx.fill();

              // Weapon receiver body
              const rg = hudCtx.createLinearGradient(gx - 28, gy - 20, gx + 28, gy + 45);
              rg.addColorStop(0, "#3D4657");
              rg.addColorStop(0.5, "#1E2430");
              rg.addColorStop(1, "#0E121A");
              hudCtx.fillStyle = rg;
              rrect(hudCtx, gx - 26, gy - 14, 52, 74, 6);
              hudCtx.fill();

              // Barrel / Suppressor / Quad Rail
              if (wp.id === 1) {
                // MP5SD Integrated Suppressor
                hudCtx.fillStyle = "#151922";
                rrect(hudCtx, gx - 12, gy - 95, 24, 86, 6);
                hudCtx.fill();
              } else if (wp.id === 3) {
                // M870 Pump-Action Shotgun
                hudCtx.fillStyle = "#11161F";
                hudCtx.fillRect(gx - 11, gy - 108, 22, 96);
                hudCtx.fillStyle = "#3E2C22"; // Ribbed forend pump grip
                rrect(hudCtx, gx - 16, gy - 68, 32, 42, 4);
                hudCtx.fill();
              } else {
                // M4A1 / M24 barrel & rail
                hudCtx.fillStyle = "#171C26";
                hudCtx.fillRect(gx - 14, gy - (wp.id === 2 ? 122 : 96), 28, wp.id === 2 ? 112 : 84);
                hudCtx.fillStyle = "#475569";
                for (let ry = gy - 82; ry < gy - 18; ry += 9) {
                  hudCtx.fillRect(gx - 12, ry, 24, 2);
                }
              }

              // Holographic Red-Dot Optic on M4A1 & MP5SD
              if (wp.id === 0 || wp.id === 1) {
                hudCtx.fillStyle = "#0F141D";
                hudCtx.strokeStyle = "#64748B";
                hudCtx.lineWidth = 2;
                rrect(hudCtx, gx - 19, gy - 34, 38, 24, 4);
                hudCtx.fill();
                hudCtx.stroke();
                hudCtx.fillStyle = "rgba(0, 212, 255, 0.14)";
                hudCtx.fillRect(gx - 14, gy - 30, 28, 16);
                hudCtx.fillStyle = "#FF2E63";
                hudCtx.beginPath();
                hudCtx.arc(gx, gy - 22, 2.3, 0, Math.PI * 2);
                hudCtx.fill();
              }

              // Muzzle Blast Glow
              if (s.muzzleFlash > 0.18) {
                const ty = gy - (wp.id === 2 ? 128 : wp.id === 3 ? 112 : 100);
                const fr = (wp.id === 1 ? 18 : wp.id === 3 ? 48 : 34) * s.muzzleFlash;
                const mg = hudCtx.createRadialGradient(gx, ty, 2, gx, ty, fr);
                mg.addColorStop(0, "#FFFFFF");
                mg.addColorStop(0.35, wp.id === 1 ? "rgba(125,211,252,0.75)" : "rgba(254,240,138,0.95)");
                mg.addColorStop(1, "rgba(249,115,22,0)");
                hudCtx.fillStyle = mg;
                hudCtx.beginPath();
                hudCtx.arc(gx, ty, fr, 0, Math.PI * 2);
                hudCtx.fill();
              }
              hudCtx.restore();
            }

            // 4. Tactical Minimap (Top-Left showing Enterable Buildings, Doors, Hostiles & Objectives!)
            const mapPx = 136;
            const mx = 14;
            const my = 14;
            const scale = mapPx / s.mission.size;

            hudCtx.save();
            hudCtx.fillStyle = "rgba(6, 12, 20, 0.84)";
            hudCtx.strokeStyle = "rgba(0, 212, 255, 0.5)";
            hudCtx.lineWidth = 1.5;
            rrect(hudCtx, mx, my, mapPx, mapPx, 10);
            hudCtx.fill();
            hudCtx.stroke();

            // Draw enterable building footprints
            for (const b of s.mission.buildings) {
              const inside = findBuildingAt([b], s.px, s.pz);
              hudCtx.fillStyle = inside ? "rgba(0, 212, 255, 0.28)" : "rgba(148, 163, 184, 0.25)";
              hudCtx.strokeStyle = inside ? "#00D4FF" : "rgba(148, 163, 184, 0.65)";
              hudCtx.lineWidth = 1.2;
              hudCtx.fillRect(mx + b.x * scale, my + b.z * scale, b.w * scale, b.d * scale);
              hudCtx.strokeRect(mx + b.x * scale, my + b.z * scale, b.w * scale, b.d * scale);
            }

            // Objective / Extraction blips
            if (!allDone) {
              for (const o of s.objectives) {
                if (o.completed) continue;
                hudCtx.fillStyle = o.color || "#00D4FF";
                hudCtx.beginPath();
                hudCtx.arc(mx + o.x * scale, my + o.z * scale, 4, 0, Math.PI * 2);
                hudCtx.fill();
              }
            } else {
              hudCtx.fillStyle = "#34D399";
              hudCtx.beginPath();
              hudCtx.arc(mx + s.extraction.x * scale, my + s.extraction.z * scale, 4.6, 0, Math.PI * 2);
              hudCtx.fill();
            }

            // Hostile soldier blips
            for (const e of s.enemies) {
              if (!e.alive) continue;
              hudCtx.fillStyle = e.kind === "officer" ? "#F012A8" : "#EF4444";
              hudCtx.beginPath();
              hudCtx.arc(mx + e.x * scale, my + e.z * scale, e.kind === "officer" ? 3.5 : 2.5, 0, Math.PI * 2);
              hudCtx.fill();
            }

            // Player dot + view cone
            const pxM = mx + s.px * scale;
            const pzM = my + s.pz * scale;
            const viewAng = s.yaw - Math.PI * 0.5;
            hudCtx.fillStyle = "rgba(52, 211, 153, 0.28)";
            hudCtx.beginPath();
            hudCtx.moveTo(pxM, pzM);
            hudCtx.arc(pxM, pzM, 20, viewAng - 0.5, viewAng + 0.5);
            hudCtx.closePath();
            hudCtx.fill();
            hudCtx.fillStyle = "#FFFFFF";
            hudCtx.beginPath();
            hudCtx.arc(pxM, pzM, 3, 0, Math.PI * 2);
            hudCtx.fill();
            hudCtx.restore();

            // 5. NVG Scanline Overlay + Combat Damage Vignette
            if (nvgRef.current) {
              hudCtx.fillStyle = "rgba(0, 28, 12, 0.2)";
              for (let sy = 0; sy < h; sy += 4) hudCtx.fillRect(0, sy, w, 1.5);
            }
            if (s.damageFlash > 0) {
              hudCtx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.42, s.damageFlash * 0.36)})`;
              hudCtx.fillRect(0, 0, w, h);
            }
          }
        }
      } catch (err) {
        console.error("[VanguardArmy3D error]", err);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      worldRef.current?.dispose();
    };
  }, [syncHud]);

  const activeWeapon = ARMY_WEAPONS[hud.weaponId];
  const nextMission = VANGUARD_MISSIONS[selectedIdx + 1] || null;

  return (
    <div
      ref={containerRef}
      className="neon-corridor-frame relative overflow-hidden rounded-[28px] border border-white/15 bg-[#06040D] shadow-2xl"
    >
      {/* Top Tactical HUD Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0617]/95 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <div className="w-24">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-ink-muted">ARMOR</span>
                <span className={hud.hp < 35 ? "text-rose-400" : "text-emerald-300"}>
                  {hud.hp}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all ${hud.hp < 35 ? "bg-rose-500" : "bg-emerald-400"}`}
                  style={{ width: `${hud.hp}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4-Weapon Loadout Selector */}
          <div className="flex flex-wrap items-center gap-1">
            {ARMY_WEAPONS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => {
                  simRef.current.weaponId = wp.id;
                  simRef.current.reloading = 0;
                  simRef.current.ads = false;
                  syncHud();
                }}
                className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-bold transition ${
                  hud.weaponId === wp.id
                    ? "border-[#FF8A1F] bg-[#FF8A1F]/20 text-white"
                    : "border-white/10 bg-white/5 text-ink-muted hover:text-white"
                }`}
              >
                [{wp.key}] {wp.short}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span>
              <span className="text-ink-muted">AMMO </span>
              <strong className="text-white">
                {hud.reloading ? "RELOAD..." : `${hud.ammo}/${hud.reserve}`}
              </strong>
            </span>
            <button
              type="button"
              onClick={throwGrenade}
              title="Throw Frag Grenade (Press G)"
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25"
            >
              <Bomb className="h-3 w-3" />
              <span>[G] {hud.grenades}</span>
            </button>
          </div>
        </div>

        {/* Campaign / NVG / Audio / Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectMission(selectedIdx)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FFC247]/45 bg-[#FFC247]/15 px-3 py-1 font-mono text-[10px] font-bold uppercase text-[#FFC247] hover:bg-[#FFC247]/25"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>
              Ops ({campaign.unlockedCount}/{VANGUARD_MISSIONS.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setNvg((prev) => {
                nvgRef.current = !prev;
                return !prev;
              })
            }
            title="Night Vision Goggles (Press N)"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold transition ${
              nvg
                ? "border-emerald-400 bg-emerald-500/30 text-emerald-200"
                : "border-white/15 bg-white/5 text-ink-muted hover:text-white"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>NVG</span>
          </button>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* True 3D WebGL Viewport + Layered 2D Tactical HUD */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-64px)]" : "h-[70vh] min-h-[520px] max-h-[720px]"
        }`}
      >
        <canvas
          ref={glCanvasRef}
          onMouseDown={(e) => {
            if (phaseRef.current !== "playing") return;
            if (document.pointerLockElement !== glCanvasRef.current) {
              try {
                glCanvasRef.current?.requestPointerLock?.();
              } catch {
                // fallback drag-look
              }
              simRef.current.dragging = true;
              simRef.current.lastDragX = e.clientX;
              simRef.current.lastDragY = e.clientY;
            }
            if (e.button === 2) {
              simRef.current.ads = !simRef.current.ads;
              syncHud();
              return;
            }
            simRef.current.mouseDown = true;
          }}
          onMouseUp={() => {
            simRef.current.mouseDown = false;
            simRef.current.dragging = false;
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="block h-full w-full cursor-crosshair"
        />
        <canvas
          ref={hudCanvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {webglError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#06040D]/95 p-6 text-center text-sm text-rose-300">
            WebGL 3D context could not be initialized in this browser.
          </div>
        )}

        {/* Top-Right Live Objectives, Building Room Indicator & Kill Feed */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute right-3.5 top-3.5 z-10 flex w-64 flex-col gap-2">
            <div className="rounded-2xl border border-white/12 bg-black/70 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-mono text-[10px] font-bold uppercase text-[#FFC247]">
                <span>
                  {selectedMission.code}: {selectedMission.title}
                </span>
                {hud.crouched && (
                  <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] text-emerald-300">
                    CROUCH
                  </span>
                )}
              </div>

              {hud.insideBuilding && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#00D4FF]/20 px-2 py-0.5 font-mono text-[9px] font-bold text-[#7EE8FF]">
                  <MapPin className="h-2.5 w-2.5" />
                  INSIDE: {hud.insideBuilding}
                </div>
              )}

              <ul className="mt-2 space-y-1.5 font-mono text-[10px]">
                {hud.objectives.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center justify-between gap-2 ${
                      o.completed ? "text-emerald-300 line-through opacity-75" : "text-white"
                    }`}
                  >
                    <span className="truncate">
                      {o.completed ? "✓" : "▸"} {o.label}
                    </span>
                    {!o.completed && <span className="shrink-0 text-[#00D4FF]">{o.dist}m</span>}
                  </li>
                ))}
                <li
                  className={`flex items-center justify-between gap-2 ${
                    hud.allObjectivesDone ? "font-bold text-emerald-300" : "text-ink-muted"
                  }`}
                >
                  <span>
                    {hud.allObjectivesDone ? "★" : "○"} Extract: {selectedMission.extraction.label}
                  </span>
                </li>
              </ul>
            </div>

            {hud.killFeed.length > 0 && (
              <div className="space-y-1">
                {hud.killFeed.map((kf) => (
                  <div
                    key={kf.id}
                    className="rounded-lg border border-white/10 bg-black/72 px-2.5 py-1 font-mono text-[10px] font-bold backdrop-blur-sm"
                    style={{ color: kf.color }}
                  >
                    {kf.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom Comms & Action Prompt */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-2">
            <div className="rounded-xl border border-white/15 bg-black/75 px-3.5 py-2 font-mono text-[11px] text-[#7EE8FF] backdrop-blur-md">
              {hud.nearInteract ? (
                <div className="space-y-1">
                  <div className="font-bold text-[#FFC247]">
                    HOLD [E] — {hud.nearInteract.verb} ({hud.nearInteract.progress}%)
                  </div>
                  <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full bg-[#FF8A1F] transition-all"
                      style={{ width: `${hud.nearInteract.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                hud.alertText
              )}
            </div>

            {!pointerLocked && (
              <div className="rounded-xl border border-[#FFC247]/40 bg-black/75 px-3 py-1.5 font-mono text-[10px] text-[#FFC247] backdrop-blur-md">
                Click screen to lock 360° look • RMB Aim/Scope • [G] Frag Grenade • [C] Crouch • [N] NVG
              </div>
            )}
          </div>
        )}

        {/* Campaign Mission Selector & Sequential Unlock Dossier */}
        {phase === "briefing" && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#06040D]/86 via-[#06040D]/72 to-[#06040D]/90 p-4 backdrop-blur-[3px] sm:p-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF8A1F]/55 bg-[#FF8A1F]/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFC247]">
                    <Target className="h-3 w-3" />
                    True WebGL 3D Army Special Forces • Sequential Campaign
                  </span>
                  <h2 className="mt-1.5 font-display text-2xl font-extrabold text-white sm:text-4xl">
                    VANGUARD: <span className="text-neon-gradient">FRONTLINE OPS</span>
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                  Unlocked: {campaign.unlockedCount} / {VANGUARD_MISSIONS.length} Theaters
                </span>
              </div>

              {/* 5 Unique Global War Theaters (Sequential Unlock Lock System!) */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {VANGUARD_MISSIONS.map((m, idx) => {
                  const unlocked = idx < campaign.unlockedCount;
                  const active = idx === selectedIdx;
                  const rec = campaign.records[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => selectMission(idx)}
                      className={`relative rounded-2xl border p-3 text-left transition ${
                        !unlocked
                          ? "cursor-not-allowed border-white/10 bg-black/65 opacity-55"
                          : active
                          ? "border-[#FF8A1F] bg-[#FF8A1F]/18 shadow-glass-3d"
                          : "border-white/15 bg-black/55 hover:border-white/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                        <span className="font-bold text-[#FFC247]">{m.code}</span>
                        {!unlocked ? (
                          <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-ink-muted">
                            <Lock className="h-2.5 w-2.5" /> LOCKED
                          </span>
                        ) : rec?.cleared ? (
                          <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 font-bold text-emerald-300">
                            ✓ {rec.rank}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-[#00D4FF]/20 px-1.5 py-0.5 text-[9px] text-[#7EE8FF]">
                            <Unlock className="h-2.5 w-2.5" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-display text-sm font-bold text-white">
                        {m.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-secondary">{m.theater}</p>
                      <p className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] text-ink-muted">
                        <CloudRain className="h-2.5 w-2.5 text-[#00D4FF]" />
                        {!unlocked
                          ? `Complete ${VANGUARD_MISSIONS[idx - 1].code} to unlock`
                          : m.weatherLabel}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Active Theater Intelligence Panel */}
              <div className="mt-4 rounded-2xl border border-white/12 bg-black/68 p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#FFC247]">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-bold uppercase">
                      {selectedMission.code} • {selectedMission.theater}
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-[#7EE8FF]">
                      {selectedMission.weatherLabel}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-muted">
                    Enterable Buildings: {selectedMission.buildings.length} • Hostiles:{" "}
                    {selectedMission.enemies.length}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-ink-secondary sm:text-sm">
                  {selectedMission.briefing}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                    {selectedMission.objectives.map((o, i) => (
                      <span
                        key={o.id}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white"
                      >
                        OBJ 0{i + 1}: {o.label}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => deployMission(selectedIdx)}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(110deg, #FF8A1F 0%, #F012A8 52%, #0099FF 100%)",
                    }}
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Deploy {selectedMission.code}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center justify-center gap-3 font-mono text-[10px] text-ink-muted">
              <span>[WASD] Move</span>
              <span>•</span>
              <span>[Mouse] Full 3D Look + Shoot</span>
              <span>•</span>
              <span>[Right-Click] Iron-Sight / Sniper Scope</span>
              <span>•</span>
              <span>[1–4] M4A1 / MP5SD / M24 / M870</span>
              <span>•</span>
              <span>[G] Frag Grenade</span>
              <span>•</span>
              <span>[C] Crouch</span>
              <span>•</span>
              <span>[E] Interact / Breach Doors</span>
            </div>
          </div>
        )}

        {/* Mission Accomplished / KIA Overlay */}
        {(phase === "victory" || phase === "failed") && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#06040D]/88 p-5 text-center backdrop-blur-md">
            <span
              className={`mb-2 inline-flex items-center gap-2 rounded-full border px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest ${
                phase === "victory"
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                  : "border-rose-500/60 bg-rose-500/20 text-rose-300"
              }`}
            >
              {phase === "victory" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> {selectedMission.code} COMPLETED • RANK {hud.rank}
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" /> OPERATOR DOWN • {selectedMission.code}
                </>
              )}
            </span>

            <h3 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              {phase === "victory"
                ? `${selectedMission.title.toUpperCase()} SECURED`
                : "OPERATION FAILED"}
            </h3>

            {phase === "victory" && justUnlockedTitle && (
              <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-[#FFC247]/60 bg-[#FFC247]/20 px-4 py-1 font-mono text-xs font-bold text-[#FFC247]">
                <Unlock className="h-3.5 w-3.5" />
                NEW MISSION UNLOCKED: {justUnlockedTitle}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">HOSTILES KIA</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FF3CC7]">
                  {hud.kills} / {hud.totalHostiles}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">HEADSHOTS</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FFC247]">
                  {hud.headshots}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">TIME</p>
                <p className="mt-1 font-display text-lg font-bold text-[#00D4FF]">
                  {hud.elapsed}s
                </p>
              </div>
            </div>

            {phase === "victory" && (
              <LeaderboardSubmitCard
                key={`vanguard-${selectedMission.id}-${hud.elapsed}`}
                gameId="vanguard"
                score={
                  (selectedIdx + 1) * 1500 +
                  hud.kills * 180 +
                  hud.headshots * 140 +
                  hud.hp * 15 +
                  Math.max(0, 600 - hud.elapsed * 3)
                }
                badge={`${selectedMission.code} • RANK ${hud.rank}`}
                meta={`${hud.kills} KIA • ${hud.headshots} HS • ${hud.elapsed}s`}
                highlightLabel="Mission Complete! Add Your Name"
                isNewRecord
              />
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {phase === "victory" && nextMission && (
                <button
                  type="button"
                  onClick={() => deployMission(selectedIdx + 1)}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-heading text-sm font-bold text-white shadow-neon-magenta transition hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(110deg, #FF8A1F 0%, #F012A8 52%, #0099FF 100%)",
                  }}
                >
                  <span>Deploy Next ({nextMission.code}: {nextMission.title})</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => deployMission(selectedIdx)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Replay {selectedMission.code}</span>
              </button>

              <button
                type="button"
                onClick={() => selectMission(selectedIdx)}
                className="inline-flex items-center gap-2 rounded-full border border-[#FFC247]/45 bg-[#FFC247]/15 px-6 py-3 text-sm font-bold text-[#FFC247] hover:bg-[#FFC247]/25"
              >
                <ListChecks className="h-4 w-4" />
                <span>Campaign Ops</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#080514] px-5 py-2.5 font-mono text-[11px] text-ink-muted">
        <span>
          Loadout: <strong className="text-white">{activeWeapon.name}</strong> • Walk through doors to breach buildings & shoot red fuel barrels!
        </span>
        <span>[1–4] Weapons • [RMB] ADS/Scope • [G] Frag • [C] Crouch • [N] NVG • [E] Action</span>
      </div>
    </div>
  );
}
