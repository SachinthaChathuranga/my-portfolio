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
  ListChecks,
  ChevronRight,
  Eye,
  MapPin,
} from "lucide-react";
import { IGI_MISSIONS } from "./igiMissions";
import {
  TEX_SIZE,
  createWallTextures,
  drawFirstPersonWeapon,
  drawRealisticSoldier,
  roundRectPath,
} from "./igiTextures";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const PROGRESS_KEY = "smsc_igi_campaign_v2";

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage quota
  }
}

const WEAPONS = [
  {
    id: 0,
    key: "1",
    name: "SOCOM MK23 Silenced",
    short: "PISTOL",
    damage: 38,
    fireRate: 0.23,
    magSize: 12,
    reserveStart: 72,
    reloadTime: 1.0,
    spread: 0.011,
    noiseRadius: 2.2, // Near-silent stealth!
    scopedFov: null,
    auto: false,
    accent: "#00D4FF",
  },
  {
    id: 1,
    key: "2",
    name: "M4A1 Tactical Carbine",
    short: "M4 RIFLE",
    damage: 30,
    fireRate: 0.11,
    magSize: 30,
    reserveStart: 120,
    reloadTime: 1.45,
    spread: 0.024,
    noiseRadius: 9.5,
    scopedFov: null,
    auto: true,
    accent: "#FF8A1F",
  },
  {
    id: 2,
    key: "3",
    name: "Dragunov SVD Sniper",
    short: "SNIPER",
    damage: 115,
    fireRate: 0.85,
    magSize: 5,
    reserveStart: 20,
    reloadTime: 1.8,
    spread: 0.002,
    noiseRadius: 11.5,
    scopedFov: 0.34, // High-zoom PSO-1 optical scope!
    auto: false,
    accent: "#F012A8",
  },
];

function createTacticalAudio() {
  let ctx = null;
  const getCtx = () => {
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

  const noiseBurst = (dur, freqStart, freqEnd, vol) => {
    try {
      const c = getCtx();
      if (!c) return;
      const now = c.currentTime;
      const len = Math.max(256, Math.floor((c.sampleRate || 44100) * dur));
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.0);
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
    } catch {
      // ignore
    }
  };

  return {
    shoot(weaponId, muted) {
      if (muted) return;
      if (weaponId === 0) noiseBurst(0.08, 2300, 680, 0.14);
      else if (weaponId === 1) noiseBurst(0.11, 1450, 230, 0.22);
      else noiseBurst(0.28, 920, 90, 0.34);
    },
    enemyShot(muted) {
      if (muted) return;
      noiseBurst(0.1, 1150, 210, 0.14);
    },
    reload(muted) {
      try {
        if (muted) return;
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        [340, 520, 660].forEach((f, idx) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now + idx * 0.1);
          g.gain.setValueAtTime(0.075, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.08);
          osc.connect(g).connect(c.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.09);
        });
      } catch {
        // ignore
      }
    },
    hit(muted, headshot = false) {
      try {
        if (muted) return;
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = headshot ? "triangle" : "sine";
        osc.frequency.setValueAtTime(headshot ? 1320 : 760, now);
        osc.frequency.exponentialRampToValueAtTime(headshot ? 640 : 320, now + 0.07);
        g.gain.setValueAtTime(headshot ? 0.14 : 0.095, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(g).connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.085);
      } catch {
        // ignore
      }
    },
    alarm(muted) {
      try {
        if (muted) return;
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(620, now + 0.14);
        g.gain.setValueAtTime(0.085, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g).connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch {
        // ignore
      }
    },
    pickup(muted) {
      try {
        if (muted) return;
        const c = getCtx();
        if (!c) return;
        const now = c.currentTime;
        [523, 784, 1046].forEach((f, idx) => {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now + idx * 0.065);
          g.gain.setValueAtTime(0.085, now + idx * 0.065);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.14);
          osc.connect(g).connect(c.destination);
          osc.start(now + idx * 0.065);
          osc.stop(now + idx * 0.065 + 0.15);
        });
      } catch {
        // ignore
      }
    },
  };
}

function isWallAt(map, x, y) {
  const my = Math.floor(y);
  const mx = Math.floor(x);
  if (my < 0 || mx < 0 || my >= map.length || mx >= map[0].length) return true;
  return map[my][mx] > 0;
}

function hasLineOfSight(map, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(dist * 7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWallAt(map, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

function buildMissionRuntime(mission) {
  return {
    mission,
    map: mission.map,
    px: mission.playerStart.x,
    py: mission.playerStart.y,
    angle: mission.playerStart.angle,
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
    crouched: false,
    crouchLerp: 0,
    hitMarker: 0,
    headshotFlash: 0,
    damageFlash: 0,
    alarmTimer: 0,
    alarmsTriggered: 0,
    kills: 0,
    headshots: 0,
    camerasDisabled: 0,
    elapsed: 0,
    alertText: `DEPLOYED: ${mission.title.toUpperCase()} — COMPLETE ALL OBJECTIVES`,
    alertTimer: 4,
    mouseDown: false,
    tracers: [],
    enemies: mission.enemies.map((e) => ({
      ...e,
      maxHp: e.hp,
      state: e.kind === "camera" ? "scan" : "patrol",
      shootCd: 0.7 + Math.random() * 0.7,
      hitFlash: 0,
      muzzleFlash: 0,
      alertPop: 0,
      walkCycle: Math.random() * Math.PI * 2,
      alive: true,
      deathAnim: 0,
    })),
    pickups: mission.pickups.map((pk) => ({ ...pk, taken: false })),
    objectives: mission.objectives.map((o) => ({
      ...o,
      completed: false,
      progress: 0,
    })),
    extraction: { ...mission.extraction },
    weatherParticles: Array.from({ length: 75 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.4 + Math.random() * 0.8,
      size: 1.2 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 0.2,
    })),
  };
}

export default function TacticalIgi3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const texturesRef = useRef(null);

  if (!audioRef.current) audioRef.current = createTacticalAudio();

  const [selectedMissionIdx, setSelectedMissionIdx] = useState(0);
  const [campaignProgress, setCampaignProgress] = useState(() => loadProgress());
  const [phase, setPhase] = useState("briefing"); // "briefing" | "playing" | "victory" | "failed"
  const [muted, setMuted] = useState(false);
  const [nvg, setNvg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

  const selectedMission = IGI_MISSIONS[selectedMissionIdx] || IGI_MISSIONS[0];

  const [hud, setHud] = useState(() => ({
    hp: 100,
    weaponId: 0,
    ammo: 12,
    reserve: 72,
    reloading: false,
    scoped: false,
    crouched: false,
    alarmActive: false,
    allObjectivesDone: false,
    objectives: selectedMission.objectives.map((o) => ({
      id: o.id,
      label: o.label,
      completed: false,
      progress: 0,
      dist: 0,
    })),
    nearInteract: null,
    kills: 0,
    headshots: 0,
    totalHostiles: selectedMission.enemies.filter((e) => e.kind !== "camera").length,
    camerasDisabled: 0,
    totalCameras: selectedMission.enemies.filter((e) => e.kind === "camera").length,
    alarmsTriggered: 0,
    elapsed: 0,
    rank: "A",
    alertText: "SELECT MISSION & DEPLOY",
  }));

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const nvgRef = useRef(nvg);
  nvgRef.current = nvg;
  const missionIdxRef = useRef(selectedMissionIdx);
  missionIdxRef.current = selectedMissionIdx;

  const simRef = useRef(null);
  if (!simRef.current) {
    simRef.current = {
      width: 960,
      height: 540,
      keys: {},
      codes: {},
      dragging: false,
      lastDragX: 0,
      ...buildMissionRuntime(IGI_MISSIONS[0]),
    };
  }

  const syncHud = useCallback((finalRank = "A") => {
    const s = simRef.current;
    if (!s) return;
    const totalHostiles = s.enemies.filter((e) => e.kind !== "camera").length;
    const totalCameras = s.enemies.filter((e) => e.kind === "camera").length;
    const allObjectivesDone = s.objectives.every((o) => o.completed);

    let nearInteract = null;
    const objSummaries = s.objectives.map((o) => {
      let ox = o.x;
      let oy = o.y;
      if (o.type === "eliminate" && o.targetId) {
        const t = s.enemies.find((e) => e.id === o.targetId);
        if (t && t.alive) {
          ox = t.x;
          oy = t.y;
        }
      }
      const dist = Math.hypot(ox - s.px, oy - s.py);
      if (!o.completed && o.type === "interact" && dist < 2.25) {
        nearInteract = {
          label: o.label,
          verb: o.actionVerb,
          progress: Math.round(o.progress * 100),
        };
      }
      return {
        id: o.id,
        label: o.label,
        completed: o.completed,
        progress: Math.round(o.progress * 100),
        dist: Math.round(dist * 3.5),
      };
    });

    setHud({
      hp: Math.max(0, Math.ceil(s.hp)),
      weaponId: s.weaponId,
      ammo: s.mags[s.weaponId],
      reserve: s.reserves[s.weaponId],
      reloading: s.reloading > 0,
      scoped: s.scoped,
      crouched: s.crouched,
      alarmActive: s.alarmTimer > 0,
      allObjectivesDone,
      objectives: objSummaries,
      nearInteract,
      kills: s.kills,
      headshots: s.headshots,
      totalHostiles,
      camerasDisabled: s.camerasDisabled,
      totalCameras,
      alarmsTriggered: s.alarmsTriggered,
      elapsed: Math.floor(s.elapsed),
      rank: finalRank,
      alertText: s.alertText,
    });
  }, []);

  const selectMissionPreview = useCallback(
    (idx) => {
      const m = IGI_MISSIONS[idx] || IGI_MISSIONS[0];
      setSelectedMissionIdx(idx);
      missionIdxRef.current = idx;
      // Auto-enable NVG hint only off by default so user sees real lighting first
      setNvg(false);
      nvgRef.current = false;
      Object.assign(simRef.current, buildMissionRuntime(m));
      phaseRef.current = "briefing";
      setPhase("briefing");
      document.exitPointerLock?.();
      syncHud();
    },
    [syncHud]
  );

  const startMission = useCallback(
    (overrideIdx = null) => {
      const idx = typeof overrideIdx === "number" ? overrideIdx : missionIdxRef.current;
      const m = IGI_MISSIONS[idx] || IGI_MISSIONS[0];
      setSelectedMissionIdx(idx);
      missionIdxRef.current = idx;
      const rt = buildMissionRuntime(m);
      Object.assign(simRef.current, {
        ...rt,
        keys: {},
        codes: {},
        dragging: false,
      });

      phaseRef.current = "playing";
      setPhase("playing");
      syncHud();

      try {
        canvasRef.current?.requestPointerLock?.();
      } catch {
        // ignore pointer lock denial
      }
    },
    [syncHud]
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
    const onPl = () => setPointerLocked(document.pointerLockElement === canvasRef.current);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("pointerlockchange", onPl);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("pointerlockchange", onPl);
    };
  }, []);

  // Keyboard + Pointer Lock Aim Listeners (supports e.code + e.key across all keyboard layouts)
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

      if (k === "1" || k === "2" || k === "3" || c === "Digit1" || c === "Digit2" || c === "Digit3") {
        const nextId = c === "Digit1" || k === "1" ? 0 : c === "Digit2" || k === "2" ? 1 : 2;
        if (nextId !== s.weaponId) {
          s.weaponId = nextId;
          s.reloading = 0;
          s.scoped = false;
          syncHud();
        }
      }
      if (k === "r" || c === "KeyR") {
        const w = WEAPONS[s.weaponId];
        if (s.reloading <= 0 && s.mags[s.weaponId] < w.magSize && s.reserves[s.weaponId] > 0) {
          s.reloading = w.reloadTime;
          s.scoped = false;
          audioRef.current?.reload(mutedRef.current);
          syncHud();
        }
      }
      if ((k === "f" || c === "KeyF") && s.weaponId === 2) {
        s.scoped = !s.scoped;
        syncHud();
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
      if (document.pointerLockElement === canvasRef.current) {
        const sens = s.scoped ? 0.0012 : 0.0025;
        s.angle += e.movementX * sens;
      } else if (s.dragging) {
        const dx = e.clientX - s.lastDragX;
        s.lastDragX = e.clientX;
        s.angle += dx * (s.scoped ? 0.0022 : 0.0045);
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
  }, [syncHud]);

  // Main 60fps 3D Textured Raycasting + Tactical AI Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!texturesRef.current) {
      texturesRef.current = createWallTextures();
    }
    const wallTextures = texturesRef.current;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.floor(rect.width || canvas.parentElement?.clientWidth || 960));
      const cssH = Math.max(260, Math.floor(rect.height || canvas.parentElement?.clientHeight || 540));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const tw = Math.floor(cssW * dpr);
      const th = Math.floor(cssH * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.width = cssW;
      simRef.current.height = cssH;
    };
    resize();
    window.addEventListener("resize", resize);
    let ro = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement);
    }

    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;

    const fireWeapon = (s) => {
      const weapon = WEAPONS[s.weaponId];
      if (s.fireCd > 0 || s.reloading > 0) return;
      if (s.mags[s.weaponId] <= 0) {
        if (s.reserves[s.weaponId] > 0) {
          s.reloading = weapon.reloadTime;
          s.scoped = false;
          audioRef.current?.reload(mutedRef.current);
        }
        return;
      }

      s.mags[s.weaponId] -= 1;
      s.fireCd = weapon.fireRate;
      s.muzzleFlash = 1;
      s.recoil = 1;
      audioRef.current?.shoot(s.weaponId, mutedRef.current);

      // Noise alerting (SOCOM Silenced Pistol keeps guards unaware!)
      for (const e of s.enemies) {
        if (!e.alive || e.kind === "camera") continue;
        const d = Math.hypot(e.x - s.px, e.y - s.py);
        if (d <= weapon.noiseRadius) {
          e.state = "combat";
          e.alertPop = 1.6;
        }
      }

      // Hitscan Precision Check (with Headshot bonus for tight aim!)
      const fov = s.scoped && weapon.scopedFov ? weapon.scopedFov : Math.PI / 3;
      const spreadFactor = s.crouched ? 0.65 : 1;
      const maxAimAngle = (s.scoped ? 0.042 : 0.072) + weapon.spread * spreadFactor;

      let bestTarget = null;
      let bestDist = Infinity;
      let bestAngleErr = 99;

      for (const e of s.enemies) {
        if (!e.alive) continue;
        const dx = e.x - s.px;
        const dy = e.y - s.py;
        const dist = Math.hypot(dx, dy);
        let relAngle = Math.atan2(dy, dx) - s.angle;
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        const angularHitbox = Math.atan2(
          e.kind === "camera" ? 0.26 : e.kind === "heavy" ? 0.38 : 0.33,
          Math.max(0.45, dist)
        );
        const absErr = Math.abs(relAngle);
        if (absErr <= Math.max(maxAimAngle * (fov / (Math.PI / 3)), angularHitbox)) {
          if (dist < bestDist && hasLineOfSight(s.map, s.px, s.py, e.x, e.y)) {
            bestDist = dist;
            bestTarget = e;
            bestAngleErr = absErr;
          }
        }
      }

      if (bestTarget) {
        const isHeadshot =
          bestTarget.kind !== "camera" &&
          (s.scoped || bestAngleErr < Math.atan2(0.11, Math.max(0.8, bestDist)));
        const dmg = weapon.damage * (isHeadshot ? 2.1 : 1) * (s.scoped ? 1.25 : 1);
        bestTarget.hp -= dmg;
        bestTarget.hitFlash = 1;
        s.hitMarker = 1;
        if (isHeadshot) s.headshotFlash = 1;
        audioRef.current?.hit(mutedRef.current, isHeadshot);

        if (bestTarget.kind !== "camera") {
          bestTarget.state = "combat";
          bestTarget.alertPop = 1.6;
        }

        if (bestTarget.hp <= 0) {
          bestTarget.alive = false;
          bestTarget.deathAnim = 0.05;
          if (bestTarget.kind === "camera") {
            s.camerasDisabled++;
            s.alertText = "CCTV CAMERA DESTROYED — STEALTH PRESERVED";
            s.alertTimer = 2.6;
          } else {
            s.kills++;
            if (isHeadshot) s.headshots++;
            const classLabel =
              bestTarget.kind === "officer"
                ? "WARLORD COMMANDER ELIMINATED!"
                : bestTarget.kind === "heavy"
                ? "HEAVY TROOPER DOWN"
                : bestTarget.kind === "sniper"
                ? "ENEMY SNIPER ELIMINATED"
                : "SOLDIER NEUTRALIZED";
            s.alertText = isHeadshot ? `HEADSHOT! ${classLabel}` : classLabel;
            s.alertTimer = 2.2;

            // Check if any eliminate objective was just completed
            for (const o of s.objectives) {
              if (o.type === "eliminate" && o.targetId === bestTarget.id && !o.completed) {
                o.completed = true;
                o.progress = 1;
                audioRef.current?.pickup(mutedRef.current);
              }
            }
          }
        }
      }
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);

      try {
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        const s = simRef.current;
        if (!s) return;

        if (!s.width || s.width < 50 || !s.height || s.height < 50) {
          resize();
        }
        const w = Math.max(320, s.width);
        const h = Math.max(260, s.height);
        const biome = s.mission.biome;

        // Smooth camera rotation preview while on Mission Briefing screen
        if (phaseRef.current === "briefing") {
          s.angle += dt * 0.22;
        }

        // Animate ambient weather (snow / desert dust / storm rain)
        for (const wp of s.weatherParticles) {
          wp.y += dt * (biome.weather === "rain" ? 1.8 : 0.24) * wp.speed;
          wp.x += dt * (biome.weather === "dust" ? 0.35 : wp.drift);
          if (wp.y > 1) {
            wp.y = 0;
            wp.x = Math.random();
          }
          if (wp.x > 1) wp.x -= 1;
          if (wp.x < 0) wp.x += 1;
        }

        if (phaseRef.current === "playing") {
          s.elapsed += dt;
          s.fireCd = Math.max(0, s.fireCd - dt);
          s.muzzleFlash = Math.max(0, s.muzzleFlash - dt * 11);
          s.recoil = Math.max(0, s.recoil - dt * 7.5);
          s.hitMarker = Math.max(0, s.hitMarker - dt * 5);
          s.headshotFlash = Math.max(0, s.headshotFlash - dt * 2.2);
          s.damageFlash = Math.max(0, s.damageFlash - dt * 2.6);
          s.alarmTimer = Math.max(0, s.alarmTimer - dt);
          s.crouchLerp += ((s.crouched ? 1 : 0) - s.crouchLerp) * Math.min(1, dt * 10);

          // Update enemy bullet tracers
          for (let ti = s.tracers.length - 1; ti >= 0; ti--) {
            s.tracers[ti].life -= dt * 6;
            if (s.tracers[ti].life <= 0) s.tracers.splice(ti, 1);
          }

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

          // Keyboard turning fallback (ArrowLeft / ArrowRight / Q)
          const turnSpeed = s.scoped ? 1.1 : 2.3;
          if (s.keys["arrowleft"] || s.codes["ArrowLeft"] || s.keys["q"] || s.codes["KeyQ"]) {
            s.angle -= turnSpeed * dt;
          }
          if (s.keys["arrowright"] || s.codes["ArrowRight"]) {
            s.angle += turnSpeed * dt;
          }

          // Tactical Movement (WASD / ArrowUp / ArrowDown + Sprint + Stealth Crouch)
          let moveF = 0;
          let moveS = 0;
          if (s.keys["w"] || s.codes["KeyW"] || s.keys["arrowup"] || s.codes["ArrowUp"]) moveF += 1;
          if (s.keys["s"] || s.codes["KeyS"] || s.keys["arrowdown"] || s.codes["ArrowDown"]) moveF -= 1;
          if (s.keys["a"] || s.codes["KeyA"]) moveS -= 1;
          if (s.keys["d"] || s.codes["KeyD"]) moveS += 1;

          const sprinting = Boolean(s.keys["shift"] || s.codes["ShiftLeft"] || s.codes["ShiftRight"]);
          const moveSpeed = s.scoped ? 1.6 : s.crouched ? 1.9 : sprinting ? 4.35 : 3.15;

          if (moveF !== 0 || moveS !== 0) {
            const len = Math.hypot(moveF, moveS);
            moveF /= len;
            moveS /= len;
            const vx = (Math.cos(s.angle) * moveF - Math.sin(s.angle) * moveS) * moveSpeed * dt;
            const vy = (Math.sin(s.angle) * moveF + Math.cos(s.angle) * moveS) * moveSpeed * dt;
            const pad = 0.25;
            if (!isWallAt(s.map, s.px + vx + Math.sign(vx) * pad, s.py)) s.px += vx;
            if (!isWallAt(s.map, s.px, s.py + vy + Math.sign(vy) * pad)) s.py += vy;
            s.walkBob += dt * (sprinting ? 12 : s.crouched ? 5.5 : 8.5);
          }

          // Firing
          if (s.mouseDown || s.keys[" "] || s.codes["Space"]) {
            fireWeapon(s);
            if (!WEAPONS[s.weaponId].auto) {
              s.mouseDown = false;
            }
          }

          // Military Pickups (Medkits & Ammo Crates)
          for (const pk of s.pickups) {
            if (pk.taken) continue;
            if (Math.hypot(pk.x - s.px, pk.y - s.py) < 0.9) {
              if (pk.kind === "medkit" && s.hp < 100) {
                pk.taken = true;
                s.hp = Math.min(100, s.hp + 45);
                s.alertText = "FIRST-AID SYRINGE APPLIED (+45% HEALTH)";
                audioRef.current?.pickup(mutedRef.current);
              } else if (pk.kind === "ammo") {
                pk.taken = true;
                s.reserves[0] += 24;
                s.reserves[1] += 60;
                s.reserves[2] += 10;
                s.alertText = "MILITARY AMMO CRATE RESUPPLIED";
                audioRef.current?.pickup(mutedRef.current);
              }
            }
          }

          // Multi-Stage Interact Objectives (Hack / Plant C4 / Decrypt / Extract Core)
          const holdingE = Boolean(s.keys["e"] || s.codes["KeyE"]);
          for (const obj of s.objectives) {
            if (obj.completed || obj.type !== "interact") continue;
            const distObj = Math.hypot(s.px - obj.x, s.py - obj.y);
            if (distObj < 2.25 && (holdingE || distObj < 1.35)) {
              obj.progress = Math.min(1, obj.progress + dt / (obj.duration || 2.2));
              s.alertText = `${obj.actionVerb}... ${Math.round(obj.progress * 100)}%`;
              if (obj.progress >= 1) {
                obj.completed = true;
                audioRef.current?.pickup(mutedRef.current);
                const allDone = s.objectives.every((o) => o.completed);
                s.alertText = allDone
                  ? `ALL OBJECTIVES COMPLETE! PROCEED TO ${s.extraction.label}`
                  : `OBJECTIVE COMPLETE: ${obj.label.toUpperCase()}!`;
                // Nearby guards respond to security breach
                s.enemies.forEach((en) => {
                  if (en.alive && en.kind !== "camera" && Math.hypot(en.x - obj.x, en.y - obj.y) < 9.5) {
                    en.state = "combat";
                    en.alertPop = 2.0;
                  }
                });
              }
            }
          }

          // Extraction Zone Victory Check
          const allObjectivesDone = s.objectives.every((o) => o.completed);
          if (
            allObjectivesDone &&
            Math.hypot(s.px - s.extraction.x, s.py - s.extraction.y) < 1.5
          ) {
            const rank =
              s.alarmsTriggered === 0 && s.hp >= 65
                ? "S"
                : s.hp >= 40
                ? "A"
                : "B";

            // Persist campaign progress
            const nextProg = {
              ...loadProgress(),
              [s.mission.id]: {
                cleared: true,
                bestTime: Math.min(
                  loadProgress()[s.mission.id]?.bestTime || 9999,
                  Math.floor(s.elapsed)
                ),
                rank,
              },
            };
            saveProgress(nextProg);
            setCampaignProgress(nextProg);

            phaseRef.current = "victory";
            setPhase("victory");
            document.exitPointerLock?.();
            audioRef.current?.pickup(mutedRef.current);
            syncHud(rank);
          }

          // Soldier & Camera Tactical AI
          const stealthMult = s.crouched ? 0.68 : 1;
          for (const e of s.enemies) {
            if (!e.alive) {
              if (e.deathAnim < 1) e.deathAnim = Math.min(1, e.deathAnim + dt * 2.8);
              continue;
            }
            e.hitFlash = Math.max(0, e.hitFlash - dt * 7);
            e.muzzleFlash = Math.max(0, e.muzzleFlash - dt * 10);
            e.alertPop = Math.max(0, e.alertPop - dt);

            const dx = s.px - e.x;
            const dy = s.py - e.y;
            const dist = Math.hypot(dx, dy);
            const visionRange =
              (e.kind === "camera" ? 6.4 : e.kind === "sniper" ? 11.5 : 8.5) * stealthMult;
            const canSee = dist < visionRange && hasLineOfSight(s.map, e.x, e.y, s.px, s.py);

            if (e.kind === "camera") {
              e.dir += dt * 0.85;
              if (canSee) {
                if (s.alarmTimer <= 0) {
                  s.alarmsTriggered++;
                  audioRef.current?.alarm(mutedRef.current);
                }
                s.alarmTimer = 5.5;
                s.alertText = "SECURITY CAMERA SPOTTED YOU! BASE ALARM ACTIVE!";
                s.enemies.forEach((other) => {
                  if (other.alive && other.kind !== "camera" && Math.hypot(other.x - e.x, other.y - e.y) < 10.5) {
                    other.state = "combat";
                    other.alertPop = 1.8;
                  }
                });
              }
              continue;
            }

            if (canSee && e.state !== "combat") {
              e.state = "combat";
              e.alertPop = 2.0;
            }

            if (e.state === "patrol") {
              const nx = e.x + Math.cos(e.dir) * e.speed * 0.52 * dt;
              const ny = e.y + Math.sin(e.dir) * e.speed * 0.52 * dt;
              if (!isWallAt(s.map, nx + Math.cos(e.dir) * 0.36, ny + Math.sin(e.dir) * 0.36)) {
                e.x = nx;
                e.y = ny;
                e.walkCycle += dt * 5.2;
              } else {
                e.dir += Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
              }
            } else if (e.state === "combat") {
              const idealRange = e.kind === "sniper" ? 6.5 : 3.2;
              if (dist > idealRange) {
                const mx = (dx / dist) * e.speed * dt;
                const my = (dy / dist) * e.speed * dt;
                if (!isWallAt(s.map, e.x + mx + Math.sign(mx) * 0.3, e.y)) e.x += mx;
                if (!isWallAt(s.map, e.x, e.y + my + Math.sign(my) * 0.3)) e.y += my;
                e.walkCycle += dt * 7.8;
              }

              if (canSee) {
                e.shootCd -= dt;
                if (e.shootCd <= 0) {
                  e.shootCd =
                    e.kind === "heavy"
                      ? 0.68
                      : e.kind === "officer"
                      ? 0.72
                      : e.kind === "sniper"
                      ? 1.55
                      : 1.05;
                  e.muzzleFlash = 1;
                  audioRef.current?.enemyShot(mutedRef.current);

                  // Visual incoming tracer line
                  s.tracers.push({
                    x: w * (0.35 + Math.random() * 0.3),
                    y: h * (0.4 + Math.random() * 0.2),
                    life: 1,
                  });

                  const crouchDodge = s.crouched ? 0.78 : 1;
                  const hitChance = Math.max(0.22, (0.76 - dist * 0.052) * crouchDodge);
                  if (Math.random() < hitChance) {
                    const dmg =
                      e.kind === "sniper"
                        ? 16
                        : e.kind === "officer"
                        ? 13
                        : e.kind === "heavy"
                        ? 11
                        : 7;
                    s.hp -= dmg;
                    s.damageFlash = 1;
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

          hudTimer += dt;
          if (hudTimer > 0.075) {
            hudTimer = 0;
            syncHud();
          }
        }

        // ================= RENDER REALISTIC 3D MILITARY WORLD =================
        const weapon = WEAPONS[s.weaponId];
        const fov = s.scoped && weapon.scopedFov ? weapon.scopedFov : Math.PI / 3;
        const crouchShift = s.crouchLerp * h * 0.085;
        const halfH = h * 0.5 + crouchShift;

        // 1. Atmospheric Biome Skybox + Sun/Moon + Parallax Mountains + Military Horizon Silhouettes
        const sky = ctx.createLinearGradient(0, 0, 0, halfH + 8);
        sky.addColorStop(0, biome.skyTop);
        sky.addColorStop(0.55, biome.skyMid);
        sky.addColorStop(1, biome.skyHorizon);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, halfH + 8);

        // Directional Sun / Moon Halo rotating with player look angle
        const wrapSpan = Math.max(400, w * 2.4);
        const angleRatio = (((s.angle / (Math.PI * 2)) % 1) + 1) % 1;
        const sunX = (((0.65 - angleRatio) * wrapSpan) % wrapSpan + wrapSpan) % wrapSpan - w * 0.4;
        const sunG = ctx.createRadialGradient(sunX, halfH * 0.48, 8, sunX, halfH * 0.48, 150);
        sunG.addColorStop(0, biome.sunColor);
        sunG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunG;
        ctx.fillRect(0, 0, w, halfH);

        // Sweeping Midnight Searchlights in Mission 4 (Blacksite Night Raid)
        if (biome.id === "night") {
          ctx.save();
          for (let sl = 0; sl < 2; sl++) {
            const beamBaseX = w * (0.25 + sl * 0.5);
            const sweep = Math.sin(now * 0.0008 + sl * 2.2) * 140;
            const bg = ctx.createLinearGradient(beamBaseX, halfH, beamBaseX + sweep, 0);
            bg.addColorStop(0, "rgba(186, 230, 253, 0.22)");
            bg.addColorStop(1, "rgba(186, 230, 253, 0)");
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(beamBaseX - 8, halfH);
            ctx.lineTo(beamBaseX + sweep - 55, 0);
            ctx.lineTo(beamBaseX + sweep + 55, 0);
            ctx.lineTo(beamBaseX + 8, halfH);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        // Parallax Distant Mountain Range + Watchtower / Radar Dish Silhouettes
        ctx.save();
        const mShift = -angleRatio * w * 2.2;
        for (let pass = -1; pass <= 2; pass++) {
          const baseX = mShift + pass * w * 1.1;
          // Far ridge
          ctx.fillStyle = biome.mountainFar;
          ctx.beginPath();
          ctx.moveTo(baseX, halfH + 4);
          for (let i = 0; i <= 8; i++) {
            const mx = baseX + (i / 8) * (w * 1.1);
            const mh = 26 + Math.abs(Math.sin(i * 1.9 + 0.5)) * 56;
            ctx.lineTo(mx, halfH - mh);
          }
          ctx.lineTo(baseX + w * 1.1, halfH + 4);
          ctx.closePath();
          ctx.fill();

          // Near ridge + Military Radio Mast & Watchtower silhouettes
          ctx.fillStyle = biome.mountainNear;
          ctx.beginPath();
          ctx.moveTo(baseX, halfH + 4);
          for (let i = 0; i <= 8; i++) {
            const mx = baseX + (i / 8) * (w * 1.1);
            const mh = 12 + Math.abs(Math.cos(i * 2.4)) * 28;
            ctx.lineTo(mx, halfH - mh);
          }
          ctx.lineTo(baseX + w * 1.1, halfH + 4);
          ctx.closePath();
          ctx.fill();

          // Silhouetted Military Communications Tower + Blinking Aviation Red Light
          const towerX = baseX + w * 0.36;
          ctx.fillStyle = biome.mountainNear;
          ctx.fillRect(towerX - 2, halfH - 72, 4, 72);
          ctx.fillRect(towerX - 10, halfH - 52, 20, 3);
          if (Math.floor(now / 650) % 2 === 0) {
            ctx.fillStyle = "#FF2E63";
            ctx.beginPath();
            ctx.arc(towerX, halfH - 74, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Distant Radar Dome / Watchtower Silhouette
          const watchX = baseX + w * 0.78;
          ctx.fillStyle = biome.mountainNear;
          ctx.fillRect(watchX - 10, halfH - 42, 20, 42);
          ctx.fillRect(watchX - 16, halfH - 52, 32, 12);
        }
        ctx.restore();

        // 2. Textured Ground Surface Gradient + Subtle Depth Grid Lines
        const floorG = ctx.createLinearGradient(0, halfH, 0, h);
        floorG.addColorStop(0, biome.floorFar);
        floorG.addColorStop(0.55, biome.floorNear);
        floorG.addColorStop(1, biome.floorFar);
        ctx.fillStyle = floorG;
        ctx.fillRect(0, halfH, w, h - halfH);

        // 3. Textured DDA 3D Raycasting Pass (Real Procedural Military Walls!)
        const stripWidth = 2;
        const numRays = Math.ceil(w / stripWidth);
        const zBuffer = new Float32Array(numRays);
        const map = s.map;
        const mapH = map.length;
        const mapW = map[0].length;
        const fogRgb = biome.fogRgb;

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
          while (hit === 0 && steps < 34) {
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
            if (mapX < 0 || mapY < 0 || mapX >= mapW || mapY >= mapH) {
              hit = 1;
            } else if (map[mapY][mapX] > 0) {
              hit = map[mapY][mapX];
            }
          }

          const rawDist =
            side === 0
              ? (mapX - s.px + (1 - stepX) / 2) / (rayDx || 1e-6)
              : (mapY - s.py + (1 - stepY) / 2) / (rayDy || 1e-6);
          const perpDist = Math.max(0.1, rawDist * Math.cos(rayAngle - s.angle));
          zBuffer[i] = perpDist;

          const wallH = (h * 0.96) / perpDist;
          const drawTop = halfH - wallH * 0.5;

          const hitPos = side === 0 ? s.py + rawDist * rayDy : s.px + rawDist * rayDx;
          const texX = Math.min(TEX_SIZE - 1, Math.max(0, Math.floor((hitPos - Math.floor(hitPos)) * TEX_SIZE)));
          const texCanvas = wallTextures[hit] || wallTextures[1];

          ctx.drawImage(
            texCanvas,
            texX,
            0,
            1,
            TEX_SIZE,
            i * stripWidth,
            drawTop,
            stripWidth + 0.5,
            wallH
          );

          // Directional directional-light shadow + Atmospheric distance fog blending!
          const sideDark = side === 1 ? 0.24 : 0;
          const distFog = Math.min(0.84, Math.max(0, (perpDist - 1.6) / 14.5));
          if (sideDark > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${sideDark})`;
            ctx.fillRect(i * stripWidth, drawTop, stripWidth + 0.5, wallH);
          }
          if (distFog > 0.02) {
            ctx.fillStyle = `rgba(${fogRgb[0]}, ${fogRgb[1]}, ${fogRgb[2]}, ${distFog.toFixed(2)})`;
            ctx.fillRect(i * stripWidth, drawTop, stripWidth + 0.5, wallH);
          }
        }

        // 4. 3D Sprites (Articulated Soldiers, Fallen Bodies, Cameras, Medkits, Ammo, Objective Beacons)
        const sprites = [];
        for (const e of s.enemies) {
          if (e.alive || (e.kind !== "camera" && e.deathAnim < 0.98)) {
            sprites.push({ ...e, dist: Math.hypot(e.x - s.px, e.y - s.py) });
          }
        }
        for (const pk of s.pickups) {
          if (!pk.taken) sprites.push({ ...pk, dist: Math.hypot(pk.x - s.px, pk.y - s.py) });
        }

        const allDone = s.objectives.every((o) => o.completed);
        if (!allDone) {
          for (const obj of s.objectives) {
            if (!obj.completed && obj.type === "interact") {
              sprites.push({
                kind: "objective",
                label: obj.label,
                color: obj.color || "#00D4FF",
                x: obj.x,
                y: obj.y,
                dist: Math.hypot(obj.x - s.px, obj.y - s.py),
              });
            }
          }
        } else {
          sprites.push({
            kind: "extraction",
            label: s.extraction.label,
            color: "#34D399",
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
          const perp = Math.max(0.22, sp.dist * Math.cos(relAngle));
          const screenX = (w / 2) * (1 + Math.tan(relAngle) / tanHalfFov);
          const colIdx = Math.floor(screenX / stripWidth);
          if (colIdx < 0 || colIdx >= numRays) continue;

          // Allow floating tactical beacon diamonds through partial cover? No, respect walls for solid sprites!
          const occluded = perp > zBuffer[colIdx] + 0.16;
          if (occluded && sp.kind !== "objective" && sp.kind !== "extraction") continue;

          const size = (h * 0.88) / perp;
          const fogAlpha = Math.min(0.8, Math.max(0, (perp - 2) / 14));

          if (
            sp.kind === "guard" ||
            sp.kind === "heavy" ||
            sp.kind === "sniper" ||
            sp.kind === "officer"
          ) {
            drawRealisticSoldier(ctx, sp, screenX, halfH, size, biome.uniform, fogAlpha, fogRgb);
          } else if (sp.kind === "camera") {
            ctx.save();
            const camY = halfH - size * 0.34;
            // Wall bracket mount
            ctx.fillStyle = "#334155";
            ctx.fillRect(screenX - size * 0.03, camY - size * 0.12, size * 0.06, size * 0.14);
            // Armored CCTV housing
            ctx.fillStyle = sp.hitFlash > 0 ? "#FFFFFF" : "#1E293B";
            ctx.strokeStyle = "#64748B";
            ctx.lineWidth = Math.max(1, size * 0.015);
            roundRectPath(ctx, screenX - size * 0.14, camY, size * 0.28, size * 0.14, 3);
            ctx.fill();
            ctx.stroke();
            // Sweeping glass lens + red recording LED
            const lensShift = Math.sin(sp.dir || 0) * size * 0.05;
            ctx.fillStyle = "#020617";
            ctx.beginPath();
            ctx.arc(screenX + lensShift, camY + size * 0.07, Math.max(3, size * 0.048), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = s.alarmTimer > 0 ? "#FF2E63" : "#FF8A1F";
            ctx.beginPath();
            ctx.arc(screenX + lensShift, camY + size * 0.07, Math.max(2, size * 0.028), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (sp.kind === "medkit") {
            ctx.save();
            const bw = size * 0.26;
            const bh = bw * 0.72;
            const by = halfH + size * 0.24;
            // White/Red Military First-Aid Case
            ctx.fillStyle = "#E2E8F0";
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1.5;
            roundRectPath(ctx, screenX - bw / 2, by, bw, bh, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#DC2626";
            ctx.fillRect(screenX - bw * 0.22, by + bh * 0.4, bw * 0.44, bh * 0.2);
            ctx.fillRect(screenX - bw * 0.08, by + bh * 0.2, bw * 0.16, bh * 0.6);
            ctx.restore();
          } else if (sp.kind === "ammo") {
            ctx.save();
            const bw = size * 0.28;
            const bh = bw * 0.68;
            const by = halfH + size * 0.25;
            // Olive Drab Military Ammo Crate
            ctx.fillStyle = "#3F4D34";
            ctx.strokeStyle = "#1E2618";
            ctx.lineWidth = 1.5;
            roundRectPath(ctx, screenX - bw / 2, by, bw, bh, 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#FACC15";
            ctx.fillRect(screenX - bw * 0.32, by + bh * 0.38, bw * 0.64, Math.max(2, bh * 0.18));
            ctx.restore();
          } else if (sp.kind === "objective" || sp.kind === "extraction") {
            ctx.save();
            if (!occluded) {
              // Subtle translucent vertical tactical beacon shaft
              ctx.fillStyle =
                sp.kind === "extraction"
                  ? "rgba(52, 211, 153, 0.24)"
                  : "rgba(0, 212, 255, 0.2)";
              ctx.fillRect(screenX - size * 0.12, halfH - size * 0.5, size * 0.24, size);
            }
            // Floating Project I.G.I. Diamond Objective HUD Waypoint (visible through compound walls with distance!)
            const markerY = Math.max(46, Math.min(h - 90, halfH - size * 0.28));
            ctx.translate(screenX, markerY);
            ctx.strokeStyle = sp.color;
            ctx.fillStyle = "rgba(6, 10, 18, 0.72)";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(10, 0);
            ctx.lineTo(0, 10);
            ctx.lineTo(-10, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = sp.color;
            ctx.font = "700 10px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText(`${Math.round(sp.dist * 3.5)}m`, 0, -15);
            ctx.restore();
          }
        }

        // 5. Weather Overlay (Falling Arctic Snow / Storm Rain / Desert Dust)
        if (biome.weather === "snow") {
          ctx.fillStyle = "rgba(241, 245, 249, 0.75)";
          for (const wp of s.weatherParticles) {
            ctx.beginPath();
            ctx.arc(wp.x * w, wp.y * h, wp.size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (biome.weather === "rain") {
          ctx.strokeStyle = "rgba(186, 230, 253, 0.28)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const wp of s.weatherParticles) {
            const rx = wp.x * w;
            const ry = wp.y * h;
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 4, ry + 18);
          }
          ctx.stroke();
        } else if (biome.weather === "dust") {
          ctx.fillStyle = "rgba(251, 191, 36, 0.24)";
          for (const wp of s.weatherParticles) {
            ctx.beginPath();
            ctx.arc(wp.x * w, wp.y * h, wp.size * 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Incoming enemy tracer flashes
        for (const tr of s.tracers) {
          ctx.strokeStyle = `rgba(254, 240, 138, ${Math.max(0, tr.life * 0.75)})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y);
          ctx.lineTo(w * 0.5 + (tr.x - w * 0.5) * 1.4, h);
          ctx.stroke();
        }

        // 6. Optional Night-Vision Goggles (NVG) Green Phosphor Filter
        if (nvgRef.current) {
          ctx.save();
          ctx.fillStyle = "rgba(16, 185, 129, 0.24)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "rgba(0, 30, 12, 0.22)";
          for (let sy = 0; sy < h; sy += 4) {
            ctx.fillRect(0, sy, w, 1.5);
          }
          ctx.restore();
        }

        // 7. First-Person Sculpted Weapon OR Authentic PSO-1 Dragunov Sniper Scope
        if (phaseRef.current === "playing") {
          if (s.scoped && s.weaponId === 2) {
            const radius = Math.min(w, h) * 0.43;
            ctx.save();
            ctx.fillStyle = "rgba(4, 6, 10, 0.95)";
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2, true);
            ctx.fill();

            // Scope bevel ring
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Authentic PSO-1 Russian Sniper Reticle + Rangefinder Curve
            ctx.strokeStyle = "rgba(52, 211, 153, 0.9)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(w / 2 - radius, h / 2);
            ctx.lineTo(w / 2 - 14, h / 2);
            ctx.moveTo(w / 2 + 14, h / 2);
            ctx.lineTo(w / 2 + radius, h / 2);
            ctx.moveTo(w / 2, h / 2 + 14);
            ctx.lineTo(w / 2, h / 2 + radius);
            // Center chevron ^
            ctx.moveTo(w / 2 - 8, h / 2 + 8);
            ctx.lineTo(w / 2, h / 2);
            ctx.lineTo(w / 2 + 8, h / 2 + 8);
            ctx.stroke();

            // Bottom-left Stadiametric rangefinder arc
            ctx.strokeStyle = "rgba(255, 194, 71, 0.7)";
            ctx.beginPath();
            ctx.moveTo(w / 2 - radius * 0.58, h / 2 + radius * 0.45);
            ctx.lineTo(w / 2 - radius * 0.16, h / 2 + radius * 0.45);
            ctx.moveTo(w / 2 - radius * 0.58, h / 2 + radius * 0.25);
            ctx.quadraticCurveTo(
              w / 2 - radius * 0.36,
              h / 2 + radius * 0.36,
              w / 2 - radius * 0.16,
              h / 2 + radius * 0.41
            );
            ctx.stroke();

            ctx.fillStyle = "#FF2E63";
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Crisp Dynamic Tactical Crosshair + Hitmarker
            ctx.save();
            ctx.strokeStyle =
              s.headshotFlash > 0
                ? "#FACC15"
                : s.hitMarker > 0
                ? "#FF2E63"
                : nvgRef.current
                ? "#4ADE80"
                : "#00D4FF";
            ctx.lineWidth = 1.8;
            const gap = (s.crouched ? 5 : 8) + s.recoil * 9;
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

            // X Hitmarker tick on enemy hit
            if (s.hitMarker > 0.15) {
              ctx.strokeStyle = s.headshotFlash > 0 ? "#FACC15" : "#FF2E63";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(w / 2 - 9, h / 2 - 9);
              ctx.lineTo(w / 2 - 4, h / 2 - 4);
              ctx.moveTo(w / 2 + 9, h / 2 - 9);
              ctx.lineTo(w / 2 + 4, h / 2 - 4);
              ctx.moveTo(w / 2 - 9, h / 2 + 9);
              ctx.lineTo(w / 2 - 4, h / 2 + 4);
              ctx.moveTo(w / 2 + 9, h / 2 + 9);
              ctx.lineTo(w / 2 + 4, h / 2 + 4);
              ctx.stroke();
            }

            if (s.headshotFlash > 0.2) {
              ctx.fillStyle = "#FACC15";
              ctx.font = "800 12px 'JetBrains Mono', monospace";
              ctx.textAlign = "center";
              ctx.fillText("HEADSHOT!", w / 2, h / 2 - 26);
            }
            ctx.restore();

            drawFirstPersonWeapon(ctx, s, weapon, w, h);
          }

          // 8. Authentic Project I.G.I. Satellite Tactical Radar (Top-Left)
          const radarSize = 136;
          const rx = 14;
          const ry = 14;
          const cell = radarSize / mapW;

          ctx.save();
          ctx.fillStyle = "rgba(6, 12, 18, 0.84)";
          ctx.strokeStyle = s.alarmTimer > 0 ? "#FF2E63" : "rgba(52, 211, 153, 0.65)";
          ctx.lineWidth = 1.5;
          roundRectPath(ctx, rx, ry, radarSize, radarSize, 8);
          ctx.fill();
          ctx.stroke();

          for (let my = 0; my < mapH; my++) {
            for (let mx = 0; mx < mapW; mx++) {
              const tile = map[my][mx];
              if (tile > 0) {
                ctx.fillStyle =
                  tile === 4
                    ? "#00D4FF"
                    : tile === 6
                    ? "#F59E0B"
                    : "rgba(148, 163, 184, 0.45)";
                ctx.fillRect(rx + mx * cell, ry + my * cell, cell, cell);
              }
            }
          }

          // Active Objective / Extraction Blips
          if (!allDone) {
            for (const o of s.objectives) {
              if (o.completed) continue;
              ctx.fillStyle = o.color || "#00D4FF";
              ctx.beginPath();
              ctx.arc(rx + o.x * cell, ry + o.y * cell, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = "#34D399";
            ctx.beginPath();
            ctx.arc(rx + s.extraction.x * cell, ry + s.extraction.y * cell, 4.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Live Hostiles & Camera Blips
          for (const e of s.enemies) {
            if (!e.alive) continue;
            ctx.fillStyle =
              e.kind === "camera"
                ? "#FACC15"
                : e.kind === "officer"
                ? "#F012A8"
                : "#EF4444";
            ctx.beginPath();
            ctx.arc(
              rx + e.x * cell,
              ry + e.y * cell,
              e.kind === "officer" || e.kind === "heavy" ? 3.5 : 2.5,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }

          // Player position + FOV cone
          const pRx = rx + s.px * cell;
          const pRy = ry + s.py * cell;
          ctx.fillStyle = "rgba(52, 211, 153, 0.24)";
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
        }

        // Red Combat Damage Vignette
        if (s.damageFlash > 0) {
          ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.45, s.damageFlash * 0.4)})`;
          ctx.fillRect(0, 0, w, h);
        }
      } catch (err) {
        console.error("[TacticalIgi3D error]", err);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, [syncHud]);

  const activeWeapon = WEAPONS[hud.weaponId];
  const hasNextMission = selectedMissionIdx < IGI_MISSIONS.length - 1;
  const clearedCount = Object.values(campaignProgress).filter((p) => p?.cleared).length;

  return (
    <div
      ref={containerRef}
      className="neon-corridor-frame relative overflow-hidden rounded-[28px] border border-white/15 bg-[#06040D] shadow-2xl"
    >
      {/* Tactical Top HUD Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0617]/95 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          {/* Health Bar */}
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

        {/* Mission Select / NVG / Alarm / Audio / Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectMissionPreview(selectedMissionIdx)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FFC247]/45 bg-[#FFC247]/15 px-3 py-1 font-mono text-[10px] font-bold uppercase text-[#FFC247] hover:bg-[#FFC247]/25"
            title="Open Campaign Mission List"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>Missions ({clearedCount}/{IGI_MISSIONS.length})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setNvg((prev) => {
                nvgRef.current = !prev;
                return !prev;
              })
            }
            title="Toggle Night-Vision Goggles (Press N)"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold transition ${
              nvg
                ? "border-emerald-400 bg-emerald-500/30 text-emerald-200"
                : "border-white/15 bg-white/5 text-ink-muted hover:text-white"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>NVG</span>
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
              hud.alarmActive
                ? "animate-pulse border-rose-500 bg-rose-500/20 text-rose-300"
                : hud.allObjectivesDone
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                : "border-[#00D4FF]/40 bg-[#00D4FF]/15 text-[#7EE8FF]"
            }`}
          >
            <Radio className="h-3 w-3" />
            {hud.alarmActive
              ? "ALARM"
              : hud.allObjectivesDone
              ? "EXTRACT"
              : selectedMission.code}
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
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 3D Tactical Viewport */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-64px)]" : "h-[68vh] min-h-[500px] max-h-[700px]"
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            if (phaseRef.current !== "playing") return;
            if (document.pointerLockElement !== canvasRef.current) {
              try {
                canvasRef.current?.requestPointerLock?.();
              } catch {
                // fallback to drag-look below
              }
              simRef.current.dragging = true;
              simRef.current.lastDragX = e.clientX;
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
            simRef.current.dragging = false;
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="block h-full w-full cursor-crosshair"
        />

        {/* Top-Right Live Mission Objectives Checklist (During Gameplay) */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute right-3.5 top-3.5 z-10 w-60 rounded-2xl border border-white/12 bg-black/68 p-3 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFC247]">
              <span>
                {selectedMission.code}: {selectedMission.title}
              </span>
              {hud.crouched && (
                <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[9px] text-emerald-300">
                  STEALTH
                </span>
              )}
            </div>
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
                  {!o.completed && (
                    <span className="shrink-0 text-[#00D4FF]">{o.dist}m</span>
                  )}
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
        )}

        {/* Bottom Mission Comms & Interact Progress Banner */}
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
                      className="h-full bg-[#00D4FF] transition-all"
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
                Click screen to lock aim • [C] Crouch • [N] Night Vision • [R] Reload • RMB Scope
              </div>
            )}
          </div>
        )}

        {/* Campaign Mission Selector & Tactical Briefing Screen */}
        {phase === "briefing" && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#06040D]/88 via-[#06040D]/76 to-[#06040D]/92 p-4 backdrop-blur-sm sm:p-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/50 bg-[#00D4FF]/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#7EE8FF]">
                    <Target className="h-3 w-3" />
                    Project I.G.I. Tactical Campaign
                  </span>
                  <h2 className="mt-1.5 font-display text-2xl font-extrabold text-white sm:text-4xl">
                    OPERATION: <span className="text-neon-gradient">NEON I.G.I.</span>
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                  Campaign Progress: {clearedCount} / {IGI_MISSIONS.length} Cleared
                </span>
              </div>

              {/* 4-Mission Tactical Dossier List */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {IGI_MISSIONS.map((m, idx) => {
                  const active = idx === selectedMissionIdx;
                  const prog = campaignProgress[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMissionPreview(idx)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-[#00D4FF] bg-[#00D4FF]/16 shadow-glass-3d"
                          : "border-white/12 bg-black/55 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                        <span className="font-bold text-[#FFC247]">{m.code}</span>
                        {prog?.cleared ? (
                          <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 font-bold text-emerald-300">
                            ✓ RANK {prog.rank}
                          </span>
                        ) : (
                          <span
                            className={`rounded px-1.5 py-0.5 font-semibold ${
                              m.difficulty === "Veteran"
                                ? "bg-rose-500/25 text-rose-300"
                                : m.difficulty === "Hard"
                                ? "bg-amber-500/25 text-amber-300"
                                : "bg-white/10 text-ink-muted"
                            }`}
                          >
                            {m.difficulty}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 font-display text-sm font-bold text-white">
                        {m.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-secondary">{m.subtitle}</p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Mission Intelligence Card */}
              <div className="mt-4 rounded-2xl border border-white/12 bg-black/65 p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#00D4FF]">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-bold uppercase">
                      {selectedMission.code} • {selectedMission.location}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-muted">
                    Hostiles: {selectedMission.enemies.filter((e) => e.kind !== "camera").length} •
                    Cameras: {selectedMission.enemies.filter((e) => e.kind === "camera").length}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-ink-secondary sm:text-sm">
                  {selectedMission.briefing}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                    {selectedMission.objectives.map((o, i) => (
                      <span
                        key={o.id}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-white"
                      >
                        OBJ 0{i + 1}: {o.label}
                      </span>
                    ))}
                    <span className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                      EXFIL: {selectedMission.extraction.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => startMission(selectedMissionIdx)}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
                    }}
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Deploy {selectedMission.code}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-3 flex max-w-4xl flex-wrap items-center justify-center gap-3 font-mono text-[10px] text-ink-muted">
              <span>[WASD] Move</span>
              <span>•</span>
              <span>[Mouse] Aim & Shoot</span>
              <span>•</span>
              <span>[1/2/3] Silenced Pistol / M4 / Sniper</span>
              <span>•</span>
              <span>[C] Stealth Crouch</span>
              <span>•</span>
              <span>[N] Night Vision</span>
              <span>•</span>
              <span>[E] Hack / Plant C4</span>
            </div>
          </div>
        )}

        {/* Mission Accomplished / Agent Down Summary */}
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
                  <CheckCircle2 className="h-4 w-4" /> {selectedMission.code} ACCOMPLISHED • RANK{" "}
                  {hud.rank}
                </>
              ) : (
                <>
                  <Crosshair className="h-4 w-4" /> AGENT DOWN • {selectedMission.code}
                </>
              )}
            </span>

            <h3 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              {phase === "victory"
                ? `${selectedMission.title.toUpperCase()} CLEARED`
                : "MISSION FAILED"}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">HOSTILES</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FF3CC7]">
                  {hud.kills} / {hud.totalHostiles}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">HEADSHOTS</p>
                <p className="mt-1 font-display text-lg font-bold text-[#FFC247]">
                  {hud.headshots}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">CAMERAS</p>
                <p className="mt-1 font-display text-lg font-bold text-emerald-300">
                  {hud.camerasDisabled} / {hud.totalCameras}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
                <p className="font-mono text-[10px] text-ink-muted">TIME</p>
                <p className="mt-1 font-display text-lg font-bold text-[#00D4FF]">
                  {hud.elapsed}s
                </p>
              </div>
            </div>

            {phase === "victory" && (
              <LeaderboardSubmitCard
                key={`igi-${selectedMission.id}-${hud.elapsed}`}
                gameId="igi"
                score={
                  (selectedMissionIdx + 1) * 1400 +
                  hud.kills * 160 +
                  hud.headshots * 140 +
                  hud.camerasDisabled * 220 +
                  (hud.alarmsTriggered === 0 ? 750 : 0) +
                  hud.hp * 12 +
                  Math.max(0, 500 - hud.elapsed * 3)
                }
                badge={`${selectedMission.code} • RANK ${hud.rank}`}
                meta={`${hud.kills} Kills • ${hud.camerasDisabled} Cams • ${hud.elapsed}s`}
                highlightLabel="Mission Cleared! Save to Leaderboard"
                isNewRecord
              />
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {phase === "victory" && hasNextMission && (
                <button
                  type="button"
                  onClick={() => startMission(selectedMissionIdx + 1)}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-heading text-sm font-bold text-white shadow-neon-magenta transition hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
                  }}
                >
                  <span>Next Mission ({IGI_MISSIONS[selectedMissionIdx + 1].code})</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => startMission(selectedMissionIdx)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Replay {selectedMission.code}</span>
              </button>

              <button
                type="button"
                onClick={() => selectMissionPreview(selectedMissionIdx)}
                className="inline-flex items-center gap-2 rounded-full border border-[#FFC247]/45 bg-[#FFC247]/15 px-6 py-3 text-sm font-bold text-[#FFC247] hover:bg-[#FFC247]/25"
              >
                <ListChecks className="h-4 w-4" />
                <span>Mission List</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#080514] px-5 py-2.5 font-mono text-[11px] text-ink-muted">
        <span>
          Equipped: <strong className="text-white">{activeWeapon.name}</strong>
          {activeWeapon.id === 0
            ? " (Silenced Stealth)"
            : activeWeapon.id === 2
            ? " (RMB / F for PSO-1 Scope)"
            : " (Full Auto • Holographic Sight)"}
        </span>
        <span>[C] Crouch • [N] Night Vision • [R] Reload • [E] Hack/C4 • Radar: Cyan=Obj Green=Exfil</span>
      </div>
    </div>
  );
}
