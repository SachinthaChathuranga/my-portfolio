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
import * as THREE from "three";
import { VANGUARD_MISSIONS } from "./vanguardMissions";
import { getExpandedMission } from "./vanguard/missionExpand";
import { buildWorld } from "./vanguard/world";
import { SoldierFactory } from "./vanguard/soldiers";
import { ViewModel } from "./vanguard/viewmodel";
import { FX } from "./vanguard/fx";
import { loadSoldierModel, setMaxAnisotropy } from "./vanguard/assets";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const CAMPAIGN_STORAGE_KEY = "smsc_vanguard_army_campaign_v1";

// Large-scale theaters (≈130 m) with ordered TASK 1 → 2 → 3 objectives
const VANGUARD_OPS = VANGUARD_MISSIONS.map(getExpandedMission);

function loadCampaign() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return { unlockedCount: 1, records: {} };
    const parsed = JSON.parse(raw);
    return {
      unlockedCount: Math.max(1, Math.min(VANGUARD_OPS.length, Number(parsed.unlockedCount || 1))),
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

  // Low-frequency body ("thump") that makes gunshots & blasts feel heavy
  const thump = (freq, dur, vol) => {
    try {
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.35), now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g).connect(c.destination);
      o.start(now);
      o.stop(now + dur + 0.02);
    } catch {
      // ignore
    }
  };
  const tone = (f, dur, vol, type = "sine", delay = 0) => {
    try {
      const c = ensure();
      if (!c) return;
      const now = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g).connect(c.destination);
      o.start(now);
      o.stop(now + dur + 0.02);
    } catch {
      // ignore
    }
  };

  return {
    shoot(wId, muted) {
      if (muted) return;
      if (wId === 0) {
        burst(0.12, 1700, 220, 0.24);
        thump(140, 0.14, 0.32);
        setTimeout(() => burst(0.35, 700, 120, 0.05, "lowpass"), 60); // outdoor echo tail
      } else if (wId === 1) {
        burst(0.075, 2400, 720, 0.12); // Suppressed MP5SD
        thump(220, 0.05, 0.08);
      } else if (wId === 2) {
        burst(0.32, 1200, 75, 0.36, "lowpass"); // M24 Sniper crack
        thump(90, 0.3, 0.45);
        setTimeout(() => burst(0.7, 500, 60, 0.08, "lowpass"), 110);
      } else {
        burst(0.24, 1100, 95, 0.34, "lowpass"); // M870 Shotgun blast
        thump(80, 0.25, 0.5);
        setTimeout(() => tone(320, 0.05, 0.05, "square"), 260); // pump rack
        setTimeout(() => tone(240, 0.06, 0.05, "square"), 360);
      }
    },
    enemyShot(muted, dist = 10) {
      if (muted) return;
      const att = Math.max(0.12, 1 - dist / 60);
      burst(0.11, 1250 * (0.6 + att * 0.4), 220, 0.14 * att);
      thump(120, 0.1, 0.12 * att);
    },
    whiz(muted) {
      if (muted) return;
      burst(0.09, 3800, 1600, 0.05, "highpass");
    },
    hurt(muted) {
      if (muted) return;
      thump(70, 0.18, 0.25);
    },
    step(muted, ground, sprint) {
      if (muted) return;
      const f = ground === "snowGround" ? 900 : ground === "desertSand" ? 1300 : ground === "asphalt" ? 2200 : 1600;
      burst(0.06, f, f * 0.4, sprint ? 0.05 : 0.032, "bandpass");
    },
    radio(muted) {
      if (muted) return;
      tone(1240, 0.07, 0.05, "square");
      tone(1640, 0.08, 0.05, "square", 0.09);
      setTimeout(() => burst(0.25, 3000, 2000, 0.025, "bandpass"), 200);
    },
    thunder(muted) {
      if (muted) return;
      burst(2.2, 220, 30, 0.38, "lowpass");
      thump(45, 1.6, 0.3);
    },
    dryFire(muted) {
      if (muted) return;
      tone(2400, 0.03, 0.06, "square");
    },
    explosion(muted) {
      if (muted) return;
      burst(0.75, 420, 42, 0.45, "lowpass");
      thump(60, 0.9, 0.6);
      setTimeout(() => burst(1.4, 260, 40, 0.12, "lowpass"), 180);
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
function collidesWalk(colliders, x, z, radius = 0.42, footY = 0) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (!c.blocksWalk) continue;
    // Allow jumping cleanly over low sandbags, crates & Jersey barriers when airborne!
    if (footY > 0.12 && c.maxBulletY <= footY + 0.18) continue;
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
    playerY: 0,
    playerVy: 0,
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
    stance: "stand", // "stand" | "crouch" | "prone"
    eyeHeight: 1.68,
    landDip: 0,
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
    alertText: `DEPLOYED TO ${mission.theater.toUpperCase()} — ${mission.objectives[0]?.taskLabel || "TASK 1"}: ${(mission.objectives[0]?.label || "").toUpperCase()}`,
    taskIndex: 0,
    taskBanner: null,
    moving: false,
    sprinting: false,
    cycle: 0,
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
    objectives: mission.objectives.map((o) => ({ ...o, completed: false, progress: 0, targetDown: false })),
    extraction: { ...mission.extraction },
  };
}

export default function VanguardArmy3D() {
  const containerRef = useRef(null);
  const glCanvasRef = useRef(null);
  const hudCanvasRef = useRef(null);
  const audioRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const worldRef = useRef(null);
  const fxRef = useRef(null);
  const soldiersRef = useRef(null);
  const soldierViewsRef = useRef(new Map());
  const viewModelRef = useRef(null);
  const soldierGltfRef = useRef(null);
  const [assetsReady, setAssetsReady] = useState(false);

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

  const selectedMission = VANGUARD_OPS[selectedIdx] || VANGUARD_OPS[0];

  const [hud, setHud] = useState(() => ({
    hp: 100,
    weaponId: 0,
    ammo: 30,
    reserve: 150,
    grenades: 3,
    reloading: false,
    ads: false,
    stance: "stand",
    insideBuilding: null,
    allObjectivesDone: false,
    objectives: selectedMission.objectives.map((o, i) => ({
      id: o.id,
      label: o.label,
      taskLabel: o.taskLabel,
      status: i === 0 ? "active" : "locked",
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
      ...createRuntimeState(VANGUARD_OPS[0]),
    };
  }

  const disposeWorld = useCallback(() => {
    soldiersRef.current?.dispose();
    soldiersRef.current = null;
    soldierViewsRef.current.clear();
    fxRef.current?.dispose();
    fxRef.current = null;
    viewModelRef.current?.dispose();
    viewModelRef.current = null;
    worldRef.current?.dispose();
    worldRef.current = null;
  }, []);

  const spawnSoldiers = useCallback((mission) => {
    const gltf = soldierGltfRef.current;
    const sc = sceneRef.current;
    if (!gltf || !sc) return;
    soldiersRef.current?.dispose();
    soldierViewsRef.current.clear();
    const fac = new SoldierFactory(gltf, mission.env.uniform);
    soldiersRef.current = fac;
    for (const e of simRef.current.enemies) {
      const view = fac.spawn(e);
      sc.scene.add(view.root);
      soldierViewsRef.current.set(e.id, view);
    }
  }, []);

  // Dev-only debug handle for automated visual checks
  if (import.meta.env.DEV && typeof window !== "undefined") window.__vanguard = simRef;

  const rebuildWorldForMission = useCallback(
    (mission) => {
      const renderer = rendererRef.current;
      const sc = sceneRef.current;
      if (!renderer || !sc) return;
      disposeWorld();
      const world = buildWorld(mission, renderer);
      sc.scene.add(world.root);
      sc.scene.environment = world.envMap;
      sc.scene.environmentIntensity = world.night ? 0.45 : 0.85;
      sc.scene.fog = new THREE.FogExp2(world.fogColor, mission.env.fogDensity);
      worldRef.current = world;
      fxRef.current = new FX(sc.scene, { night: world.night, weather: mission.env.weather });
      const vm = new ViewModel(mission.env.uniform);
      vm.setEnvironment(world.envMap);
      vm.setSize(simRef.current.width, simRef.current.height);
      viewModelRef.current = vm;
      if (soldierGltfRef.current) spawnSoldiers(mission);
    },
    [disposeWorld, spawnSoldiers]
  );

  // Rigged soldier model loads once, in the background
  useEffect(() => {
    let alive = true;
    loadSoldierModel()
      .then((gltf) => {
        if (!alive) return;
        soldierGltfRef.current = gltf;
        setAssetsReady(true);
        if (worldRef.current && !soldiersRef.current) spawnSoldiers(simRef.current.mission);
      })
      .catch((err) => {
        console.error("[Vanguard] soldier model failed to load", err);
        setAssetsReady(true);
      });
    return () => {
      alive = false;
    };
  }, [spawnSoldiers]);

  const syncHud = useCallback((finalRank = "A") => {
    const s = simRef.current;
    if (!s) return;
    const allObjectivesDone = s.taskIndex >= s.objectives.length;
    const bldg = findBuildingAt(s.mission.buildings, s.px, s.pz);

    let nearInteract = null;
    const objList = s.objectives.map((o, i) => {
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
      const status = o.completed ? "done" : i === s.taskIndex ? "active" : "locked";
      if (status === "active" && o.type === "interact" && dist < 2.8) {
        nearInteract = {
          verb: `${o.taskLabel}: ${o.actionVerb}`,
          progress: Math.round(o.progress * 100),
        };
      }
      return {
        id: o.id,
        label: o.label,
        taskLabel: o.taskLabel,
        status,
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
      stance: s.stance,
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
      const m = VANGUARD_OPS[idx] || VANGUARD_OPS[0];
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
      const m = VANGUARD_OPS[idx] || VANGUARD_OPS[0];
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
    const eyeY = s.eyeHeight + s.playerY;
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
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

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

      // [Space] -> Jump (or rise quickly from Prone / Crouch!)
      if (k === " " || c === "Space") {
        if (s.stance === "prone") {
          s.stance = "crouch";
          syncHud();
        } else if (s.stance === "crouch") {
          s.stance = "stand";
          syncHud();
        } else if (s.playerY <= 0.02) {
          s.playerVy = 6.6;
        }
        return;
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
        s.stance = s.stance === "crouch" ? "stand" : "crouch";
        syncHud();
      }
      if (k === "z" || c === "KeyZ" || k === "x" || c === "KeyX") {
        s.stance = s.stance === "prone" ? "stand" : "prone";
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

  // ================= MAIN 60FPS THREE.JS 3D + TACTICAL HUD ENGINE =================
  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    if (!glCanvas || !hudCanvas) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(true);
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 1400);
    camera.rotation.order = "YXZ";
    sceneRef.current = { scene, camera };

    rebuildWorldForMission(simRef.current.mission);

    const hudCtx = hudCanvas.getContext("2d");

    const resize = () => {
      const rect = glCanvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.floor(rect.width || glCanvas.parentElement?.clientWidth || 960));
      const cssH = Math.max(260, Math.floor(rect.height || glCanvas.parentElement?.clientHeight || 560));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(cssW, cssH, false);
      const pw = Math.floor(cssW * dpr);
      const ph = Math.floor(cssH * dpr);
      if (hudCanvas.width !== pw || hudCanvas.height !== ph) {
        hudCanvas.width = pw;
        hudCanvas.height = ph;
      }
      hudCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      camera.aspect = cssW / cssH;
      camera.updateProjectionMatrix();
      viewModelRef.current?.setSize(cssW, cssH);
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

    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const tmpV = new THREE.Vector3();
    const tmpMuzzle = new THREE.Vector3();

    const pushKillFeed = (s, text, color = "#FFC247") => {
      s.killFeed.unshift({ id: Date.now() + Math.random(), text, color, ttl: 4.0 });
      if (s.killFeed.length > 4) s.killFeed.pop();
    };

    // ---------- Sequential TASK 1 → 2 → 3 chain ----------
    const advanceTasks = (s) => {
      let advanced = false;
      while (s.taskIndex < s.objectives.length) {
        const cur = s.objectives[s.taskIndex];
        const done = cur.completed || (cur.type === "eliminate" && cur.targetDown);
        if (!done) break;
        cur.completed = true;
        cur.progress = 1;
        s.taskIndex += 1;
        advanced = true;
        audioRef.current?.pickup(mutedRef.current);
        audioRef.current?.radio?.(mutedRef.current);
        const nxt = s.objectives[s.taskIndex];
        s.taskBanner = {
          title: `${cur.taskLabel} COMPLETE`,
          sub: nxt ? `HQ: Confirmed. Proceed to ${nxt.taskLabel} — ${nxt.label}` : `HQ: All tasks confirmed. Extract at ${s.extraction.label}`,
          t: 3.6,
        };
        s.alertText = nxt
          ? `${cur.taskLabel} SUBMITTED ✓ — NOW ${nxt.taskLabel}: ${nxt.label.toUpperCase()}`
          : `ALL TASKS SUBMITTED ✓ — EXTRACT AT ${s.extraction.label}`;
      }
      return advanced;
    };

    const onEnemyKilled = (s, e) => {
      for (const o of s.objectives) {
        if (o.type === "eliminate" && o.targetId === e.id) {
          o.targetDown = true;
          if (s.objectives[s.taskIndex] !== o) {
            pushKillFeed(s, `HVT DOWN — confirm when ${o.taskLabel} is active`, "#F012A8");
          }
        }
      }
      advanceTasks(s);
    };

    const triggerExplosion = (s, world, ex, ey, ez, radius, causeLabel) => {
      audioRef.current?.explosion(mutedRef.current);
      fxRef.current?.explosion(V(ex, ey, ez), radius);
      s.explosions.push({ x: ex, y: ey, z: ez, life: 1.0 });
      const distP = Math.hypot(s.px - ex, s.pz - ez);
      if (distP < 16) s.shake = Math.max(s.shake, (1 - distP / 16) * 18);
      if (distP < radius * 0.72) {
        const selfDmg = Math.round((1 - distP / (radius * 0.72)) * 38);
        s.hp = Math.max(0, s.hp - selfDmg);
        s.damageFlash = 1;
      }
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
            onEnemyKilled(s, e);
          }
        }
      }
      for (const b of world.barrels) {
        if (!b.intact) continue;
        if (Math.hypot(b.x - ex, b.z - ez) < radius * 0.85) {
          destroyBarrel(s, world, b);
        }
      }
    };

    const destroyBarrel = (s, world, b) => {
      b.intact = false;
      if (b.mesh) b.mesh.visible = false;
      if (b.wreck) b.wreck.visible = true;
      fxRef.current?.burning(V(b.x, 0.2, b.z), 10);
      triggerExplosion(s, world, b.x, 0.75, b.z, 6.2, "FUEL BARREL");
    };

    /** Ray vs. world colliders → nearest hit distance + surface normal */
    const raycastWorld = (colliders, ox, oy, oz, dx, dy, dz, maxDist) => {
      let best = maxDist;
      let hitC = null;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        const t = rayAABB(ox, oy, oz, dx, dy, dz, c.minX, c.maxX, c.minBulletY, c.maxBulletY, c.minZ, c.maxZ);
        if (t < best) {
          best = t;
          hitC = c;
        }
      }
      // ground plane
      if (dy < -1e-4) {
        const tg = -oy / dy;
        if (tg < best) return { t: tg, normal: V(0, 1, 0), ground: true };
      }
      if (!hitC) return { t: best, normal: null };
      const hx = ox + dx * best;
      const hy = oy + dy * best;
      const hz = oz + dz * best;
      const cands = [
        [Math.abs(hx - hitC.minX), V(-1, 0, 0)],
        [Math.abs(hx - hitC.maxX), V(1, 0, 0)],
        [Math.abs(hz - hitC.minZ), V(0, 0, -1)],
        [Math.abs(hz - hitC.maxZ), V(0, 0, 1)],
        [Math.abs(hy - Math.min(hitC.maxBulletY, 40)), V(0, 1, 0)],
      ];
      cands.sort((a, b) => a[0] - b[0]);
      return { t: best, normal: cands[0][1] };
    };

    const fireWeapon = (s, world) => {
      const wp = ARMY_WEAPONS[s.weaponId];
      if (s.fireCd > 0 || s.reloading > 0) return;
      if (s.stance === "stand" && s.sprinting) return;
      if (s.mags[s.weaponId] <= 0) {
        if (s.reserves[s.weaponId] > 0) {
          s.reloading = wp.reloadTime;
          s.ads = false;
          audioRef.current?.reload(mutedRef.current);
        } else {
          audioRef.current?.dryFire?.(mutedRef.current);
        }
        return;
      }

      s.mags[s.weaponId] -= 1;
      s.fireCd = wp.fireRate;
      s.muzzleFlash = 1;
      s.cycle = wp.id === 3 || wp.id === 2 ? 1 : 0;
      const stanceRecoil = s.stance === "prone" ? 0.45 : s.stance === "crouch" ? 0.72 : 1.0;
      s.recoil = (wp.id === 2 || wp.id === 3 ? 1.25 : 0.85) * stanceRecoil;
      s.pitch = Math.min(0.6, s.pitch + (wp.id === 2 ? 0.03 : wp.id === 3 ? 0.035 : 0.008) * stanceRecoil);
      s.yaw += (Math.random() - 0.5) * 0.006 * stanceRecoil;
      viewModelRef.current?.ejectShell(wp.id === 3);
      audioRef.current?.shoot(s.weaponId, mutedRef.current);

      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - s.px, e.z - s.pz) <= wp.noiseRadius) e.state = "combat";
      }

      const eyeY = s.eyeHeight + s.playerY;
      const stanceSpread = s.stance === "prone" ? 0.42 : s.stance === "crouch" ? 0.7 : 1;
      const airPenalty = s.playerY > 0.1 ? 1.65 : 1;
      const moveSpread = s.moving ? 1.35 : 1;
      const spread = (s.ads ? wp.adsSpread : wp.spread) * stanceSpread * airPenalty * moveSpread;

      for (let p = 0; p < wp.pellets; p++) {
        const syaw = s.yaw + (Math.random() - 0.5) * spread * 2;
        const spitch = s.pitch + (Math.random() - 0.5) * spread * 2;
        const dx = Math.sin(syaw) * Math.cos(spitch);
        const dy = Math.sin(spitch);
        const dz = -Math.cos(syaw) * Math.cos(spitch);

        const hit = raycastWorld(world.colliders, s.px, eyeY, s.pz, dx, dy, dz, 140);
        const wallDist = hit.t;

        let bestBarrel = null;
        let bestBarrelT = wallDist;
        for (const b of world.barrels) {
          if (!b.intact) continue;
          const t = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, b.x - 0.36, b.x + 0.36, 0, 1.12, b.z - 0.36, b.z + 0.36);
          if (t < bestBarrelT) {
            bestBarrelT = t;
            bestBarrel = b;
          }
        }

        let bestEnemy = null;
        let bestEnemyT = bestBarrelT;
        let hitHead = false;
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const r = e.kind === "heavy" ? 0.4 : 0.33;
          const tHead = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, e.x - 0.17, e.x + 0.17, 1.5, 1.86, e.z - 0.17, e.z + 0.17);
          if (tHead < bestEnemyT) {
            bestEnemyT = tHead;
            bestEnemy = e;
            hitHead = true;
          }
          const tBody = rayAABB(s.px, eyeY, s.pz, dx, dy, dz, e.x - r, e.x + r, 0.05, 1.5, e.z - r, e.z + r);
          if (tBody < bestEnemyT) {
            bestEnemyT = tBody;
            bestEnemy = e;
            hitHead = false;
          }
        }

        const endT = bestEnemy ? bestEnemyT : bestBarrel ? bestBarrelT : Math.min(wallDist, 140);
        if (p === 0 && (s.shotCount = (s.shotCount || 0) + 1) % 3 === 0 && wp.id !== 1) {
          const from = V(s.px + dx * 0.9 + Math.cos(s.yaw) * 0.18, eyeY - 0.12, s.pz + dz * 0.9 + Math.sin(s.yaw) * 0.18);
          fxRef.current?.spawnTracer(from, V(s.px + dx * endT, eyeY + dy * endT, s.pz + dz * endT), 260);
        }

        if (bestEnemy) {
          const dmg = wp.damage * (hitHead ? 2.4 : 1.0);
          bestEnemy.hp -= dmg;
          bestEnemy.hitFlash = 1;
          bestEnemy.state = "combat";
          s.hitMarker = 1;
          if (hitHead) s.headshotFlash = 1;
          audioRef.current?.hit(mutedRef.current, hitHead);
          fxRef.current?.impact(V(s.px + dx * bestEnemyT, eyeY + dy * bestEnemyT, s.pz + dz * bestEnemyT), null, "blood");

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
            pushKillFeed(s, hitHead ? `★ HEADSHOT • ${tag} KIA` : `☠ ${tag} NEUTRALIZED`, hitHead ? "#FACC15" : "#00D4FF");
            onEnemyKilled(s, bestEnemy);
          }
        } else if (bestBarrel) {
          bestBarrel.hp -= wp.damage;
          s.hitMarker = 0.8;
          fxRef.current?.impact(V(s.px + dx * bestBarrelT, eyeY + dy * bestBarrelT, s.pz + dz * bestBarrelT), null, "wall");
          if (bestBarrel.hp <= 0) destroyBarrel(s, world, bestBarrel);
        } else if (wallDist < 139) {
          const pt = V(s.px + dx * (wallDist - 0.01), eyeY + dy * (wallDist - 0.01), s.pz + dz * (wallDist - 0.01));
          fxRef.current?.impact(pt, hit.normal, hit.ground ? "ground" : "wall");
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    let hudTick = 0;
    const clock0 = performance.now();

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      try {
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        const time = (now - clock0) / 1000;
        const s = simRef.current;
        const world = worldRef.current;
        if (!s || !world) return;

        if (s.width < 50 || s.height < 50) resize();
        const w = Math.max(320, s.width);
        const h = Math.max(260, s.height);
        const env = s.mission.env;

        if (env.weather === "storm") {
          s.lightningFlash = Math.max(0, s.lightningFlash - dt * 3.5);
          if (Math.random() < dt * 0.14) {
            s.lightningFlash = 0.85;
            setTimeout(() => audioRef.current?.thunder?.(mutedRef.current), 400 + Math.random() * 900);
          }
        } else {
          s.lightningFlash = 0;
        }

        let moving = false;
        let sprinting = false;

        // ================= GAMEPLAY SIMULATION =================
        if (phaseRef.current === "playing") {
          s.elapsed += dt;
          s.fireCd = Math.max(0, s.fireCd - dt);
          s.muzzleFlash = Math.max(0, s.muzzleFlash - dt * 11);
          s.recoil = Math.max(0, s.recoil - dt * 7);
          s.cycle = Math.max(0, (s.cycle || 0) - dt * 1.6);
          s.hitMarker = Math.max(0, s.hitMarker - dt * 5);
          s.headshotFlash = Math.max(0, s.headshotFlash - dt * 2.2);
          s.damageFlash = Math.max(0, s.damageFlash - dt * 2.4);
          s.shake = Math.max(0, s.shake - dt * 34);
          s.adsLerp += ((s.ads ? 1 : 0) - s.adsLerp) * Math.min(1, dt * 14);
          const targetEyeH = s.stance === "prone" ? 0.42 : s.stance === "crouch" ? 1.04 : 1.68;
          s.eyeHeight += (targetEyeH - s.eyeHeight) * Math.min(1, dt * 10.5);
          s.landDip = Math.max(0, s.landDip - dt * 4.5);
          if (s.taskBanner) {
            s.taskBanner.t -= dt;
            if (s.taskBanner.t <= 0) s.taskBanner = null;
          }

          if (s.playerY > 0 || s.playerVy > 0) {
            s.playerVy -= 18.5 * dt;
            s.playerY += s.playerVy * dt;
            if (s.playerY <= 0) {
              s.playerY = 0;
              if (s.playerVy < -3.5) s.landDip = 0.22;
              s.playerVy = 0;
            }
          }

          for (let k = s.killFeed.length - 1; k >= 0; k--) {
            s.killFeed[k].ttl -= dt;
            if (s.killFeed[k].ttl <= 0) s.killFeed.splice(k, 1);
          }

          if (s.reloading > 0) {
            s.reloading -= dt;
            if (s.reloading <= 0) {
              s.reloading = 0;
              const wp = ARMY_WEAPONS[s.weaponId];
              const need = wp.magSize - s.mags[s.weaponId];
              const take = Math.min(need, s.reserves[s.weaponId]);
              s.mags[s.weaponId] += take;
              s.reserves[s.weaponId] -= take;
            }
          }

          const turnSpd = s.ads ? 1.25 : 2.35;
          if (s.keys["arrowleft"] || s.codes["ArrowLeft"] || s.keys["q"] || s.codes["KeyQ"]) s.yaw -= turnSpd * dt;
          if (s.keys["arrowright"] || s.codes["ArrowRight"]) s.yaw += turnSpd * dt;

          let mf = 0;
          let ms = 0;
          if (s.keys["w"] || s.codes["KeyW"] || s.keys["arrowup"] || s.codes["ArrowUp"]) mf += 1;
          if (s.keys["s"] || s.codes["KeyS"] || s.keys["arrowdown"] || s.codes["ArrowDown"]) mf -= 1;
          if (s.keys["a"] || s.codes["KeyA"]) ms -= 1;
          if (s.keys["d"] || s.codes["KeyD"]) ms += 1;

          const wantSprint = Boolean((s.keys["shift"] || s.codes["ShiftLeft"] || s.codes["ShiftRight"]) && !s.ads && mf > 0);
          if (wantSprint && s.stance !== "stand" && s.playerY <= 0.02) s.stance = "stand";
          sprinting = wantSprint && s.stance === "stand" && s.reloading <= 0;
          s.sprinting = sprinting;
          const spd = s.stance === "prone" ? 1.95 : s.stance === "crouch" ? 3.6 : s.ads ? 3.4 : sprinting ? 8.6 : 5.9;

          if (mf !== 0 || ms !== 0) {
            moving = true;
            const len = Math.hypot(mf, ms);
            mf /= len;
            ms /= len;
            const fx = Math.sin(s.yaw);
            const fz = -Math.cos(s.yaw);
            const rx = Math.cos(s.yaw);
            const rz = Math.sin(s.yaw);
            const vx = (fx * mf + rx * ms) * spd * dt;
            const vz = (fz * mf + rz * ms) * spd * dt;
            if (!collidesWalk(world.colliders, s.px + vx, s.pz, 0.42, s.playerY)) s.px += vx;
            if (!collidesWalk(world.colliders, s.px, s.pz + vz, 0.42, s.playerY)) s.pz += vz;
            if (s.playerY <= 0.05) {
              const prev = s.walkBob;
              s.walkBob += dt * (sprinting ? 12 : s.stance === "prone" ? 4.2 : s.stance === "crouch" ? 5.8 : 8.5);
              if (Math.floor(prev / Math.PI) !== Math.floor(s.walkBob / Math.PI)) {
                audioRef.current?.step?.(mutedRef.current, env.groundTex, sprinting);
              }
            }
          }
          s.moving = moving;

          for (const d of world.doors) {
            const nearPlayer = Math.hypot(s.px - d.cx, s.pz - d.cz) < 3.4;
            const nearEnemy = s.enemies.some((e) => e.alive && Math.hypot(e.x - d.cx, e.z - d.cz) < 2.6);
            const target = nearPlayer || nearEnemy ? 1 : 0;
            d.openAmount += (target - d.openAmount) * Math.min(1, dt * 6.5);
            d.pivot.rotation.y = d.baseAngle + d.openAmount * 1.52;
          }

          if (s.mouseDown) {
            fireWeapon(s, world);
            if (!ARMY_WEAPONS[s.weaponId].auto) s.mouseDown = false;
          }

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
            if (g.y < 0.1) {
              g.y = 0.1;
              g.vy = Math.abs(g.vy) * 0.35;
              g.vx *= 0.65;
              g.vz *= 0.65;
            }
            if (g.fuse <= 0) {
              triggerExplosion(s, world, g.x, g.y + 0.4, g.z, 6.8, "FRAG GRENADE");
              s.activeGrenades.splice(gi, 1);
            }
          }

          for (let i = s.explosions.length - 1; i >= 0; i--) {
            s.explosions[i].life -= dt * 1.9;
            if (s.explosions[i].life <= 0) s.explosions.splice(i, 1);
          }

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

          // Only the ACTIVE task can be worked on (strict TASK 1 → 2 → 3 order)
          const holdingE = Boolean(s.keys["e"] || s.codes["KeyE"]);
          const curTask = s.objectives[s.taskIndex];
          if (curTask && curTask.type === "interact" && !curTask.completed) {
            const dObj = Math.hypot(curTask.x - s.px, curTask.z - s.pz);
            if (dObj < 2.8 && holdingE) {
              curTask.progress = Math.min(1, curTask.progress + dt / (curTask.duration || 2.1));
              s.alertText = `${curTask.taskLabel}: ${curTask.actionVerb}... ${Math.round(curTask.progress * 100)}%`;
              if (curTask.progress >= 1) {
                curTask.completed = true;
                s.enemies.forEach((en) => {
                  if (en.alive && Math.hypot(en.x - curTask.x, en.z - curTask.z) < 18) en.state = "combat";
                });
                advanceTasks(s);
              }
            } else if (dObj < 2.8) {
              s.alertText = `HOLD [E] TO ${curTask.actionVerb} (${curTask.taskLabel})`;
            }
          }
          // Locked tasks: tell the player to follow the order
          for (const o of s.objectives) {
            if (o.order > s.taskIndex && o.type === "interact" && Math.hypot(o.x - s.px, o.z - s.pz) < 2.6) {
              s.alertText = `${o.taskLabel} LOCKED — COMPLETE ${s.objectives[s.taskIndex]?.taskLabel || "PREVIOUS TASK"} FIRST`;
            }
          }

          const allDone = s.taskIndex >= s.objectives.length;
          if (allDone && Math.hypot(s.px - s.extraction.x, s.pz - s.extraction.z) < 3.2) {
            const rank = s.hp >= 70 ? "S" : s.hp >= 40 ? "A" : "B";
            const current = loadCampaign();
            const nextUnlocked = Math.max(current.unlockedCount, Math.min(VANGUARD_OPS.length, s.mission.index + 2));
            const newlyUnlocked =
              nextUnlocked > current.unlockedCount && VANGUARD_OPS[s.mission.index + 1]
                ? `${VANGUARD_OPS[s.mission.index + 1].code}: ${VANGUARD_OPS[s.mission.index + 1].title}`
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

          // ---------- Enemy tactical AI ----------
          const playerEyeY = s.eyeHeight + s.playerY;
          const stealthMult = s.stance === "prone" ? 0.44 : s.stance === "crouch" ? 0.72 : 1;
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
            const sightRange = (e.kind === "sniper" ? 36 : 24) * stealthMult;
            // vision cone: patrolling soldiers only see what is in front of them
            const facing = Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz;
            const inCone = e.state === "combat" || dist < 5 || facing > dist * 0.25;
            const canSee = dist < sightRange && inCone && hasLineOfSight3D(world.colliders, e.x, 1.6, e.z, s.px, playerEyeY, s.pz);
            if (canSee) {
              if (e.state !== "combat") {
                // alert the squad
                for (const o of s.enemies) if (o.alive && Math.hypot(o.x - e.x, o.z - e.z) < 12) o.state = "combat";
              }
              e.state = "combat";
              e.lastSeenX = s.px;
              e.lastSeenZ = s.pz;
            }

            if (e.state === "patrol") {
              const pr = e.patrolRadius || 4.5;
              const vx = Math.sin(e.patrolDir) * e.speed * 0.42 * dt;
              const vz = Math.cos(e.patrolDir) * e.speed * 0.42 * dt;
              e.pauseT = (e.pauseT || 0) - dt;
              if (e.pauseT > 0) {
                // stand & scan
              } else {
                const dOrigin = Math.hypot(e.x + vx - e.patrolOriginX, e.z + vz - e.patrolOriginZ);
                if (dOrigin < pr && !collidesWalk(world.colliders, e.x + vx, e.z + vz, 0.45)) {
                  e.x += vx;
                  e.z += vz;
                  e.yaw = e.patrolDir;
                } else {
                  e.patrolDir += Math.PI * 0.55 + (Math.random() - 0.5) * 0.8;
                  if (Math.random() < 0.5) e.pauseT = 1 + Math.random() * 2.5;
                }
              }
            } else if (e.state === "combat") {
              const tx = canSee ? s.px : e.lastSeenX ?? s.px;
              const tz = canSee ? s.pz : e.lastSeenZ ?? s.pz;
              const ddx = tx - e.x;
              const ddz = tz - e.z;
              const dd = Math.hypot(ddx, ddz) || 1;
              e.yaw = Math.atan2(ddx, ddz);
              const idealRange = e.kind === "sniper" ? 16 : 7;
              if ((dd > idealRange || !canSee) && dd > 1.2 && dist < 46) {
                const run = canSee ? 1 : 1.25;
                const mx = (ddx / dd) * e.speed * run * dt;
                const mz = (ddz / dd) * e.speed * run * dt;
                if (!collidesWalk(world.colliders, e.x + mx, e.z, 0.45)) e.x += mx;
                if (!collidesWalk(world.colliders, e.x, e.z + mz, 0.45)) e.z += mz;
              } else if (canSee && dd < idealRange * 0.6 && e.kind !== "heavy") {
                // strafe sideways to stay a harder target
                const side = Math.sin(time * 0.9 + e.x) > 0 ? 1 : -1;
                const sx = (ddz / dd) * side * e.speed * 0.5 * dt;
                const sz = (-ddx / dd) * side * e.speed * 0.5 * dt;
                if (!collidesWalk(world.colliders, e.x + sx, e.z + sz, 0.45)) {
                  e.x += sx;
                  e.z += sz;
                }
              }

              if (canSee) {
                e.shootCd -= dt;
                if (e.shootCd <= 0) {
                  e.shootCd = e.kind === "heavy" ? 0.62 : e.kind === "officer" ? 0.65 : e.kind === "sniper" ? 1.7 : 0.98;
                  e.muzzleFlash = 1;
                  audioRef.current?.enemyShot(mutedRef.current, dist);

                  const stanceDodge = s.stance === "prone" ? 0.52 : s.stance === "crouch" ? 0.74 : 1;
                  const moveDodge = moving ? (sprinting ? 0.6 : 0.8) : 1;
                  const hitChance = Math.max(0.1, (0.7 - dist * 0.02) * stanceDodge * moveDodge);
                  const isHit = Math.random() < hitChance;

                  const view = soldierViewsRef.current.get(e.id);
                  const from = view ? soldiersRef.current.muzzleWorld(view, tmpMuzzle) : V(e.x, 1.4, e.z);
                  const miss = isHit ? 0.15 : 1.2;
                  const to = V(s.px + (Math.random() - 0.5) * miss, playerEyeY - 0.3 + (Math.random() - 0.5) * miss, s.pz + (Math.random() - 0.5) * miss);
                  fxRef.current?.spawnTracer(from, to, 120);

                  if (isHit) {
                    const dmg = e.kind === "sniper" ? 15 : e.kind === "officer" ? 12 : e.kind === "heavy" ? 10 : 7;
                    s.hp -= dmg;
                    s.damageFlash = 1;
                    s.damageAngle = Math.atan2(e.x - s.px, -(e.z - s.pz)) - s.yaw;
                    audioRef.current?.hurt?.(mutedRef.current);
                    if (s.hp <= 0) {
                      s.hp = 0;
                      phaseRef.current = "failed";
                      setPhase("failed");
                      document.exitPointerLock?.();
                      syncHud();
                    }
                  } else {
                    audioRef.current?.whiz?.(mutedRef.current);
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

        // ================= THREE.JS RENDER PASS =================
        let fovDeg = 72;
        if (phaseRef.current === "briefing") {
          const orbitA = time * 0.06;
          const mid = s.mission.size * 0.5;
          camera.position.set(mid + Math.cos(orbitA) * 70, 32, mid + Math.sin(orbitA) * 70);
          camera.lookAt(mid, 2, mid);
        } else {
          const wp = ARMY_WEAPONS[s.weaponId];
          fovDeg = 72 + (wp.adsFov - 72) * s.adsLerp + (sprinting ? 4 : 0);
          const bobAmp = s.stance === "prone" ? 0.014 : 0.03;
          const bobY = Math.sin(s.walkBob * 2) * bobAmp * (1 - s.adsLerp * 0.7);
          const shakeX = (Math.random() - 0.5) * s.shake * 0.012;
          const shakeY = (Math.random() - 0.5) * s.shake * 0.012;
          const eyeY = Math.max(0.36, s.eyeHeight + s.playerY + bobY + shakeY - s.landDip);
          camera.position.set(s.px + shakeX, eyeY, s.pz);
          camera.rotation.set(s.pitch + s.recoil * 0.012, -s.yaw, Math.cos(s.walkBob) * 0.004 * (moving ? 1 : 0));
        }
        if (Math.abs(camera.fov - fovDeg) > 0.01) {
          camera.fov = fovDeg;
          camera.updateProjectionMatrix();
        }
        camera.updateMatrixWorld();

        const indoors = phaseRef.current === "playing" && Boolean(findBuildingAt(s.mission.buildings, s.px, s.pz));
        const lf = s.lightningFlash;

        // dynamic flash light: explosion > muzzle flash
        let flashPos = null;
        let flashI = 0;
        let flashCol = null;
        if (s.explosions.length > 0) {
          const ex = s.explosions[0];
          flashPos = tmpV.set(ex.x, ex.y + 1, ex.z);
          flashI = ex.life * 60;
          flashCol = explosionColor;
        } else if (s.muzzleFlash > 0.2 && phaseRef.current === "playing" && s.weaponId !== 1) {
          flashPos = tmpV.set(camera.position.x + Math.sin(s.yaw), camera.position.y, camera.position.z - Math.cos(s.yaw));
          flashI = s.muzzleFlash * 7;
          flashCol = muzzleColor;
        }
        world.update(time, camera.position, { lightning: lf, flashPos, flashIntensity: flashI, flashColor: flashCol });

        // soldiers
        const fac = soldiersRef.current;
        if (fac) {
          for (const e of s.enemies) {
            const v = soldierViewsRef.current.get(e.id);
            if (v) fac.update(v, dt, camera.position);
          }
        }

        // effects
        const fx = fxRef.current;
        if (fx) {
          let beacon = null;
          if (phaseRef.current === "playing") {
            const cur = s.objectives[s.taskIndex];
            if (cur) {
              let bx = cur.x;
              let bz = cur.z;
              if (cur.type === "eliminate" && cur.targetId) {
                const t = s.enemies.find((en) => en.id === cur.targetId);
                if (t && t.alive) {
                  bx = t.x;
                  bz = t.z;
                }
              }
              beacon = { x: bx, z: bz, color: cur.color || "#00D4FF" };
            } else {
              beacon = { x: s.extraction.x, z: s.extraction.z, color: "#34D399", smoke: true };
            }
          }
          fx.syncDynamic(s, time, beacon);
          fx.update(dt, camera.position, indoors);
        }

        renderer.toneMappingExposure = (world.night ? 1.35 : 0.48) * (nvgRef.current ? 2.6 : 1) + lf * 0.8;
        renderer.clear();
        renderer.render(scene, camera);

        // first-person weapon
        const vm = viewModelRef.current;
        if (vm && phaseRef.current === "playing") {
          const wp = ARMY_WEAPONS[s.weaponId];
          sunView.copy(world.sunDir || sunWorld).applyQuaternion(camQuatInv.copy(camera.quaternion).invert());
          vm.update(dt, {
            weaponId: s.weaponId,
            adsLerp: s.adsLerp,
            walkBob: s.walkBob,
            moving,
            sprinting,
            recoil: s.recoil,
            reloadP: s.reloading > 0 ? 1 - s.reloading / wp.reloadTime : 0,
            cycleP: s.cycle ? 1 - s.cycle : 0,
            muzzleFlash: s.muzzleFlash,
            landDip: s.landDip,
            stance: s.stance,
            sunDirView: sunView,
            night: world.night,
            hidden: wp.isSniper && s.adsLerp > 0.65,
            idleBreath: Math.sin(time * 1.6),
          });
          vm.render(renderer);
        }

        // ================= 2D TACTICAL HUD =================
        if (hudCtx) {
          hudCtx.clearRect(0, 0, w, h);

          if (phaseRef.current === "playing") {
            const allDone = s.taskIndex >= s.objectives.length;

            // 1. Projected waypoint for the ACTIVE task only
            const markers = [];
            const cur = s.objectives[s.taskIndex];
            if (cur) {
              let ox = cur.x;
              let oz = cur.z;
              if (cur.type === "eliminate" && cur.targetId) {
                const t = s.enemies.find((en) => en.id === cur.targetId);
                if (t && t.alive) {
                  ox = t.x;
                  oz = t.z;
                }
              }
              markers.push({ x: ox, y: 2.3, z: oz, color: cur.color || "#00D4FF", label: `${cur.taskLabel} • ${Math.round(Math.hypot(ox - s.px, oz - s.pz))}m` });
            } else if (allDone) {
              markers.push({ x: s.extraction.x, y: 2.6, z: s.extraction.z, color: "#34D399", label: `EXFIL • ${Math.round(Math.hypot(s.extraction.x - s.px, s.extraction.z - s.pz))}m` });
            }

            for (const mk of markers) {
              tmpV.set(mk.x, mk.y, mk.z).project(camera);
              const behind = tmpV.z > 1;
              let sx = (tmpV.x * 0.5 + 0.5) * w;
              let sy = (-tmpV.y * 0.5 + 0.5) * h;
              if (behind) {
                sx = w - sx;
                sy = h - 40;
              }
              const clamped = sx < 30 || sx > w - 30 || sy < 50 || sy > h - 60 || behind;
              sx = Math.max(30, Math.min(w - 30, sx));
              sy = Math.max(50, Math.min(h - 60, sy));
              hudCtx.save();
              hudCtx.translate(sx, sy);
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
              hudCtx.fillText(mk.label, 0, clamped ? 24 : -15);
              hudCtx.restore();
            }

            // 2. Compass strip
            const compW = Math.min(360, w * 0.42);
            const compX = (w - compW) * 0.5;
            const compY = 14;
            hudCtx.save();
            hudCtx.fillStyle = "rgba(6, 10, 18, 0.62)";
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
            if (markers[0]) {
              let diff = Math.atan2(markers[0].x - s.px, -(markers[0].z - s.pz)) - s.yaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const px = w * 0.5 + (diff / (Math.PI * 0.55)) * (compW * 0.5);
              hudCtx.fillStyle = markers[0].color;
              hudCtx.beginPath();
              hudCtx.moveTo(px, compY + 20);
              hudCtx.lineTo(px - 5, compY + 24);
              hudCtx.lineTo(px + 5, compY + 24);
              hudCtx.fill();
            }
            hudCtx.restore();

            // 3. Sniper scope or crosshair
            const wp = ARMY_WEAPONS[s.weaponId];
            if (wp.isSniper && s.adsLerp > 0.65) {
              const rad = Math.min(w, h) * 0.43;
              hudCtx.save();
              hudCtx.fillStyle = "rgba(3, 5, 10, 0.97)";
              hudCtx.beginPath();
              hudCtx.rect(0, 0, w, h);
              hudCtx.arc(w / 2, h / 2, rad, 0, Math.PI * 2, true);
              hudCtx.fill();
              const vg = hudCtx.createRadialGradient(w / 2, h / 2, rad * 0.75, w / 2, h / 2, rad);
              vg.addColorStop(0, "rgba(0,0,0,0)");
              vg.addColorStop(1, "rgba(0,0,0,0.75)");
              hudCtx.fillStyle = vg;
              hudCtx.beginPath();
              hudCtx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
              hudCtx.fill();
              hudCtx.strokeStyle = "rgba(10,10,10,0.95)";
              hudCtx.lineWidth = 1.4;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - rad, h / 2);
              hudCtx.lineTo(w / 2 + rad, h / 2);
              hudCtx.moveTo(w / 2, h / 2 - rad);
              hudCtx.lineTo(w / 2, h / 2 + rad);
              hudCtx.stroke();
              hudCtx.lineWidth = 4;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - rad, h / 2);
              hudCtx.lineTo(w / 2 - rad * 0.35, h / 2);
              hudCtx.moveTo(w / 2 + rad * 0.35, h / 2);
              hudCtx.lineTo(w / 2 + rad, h / 2);
              hudCtx.moveTo(w / 2, h / 2 + rad * 0.35);
              hudCtx.lineTo(w / 2, h / 2 + rad);
              hudCtx.stroke();
              for (let m = -4; m <= 4; m++) {
                if (m === 0) continue;
                hudCtx.fillStyle = "rgba(10,10,10,0.95)";
                hudCtx.beginPath();
                hudCtx.arc(w / 2 + m * 22, h / 2, 2, 0, Math.PI * 2);
                hudCtx.arc(w / 2, h / 2 + m * 22, 2, 0, Math.PI * 2);
                hudCtx.fill();
              }
              hudCtx.fillStyle = "#FF2E63";
              hudCtx.beginPath();
              hudCtx.arc(w / 2, h / 2, 1.6, 0, Math.PI * 2);
              hudCtx.fill();
              hudCtx.restore();
            } else if (s.adsLerp < 0.6) {
              hudCtx.save();
              const baseGap = s.stance === "prone" ? 4.5 : s.stance === "crouch" ? 6.5 : 9.5;
              const gap = baseGap + s.recoil * 10 + (s.playerY > 0.1 ? 7 : 0) + (moving ? 5 : 0);
              hudCtx.globalAlpha = 1 - s.adsLerp * 1.6;
              hudCtx.strokeStyle = s.headshotFlash > 0 ? "#FACC15" : s.hitMarker > 0 ? "#FF2E63" : "#FFFFFF";
              hudCtx.shadowColor = "rgba(0,0,0,0.7)";
              hudCtx.shadowBlur = 3;
              hudCtx.lineWidth = 1.6;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - gap - 8, h / 2);
              hudCtx.lineTo(w / 2 - gap, h / 2);
              hudCtx.moveTo(w / 2 + gap, h / 2);
              hudCtx.lineTo(w / 2 + gap + 8, h / 2);
              hudCtx.moveTo(w / 2, h / 2 + gap);
              hudCtx.lineTo(w / 2, h / 2 + gap + 8);
              hudCtx.moveTo(w / 2, h / 2 - gap - 8);
              hudCtx.lineTo(w / 2, h / 2 - gap);
              hudCtx.stroke();
              hudCtx.restore();
            }
            if (s.hitMarker > 0.15) {
              hudCtx.save();
              hudCtx.strokeStyle = s.headshotFlash > 0 ? "#FACC15" : "#FFFFFF";
              hudCtx.lineWidth = 2.2;
              hudCtx.beginPath();
              hudCtx.moveTo(w / 2 - 11, h / 2 - 11);
              hudCtx.lineTo(w / 2 - 5, h / 2 - 5);
              hudCtx.moveTo(w / 2 + 11, h / 2 - 11);
              hudCtx.lineTo(w / 2 + 5, h / 2 - 5);
              hudCtx.moveTo(w / 2 - 11, h / 2 + 11);
              hudCtx.lineTo(w / 2 - 5, h / 2 + 5);
              hudCtx.moveTo(w / 2 + 11, h / 2 + 11);
              hudCtx.lineTo(w / 2 + 5, h / 2 + 5);
              hudCtx.stroke();
              hudCtx.restore();
            }
            if (s.headshotFlash > 0.2) {
              hudCtx.fillStyle = "#FACC15";
              hudCtx.font = "800 12px 'JetBrains Mono', monospace";
              hudCtx.textAlign = "center";
              hudCtx.fillText("HEADSHOT!", w / 2, h / 2 - 30);
            }

            // 4. Tactical minimap (player-centred, 70 m window, roads + buildings)
            const mapPx = 150;
            const mx = 14;
            const my = 14;
            const viewM = 70;
            const scale = mapPx / viewM;
            const toMap = (x, z) => [mx + mapPx / 2 + (x - s.px) * scale, my + mapPx / 2 + (z - s.pz) * scale];
            hudCtx.save();
            hudCtx.fillStyle = "rgba(6, 12, 20, 0.8)";
            hudCtx.strokeStyle = "rgba(0, 212, 255, 0.45)";
            hudCtx.lineWidth = 1.5;
            rrect(hudCtx, mx, my, mapPx, mapPx, 12);
            hudCtx.fill();
            hudCtx.stroke();
            hudCtx.clip();
            hudCtx.strokeStyle = "rgba(196, 170, 120, 0.4)";
            hudCtx.lineCap = "round";
            for (const r of s.mission.roads || []) {
              hudCtx.lineWidth = r.w * scale;
              const [ax, az] = toMap(r.ax, r.az);
              const [bx, bz] = toMap(r.bx, r.bz);
              hudCtx.beginPath();
              hudCtx.moveTo(ax, az);
              hudCtx.lineTo(bx, bz);
              hudCtx.stroke();
            }
            // map boundary
            {
              const [ax, az] = toMap(0, 0);
              hudCtx.strokeStyle = "rgba(255,255,255,0.35)";
              hudCtx.lineWidth = 1;
              hudCtx.strokeRect(ax, az, s.mission.size * scale, s.mission.size * scale);
            }
            for (const b of s.mission.buildings) {
              const inside = findBuildingAt([b], s.px, s.pz);
              const [bx, bz] = toMap(b.x, b.z);
              hudCtx.fillStyle = inside ? "rgba(0, 212, 255, 0.3)" : "rgba(148, 163, 184, 0.3)";
              hudCtx.strokeStyle = inside ? "#00D4FF" : "rgba(148, 163, 184, 0.7)";
              hudCtx.lineWidth = 1.2;
              hudCtx.fillRect(bx, bz, b.w * scale, b.d * scale);
              hudCtx.strokeRect(bx, bz, b.w * scale, b.d * scale);
            }
            if (markers[0]) {
              const [ox, oz] = toMap(markers[0].x, markers[0].z);
              const cx = Math.max(mx + 6, Math.min(mx + mapPx - 6, ox));
              const cz = Math.max(my + 6, Math.min(my + mapPx - 6, oz));
              hudCtx.fillStyle = markers[0].color;
              hudCtx.beginPath();
              hudCtx.arc(cx, cz, 4.5, 0, Math.PI * 2);
              hudCtx.fill();
            }
            for (const e of s.enemies) {
              if (!e.alive || e.state !== "combat") continue; // only hostiles that have revealed themselves
              const [ex, ez] = toMap(e.x, e.z);
              hudCtx.fillStyle = e.kind === "officer" ? "#F012A8" : "#EF4444";
              hudCtx.beginPath();
              hudCtx.arc(ex, ez, e.kind === "officer" ? 3.5 : 2.5, 0, Math.PI * 2);
              hudCtx.fill();
            }
            const pxM = mx + mapPx / 2;
            const pzM = my + mapPx / 2;
            const viewAng = s.yaw - Math.PI * 0.5;
            hudCtx.fillStyle = "rgba(52, 211, 153, 0.25)";
            hudCtx.beginPath();
            hudCtx.moveTo(pxM, pzM);
            hudCtx.arc(pxM, pzM, 26, viewAng - 0.5, viewAng + 0.5);
            hudCtx.closePath();
            hudCtx.fill();
            hudCtx.fillStyle = "#FFFFFF";
            hudCtx.beginPath();
            hudCtx.arc(pxM, pzM, 3, 0, Math.PI * 2);
            hudCtx.fill();
            hudCtx.restore();

            // 5. Task banner
            if (s.taskBanner) {
              const a = Math.min(1, s.taskBanner.t / 0.5, (3.6 - s.taskBanner.t) / 0.3 + 0.0001);
              hudCtx.save();
              hudCtx.globalAlpha = Math.max(0, Math.min(1, a));
              const bw = Math.min(520, w * 0.8);
              const bx = (w - bw) / 2;
              const by = h * 0.2;
              hudCtx.fillStyle = "rgba(6, 12, 20, 0.82)";
              rrect(hudCtx, bx, by, bw, 62, 14);
              hudCtx.fill();
              hudCtx.strokeStyle = "rgba(52, 211, 153, 0.8)";
              hudCtx.lineWidth = 1.5;
              hudCtx.stroke();
              hudCtx.textAlign = "center";
              hudCtx.fillStyle = "#34D399";
              hudCtx.font = "800 18px 'Space Grotesk', sans-serif";
              hudCtx.fillText(`✓ ${s.taskBanner.title}`, w / 2, by + 26);
              hudCtx.fillStyle = "rgba(226,232,240,0.9)";
              hudCtx.font = "600 11px 'JetBrains Mono', monospace";
              hudCtx.fillText(s.taskBanner.sub, w / 2, by + 47);
              hudCtx.restore();
            }

            // 6. NVG scanlines, damage direction & vignette
            if (nvgRef.current) {
              hudCtx.fillStyle = "rgba(0, 28, 12, 0.18)";
              for (let sy = 0; sy < h; sy += 4) hudCtx.fillRect(0, sy, w, 1.5);
            }
            if (s.damageFlash > 0) {
              const g = hudCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
              g.addColorStop(0, "rgba(220, 38, 38, 0)");
              g.addColorStop(1, `rgba(180, 20, 20, ${Math.min(0.65, s.damageFlash * 0.6)})`);
              hudCtx.fillStyle = g;
              hudCtx.fillRect(0, 0, w, h);
              hudCtx.save();
              hudCtx.translate(w / 2, h / 2);
              hudCtx.rotate(s.damageAngle);
              hudCtx.fillStyle = `rgba(255, 60, 60, ${s.damageFlash * 0.85})`;
              hudCtx.beginPath();
              hudCtx.moveTo(-26, -Math.min(w, h) * 0.22);
              hudCtx.lineTo(0, -Math.min(w, h) * 0.22 - 18);
              hudCtx.lineTo(26, -Math.min(w, h) * 0.22);
              hudCtx.fill();
              hudCtx.restore();
            }
            if (s.hp < 35) {
              const pulse = 0.25 + Math.sin(time * 5) * 0.08;
              const g = hudCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
              g.addColorStop(0, "rgba(0,0,0,0)");
              g.addColorStop(1, `rgba(90, 0, 0, ${pulse})`);
              hudCtx.fillStyle = g;
              hudCtx.fillRect(0, 0, w, h);
            }
          }
        }
      } catch (err) {
        console.error("[Vanguard3D error]", err);
      }
    };

    const sunWorld = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
    const sunView = new THREE.Vector3();
    const camQuatInv = new THREE.Quaternion();
    const explosionColor = new THREE.Color(1, 0.55, 0.2);
    const muzzleColor = new THREE.Color(1, 0.75, 0.4);

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      disposeWorld();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [syncHud, rebuildWorldForMission, disposeWorld]);

  const activeWeapon = ARMY_WEAPONS[hud.weaponId];
  const nextMission = VANGUARD_OPS[selectedIdx + 1] || null;

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
              Ops ({campaign.unlockedCount}/{VANGUARD_OPS.length})
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
          style={nvg ? { filter: "grayscale(1) sepia(1) hue-rotate(62deg) saturate(3.2) contrast(1.15)" } : undefined}
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
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    hud.stance === "prone"
                      ? "bg-[#00D4FF]/25 text-[#7EE8FF]"
                      : hud.stance === "crouch"
                      ? "bg-emerald-500/25 text-emerald-300"
                      : "bg-white/10 text-ink-secondary"
                  }`}
                >
                  {hud.stance}
                </span>
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
                    className={`rounded-lg px-2 py-1 ${
                      o.status === "done"
                        ? "text-emerald-300/80"
                        : o.status === "active"
                        ? "border border-[#FFC247]/50 bg-[#FFC247]/10 text-white"
                        : "text-ink-muted/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 font-bold">
                        {o.status === "done" ? "✓" : o.status === "active" ? "▶" : "🔒"} {o.taskLabel}
                      </span>
                      {o.status === "active" && <span className="shrink-0 text-[#00D4FF]">{o.dist}m</span>}
                      {o.status === "done" && <span className="shrink-0 text-[9px]">SUBMITTED</span>}
                    </div>
                    <div className={`truncate ${o.status === "done" ? "line-through" : ""}`}>{o.label}</div>
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

        {/* Bottom Comms, Interactive Stance Selector (STAND / CROUCH / PRONE) & Action Prompt */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-2">
              {/* Clickable Stance Pills: Standing / Crouching / Prone + Jump */}
              <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xl border border-white/12 bg-black/70 p-1 font-mono text-[10px] backdrop-blur-md">
                {[
                  { id: "stand", label: "STAND" },
                  { id: "crouch", label: "CROUCH [C]" },
                  { id: "prone", label: "PRONE [Z]" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      simRef.current.stance = st.id;
                      syncHud();
                    }}
                    className={`rounded-lg px-2.5 py-1 font-bold transition ${
                      hud.stance === st.id
                        ? "bg-[#00D4FF] text-[#06040D]"
                        : "text-ink-muted hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const s = simRef.current;
                    if (s.stance !== "stand") s.stance = "stand";
                    else if (s.playerY <= 0.02) s.playerVy = 6.6;
                    syncHud();
                  }}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-bold text-[#FFC247] hover:bg-white/15"
                >
                  JUMP [SPACE]
                </button>
              </div>

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
            </div>

            {!pointerLocked && (
              <div className="rounded-xl border border-[#FFC247]/40 bg-black/75 px-3 py-1.5 font-mono text-[10px] text-[#FFC247] backdrop-blur-md">
                Click screen to lock 360° look • [Space] Jump • [C] Crouch • [Z] Prone • [G] Frag • RMB Scope
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
                    Realistic 3D Special Forces • Ordered Tasks • Large Maps
                  </span>
                  <h2 className="mt-1.5 font-display text-2xl font-extrabold text-white sm:text-4xl">
                    VANGUARD: <span className="text-neon-gradient">FRONTLINE OPS</span>
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                  Unlocked: {campaign.unlockedCount} / {VANGUARD_OPS.length} Theaters
                </span>
              </div>

              {/* 5 Unique Global War Theaters (Sequential Unlock Lock System!) */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {VANGUARD_OPS.map((m, idx) => {
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
                          ? `Complete ${VANGUARD_OPS[idx - 1].code} to unlock`
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
                    Map: {selectedMission.size}×{selectedMission.size}m • Buildings: {selectedMission.buildings.length} • Hostiles:{" "}
                    {selectedMission.enemies.length}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-ink-secondary sm:text-sm">
                  {selectedMission.briefing}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                    {selectedMission.objectives.map((o, i) => (
                      <span title="Tasks must be completed in order"
                        key={o.id}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white"
                      >
                        {o.taskLabel || `TASK ${i + 1}`}: {o.label}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => deployMission(selectedIdx)}
                    disabled={!assetsReady}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                    style={{
                      background:
                        "linear-gradient(110deg, #FF8A1F 0%, #F012A8 52%, #0099FF 100%)",
                    }}
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>{assetsReady ? `Deploy ${selectedMission.code}` : "Loading 3D assets…"}</span>
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
        <span>[Space] Jump • [C] Crouch • [Z] Prone • [1–4] Weapons • [RMB] Scope • [G] Frag • [N] NVG • [E] Action</span>
      </div>
    </div>
  );
}
