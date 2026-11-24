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
  Radio,
  Target,
  CheckCircle2,
} from "lucide-react";

/**
 * OPERATION: NEON I.G.I. — 3D Tactical First-Person Stealth Shooter
 * True 3D raycasting compound with:
 * - WASD movement + Mouse Pointer Lock 360° look
 * - 3 Weapons: [1] Silenced Pistol (Stealth), [2] Tactical Rifle, [3] Sniper Rifle w/ Right-Click Scope
 * - Live Tactical Satellite Radar (walls, guards, FOV cone, objective, extraction)
 * - Security Cameras (shootable!), Guard AI (Patrol / Alert / Combat), Medkits & Ammo Crates
 * - 3-Stage Mission: Hack Main Server Terminal (E) -> Extract at Helipad Beacon
 */

// 16x16 Military Compound Map
// 0 = open, 1 = concrete bunker wall, 2 = steel bulkhead, 3 = hazard blast wall, 4 = server terminal wall
const MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 3, 3, 0, 0, 2, 0, 4, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 3, 0, 0, 3, 0, 2, 0, 0, 0, 0, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 3, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const MAP_H = MAP.length;
const MAP_W = MAP[0].length;

const WEAPONS = [
  {
    id: 0,
    key: "1",
    name: "SOCOM Silenced",
    short: "PISTOL",
    damage: 36,
    fireRate: 0.24,
    magSize: 12,
    reserveStart: 72,
    reloadTime: 1.0,
    spread: 0.012,
    noiseRadius: 2.2, // Stealth!
    scopedFov: null,
    auto: false,
    accent: "#00D4FF",
  },
  {
    id: 1,
    key: "2",
    name: "M4 Tactical",
    short: "RIFLE",
    damage: 28,
    fireRate: 0.11,
    magSize: 30,
    reserveStart: 120,
    reloadTime: 1.45,
    spread: 0.025,
    noiseRadius: 9.5,
    scopedFov: null,
    auto: true,
    accent: "#FF8A1F",
  },
  {
    id: 2,
    key: "3",
    name: "Dragunov SVD",
    short: "SNIPER",
    damage: 110,
    fireRate: 0.85,
    magSize: 5,
    reserveStart: 20,
    reloadTime: 1.85,
    spread: 0.002,
    noiseRadius: 11.0,
    scopedFov: 0.36, // 2.8x optical zoom!
    auto: false,
    accent: "#F012A8",
  },
];

function createTacticalAudio() {
  let ctx = null;
  const getCtx = () => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  };

  const noiseBurst = (dur, freqStart, freqEnd, vol) => {
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.1);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(now);
  };

  return {
    shoot(weaponId, muted) {
      if (muted) return;
      if (weaponId === 0) {
        // Silenced tactical "pfft"
        noiseBurst(0.08, 2200, 700, 0.14);
      } else if (weaponId === 1) {
        // Assault rifle punch
        noiseBurst(0.11, 1400, 240, 0.22);
      } else {
        // Heavy sniper boom
        noiseBurst(0.28, 900, 95, 0.32);
      }
    },
    enemyShot(muted) {
      if (muted) return;
      noiseBurst(0.1, 1100, 220, 0.14);
    },
    reload(muted) {
      if (muted) return;
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [340, 520].forEach((f, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + idx * 0.12);
        g.gain.setValueAtTime(0.08, now + idx * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.08);
        osc.connect(g).connect(c.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.09);
      });
    },
    hit(muted) {
      if (muted) return;
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(g).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    },
    alarm(muted) {
      if (muted) return;
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(620, now + 0.14);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    },
    pickup(muted) {
      if (muted) return;
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      [523, 784].forEach((f, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.07);
        g.gain.setValueAtTime(0.09, now + idx * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.14);
        osc.connect(g).connect(c.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.15);
      });
    },
  };
}

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
  return MAP[my][mx] > 0;
}

function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist * 7);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

function createInitialEntities() {
  return {
    enemies: [
      { id: "g1", kind: "guard", x: 6.5, y: 12.5, hp: 70, maxHp: 70, state: "patrol", dir: 0, speed: 1.35, shootCd: 1.2, hitFlash: 0, alive: true },
      { id: "g2", kind: "guard", x: 11.5, y: 12.5, hp: 70, maxHp: 70, state: "patrol", dir: Math.PI, speed: 1.4, shootCd: 1.4, hitFlash: 0, alive: true },
      { id: "g3", kind: "guard", x: 6.5, y: 6.5, hp: 85, maxHp: 85, state: "patrol", dir: Math.PI / 2, speed: 1.5, shootCd: 1.1, hitFlash: 0, alive: true },
      { id: "g4", kind: "heavy", x: 11.5, y: 6.5, hp: 130, maxHp: 130, state: "patrol", dir: -Math.PI / 2, speed: 1.25, shootCd: 1.0, hitFlash: 0, alive: true },
      { id: "g5", kind: "guard", x: 4.0, y: 2.5, hp: 75, maxHp: 75, state: "patrol", dir: 0, speed: 1.45, shootCd: 1.1, hitFlash: 0, alive: true },
      { id: "g6", kind: "heavy", x: 12.5, y: 3.5, hp: 140, maxHp: 140, state: "patrol", dir: Math.PI, speed: 1.3, shootCd: 0.9, hitFlash: 0, alive: true },
      { id: "c1", kind: "camera", x: 4.5, y: 8.5, hp: 30, maxHp: 30, state: "scan", dir: 0, speed: 0, shootCd: 0, hitFlash: 0, alive: true },
      { id: "c2", kind: "camera", x: 10.5, y: 3.5, hp: 30, maxHp: 30, state: "scan", dir: 0, speed: 0, shootCd: 0, hitFlash: 0, alive: true },
    ],
    pickups: [
      { id: "med1", kind: "medkit", x: 1.8, y: 9.5, taken: false },
      { id: "med2", kind: "medkit", x: 14.2, y: 8.5, taken: false },
      { id: "ammo1", kind: "ammo", x: 8.5, y: 10.5, taken: false },
      { id: "ammo2", kind: "ammo", x: 8.5, y: 4.2, taken: false },
    ],
    terminal: { x: 13.5, y: 2.5, hacked: false, progress: 0 },
    extraction: { x: 2.2, y: 13.8 },
  };
}

export default function TacticalIgi3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const [phase, setPhase] = useState("briefing"); // "briefing" | "playing" | "victory" | "failed"
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

  const [hud, setHud] = useState({
    hp: 100,
    weaponId: 0,
    ammo: 12,
    reserve: 72,
    reloading: false,
    scoped: false,
    alarmActive: false,
    terminalHacked: false,
    hackProgress: 0,
    nearTerminal: false,
    nearExtraction: false,
    kills: 0,
    totalHostiles: 6,
    camerasDisabled: 0,
    elapsed: 0,
    alertText: "INFILTRATE COMPOUND & HACK MAIN SERVER",
  });

  if (!audioRef.current) audioRef.current = createTacticalAudio();

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const simRef = useRef({
    width: 960,
    height: 560,
    px: 2.2,
    py: 13.8,
    angle: -Math.PI / 2,
    hp: 100,
    weaponId: 0,
    mags: [12, 30, 5],
    reserves: [72, 120, 20],
    reloading: 0,
    fireCd: 0,
    muzzleFlash: 0,
    recoil: 0,
    walkBob: 0,
    scoped: false,
    hitMarker: 0,
    damageFlash: 0,
    alarmTimer: 0,
    kills: 0,
    camerasDisabled: 0,
    elapsed: 0,
    alertText: "INFILTRATE COMPOUND & HACK MAIN SERVER",
    alertTimer: 0,
    keys: {},
    mouseDown: false,
    ...createInitialEntities(),
  });

  const syncHud = useCallback(() => {
    const s = simRef.current;
    const distTerm = Math.hypot(s.px - s.terminal.x, s.py - s.terminal.y);
    const distExt = Math.hypot(s.px - s.extraction.x, s.py - s.extraction.y);
    setHud({
      hp: Math.max(0, Math.ceil(s.hp)),
      weaponId: s.weaponId,
      ammo: s.mags[s.weaponId],
      reserve: s.reserves[s.weaponId],
      reloading: s.reloading > 0,
      scoped: s.scoped,
      alarmActive: s.alarmTimer > 0,
      terminalHacked: s.terminal.hacked,
      hackProgress: Math.round(s.terminal.progress * 100),
      nearTerminal: !s.terminal.hacked && distTerm < 2.2,
      nearExtraction: s.terminal.hacked && distExt < 2.0,
      kills: s.kills,
      totalHostiles: 6,
      camerasDisabled: s.camerasDisabled,
      elapsed: Math.floor(s.elapsed),
      alertText: s.alertText,
    });
  }, []);

  const startMission = useCallback(() => {
    const s = simRef.current;
    Object.assign(s, {
      px: 2.2,
      py: 13.8,
      angle: -Math.PI / 2,
      hp: 100,
      weaponId: 0,
      mags: WEAPONS.map((w) => w.magSize),
      reserves: WEAPONS.map((w) => w.reserveStart),
      reloading: 0,
      fireCd: 0,
      muzzleFlash: 0,
      recoil: 0,
      walkBob: 0,
      scoped: false,
      hitMarker: 0,
      damageFlash: 0,
      alarmTimer: 0,
      kills: 0,
      camerasDisabled: 0,
      elapsed: 0,
      alertText: "OBJ 01: INFILTRATE & HACK SERVER TERMINAL (GREEN BEACON)",
      alertTimer: 4,
      mouseDown: false,
      ...createInitialEntities(),
    });
    setPhase("playing");
    syncHud();
    canvasRef.current?.requestPointerLock?.();
  }, [syncHud]);

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
    const onPl = () => setPointerLocked(document.pointerLockElement === canvasRef.current);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("pointerlockchange", onPl);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("pointerlockchange", onPl);
    };
  }, []);

  // Input Handlers
  useEffect(() => {
    const s = simRef.current;
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      s.keys[k] = true;
      if (phaseRef.current !== "playing") return;

      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        e.preventDefault();
      }
      if (k === "1" || k === "2" || k === "3") {
        const nextId = Number(k) - 1;
        if (nextId !== s.weaponId) {
          s.weaponId = nextId;
          s.reloading = 0;
          s.scoped = false;
          syncHud();
        }
      }
      if (k === "r") {
        const w = WEAPONS[s.weaponId];
        if (s.reloading <= 0 && s.mags[s.weaponId] < w.magSize && s.reserves[s.weaponId] > 0) {
          s.reloading = w.reloadTime;
          s.scoped = false;
          audioRef.current.reload(mutedRef.current);
          syncHud();
        }
      }
      if (k === "f" && s.weaponId === 2) {
        s.scoped = !s.scoped;
        syncHud();
      }
    };

    const onKeyUp = (e) => {
      s.keys[e.key.toLowerCase()] = false;
    };

    const onMouseMove = (e) => {
      if (phaseRef.current !== "playing") return;
      if (document.pointerLockElement === canvasRef.current) {
        const sens = s.scoped ? 0.0012 : 0.0026;
        s.angle += e.movementX * sens;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [syncHud]);

  // Main 60fps 3D Raycasting + Tactical AI Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(360, Math.floor(rect.width * dpr));
      canvas.height = Math.max(260, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.width = rect.width;
      simRef.current.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf;
    let last = performance.now();
    let hudTimer = 0;

    const fireWeapon = (s) => {
      const weapon = WEAPONS[s.weaponId];
      if (s.fireCd > 0 || s.reloading > 0) return;
      if (s.mags[s.weaponId] <= 0) {
        if (s.reserves[s.weaponId] > 0) {
          s.reloading = weapon.reloadTime;
          s.scoped = false;
          audioRef.current.reload(mutedRef.current);
        }
        return;
      }

      s.mags[s.weaponId] -= 1;
      s.fireCd = weapon.fireRate;
      s.muzzleFlash = 1;
      s.recoil = 1;
      audioRef.current.shoot(s.weaponId, mutedRef.current);

      // Alert nearby guards based on weapon noise (Silenced pistol stays stealthy!)
      for (const e of s.enemies) {
        if (!e.alive || e.kind === "camera") continue;
        const d = Math.hypot(e.x - s.px, e.y - s.py);
        if (d <= weapon.noiseRadius) {
          e.state = "combat";
        }
      }

      // Hitscan ray against visible enemies near crosshair center
      const fov = s.scoped && weapon.scopedFov ? weapon.scopedFov : Math.PI / 3;
      const maxAimAngle = (s.scoped ? 0.045 : 0.075) + weapon.spread;

      let bestTarget = null;
      let bestDist = Infinity;

      for (const e of s.enemies) {
        if (!e.alive) continue;
        const dx = e.x - s.px;
        const dy = e.y - s.py;
        const dist = Math.hypot(dx, dy);
        let relAngle = Math.atan2(dy, dx) - s.angle;
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        const angularHitbox = Math.atan2(e.kind === "camera" ? 0.25 : 0.34, Math.max(0.5, dist));
        if (Math.abs(relAngle) <= Math.max(maxAimAngle * (fov / (Math.PI / 3)), angularHitbox)) {
          if (dist < bestDist && hasLineOfSight(s.px, s.py, e.x, e.y)) {
            bestDist = dist;
            bestTarget = e;
          }
        }
      }

      if (bestTarget) {
        // Sniper / close precision bonus
        const dmg = weapon.damage * (s.scoped ? 1.35 : 1);
        bestTarget.hp -= dmg;
        bestTarget.hitFlash = 1;
        s.hitMarker = 1;
        audioRef.current.hit(mutedRef.current);

        if (bestTarget.kind !== "camera") {
          bestTarget.state = "combat";
        }

        if (bestTarget.hp <= 0) {
          bestTarget.alive = false;
          if (bestTarget.kind === "camera") {
            s.camerasDisabled++;
            s.alertText = "SECURITY CAMERA NEUTRALIZED — STEALTH MAINTAINED";
            s.alertTimer = 2.6;
          } else {
            s.kills++;
            s.alertText =
              bestTarget.kind === "heavy"
                ? "HEAVY TROOPER ELIMINATED"
                : "HOSTILE NEUTRALIZED";
            s.alertTimer = 2.0;
          }
        }
      }
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = simRef.current;
      const w = s.width;
      const h = s.height;

      if (phaseRef.current === "playing") {
        s.elapsed += dt;
        s.fireCd = Math.max(0, s.fireCd - dt);
        s.muzzleFlash = Math.max(0, s.muzzleFlash - dt * 11);
        s.recoil = Math.max(0, s.recoil - dt * 7);
        s.hitMarker = Math.max(0, s.hitMarker - dt * 5);
        s.damageFlash = Math.max(0, s.damageFlash - dt * 2.5);
        s.alarmTimer = Math.max(0, s.alarmTimer - dt);

        if (s.reloading > 0) {
          s.reloading -= dt;
          if (s.reloading <= 0) {
            const wp = WEAPONS[s.weaponId];
            const needed = wp.magSize - s.mags[s.weaponId];
            const take = Math.min(needed, s.reserves[s.weaponId]);
            s.mags[s.weaponId] += take;
            s.reserves[s.weaponId] -= take;
          }
        }

        // Keyboard turning fallback (ArrowLeft/ArrowRight or Q/C)
        const turnSpeed = s.scoped ? 1.15 : 2.35;
        if (s.keys["arrowleft"] || s.keys["q"]) s.angle -= turnSpeed * dt;
        if (s.keys["arrowright"]) s.angle += turnSpeed * dt;

        // Movement (WASD / ArrowUp / ArrowDown)
        let moveF = 0;
        let moveS = 0;
        if (s.keys["w"] || s.keys["arrowup"]) moveF += 1;
        if (s.keys["s"] || s.keys["arrowdown"]) moveF -= 1;
        if (s.keys["a"]) moveS -= 1;
        if (s.keys["d"]) moveS += 1;

        const moveSpeed = s.scoped ? 1.8 : s.keys["shift"] ? 4.4 : 3.2;
        if (moveF !== 0 || moveS !== 0) {
          const len = Math.hypot(moveF, moveS);
          moveF /= len;
          moveS /= len;
          const vx = (Math.cos(s.angle) * moveF - Math.sin(s.angle) * moveS) * moveSpeed * dt;
          const vy = (Math.sin(s.angle) * moveF + Math.cos(s.angle) * moveS) * moveSpeed * dt;
          const pad = 0.24;
          if (!isWall(s.px + vx + Math.sign(vx) * pad, s.py)) s.px += vx;
          if (!isWall(s.px, s.py + vy + Math.sign(vy) * pad)) s.py += vy;
          s.walkBob += dt * (s.keys["shift"] ? 12 : 8.5);
        }

        // Firing
        if (s.mouseDown || s.keys[" "]) {
          fireWeapon(s);
          if (!WEAPONS[s.weaponId].auto) {
            s.mouseDown = false;
          }
        }

        // Pickups (Medkits & Ammo)
        for (const pk of s.pickups) {
          if (pk.taken) continue;
          if (Math.hypot(pk.x - s.px, pk.y - s.py) < 0.85) {
            if (pk.kind === "medkit" && s.hp < 100) {
              pk.taken = true;
              s.hp = Math.min(100, s.hp + 40);
              s.alertText = "MEDKIT SYRINGE USED (+40 HP)";
              audioRef.current.pickup(mutedRef.current);
            } else if (pk.kind === "ammo") {
              pk.taken = true;
              s.reserves[0] += 24;
              s.reserves[1] += 60;
              s.reserves[2] += 10;
              s.alertText = "TACTICAL AMMO CRATE ACQUIRED";
              audioRef.current.pickup(mutedRef.current);
            }
          }
        }

        // Server Terminal Hacking Objective
        const distTerm = Math.hypot(s.px - s.terminal.x, s.py - s.terminal.y);
        if (!s.terminal.hacked && distTerm < 2.2) {
          if (s.keys["e"] || distTerm < 1.35) {
            s.terminal.progress = Math.min(1, s.terminal.progress + dt * 0.42);
            s.alertText = `HACKING MAIN SERVER... ${Math.round(s.terminal.progress * 100)}%`;
            if (s.terminal.progress >= 1) {
              s.terminal.hacked = true;
              s.alertText = "DATA UPLOADED! RETURN TO EXTRACTION BEACON (START ZONE)";
              audioRef.current.pickup(mutedRef.current);
              // Alert remaining guards on data breach!
              s.enemies.forEach((e) => {
                if (e.alive && e.kind !== "camera") e.state = "combat";
              });
            }
          }
        }

        // Extraction Check
        if (
          s.terminal.hacked &&
          Math.hypot(s.px - s.extraction.x, s.py - s.extraction.y) < 1.4
        ) {
          setPhase("victory");
          document.exitPointerLock?.();
          audioRef.current.pickup(mutedRef.current);
          syncHud();
        }

        // Guard & Camera AI
        for (const e of s.enemies) {
          if (!e.alive) continue;
          e.hitFlash = Math.max(0, e.hitFlash - dt * 7);
          const dx = s.px - e.x;
          const dy = s.py - e.y;
          const dist = Math.hypot(dx, dy);
          const canSee = dist < (e.kind === "camera" ? 6.5 : 8.5) && hasLineOfSight(e.x, e.y, s.px, s.py);

          if (e.kind === "camera") {
            if (canSee) {
              if (s.alarmTimer <= 0) {
                audioRef.current.alarm(mutedRef.current);
              }
              s.alarmTimer = 5.0;
              s.alertText = "CAMERA SPOTTED YOU! COMPOUND ALARM TRIGGERED!";
              s.enemies.forEach((other) => {
                if (other.alive && other.kind !== "camera" && Math.hypot(other.x - e.x, other.y - e.y) < 10) {
                  other.state = "combat";
                }
              });
            }
            continue;
          }

          if (canSee) {
            e.state = "combat";
          }

          if (e.state === "patrol") {
            const nx = e.x + Math.cos(e.dir) * e.speed * 0.55 * dt;
            const ny = e.y + Math.sin(e.dir) * e.speed * 0.55 * dt;
            if (!isWall(nx + Math.cos(e.dir) * 0.35, ny + Math.sin(e.dir) * 0.35)) {
              e.x = nx;
              e.y = ny;
            } else {
              e.dir += Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
            }
          } else if (e.state === "combat") {
            // Advance toward player until comfortable combat range
            if (dist > 3.2) {
              const mx = (dx / dist) * e.speed * dt;
              const my = (dy / dist) * e.speed * dt;
              if (!isWall(e.x + mx + Math.sign(mx) * 0.3, e.y)) e.x += mx;
              if (!isWall(e.x, e.y + my + Math.sign(my) * 0.3)) e.y += my;
            }
            // Shoot if line of sight clear
            if (canSee) {
              e.shootCd -= dt;
              if (e.shootCd <= 0) {
                e.shootCd = e.kind === "heavy" ? 0.72 : 1.05;
                audioRef.current.enemyShot(mutedRef.current);
                const hitChance = Math.max(0.25, 0.78 - dist * 0.055);
                if (Math.random() < hitChance) {
                  s.hp -= e.kind === "heavy" ? 11 : 7;
                  s.damageFlash = 1;
                  if (s.hp <= 0) {
                    s.hp = 0;
                    setPhase("failed");
                    document.exitPointerLock?.();
                    syncHud();
                  }
                }
              }
            }
          }
        }

        hudTimer += dt;
        if (hudTimer > 0.08) {
          hudTimer = 0;
          syncHud();
        }
      }

      // ================= RENDER 3D RAYCASTED WORLD =================
      const weapon = WEAPONS[s.weaponId];
      const fov = s.scoped && weapon.scopedFov ? weapon.scopedFov : Math.PI / 3;
      const halfH = h * 0.5;

      // Cold military night sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, halfH);
      sky.addColorStop(0, "#050712");
      sky.addColorStop(0.65, "#10162B");
      sky.addColorStop(1, "#1C1433");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, halfH);

      // Tactical concrete floor gradient
      const floor = ctx.createLinearGradient(0, halfH, 0, h);
      floor.addColorStop(0, "#090714");
      floor.addColorStop(0.35, "#141124");
      floor.addColorStop(1, "#1F1B33");
      ctx.fillStyle = floor;
      ctx.fillRect(0, halfH, w, halfH);

      // Cast rays across screen columns
      const stripWidth = 3;
      const numRays = Math.ceil(w / stripWidth);
      const zBuffer = new Float32Array(numRays);

      for (let i = 0; i < numRays; i++) {
        const cameraX = (2 * i) / numRays - 1;
        const rayAngle = s.angle + Math.atan(cameraX * Math.tan(fov / 2));
        const rayDx = Math.cos(rayAngle);
        const rayDy = Math.sin(rayAngle);

        let mapX = Math.floor(s.px);
        let mapY = Math.floor(s.py);
        const deltaX = Math.abs(1 / (rayDx || 1e-6));
        const deltaY = Math.abs(1 / (rayDy || 1e-6));

        let stepX, stepY, sideDistX, sideDistY;
        if (rayDx < 0) {
          stepX = -1;
          sideDistX = (s.px - mapX) * deltaX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1.0 - s.px) * deltaX;
        }
        if (rayDy < 0) {
          stepY = -1;
          sideDistY = (s.py - mapY) * deltaY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1.0 - s.py) * deltaY;
        }

        let hit = 0;
        let side = 0;
        let steps = 0;
        while (hit === 0 && steps < 32) {
          steps++;
          if (sideDistX < sideDistY) {
            sideDistX += deltaX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaY;
            mapY += stepY;
            side = 1;
          }
          if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) {
            hit = 1;
          } else if (MAP[mapY][mapX] > 0) {
            hit = MAP[mapY][mapX];
          }
        }

        const rawDist =
          side === 0
            ? (mapX - s.px + (1 - stepX) / 2) / (rayDx || 1e-6)
            : (mapY - s.py + (1 - stepY) / 2) / (rayDy || 1e-6);
        const perpDist = Math.max(0.1, rawDist * Math.cos(rayAngle - s.angle));
        zBuffer[i] = perpDist;

        const wallH = (h * 0.95) / perpDist;
        const drawTop = halfH - wallH / 2;

        // Texture stripe coordinate (0..1)
        const hitPos =
          side === 0 ? s.py + rawDist * rayDy : s.px + rawDist * rayDx;
        const texX = hitPos - Math.floor(hitPos);

        const shade = Math.max(0.14, 1 - perpDist / 15) * (side === 1 ? 0.76 : 1);
        let r = 56,
          g = 64,
          b = 92;
        if (hit === 2) {
          // Steel bulkhead with cyan vertical trim
          r = 38;
          g = 74;
          b = 104;
          if (texX < 0.08 || texX > 0.92) {
            r = 0;
            g = 212;
            b = 255;
          }
        } else if (hit === 3) {
          // Hazard military barrier (amber/magenta)
          r = 110;
          g = 52;
          b = 88;
          if (Math.floor(texX * 6) % 2 === 0) {
            r = 215;
            g = 115;
            b = 30;
          }
        } else if (hit === 4) {
          // Main Server Core (glowing emerald/cyan)
          r = 14;
          g = s.terminal.hacked ? 210 : 145;
          b = s.terminal.hacked ? 160 : 255;
        } else {
          // Concrete military compound block seams
          if (texX < 0.04 || texX > 0.96) {
            r = 28;
            g = 32;
            b = 48;
          }
        }

        ctx.fillStyle = `rgb(${Math.floor(r * shade)}, ${Math.floor(g * shade)}, ${Math.floor(b * shade)})`;
        ctx.fillRect(i * stripWidth, drawTop, stripWidth + 0.6, wallH);

        // Subtle glowing neon top trim on steel walls
        if (hit === 2 || hit === 4) {
          ctx.fillStyle = hit === 4 ? "rgba(52,211,153,0.7)" : "rgba(0,212,255,0.45)";
          ctx.fillRect(i * stripWidth, drawTop, stripWidth + 0.6, Math.max(2, wallH * 0.035));
        }
      }

      // ================= RENDER 3D BILLBOARD SPRITES (GUARDS, CAMERAS, PICKUPS, BEACONS) =================
      const sprites = [];
      for (const e of s.enemies) {
        if (e.alive) sprites.push({ ...e, dist: Math.hypot(e.x - s.px, e.y - s.py) });
      }
      for (const pk of s.pickups) {
        if (!pk.taken) sprites.push({ ...pk, dist: Math.hypot(pk.x - s.px, pk.y - s.py) });
      }
      if (!s.terminal.hacked) {
        sprites.push({
          kind: "objective",
          x: s.terminal.x,
          y: s.terminal.y,
          dist: Math.hypot(s.terminal.x - s.px, s.terminal.y - s.py),
        });
      } else {
        sprites.push({
          kind: "extraction",
          x: s.extraction.x,
          y: s.extraction.y,
          dist: Math.hypot(s.extraction.x - s.px, s.extraction.y - s.py),
        });
      }

      sprites.sort((a, b) => b.dist - a.dist);

      const tanHalfFov = Math.tan(fov / 2);

      for (const sp of sprites) {
        const dx = sp.x - s.px;
        const dy = sp.y - s.py;
        let relAngle = Math.atan2(dy, dx) - s.angle;
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        if (Math.abs(relAngle) > fov * 0.72) continue;
        const perp = Math.max(0.2, sp.dist * Math.cos(relAngle));
        const screenX = (w / 2) * (1 + Math.tan(relAngle) / tanHalfFov);
        const colIdx = Math.floor(screenX / stripWidth);
        if (colIdx < 0 || colIdx >= numRays) continue;
        if (perp > zBuffer[colIdx] + 0.15) continue;

        const size = (h * 0.85) / perp;

        ctx.save();
        if (sp.kind === "guard" || sp.kind === "heavy") {
          const isHeavy = sp.kind === "heavy";
          const topY = halfH - size * 0.45;
          const bodyW = size * (isHeavy ? 0.48 : 0.38);

          // Boots / legs
          ctx.fillStyle = "#161926";
          ctx.fillRect(screenX - bodyW * 0.36, topY + size * 0.56, bodyW * 0.28, size * 0.34);
          ctx.fillRect(screenX + bodyW * 0.08, topY + size * 0.56, bodyW * 0.28, size * 0.34);

          // Tactical armored torso
          ctx.fillStyle = sp.hitFlash > 0 ? "#FFFFFF" : isHeavy ? "#4C1D3D" : "#223042";
          ctx.strokeStyle = isHeavy ? "#FF8A1F" : sp.state === "combat" ? "#F012A8" : "#00D4FF";
          ctx.lineWidth = Math.max(1.2, size * 0.018);
          ctx.fillRect(screenX - bodyW / 2, topY + size * 0.18, bodyW, size * 0.42);
          ctx.strokeRect(screenX - bodyW / 2, topY + size * 0.18, bodyW, size * 0.42);

          // Helmet + glowing tactical visor
          const headR = size * 0.115;
          ctx.fillStyle = sp.hitFlash > 0 ? "#FFFFFF" : "#111522";
          ctx.beginPath();
          ctx.arc(screenX, topY + size * 0.1, headR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = sp.state === "combat" ? "#FF2E63" : "#00D4FF";
          ctx.fillRect(screenX - headR * 0.65, topY + size * 0.08, headR * 1.3, headR * 0.35);

          // Health bar above enemy
          if (sp.hp < sp.maxHp) {
            const bw = Math.max(24, bodyW * 1.1);
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(screenX - bw / 2, topY - 12, bw, 5);
            ctx.fillStyle = "#F012A8";
            ctx.fillRect(screenX - bw / 2, topY - 12, bw * (sp.hp / sp.maxHp), 5);
          }
        } else if (sp.kind === "camera") {
          const camY = halfH - size * 0.32;
          ctx.fillStyle = sp.hitFlash > 0 ? "#FFFFFF" : "#1D2234";
          ctx.fillRect(screenX - size * 0.14, camY, size * 0.28, size * 0.14);
          ctx.fillStyle = s.alarmTimer > 0 ? "#FF2E63" : "#FF8A1F";
          ctx.beginPath();
          ctx.arc(screenX, camY + size * 0.07, Math.max(3, size * 0.05), 0, Math.PI * 2);
          ctx.fill();
        } else if (sp.kind === "medkit" || sp.kind === "ammo") {
          const boxS = size * 0.24;
          const by = halfH + size * 0.22;
          ctx.fillStyle = sp.kind === "medkit" ? "#064E3B" : "#422006";
          ctx.strokeStyle = sp.kind === "medkit" ? "#34D399" : "#FFC247";
          ctx.lineWidth = 2;
          ctx.fillRect(screenX - boxS / 2, by, boxS, boxS * 0.78);
          ctx.strokeRect(screenX - boxS / 2, by, boxS, boxS * 0.78);
        } else if (sp.kind === "objective" || sp.kind === "extraction") {
          // Glowing vertical tactical beacon column
          const col = sp.kind === "objective" ? "rgba(0, 212, 255, 0.28)" : "rgba(52, 211, 153, 0.32)";
          ctx.fillStyle = col;
          ctx.fillRect(screenX - size * 0.15, halfH - size * 0.5, size * 0.3, size);
        }
        ctx.restore();
      }

      // ================= FIRST-PERSON WEAPON OR SNIPER SCOPE =================
      if (s.scoped && s.weaponId === 2) {
        // Authentic Project I.G.I. Dragunov Sniper Scope Overlay
        const radius = Math.min(w, h) * 0.42;
        ctx.save();
        ctx.fillStyle = "rgba(4, 6, 12, 0.94)";
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2, true);
        ctx.fill();

        // Scope glass tint & mil-dot crosshair
        ctx.strokeStyle = "#00D4FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(0, 212, 255, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(w / 2 - radius, h / 2);
        ctx.lineTo(w / 2 + radius, h / 2);
        ctx.moveTo(w / 2, h / 2 - radius);
        ctx.lineTo(w / 2, h / 2 + radius);
        ctx.stroke();

        // Mil-dot ticks
        for (let t = -3; t <= 3; t++) {
          if (t === 0) continue;
          ctx.fillStyle = "#FF3CC7";
          ctx.fillRect(w / 2 + t * 26 - 1.5, h / 2 - 4, 3, 8);
          ctx.fillRect(w / 2 - 4, h / 2 + t * 26 - 1.5, 8, 3);
        }

        ctx.fillStyle = "#FF2E63";
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Crisp Tactical Crosshair
        ctx.save();
        ctx.strokeStyle = s.hitMarker > 0 ? "#FF2E63" : "#00D4FF";
        ctx.lineWidth = 1.8;
        const gap = 7 + s.recoil * 8;
        ctx.beginPath();
        ctx.moveTo(w / 2 - gap - 9, h / 2);
        ctx.lineTo(w / 2 - gap, h / 2);
        ctx.moveTo(w / 2 + gap, h / 2);
        ctx.lineTo(w / 2 + gap + 9, h / 2);
        ctx.moveTo(w / 2, h / 2 - gap - 9);
        ctx.lineTo(w / 2, h / 2 - gap);
        ctx.moveTo(w / 2, h / 2 + gap);
        ctx.lineTo(w / 2, h / 2 + gap + 9);
        ctx.stroke();
        ctx.restore();

        // First-Person Weapon Model (bottom-right)
        const bobX = Math.cos(s.walkBob) * 7;
        const bobY = Math.abs(Math.sin(s.walkBob)) * 7 + s.recoil * 22 + (s.reloading > 0 ? 48 : 0);
        const gx = w * 0.68 + bobX;
        const gy = h - 108 + bobY;

        ctx.save();
        ctx.fillStyle = "#121521";
        ctx.strokeStyle = weapon.accent;
        ctx.lineWidth = 2;
        if (s.weaponId === 0) {
          // Silenced Pistol + Suppressor
          ctx.fillRect(gx - 20, gy - 12, 34, 90);
          ctx.fillRect(gx - 12, gy - 54, 18, 46);
          ctx.strokeRect(gx - 12, gy - 54, 18, 46);
        } else if (s.weaponId === 1) {
          // M4 Tactical Rifle
          ctx.fillRect(gx - 28, gy - 18, 52, 115);
          ctx.fillRect(gx - 10, gy - 72, 20, 58);
          ctx.strokeRect(gx - 28, gy - 18, 52, 115);
        } else {
          // Dragunov Sniper
          ctx.fillRect(gx - 24, gy - 14, 42, 115);
          ctx.fillRect(gx - 8, gy - 92, 14, 82);
          ctx.strokeRect(gx - 8, gy - 92, 14, 82);
        }

        if (s.muzzleFlash > 0.25) {
          ctx.fillStyle = s.weaponId === 0 ? "rgba(0,212,255,0.65)" : "rgba(255,194,71,0.9)";
          ctx.beginPath();
          ctx.arc(gx - 1, gy - (s.weaponId === 2 ? 96 : 64), 18 * s.muzzleFlash, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ================= TACTICAL SATELLITE RADAR (TOP-LEFT, I.G.I. STYLE) =================
      const radarSize = 132;
      const rx = 14;
      const ry = 14;
      const cell = radarSize / MAP_W;

      ctx.save();
      ctx.fillStyle = "rgba(5, 10, 18, 0.82)";
      ctx.strokeStyle = s.alarmTimer > 0 ? "#FF2E63" : "rgba(0, 212, 255, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(rx, ry, radarSize, radarSize);
      ctx.strokeRect(rx, ry, radarSize, radarSize);

      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          if (MAP[y][x] > 0) {
            ctx.fillStyle = MAP[y][x] === 4 ? "#34D399" : "rgba(120, 140, 180, 0.45)";
            ctx.fillRect(rx + x * cell, ry + y * cell, cell, cell);
          }
        }
      }

      // Objective / Extraction blip
      if (!s.terminal.hacked) {
        ctx.fillStyle = "#00D4FF";
        ctx.beginPath();
        ctx.arc(rx + s.terminal.x * cell, ry + s.terminal.y * cell, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#34D399";
        ctx.beginPath();
        ctx.arc(rx + s.extraction.x * cell, ry + s.extraction.y * cell, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Enemy & camera blips
      for (const e of s.enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = e.kind === "camera" ? "#FFC247" : "#FF2E63";
        ctx.beginPath();
        ctx.arc(rx + e.x * cell, ry + e.y * cell, e.kind === "heavy" ? 3.5 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player position + view cone
      const pRx = rx + s.px * cell;
      const pRy = ry + s.py * cell;
      ctx.fillStyle = "rgba(0, 212, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(pRx, pRy);
      ctx.arc(pRx, pRy, 22, s.angle - 0.45, s.angle + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(pRx, pRy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Damage Flash Vignette
      if (s.damageFlash > 0) {
        ctx.fillStyle = `rgba(220, 38, 38, ${s.damageFlash * 0.38})`;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [syncHud]);

  const activeWeapon = WEAPONS[hud.weaponId];

  return (
    <div
      ref={containerRef}
      className="neon-corridor-frame relative overflow-hidden rounded-[28px] border border-white/15 bg-[#06040D] shadow-2xl"
    >
      {/* Tactical Top HUD */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0617]/95 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <div className="w-24">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-ink-muted">HEALTH</span>
                <span className={hud.hp < 35 ? "text-rose-400" : "text-emerald-300"}>
                  {hud.hp}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all ${
                    hud.hp < 35 ? "bg-rose-500" : "bg-emerald-400"
                  }`}
                  style={{ width: `${hud.hp}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weapon Selector Pills */}
          <div className="flex items-center gap-1.5">
            {WEAPONS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                onClick={() => {
                  simRef.current.weaponId = wp.id;
                  simRef.current.reloading = 0;
                  simRef.current.scoped = false;
                  syncHud();
                }}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold transition ${
                  hud.weaponId === wp.id
                    ? "border-[#00D4FF] bg-[#00D4FF]/20 text-white"
                    : "border-white/10 bg-white/5 text-ink-muted hover:text-white"
                }`}
              >
                [{wp.key}] {wp.short}
              </button>
            ))}
          </div>

          <div className="font-mono text-xs">
            <span className="text-ink-muted">AMMO: </span>
            <span className="font-bold text-white">
              {hud.reloading ? "RELOADING..." : `${hud.ammo} / ${hud.reserve}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase ${
              hud.alarmActive
                ? "animate-pulse border-rose-500 bg-rose-500/20 text-rose-300"
                : hud.terminalHacked
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                : "border-[#00D4FF]/40 bg-[#00D4FF]/15 text-[#7EE8FF]"
            }`}
          >
            <Radio className="h-3 w-3" />
            {hud.alarmActive
              ? "ALARM ACTIVE"
              : hud.terminalHacked
              ? "EXTRACT NOW"
              : "STEALTH OPS"}
          </span>

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

      {/* 3D Viewport */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-64px)]" : "h-[64vh] min-h-[460px] max-h-[680px]"
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            if (phaseRef.current !== "playing") return;
            if (document.pointerLockElement !== canvasRef.current) {
              canvasRef.current?.requestPointerLock?.();
            }
            if (e.button === 2) {
              if (simRef.current.weaponId === 2) {
                simRef.current.scoped = !simRef.current.scoped;
                syncHud();
              }
              return;
            }
            simRef.current.mouseDown = true;
          }}
          onMouseUp={() => {
            simRef.current.mouseDown = false;
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full cursor-crosshair"
        />

        {/* Bottom Mission Comms Banner */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-xl border border-white/12 bg-black/70 px-3.5 py-2 font-mono text-[11px] text-[#7EE8FF] backdrop-blur-md">
              {hud.nearTerminal
                ? `HOLD [E] TO HACK SERVER (${hud.hackProgress}%)`
                : hud.alertText}
            </div>

            {!pointerLocked && (
              <div className="rounded-xl border border-[#FFC247]/40 bg-black/75 px-3 py-1.5 font-mono text-[10px] text-[#FFC247] backdrop-blur-md">
                Click screen to lock mouse aim • [1/2/3] Weapons • [R] Reload • Right-Click Sniper Scope
              </div>
            )}
          </div>
        )}

        {/* Mission Briefing Screen */}
        {phase === "briefing" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06040D]/84 p-6 text-center backdrop-blur-md">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/50 bg-[#00D4FF]/15 px-4 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#7EE8FF]">
              <Target className="h-3.5 w-3.5" />
              Project I.G.I. Inspired • 3D Tactical FPS
            </span>

            <h2 className="mt-4 font-display text-4xl font-extrabold text-white sm:text-5xl">
              OPERATION: <span className="text-neon-gradient">NEON I.G.I.</span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-secondary">
              Infiltrate the hostile compound using your silenced pistol, M4 rifle, and
              scoped Dragunov sniper. Shoot out security cameras, hack the{" "}
              <span className="text-[#00D4FF]">cyan server beacon</span>, and return to
              the extraction point alive.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 text-left font-mono text-[11px] text-ink-secondary sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <span className="text-[#00D4FF]">MOVE:</span> W A S D
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <span className="text-[#FF3CC7]">AIM/FIRE:</span> Mouse Click
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <span className="text-[#FFC247]">WEAPONS:</span> 1 / 2 / 3 • R
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                <span className="text-emerald-300">SCOPE / HACK:</span> RMB / E
              </div>
            </div>

            <button
              type="button"
              onClick={startMission}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full px-8 py-4 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Start Infiltration</span>
            </button>
          </div>
        )}

        {/* Mission Complete / Failed Overlays */}
        {(phase === "victory" || phase === "failed") && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06040D]/86 p-6 text-center backdrop-blur-md">
            <span
              className={`mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1 font-mono text-xs font-bold uppercase tracking-widest ${
                phase === "victory"
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                  : "border-rose-500/60 bg-rose-500/20 text-rose-300"
              }`}
            >
              {phase === "victory" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> MISSION ACCOMPLISHED
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" /> AGENT DOWN
                </>
              )}
            </span>

            <h3 className="font-display text-4xl font-extrabold text-white">
              {phase === "victory" ? "COMPOUND EXTRACTED" : "MISSION FAILED"}
            </h3>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
                <p className="font-mono text-[10px] text-ink-muted">HOSTILES</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FF3CC7]">
                  {hud.kills} / {hud.totalHostiles}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
                <p className="font-mono text-[10px] text-ink-muted">CAMERAS</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FFC247]">
                  {hud.camerasDisabled} / 2
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
                <p className="font-mono text-[10px] text-ink-muted">TIME</p>
                <p className="mt-1 font-display text-lg font-bold text-[#00D4FF]">
                  {hud.elapsed}s
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startMission}
              className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-heading text-sm font-bold text-white shadow-neon-magenta transition hover:scale-105"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Replay Mission</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Weapon Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#080514] px-5 py-2.5 font-mono text-[11px] text-ink-muted">
        <span>
          Equipped: <strong className="text-white">{activeWeapon.name}</strong>
          {activeWeapon.id === 0 ? " (Silenced Stealth)" : activeWeapon.id === 2 ? " (Right-Click / F to Zoom Scope)" : " (Full Auto)"}
        </span>
        <span>Radar: Cyan = Server • Green = Extract • Red = Guards • Yellow = Cameras</span>
      </div>
    </div>
  );
}
