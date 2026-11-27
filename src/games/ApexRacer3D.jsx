import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Gauge,
  Flame,
  Eye,
  Trophy,
  AlertTriangle,
  Car,
  Zap,
} from "lucide-react";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const BEST_SCORE_KEY = "smsc_apex_racer_best_v2";

const CAR_PAINTS = [
  {
    id: "sapphire",
    name: "Midnight GT",
    top: "#3B82F6",
    mid: "#1D4ED8",
    dark: "#0F172A",
    accent: "#00D4FF",
    glow: "rgba(0, 212, 255, 0.45)",
  },
  {
    id: "crimson",
    name: "Rosso Corsa",
    top: "#F43F5E",
    mid: "#BE123C",
    dark: "#2A0813",
    accent: "#FF8A1F",
    glow: "rgba(244, 63, 94, 0.45)",
  },
  {
    id: "pearl",
    name: "Stealth Pearl",
    top: "#F1F5F9",
    mid: "#94A3B8",
    dark: "#1E293B",
    accent: "#F012A8",
    glow: "rgba(240, 18, 168, 0.42)",
  },
];

/** Cross-browser rounded rectangle path helper (no dependency on ctx.roundRect) */
function roundRectPath(ctx, x, y, w, h, r) {
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

/**
 * Procedural Web Audio Automotive Sound Synthesizer
 * Continuous real-time V8/V10 RPM engine growl + turbo gear-shift flutter + tire screech + Doppler whoosh + impact.
 * Fully wrapped in try/catch so audio restrictions can NEVER block gameplay.
 */
function createCarAudio() {
  let ctx = null;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let subOsc = null;
  let engineFilter = null;
  let engineGain = null;
  let screechNode = null;
  let screechGain = null;
  let running = false;

  const ensure = () => {
    try {
      if (typeof window === "undefined") return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  };

  const startEngine = (muted) => {
    try {
      const c = ensure();
      if (!c || running) return;
      running = true;

      engineOsc1 = c.createOscillator();
      engineOsc2 = c.createOscillator();
      subOsc = c.createOscillator();
      engineFilter = c.createBiquadFilter();
      engineGain = c.createGain();

      engineOsc1.type = "sawtooth";
      engineOsc2.type = "triangle";
      subOsc.type = "sine";

      engineFilter.type = "lowpass";
      engineFilter.frequency.value = 340;
      engineFilter.Q.value = 2.6;

      engineGain.gain.value = muted ? 0 : 0.055;

      engineOsc1.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      subOsc.connect(engineFilter);
      engineFilter.connect(engineGain).connect(c.destination);

      engineOsc1.start();
      engineOsc2.start();
      subOsc.start();

      // Filtered noise buffer for tire screech during drifts & hard braking
      const bufLen = Math.max(1024, Math.floor((c.sampleRate || 44100) * 1.5));
      const buf = c.createBuffer(1, bufLen, c.sampleRate || 44100);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      screechNode = c.createBufferSource();
      screechNode.buffer = buf;
      screechNode.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1850;
      bp.Q.value = 5.5;
      screechGain = c.createGain();
      screechGain.gain.value = 0;
      screechNode.connect(bp).connect(screechGain).connect(c.destination);
      screechNode.start();
    } catch {
      running = false;
    }
  };

  const stopEngine = () => {
    if (!running) return;
    running = false;
    try {
      engineOsc1?.stop();
      engineOsc2?.stop();
      subOsc?.stop();
      screechNode?.stop();
    } catch {
      // ignore
    }
    engineOsc1 = engineOsc2 = subOsc = screechNode = null;
  };

  const updateEngine = (rpm, throttle, nitro, driftAmount, muted, active) => {
    try {
      if (!running || !ctx || !engineOsc1 || !engineGain) return;
      const now = ctx.currentTime;
      if (muted || !active) {
        engineGain.gain.setTargetAtTime(0, now, 0.06);
        screechGain?.gain.setTargetAtTime(0, now, 0.05);
        return;
      }

      const safeRpm = Math.max(900, Math.min(9500, rpm || 1200));
      const baseFreq = 46 + (safeRpm / 8500) * 195 + (nitro ? 32 : 0);
      engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      engineOsc2.frequency.setTargetAtTime(baseFreq * 1.498, now, 0.04);
      subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);

      const cutoff = 280 + (safeRpm / 8500) * 1550 + (throttle ? 420 : 0) + (nitro ? 750 : 0);
      engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

      const vol = 0.05 + (throttle ? 0.032 : 0) + (nitro ? 0.032 : 0);
      engineGain.gain.setTargetAtTime(vol, now, 0.06);

      const screechVol = Math.min(0.075, Math.max(0, driftAmount * 0.07));
      screechGain?.gain.setTargetAtTime(screechVol, now, 0.04);
    } catch {
      // ignore audio glitch
    }
  };

  const playGearShift = (muted) => {
    try {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
      g.gain.setValueAtTime(0.042, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(g).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore
    }
  };

  const playWhoosh = (muted, speedFactor) => {
    try {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const dur = 0.24;
      const len = Math.max(512, Math.floor((c.sampleRate || 44100) * dur));
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(980, now);
      f.frequency.exponentialRampToValueAtTime(210, now + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(Math.min(0.16, 0.06 + speedFactor * 0.09), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(now);
    } catch {
      // ignore
    }
  };

  const playCrash = (muted) => {
    try {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const dur = 0.42;
      const len = Math.max(512, Math.floor((c.sampleRate || 44100) * dur));
      const buf = c.createBuffer(1, len, c.sampleRate || 44100);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(920, now);
      f.frequency.exponentialRampToValueAtTime(80, now + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(now);
    } catch {
      // ignore
    }
  };

  const playCheckpoint = (muted) => {
    try {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      [587.3, 880, 1174.7].forEach((freq, idx) => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.075);
        g.gain.setValueAtTime(0.085, now + idx * 0.075);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.18);
        osc.connect(g).connect(c.destination);
        osc.start(now + idx * 0.075);
        osc.stop(now + idx * 0.075 + 0.19);
      });
    } catch {
      // ignore
    }
  };

  return {
    startEngine,
    stopEngine,
    updateEngine,
    playGearShift,
    playWhoosh,
    playCrash,
    playCheckpoint,
  };
}

// 3D Expressway Geometry Constants
const SEG_LEN = 200;
const ROAD_W = 1450; // Realistic 4-lane expressway half-width (fits all lanes cleanly in view)
const RUMBLE_LEN = 3;
const DRAW_DIST = 235;
const CAM_H = 1040;

function easeInOut(a, b, p) {
  return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
}

function buildHighwayTrack() {
  const segments = [];
  const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);

  const gantryTitles = [
    "APEX EXPRESSWAY • SECTOR 1",
    "COASTAL TUNNEL • CHECKPOINT",
    "SKYLINE OVERPASS • SECTOR 3",
    "NIGHT HARBOR • CHECKPOINT",
  ];

  const addSegment = (curve, y) => {
    const n = segments.length;
    const prevY = lastY();
    const isCheckpoint = n > 0 && n % 360 === 0;
    const hasLamp = n % 11 === 0;
    const hasGantry = isCheckpoint || (n > 40 && n % 180 === 0);
    let propL = null;
    let propR = null;

    if (n % 6 === 0) {
      propL = {
        kind: n % 24 === 0 ? "sign" : "palm",
        offset: -1.42 - (n % 5) * 0.11,
      };
    }
    if (n % 6 === 3) {
      propR = {
        kind: n % 30 === 3 ? "billboard" : "palm",
        offset: 1.42 + (n % 5) * 0.11,
      };
    }

    segments.push({
      index: n,
      p1: { world: { x: 0, y: prevY, z: n * SEG_LEN }, screen: {} },
      p2: { world: { x: 0, y, z: (n + 1) * SEG_LEN }, screen: {} },
      curve,
      hasLamp,
      hasGantry,
      gantryTitle: gantryTitles[Math.floor(n / 180) % gantryTitles.length],
      isCheckpoint,
      propL,
      propR,
      clip: 0,
      dark: Math.floor(n / RUMBLE_LEN) % 2 === 1,
    });
  };

  const addRoad = (enter, hold, leave, curve, hillY) => {
    const startY = lastY();
    const endY = startY + hillY * SEG_LEN;
    const total = enter + hold + leave;
    for (let i = 0; i < enter; i++) {
      addSegment(easeInOut(0, curve, i / enter), easeInOut(startY, endY, i / total));
    }
    for (let i = 0; i < hold; i++) {
      addSegment(curve, easeInOut(startY, endY, (enter + i) / total));
    }
    for (let i = 0; i < leave; i++) {
      addSegment(
        easeInOut(curve, 0, i / leave),
        easeInOut(startY, endY, (enter + hold + i) / total)
      );
    }
  };

  // Scenic coastal-city expressway loop with real elevation hills & banked curves
  addRoad(25, 45, 25, 0, 0);
  addRoad(35, 65, 35, 2.2, 20);
  addRoad(25, 50, 25, -1.7, -16);
  addRoad(20, 40, 20, 0, 24);
  addRoad(35, 75, 35, -3.1, -15);
  addRoad(30, 55, 30, 2.7, 14);
  addRoad(25, 60, 25, 0, -22);
  addRoad(40, 70, 40, 3.4, 18);
  addRoad(30, 55, 30, -2.4, -20);
  addRoad(25, 55, 25, 1.3, 0);

  // Smooth elevation closure back to y = 0
  const remainingY = -lastY() / SEG_LEN;
  addRoad(20, 30, 20, 0, remainingY);

  return segments;
}

// Proportions expressed as fractions of road half-width (sc.w) so perspective matches player car 1:1
const TRAFFIC_MODELS = [
  {
    kind: "sedan",
    w: 0.36,
    h: 0.27,
    colors: [
      { body: "#E2E8F0", shade: "#94A3B8" },
      { body: "#38BDF8", shade: "#0284C7" },
      { body: "#94A3B8", shade: "#475569" },
      { body: "#F87171", shade: "#B91C1C" },
    ],
  },
  {
    kind: "coupe",
    w: 0.38,
    h: 0.23,
    colors: [
      { body: "#F012A8", shade: "#831843" },
      { body: "#FBBF24", shade: "#B45309" },
      { body: "#22D3EE", shade: "#0E7490" },
      { body: "#A855F7", shade: "#581C87" },
    ],
  },
  {
    kind: "suv",
    w: 0.4,
    h: 0.34,
    colors: [
      { body: "#CBD5E1", shade: "#64748B" },
      { body: "#475569", shade: "#1E293B" },
      { body: "#0EA5E9", shade: "#0369A1" },
      { body: "#10B981", shade: "#047857" },
    ],
  },
  {
    kind: "truck",
    w: 0.46,
    h: 0.52,
    colors: [
      { body: "#F1F5F9", shade: "#94A3B8" },
      { body: "#F59E0B", shade: "#B45309" },
      { body: "#3B82F6", shade: "#1D4ED8" },
    ],
  },
];

const LANE_CENTERS = [-0.74, -0.25, 0.25, 0.74];

function spawnTraffic(trackLen, twoWay) {
  const cars = [];
  const count = 48;
  const spacing = (trackLen - 4500) / count;

  for (let i = 0; i < count; i++) {
    // Keep very first 2 cars cleanly separated across lanes so the road looks alive immediately!
    const laneIdx = i < 4 ? [0, 3, 1, 2][i] : Math.floor(Math.random() * 4);
    const oncoming = twoWay && laneIdx < 2;
    const model = TRAFFIC_MODELS[Math.floor(Math.random() * TRAFFIC_MODELS.length)];
    const palette = model.colors[Math.floor(Math.random() * model.colors.length)];
    const z = (2800 + i * spacing + Math.random() * (spacing * 0.45)) % trackLen;
    const baseSpeed =
      model.kind === "truck"
        ? 4400
        : model.kind === "coupe"
        ? 7200
        : 5800;

    cars.push({
      id: i,
      offset: LANE_CENTERS[laneIdx],
      targetOffset: LANE_CENTERS[laneIdx],
      laneIdx,
      oncoming,
      z,
      speed: oncoming ? -(baseSpeed * 0.78) : baseSpeed + Math.random() * 1200,
      model: model.kind,
      w: model.w,
      h: model.h,
      color: palette.body,
      shade: palette.shade,
      passedNear: false,
      laneTimer: 3 + Math.random() * 6,
      blinker: 0,
    });
  }
  return cars;
}

export default function ApexRacer3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const trackRef = useRef(null);

  if (!audioRef.current) audioRef.current = createCarAudio();
  if (!trackRef.current) trackRef.current = buildHighwayTrack();

  const [phase, setPhase] = useState("menu"); // "menu" | "playing" | "paused" | "gameover"
  const [twoWayMode, setTwoWayMode] = useState(true);
  const [autoGas, setAutoGas] = useState(true);
  const [cameraMode, setCameraMode] = useState("chase"); // "chase" | "cockpit"
  const [paintId, setPaintId] = useState("sapphire");
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [hud, setHud] = useState(() => ({
    kmh: 120,
    rpm: 3800,
    gear: 3,
    nitro: 100,
    nitroActive: false,
    integrity: 100,
    timeLeft: 48,
    score: 0,
    bestScore: Number(localStorage.getItem(BEST_SCORE_KEY) || 0),
    distanceKm: 0,
    nearMisses: 0,
    combo: 1,
    topSpeed: 0,
    bannerText: "",
    isNewBest: false,
    gasActive: false,
    brakeActive: false,
  }));

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const cameraRef = useRef(cameraMode);
  cameraRef.current = cameraMode;
  const autoGasRef = useRef(autoGas);
  autoGasRef.current = autoGas;
  const paintRef = useRef(CAR_PAINTS[0]);
  paintRef.current = CAR_PAINTS.find((p) => p.id === paintId) || CAR_PAINTS[0];

  const simRef = useRef(null);
  if (!simRef.current) {
    const initialTrackLen = trackRef.current.length * SEG_LEN;
    simRef.current = {
      width: 960,
      height: 540,
      pos: 0,
      playerX: 0.25,
      speed: 7200,
      maxSpeed: 16800, // 290 KM/H normal, ~345 KM/H on nitro
      steerAngle: 0,
      drift: 0,
      rpm: 3600,
      gear: 3,
      nitro: 100,
      nitroActive: false,
      integrity: 100,
      invuln: 0,
      timeLeft: 48,
      score: 0,
      bestScore: Number(localStorage.getItem(BEST_SCORE_KEY) || 0),
      distance: 0,
      nearMisses: 0,
      combo: 1,
      comboTimer: 0,
      topSpeed: 0,
      lastCheckpointSeg: 0,
      skyOffset: 0,
      shake: 0,
      crashFlash: 0,
      bannerText: "",
      bannerTimer: 0,
      particles: [],
      keys: {},
      codes: {},
      touch: { left: false, right: false, gas: false, brake: false, nitro: false },
      pointerSteer: null,
      traffic: spawnTraffic(initialTrackLen, true),
      stars: Array.from({ length: 65 }, () => ({
        x: Math.random(),
        y: Math.random() * 0.42,
        r: 0.7 + Math.random() * 1.4,
        tw: Math.random() * Math.PI * 2,
      })),
    };
  }

  const syncHud = useCallback((isNewBest = false) => {
    const s = simRef.current;
    if (!s) return;
    const kmh = Math.round((s.speed / s.maxSpeed) * 290);
    setHud({
      kmh,
      rpm: Math.round(s.rpm),
      gear: s.gear,
      nitro: Math.round(s.nitro),
      nitroActive: s.nitroActive,
      integrity: Math.max(0, Math.round(s.integrity)),
      timeLeft: Math.max(0, Math.ceil(s.timeLeft)),
      score: Math.floor(s.score),
      bestScore: Math.floor(s.bestScore),
      distanceKm: Number((s.distance / 100000).toFixed(2)),
      nearMisses: s.nearMisses,
      combo: s.combo,
      topSpeed: Math.round(s.topSpeed),
      bannerText: s.bannerTimer > 0 ? s.bannerText : "",
      isNewBest,
      gasActive: Boolean(s._gasNow),
      brakeActive: Boolean(s._brakeNow),
    });
  }, []);

  const startRace = useCallback(
    (evt) => {
      try {
        evt?.currentTarget?.blur?.();
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } catch {
        // ignore
      }

      const trackLen = trackRef.current.length * SEG_LEN;
      const s = simRef.current;
      s.pos = 0;
      s.playerX = 0.25;
      // Rolling start (~115 KM/H) so the car roars forward immediately on launch!
      s.speed = 6600;
      s.steerAngle = 0;
      s.drift = 0;
      s.rpm = 4200;
      s.gear = 2;
      s.nitro = 100;
      s.nitroActive = false;
      s.integrity = 100;
      s.invuln = 0.8;
      s.timeLeft = 48;
      s.score = 0;
      s.distance = 0;
      s.nearMisses = 0;
      s.combo = 1;
      s.comboTimer = 0;
      s.topSpeed = 115;
      s.lastCheckpointSeg = 0;
      s.skyOffset = 0;
      s.shake = 0;
      s.crashFlash = 0;
      s.bannerText = twoWayMode
        ? "2-WAY EXPRESSWAY • STEER [A/D] OR [◀/▶] • SHIFT FOR NITRO!"
        : "1-WAY HIGHWAY TIME ATTACK • HIT FULL THROTTLE!";
      s.bannerTimer = 3.2;
      s.particles = [];
      s.keys = {};
      s.codes = {};
      s.traffic = spawnTraffic(trackLen, twoWayMode);

      // Update phase FIRST so audio issues can NEVER prevent the game from starting
      phaseRef.current = "playing";
      setPhase("playing");
      syncHud(false);

      try {
        audioRef.current?.startEngine(mutedRef.current);
      } catch {
        // ignore audio errors
      }
    },
    [twoWayMode, syncHud]
  );

  // Refresh preview traffic when toggling 2-Way / 1-Way on menu
  const handleSelectMode = (isTwoWay) => {
    setTwoWayMode(isTwoWay);
    if (phaseRef.current === "menu" && simRef.current) {
      const trackLen = trackRef.current.length * SEG_LEN;
      simRef.current.traffic = spawnTraffic(trackLen, isTwoWay);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.stopEngine();
    };
  }, []);

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
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Bulletproof Keyboard Listeners (tracks both e.code and e.key so any keyboard layout works!)
  useEffect(() => {
    const s = simRef.current;
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const k = (e.key || "").toLowerCase();
      const c = e.code || "";
      s.keys[k] = true;
      s.codes[c] = true;

      const isNavKey =
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) ||
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(c);

      if (isNavKey && phaseRef.current === "playing") {
        e.preventDefault();
      }

      // Press Enter or Space from Menu or Game Over to launch immediately
      if ((c === "Enter" || k === "enter") && (phaseRef.current === "menu" || phaseRef.current === "gameover")) {
        e.preventDefault();
        startRace();
        return;
      }

      if ((k === "c" || c === "KeyC") && phaseRef.current === "playing") {
        setCameraMode((prev) => (prev === "chase" ? "cockpit" : "chase"));
      }
      if (
        (k === "p" || c === "KeyP" || k === "escape" || c === "Escape") &&
        (phaseRef.current === "playing" || phaseRef.current === "paused")
      ) {
        setPhase((prev) => {
          const next = prev === "playing" ? "paused" : "playing";
          phaseRef.current = next;
          return next;
        });
      }
    };

    const onKeyUp = (e) => {
      const k = (e.key || "").toLowerCase();
      const c = e.code || "";
      s.keys[k] = false;
      s.codes[c] = false;
    };

    const onBlur = () => {
      s.keys = {};
      s.codes = {};
      s.touch = { left: false, right: false, gas: false, brake: false, nitro: false };
      s.pointerSteer = null;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [startRace]);

  // Main 60fps 3D Highway Renderer & Vehicle Physics Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(320, Math.floor(rect.width || canvas.parentElement?.clientWidth || 960));
      const cssH = Math.max(260, Math.floor(rect.height || canvas.parentElement?.clientHeight || 540));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const targetW = Math.floor(cssW * dpr);
      const targetH = Math.floor(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
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

    const segments = trackRef.current;
    const trackLen = segments.length * SEG_LEN;

    let raf = 0;
    let last = performance.now();
    let hudTick = 0;
    let errLogged = false;

    const drawQuad = (x1, y1, w1, x2, y2, w2, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x2 - w2, y2);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x1 + w1, y1);
      ctx.closePath();
      ctx.fill();
    };

    /** Draw realistic 3D-shaded highway traffic scaled accurately to projected road width sc.w */
    const drawTrafficCar = (car, x, y, roadHalfW, clipY, nowMs) => {
      const cw = car.w * roadHalfW;
      const ch = car.h * roadHalfW;
      if (cw < 5 || ch < 4) return;
      const top = y - ch;
      if (top >= clipY) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, simRef.current.width, clipY);
      ctx.clip();

      // Ground contact shadow on wet asphalt
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.beginPath();
      ctx.ellipse(x, y + ch * 0.04, cw * 0.54, Math.max(2, ch * 0.13), 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear / Front rubber tires
      ctx.fillStyle = "#080A0F";
      const tireW = cw * 0.19;
      const tireH = ch * 0.26;
      ctx.fillRect(x - cw * 0.49, y - tireH, tireW, tireH);
      ctx.fillRect(x + cw * 0.30, y - tireH, tireW, tireH);

      if (car.model === "truck") {
        // Commercial cargo box truck with metallic depth
        const boxGrad = ctx.createLinearGradient(x - cw * 0.46, top, x + cw * 0.46, y);
        boxGrad.addColorStop(0, car.color);
        boxGrad.addColorStop(1, car.shade);
        ctx.fillStyle = boxGrad;
        ctx.fillRect(x - cw * 0.46, top, cw * 0.92, ch * 0.84);

        // Cargo rear doors & corrugated ribs
        ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
        ctx.fillRect(x - cw * 0.42, top + ch * 0.08, cw * 0.84, ch * 0.64);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
        ctx.lineWidth = Math.max(1, cw * 0.015);
        ctx.beginPath();
        ctx.moveTo(x, top + ch * 0.08);
        ctx.lineTo(x, top + ch * 0.72);
        ctx.stroke();

        // Red/white reflective DOT safety tape
        ctx.fillStyle = "#EF4444";
        ctx.fillRect(x - cw * 0.44, y - ch * 0.25, cw * 0.88, Math.max(1.5, ch * 0.04));

        // Heavy steel bumper
        ctx.fillStyle = "#1E293B";
        ctx.fillRect(x - cw * 0.47, y - ch * 0.2, cw * 0.94, ch * 0.12);
      } else {
        // Metallic body gradient
        const bodyGrad = ctx.createLinearGradient(x, top, x, y);
        bodyGrad.addColorStop(0, car.color);
        bodyGrad.addColorStop(0.65, car.shade);
        bodyGrad.addColorStop(1, "#0F172A");

        // Side mirrors
        ctx.fillStyle = car.shade;
        ctx.fillRect(x - cw * 0.52, y - ch * 0.56, cw * 0.09, ch * 0.08);
        ctx.fillRect(x + cw * 0.43, y - ch * 0.56, cw * 0.09, ch * 0.08);

        // Lower body chassis
        ctx.fillStyle = bodyGrad;
        roundRectPath(ctx, x - cw * 0.48, y - ch * 0.56, cw * 0.96, ch * 0.44, Math.max(2, cw * 0.09));
        ctx.fill();

        // Upper cabin / greenhouse
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.moveTo(x - cw * 0.39, y - ch * 0.54);
        ctx.lineTo(x - cw * 0.28, top + ch * 0.04);
        ctx.lineTo(x + cw * 0.28, top + ch * 0.04);
        ctx.lineTo(x + cw * 0.39, y - ch * 0.54);
        ctx.closePath();
        ctx.fill();

        // Tinted windshield / rear glass with sky sheen
        const glassGrad = ctx.createLinearGradient(x, top + ch * 0.1, x, y - ch * 0.52);
        glassGrad.addColorStop(0, "#1E293B");
        glassGrad.addColorStop(1, "#020617");
        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.moveTo(x - cw * 0.33, y - ch * 0.54);
        ctx.lineTo(x - cw * 0.23, top + ch * 0.12);
        ctx.lineTo(x + cw * 0.23, top + ch * 0.12);
        ctx.lineTo(x + cw * 0.33, y - ch * 0.54);
        ctx.closePath();
        ctx.fill();

        // Subtle glass specular reflection streak
        if (cw > 26) {
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.moveTo(x - cw * 0.2, top + ch * 0.14);
          ctx.lineTo(x - cw * 0.04, top + ch * 0.14);
          ctx.lineTo(x - cw * 0.14, y - ch * 0.54);
          ctx.lineTo(x - cw * 0.28, y - ch * 0.54);
          ctx.closePath();
          ctx.fill();
        }

        // Rear diffuser / lower trim
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(x - cw * 0.42, y - ch * 0.19, cw * 0.84, ch * 0.08);
      }

      // Automotive lighting (Oncoming headlights vs Same-direction LED taillights)
      const lightY = y - ch * 0.35;
      const lightW = cw * 0.19;
      const lightH = Math.max(2, ch * 0.1);

      if (car.oncoming) {
        const glowR = Math.max(3, cw * 0.42);
        [-cw * 0.33, cw * 0.33].forEach((lx) => {
          const gx = x + lx;
          const g = ctx.createRadialGradient(gx, lightY, 0.8, gx, lightY, glowR);
          g.addColorStop(0, "rgba(255, 253, 232, 0.95)");
          g.addColorStop(0.32, "rgba(255, 224, 145, 0.42)");
          g.addColorStop(1, "rgba(255, 224, 145, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(gx, lightY, glowR, 0, Math.PI * 2);
          ctx.fill();
        });

        // Asphalt headlight reflection pool under oncoming car
        ctx.fillStyle = "rgba(255, 236, 179, 0.16)";
        ctx.beginPath();
        ctx.ellipse(x, y + ch * 0.14, cw * 0.62, Math.max(2, ch * 0.18), 0, 0, Math.PI * 2);
        ctx.fill();

        // Crisp halogen / xenon headlight lenses
        ctx.fillStyle = "#FFFBEB";
        ctx.fillRect(x - cw * 0.43, lightY - lightH * 0.5, lightW, lightH);
        ctx.fillRect(x + cw * 0.24, lightY - lightH * 0.5, lightW, lightH);

        // Front grille
        ctx.fillStyle = "#090D16";
        ctx.fillRect(x - cw * 0.2, lightY - lightH * 0.4, cw * 0.4, lightH * 1.15);
      } else {
        // Red LED taillights + wet-asphalt red glow reflection
        const tailR = Math.max(2.5, cw * 0.24);
        [-cw * 0.34, cw * 0.34].forEach((lx) => {
          const gx = x + lx;
          const g = ctx.createRadialGradient(gx, lightY, 0.5, gx, lightY, tailR);
          g.addColorStop(0, "rgba(255, 40, 75, 0.9)");
          g.addColorStop(0.45, "rgba(239, 68, 68, 0.35)");
          g.addColorStop(1, "rgba(239, 68, 68, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(gx, lightY, tailR, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "#FF1E42";
        ctx.fillRect(x - cw * 0.44, lightY - lightH * 0.5, lightW, lightH);
        ctx.fillRect(x + cw * 0.25, lightY - lightH * 0.5, lightW, lightH);

        // Amber lane-change blinker if switching lanes
        if (car.blinker !== 0 && Math.floor(nowMs / 180) % 2 === 0) {
          ctx.fillStyle = "#FBBF24";
          const bx = car.blinker < 0 ? x - cw * 0.46 : x + cw * 0.37;
          ctx.fillRect(bx, lightY - lightH * 0.4, cw * 0.09, lightH * 0.85);
        }

        // License plate
        if (cw > 20) {
          ctx.fillStyle = "#F8FAFC";
          ctx.fillRect(x - cw * 0.1, y - ch * 0.29, cw * 0.2, Math.max(2, ch * 0.085));
        }
      }

      ctx.restore();
    };

    const drawRoadsideProp = (prop, x, y, roadHalfW, clipY) => {
      const h = roadHalfW * 1.18;
      const w = roadHalfW * 0.52;
      if (h < 8 || y - h >= clipY) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, simRef.current.width, clipY);
      ctx.clip();

      if (prop.kind === "palm") {
        // Coastal silhouette palm/pine tree
        ctx.fillStyle = "#161128";
        ctx.fillRect(x - w * 0.07, y - h * 0.68, w * 0.14, h * 0.68);
        ctx.fillStyle = "#0E1D2F";
        ctx.beginPath();
        ctx.arc(x, y - h * 0.74, w * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0, 212, 255, 0.12)";
        ctx.beginPath();
        ctx.arc(x - w * 0.08, y - h * 0.8, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.kind === "sign") {
        ctx.fillStyle = "#334155";
        ctx.fillRect(x - w * 0.05, y - h * 0.64, w * 0.1, h * 0.64);
        ctx.fillStyle = "#0B162C";
        ctx.strokeStyle = "#00D4FF";
        ctx.lineWidth = Math.max(1, w * 0.025);
        ctx.fillRect(x - w * 0.36, y - h * 0.86, w * 0.72, h * 0.28);
        ctx.strokeRect(x - w * 0.36, y - h * 0.86, w * 0.72, h * 0.28);
      } else {
        // Highway Neon Billboard
        ctx.fillStyle = "#1E293B";
        ctx.fillRect(x - w * 0.06, y - h * 0.56, w * 0.12, h * 0.56);
        ctx.fillStyle = "#130826";
        ctx.strokeStyle = "#F012A8";
        ctx.lineWidth = Math.max(1.5, w * 0.03);
        ctx.fillRect(x - w * 0.58, y - h * 0.98, w * 1.16, h * 0.44);
        ctx.strokeRect(x - w * 0.58, y - h * 0.98, w * 1.16, h * 0.44);
      }

      ctx.restore();
    };

    const drawPlayerSupercar = (s, w, h, braking, steer, bounce, paint) => {
      const cx = w * 0.5 + steer * 22;
      const baseY = h - 22 + bounce;
      const carW = Math.max(150, Math.min(278, w * 0.31));
      const carH = carW * 0.47;

      ctx.save();

      // Dual volumetric headlight cones projected forward onto the dark highway!
      ctx.save();
      const beamShift = steer * 48;
      [-carW * 0.3, carW * 0.3].forEach((bx) => {
        const beamGrad = ctx.createLinearGradient(cx + bx, baseY - carH * 0.5, cx + bx + beamShift, baseY - h * 0.42);
        beamGrad.addColorStop(0, "rgba(255, 250, 225, 0.24)");
        beamGrad.addColorStop(0.45, "rgba(186, 230, 253, 0.10)");
        beamGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(cx + bx - carW * 0.08, baseY - carH * 0.55);
        ctx.lineTo(cx + bx + beamShift - carW * 0.52, baseY - h * 0.42);
        ctx.lineTo(cx + bx + beamShift + carW * 0.52, baseY - h * 0.42);
        ctx.lineTo(cx + bx + carW * 0.08, baseY - carH * 0.55);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      ctx.translate(cx, baseY);
      ctx.rotate(steer * 0.06 + s.drift * 0.075);

      // Wet-asphalt underglow / brake-light ground reflection
      const glowOuter = Math.max(24, carW * 0.72);
      const glow = ctx.createRadialGradient(0, 2, 8, 0, 2, glowOuter);
      glow.addColorStop(
        0,
        braking
          ? "rgba(255, 30, 66, 0.58)"
          : s.nitroActive
          ? "rgba(0, 212, 255, 0.62)"
          : paint.glow
      );
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, 5, glowOuter, carH * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep ground contact shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
      ctx.beginPath();
      ctx.ellipse(0, 3, carW * 0.54, carH * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wide performance rear Michelin-style tires with slight steer shift
      ctx.fillStyle = "#07090E";
      roundRectPath(ctx, -carW * 0.5, -carH * 0.38, carW * 0.21, carH * 0.42, 6);
      ctx.fill();
      roundRectPath(ctx, carW * 0.29, -carH * 0.38, carW * 0.21, carH * 0.42, 6);
      ctx.fill();

      // Tire tread highlight lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.5;
      [-carW * 0.43, -carW * 0.36, carW * 0.36, carW * 0.43].forEach((tx) => {
        ctx.beginPath();
        ctx.moveTo(tx, -carH * 0.34);
        ctx.lineTo(tx, carH * 0.02);
        ctx.stroke();
      });

      // Lower carbon-fiber aero diffuser with vertical strakes
      ctx.fillStyle = "#0E1420";
      roundRectPath(ctx, -carW * 0.45, -carH * 0.35, carW * 0.9, carH * 0.28, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1.2;
      [-0.14, -0.05, 0.05, 0.14].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(carW * fx, -carH * 0.28);
        ctx.lineTo(carW * fx, -carH * 0.08);
        ctx.stroke();
      });

      // Quad titanium exhaust pipes + Blue/Magenta Nitro Flames & Shift Backfire
      [-carW * 0.26, -carW * 0.19, carW * 0.19, carW * 0.26].forEach((ex) => {
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.arc(ex, -carH * 0.17, carW * 0.026, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.arc(ex, -carH * 0.17, carW * 0.016, 0, Math.PI * 2);
        ctx.fill();

        if (s.nitroActive || (s.speed > 11500 && Math.random() < 0.05)) {
          const fl = s.nitroActive ? carH * (0.48 + Math.random() * 0.36) : carH * 0.22;
          const fg = ctx.createLinearGradient(ex, -carH * 0.16, ex, -carH * 0.16 + fl);
          fg.addColorStop(0, "#FFFFFF");
          fg.addColorStop(0.32, "#00D4FF");
          fg.addColorStop(0.75, "#F012A8");
          fg.addColorStop(1, "rgba(240,18,168,0)");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(ex - carW * 0.026, -carH * 0.16);
          ctx.lineTo(ex, -carH * 0.16 + fl);
          ctx.lineTo(ex + carW * 0.026, -carH * 0.16);
          ctx.closePath();
          ctx.fill();
        }
      });

      // Sculpted Widebody Rear Haunches & Bumper (shifts subtly horizontally for 3D perspective when turning)
      const shiftX = steer * carW * 0.05;
      const bodyGrad = ctx.createLinearGradient(0, -carH * 0.96, 0, -carH * 0.2);
      bodyGrad.addColorStop(0, paint.top);
      bodyGrad.addColorStop(0.42, paint.mid);
      bodyGrad.addColorStop(1, paint.dark);

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-carW * 0.48, -carH * 0.24);
      ctx.lineTo(-carW * 0.46, -carH * 0.56);
      ctx.quadraticCurveTo(-carW * 0.42, -carH * 0.72, -carW * 0.28 + shiftX, -carH * 0.94);
      ctx.lineTo(carW * 0.28 + shiftX, -carH * 0.94);
      ctx.quadraticCurveTo(carW * 0.42, -carH * 0.72, carW * 0.46, -carH * 0.56);
      ctx.lineTo(carW * 0.48, -carH * 0.24);
      ctx.closePath();
      ctx.fill();

      // Specular body highlight contour
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Side aero mirrors
      ctx.fillStyle = paint.mid;
      roundRectPath(ctx, -carW * 0.49 + shiftX * 0.5, -carH * 0.72, carW * 0.09, carH * 0.08, 3);
      ctx.fill();
      roundRectPath(ctx, carW * 0.4 + shiftX * 0.5, -carH * 0.72, carW * 0.09, carH * 0.08, 3);
      ctx.fill();

      // Rear sloped glass canopy + mid-engine carbon louvers
      ctx.fillStyle = "#050811";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.28 + shiftX * 0.4, -carH * 0.63);
      ctx.lineTo(-carW * 0.22 + shiftX, -carH * 0.91);
      ctx.lineTo(carW * 0.22 + shiftX, -carH * 0.91);
      ctx.lineTo(carW * 0.28 + shiftX * 0.4, -carH * 0.63);
      ctx.closePath();
      ctx.fill();

      // Engine bay glass louvers & diagonal clearcoat reflection
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1.3;
      for (let lv = 0; lv < 3; lv++) {
        const ly = -carH * (0.85 - lv * 0.075);
        const lw = carW * (0.17 + lv * 0.025);
        ctx.beginPath();
        ctx.moveTo(-lw + shiftX * 0.7, ly);
        ctx.lineTo(lw + shiftX * 0.7, ly);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.11)";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.19 + shiftX, -carH * 0.89);
      ctx.lineTo(carW * 0.03 + shiftX, -carH * 0.89);
      ctx.lineTo(-carW * 0.07 + shiftX * 0.5, -carH * 0.65);
      ctx.lineTo(-carW * 0.24 + shiftX * 0.5, -carH * 0.65);
      ctx.closePath();
      ctx.fill();

      // Active Carbon-Fiber GT Rear Spoiler (tilts up slightly under heavy braking as an airbrake!)
      const airbrakeLift = braking ? -carH * 0.055 : 0;
      ctx.fillStyle = "#0B0F1A";
      ctx.fillRect(-carW * 0.34, -carH * 0.78 + airbrakeLift, carW * 0.036, carH * 0.17 - airbrakeLift);
      ctx.fillRect(carW * 0.304, -carH * 0.78 + airbrakeLift, carW * 0.036, carH * 0.17 - airbrakeLift);
      ctx.fillStyle = "#1E293B";
      roundRectPath(ctx, -carW * 0.48, -carH * 0.85 + airbrakeLift, carW * 0.96, carH * 0.085, 4);
      ctx.fill();
      ctx.strokeStyle = paint.accent;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Full-Width Supercar LED Tail-Light Bar + Intense Brake Flare
      ctx.save();
      ctx.shadowColor = braking ? "#FF003C" : "#FF1E56";
      ctx.shadowBlur = braking ? 28 : 13;
      ctx.fillStyle = braking ? "#FF3B5C" : "#E11D48";
      roundRectPath(ctx, -carW * 0.42, -carH * 0.54, carW * 0.84, carH * 0.09, 4);
      ctx.fill();
      ctx.fillStyle = braking ? "#FFFFFF" : "#FDA4AF";
      ctx.fillRect(-carW * 0.39, -carH * 0.515, carW * 0.25, carH * 0.032);
      ctx.fillRect(carW * 0.14, -carH * 0.515, carW * 0.25, carH * 0.032);
      // Center high-mount 3rd brake strip on roof
      if (braking) {
        ctx.fillStyle = "#FF2E63";
        ctx.fillRect(-carW * 0.1 + shiftX, -carH * 0.935, carW * 0.2, carH * 0.026);
      }
      ctx.restore();

      // Glowing SMSC GT License Plate
      ctx.fillStyle = "#070B14";
      ctx.strokeStyle = paint.accent;
      ctx.lineWidth = 1.2;
      ctx.fillRect(-carW * 0.13, -carH * 0.41, carW * 0.26, carH * 0.135);
      ctx.strokeRect(-carW * 0.13, -carH * 0.41, carW * 0.26, carH * 0.135);
      ctx.fillStyle = "#F8FAFC";
      ctx.font = `700 ${Math.max(8, Math.floor(carW * 0.048))}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("SMSC GT", 0, -carH * 0.32);

      ctx.restore();
    };

    const drawCockpitOverlay = (w, h, steer, kmh, rpm, gear, paint) => {
      ctx.save();
      // Left & Right A-pillars + top sun visor strip
      ctx.fillStyle = "#070A12";
      ctx.fillRect(0, 0, w, h * 0.055);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.085, 0);
      ctx.lineTo(w * 0.025, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w * 0.915, 0);
      ctx.lineTo(w * 0.975, h);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Rear-view mirror at top center
      ctx.fillStyle = "#0B1020";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, w * 0.5 - 66, h * 0.045, 132, 30, 8);
      ctx.fill();
      ctx.stroke();

      // Sculpted carbon dashboard cowl
      const dashY = h * 0.77;
      ctx.fillStyle = "#090C16";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, dashY + 24);
      ctx.quadraticCurveTo(w * 0.28, dashY - 26, w * 0.5, dashY + 6);
      ctx.quadraticCurveTo(w * 0.74, dashY - 8, w, dashY + 26);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = paint.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Digital Cockpit Instrument Cluster + F1 Shift Lights
      const cx = w * 0.34;
      const cy = h * 0.87;
      ctx.fillStyle = "#03050B";
      roundRectPath(ctx, cx - 96, cy - 38, 192, 66, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 212, 255, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Live RPM Shift-Light LEDs
      const leds = 10;
      const lit = Math.round((Math.min(9000, rpm) / 8600) * leds);
      for (let i = 0; i < leds; i++) {
        ctx.fillStyle =
          i < lit
            ? i < 5
              ? "#10B981"
              : i < 8
              ? "#F59E0B"
              : "#FF2E63"
            : "rgba(255,255,255,0.12)";
        ctx.fillRect(cx - 72 + i * 15, cy - 29, 10, 5);
      }

      ctx.fillStyle = "#00D4FF";
      ctx.font = "700 22px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${kmh} KM/H`, cx, cy - 1);
      ctx.fillStyle = rpm > 7400 ? "#FF2E63" : "#FFC247";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.fillText(`GEAR ${gear}  •  ${Math.round(rpm)} RPM`, cx, cy + 18);

      // Rotating Alcantara Racing Steering Wheel
      ctx.save();
      ctx.translate(cx, h * 0.95);
      ctx.rotate(steer * 0.95);
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 94, 0, Math.PI * 2);
      ctx.stroke();

      // Top center racing stripe
      ctx.strokeStyle = paint.accent;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 94, -Math.PI / 2 - 0.12, -Math.PI / 2 + 0.12);
      ctx.stroke();

      // Spokes
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-86, 0);
      ctx.lineTo(86, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 86);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    const tick = (now) => {
      // Schedule next frame FIRST so the game loop can NEVER freeze permanently
      raf = requestAnimationFrame(tick);

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
        const active = phaseRef.current === "playing";
        const isMenu = phaseRef.current === "menu";

        // Unified input reading (supports e.code, e.key, touch buttons & Auto-Gas assist!)
        const manualGas =
          s.keys["w"] ||
          s.keys["arrowup"] ||
          s.codes["KeyW"] ||
          s.codes["ArrowUp"] ||
          s.touch.gas;
        const brake =
          s.keys["s"] ||
          s.keys["arrowdown"] ||
          s.codes["KeyS"] ||
          s.codes["ArrowDown"] ||
          s.touch.brake;
        const left =
          s.keys["a"] ||
          s.keys["arrowleft"] ||
          s.codes["KeyA"] ||
          s.codes["ArrowLeft"] ||
          s.touch.left;
        const right =
          s.keys["d"] ||
          s.keys["arrowright"] ||
          s.codes["KeyD"] ||
          s.codes["ArrowRight"] ||
          s.touch.right;
        const handbrake = Boolean(s.keys[" "] || s.codes["Space"]);
        const wantNitro =
          s.keys["shift"] ||
          s.keys["n"] ||
          s.codes["ShiftLeft"] ||
          s.codes["ShiftRight"] ||
          s.codes["KeyN"] ||
          s.touch.nitro;

        const gas = Boolean(manualGas || (autoGasRef.current && !brake && !handbrake));
        s._gasNow = gas;
        s._brakeNow = Boolean(brake || handbrake);

        if (active) {
          const playerSegIdx = Math.floor(s.pos / SEG_LEN) % segments.length;
          const playerSeg = segments[playerSegIdx];

          s.invuln = Math.max(0, s.invuln - dt);
          s.shake = Math.max(0, s.shake - dt * 26);
          s.crashFlash = Math.max(0, s.crashFlash - dt * 2.5);
          s.bannerTimer = Math.max(0, s.bannerTimer - dt);
          if (s.comboTimer > 0) {
            s.comboTimer -= dt;
            if (s.comboTimer <= 0) s.combo = 1;
          }

          // Nitrous Boost
          s.nitroActive = Boolean(wantNitro && s.nitro > 3 && !brake);
          if (s.nitroActive) {
            s.nitro = Math.max(0, s.nitro - dt * 24);
          } else {
            s.nitro = Math.min(100, s.nitro + dt * 4.5);
          }

          // Top speed target: full throttle manual/nitro hits max, Auto-Gas cruises briskly up to 245 KM/H (hold W/↑ for full 290!)
          const cruiseCap = manualGas ? s.maxSpeed : s.maxSpeed * 0.85;
          const effectiveMax = s.nitroActive ? s.maxSpeed * 1.2 : cruiseCap;
          const offRoad = Math.abs(s.playerX) > 1.04;

          if (brake) {
            s.speed -= 13500 * dt;
          } else if (s.nitroActive) {
            s.speed += 9600 * dt;
          } else if (gas) {
            if (s.speed < effectiveMax) {
              const accel = manualGas ? 6200 : 4800;
              s.speed += accel * dt;
            } else {
              // Gentle deceleration down to cruiseCap if user released manual gas
              s.speed -= 1600 * dt;
            }
          } else {
            s.speed -= 2400 * dt;
          }

          if (handbrake && s.speed > 2000) {
            s.speed -= 4200 * dt;
          }

          if (offRoad && s.speed > 5500) {
            s.speed -= 7200 * dt;
            s.shake = Math.max(s.shake, 4.2);
          }

          s.speed = Math.max(0, Math.min(s.maxSpeed * 1.2, s.speed));
          const speedRatio = s.speed / s.maxSpeed;

          // Realistic 6-Speed Sequential Gearbox & RPM
          const gearThresholds = [0, 0.16, 0.32, 0.49, 0.67, 0.85, 1.3];
          let nextGear = 1;
          for (let g = 1; g <= 6; g++) {
            if (speedRatio >= gearThresholds[g - 1]) nextGear = g;
          }
          if (nextGear > s.gear && gas) {
            audioRef.current?.playGearShift(mutedRef.current);
          }
          s.gear = nextGear;
          const gLow = gearThresholds[s.gear - 1];
          const gHigh = gearThresholds[s.gear];
          const gearProg = Math.max(0, Math.min(1, (speedRatio - gLow) / Math.max(0.12, gHigh - gLow)));
          const targetRpm =
            s.speed < 80
              ? 1150 + (gas ? 950 : 0)
              : 2700 + gearProg * 5800 + (s.nitroActive ? 450 : 0);
          s.rpm += (targetRpm - s.rpm) * Math.min(1, dt * 14);

          // Responsive Steering (Keyboard + Optional Pointer Drag) & Curve Centrifugal Pull
          let steerInput = (right ? 1 : 0) - (left ? 1 : 0);
          if (steerInput === 0 && s.pointerSteer !== null) {
            steerInput = Math.max(-1, Math.min(1, s.pointerSteer));
          }
          s.steerAngle += (steerInput - s.steerAngle) * Math.min(1, dt * 12);

          const steerRate = (handbrake ? 2.55 : 2.05) * Math.min(1, speedRatio * 2.4 + 0.25);
          s.playerX += s.steerAngle * steerRate * dt;

          const centrifugal = playerSeg.curve * speedRatio * speedRatio * 0.36;
          s.playerX -= centrifugal * dt;
          s.playerX = Math.max(-1.42, Math.min(1.42, s.playerX));

          // Drift dynamics & tire smoke particles
          const targetDrift =
            (handbrake && Math.abs(steerInput) > 0 && speedRatio > 0.32) ||
            (Math.abs(playerSeg.curve) > 1.9 && speedRatio > 0.7 && Math.abs(steerInput) > 0)
              ? steerInput * speedRatio
              : 0;
          s.drift += (targetDrift - s.drift) * Math.min(1, dt * 8);

          if (Math.abs(s.drift) > 0.22 || (brake && speedRatio > 0.45)) {
            s.particles.push({
              x: w * 0.5 + s.steerAngle * 22 + (Math.random() - 0.5) * 95,
              y: h - 18,
              vx: -s.drift * 95 + (Math.random() - 0.5) * 38,
              vy: -28 - Math.random() * 28,
              life: 0.42,
              size: 9 + Math.random() * 14,
              color: s.nitroActive ? "rgba(0,212,255,0.28)" : "rgba(226,232,240,0.22)",
            });
          }

          // Advance highway position
          const deltaZ = s.speed * dt;
          s.pos = (s.pos + deltaZ) % trackLen;
          s.distance += deltaZ;
          s.skyOffset += playerSeg.curve * speedRatio * dt * 18;

          const kmh = (s.speed / s.maxSpeed) * 290;
          if (kmh > s.topSpeed) s.topSpeed = kmh;

          s.score += kmh * dt * 0.48 * s.combo;

          // Checkpoint Timer & Bonus
          s.timeLeft -= dt;
          const currSeg = Math.floor(s.pos / SEG_LEN) % segments.length;
          if (currSeg !== s.lastCheckpointSeg && segments[currSeg].isCheckpoint) {
            s.lastCheckpointSeg = currSeg;
            s.timeLeft = Math.min(60, s.timeLeft + 18);
            s.score += 1000;
            s.bannerText = "CHECKPOINT CLEARED! +18s TIME • +1000 PTS";
            s.bannerTimer = 2.4;
            audioRef.current?.playCheckpoint(mutedRef.current);
          }

          // Update Traffic Cars, Lane Changes, Visual-Aligned Near-Misses & Collisions
          for (const car of s.traffic) {
            car.z = (car.z + car.speed * dt + trackLen) % trackLen;

            if (!car.oncoming) {
              car.laneTimer -= dt;
              if (car.laneTimer <= 0) {
                car.laneTimer = 4.5 + Math.random() * 6.5;
                const nextTarget = car.targetOffset === 0.25 ? 0.74 : 0.25;
                car.blinker = nextTarget > car.offset ? 1 : -1;
                car.targetOffset = nextTarget;
              }
              const diff = car.targetOffset - car.offset;
              if (Math.abs(diff) < 0.02) {
                car.offset = car.targetOffset;
                car.blinker = 0;
              } else {
                car.offset += diff * Math.min(1, dt * 1.8);
              }
            }

            let relZ = car.z - s.pos;
            if (relZ < -trackLen / 2) relZ += trackLen;
            if (relZ > trackLen / 2) relZ -= trackLen;

            if (relZ > 1500 && relZ < 2400) {
              car.passedNear = false;
            }

            // Visually, the player supercar bumper sits right around relZ = 680..1080
            if (relZ > 640 && relZ < 1080) {
              const latDist = Math.abs(s.playerX - car.offset);
              const hitThreshold = car.w * 0.56 + 0.12;

              if (latDist < hitThreshold && s.invuln <= 0) {
                s.integrity -= car.oncoming ? 32 : 20;
                s.speed = Math.max(2600, s.speed * 0.38);
                s.invuln = 1.15;
                s.shake = 22;
                s.crashFlash = 1;
                s.combo = 1;
                s.bannerText = car.oncoming ? "HEAD-ON IMPACT! -32%" : "REAR COLLISION! -20%";
                s.bannerTimer = 1.9;
                audioRef.current?.playCrash(mutedRef.current);
                car.z = (car.z + 4200) % trackLen;

                // Impact spark burst
                for (let sp = 0; sp < 14; sp++) {
                  s.particles.push({
                    x: w * 0.5 + (Math.random() - 0.5) * 90,
                    y: h - 75 + (Math.random() - 0.5) * 35,
                    vx: (Math.random() - 0.5) * 260,
                    vy: -80 - Math.random() * 140,
                    life: 0.35 + Math.random() * 0.25,
                    size: 3 + Math.random() * 4,
                    color: sp % 2 === 0 ? "rgba(255,194,71,0.9)" : "rgba(255,60,120,0.9)",
                  });
                }
              } else if (
                !car.passedNear &&
                latDist >= hitThreshold &&
                latDist < hitThreshold + 0.36 &&
                kmh > 105
              ) {
                car.passedNear = true;
                s.nearMisses++;
                s.combo = Math.min(10, s.combo + 1);
                s.comboTimer = 4.2;
                const bonus = (car.oncoming ? 350 : 200) * s.combo;
                s.score += bonus;
                s.nitro = Math.min(100, s.nitro + 18);
                s.bannerText = car.oncoming
                  ? `ONCOMING NEAR MISS! +${bonus} (x${s.combo})`
                  : `CLOSE PASS! +${bonus} (x${s.combo})`;
                s.bannerTimer = 1.6;
                audioRef.current?.playWhoosh(mutedRef.current, speedRatio);
              }
            }
          }

          for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size += dt * 20;
            if (p.life <= 0) s.particles.splice(i, 1);
          }

          audioRef.current?.updateEngine(
            s.rpm,
            gas,
            s.nitroActive,
            Math.abs(s.drift) + (brake && speedRatio > 0.45 ? 0.5 : 0),
            mutedRef.current,
            true
          );

          if (s.integrity <= 0 || s.timeLeft <= 0) {
            let isNewBest = false;
            if (s.score > s.bestScore) {
              s.bestScore = Math.floor(s.score);
              localStorage.setItem(BEST_SCORE_KEY, String(s.bestScore));
              isNewBest = true;
            }
            audioRef.current?.updateEngine(1100, false, false, 0, true, false);
            phaseRef.current = "gameover";
            setPhase("gameover");
            syncHud(isNewBest);
          }

          hudTick += dt;
          if (hudTick > 0.06) {
            hudTick = 0;
            syncHud();
          }
        } else if (isMenu) {
          // Live scenic autopilot showcase behind the start menu (with moving highway, traffic & supercar!)
          s.speed = 7600;
          const playerSegIdx = Math.floor(s.pos / SEG_LEN) % segments.length;
          s.pos = (s.pos + s.speed * dt) % trackLen;
          s.skyOffset += segments[playerSegIdx].curve * 0.45 * dt * 18;
          const targetMenuX = 0.25 + Math.sin(now * 0.00075) * 0.28;
          s.steerAngle = (targetMenuX - s.playerX) * 2.2;
          s.playerX += (targetMenuX - s.playerX) * Math.min(1, dt * 2.5);
          s.drift = 0;
          for (const car of s.traffic) {
            car.z = (car.z + car.speed * dt + trackLen) % trackLen;
          }
          audioRef.current?.updateEngine(1100, false, false, 0, true, false);
        } else {
          // Paused or Game Over
          audioRef.current?.updateEngine(1100, false, false, 0, true, false);
        }

        // ================= RENDER 3D NIGHT HIGHWAY WORLD =================
        const shakeX = (Math.random() - 0.5) * s.shake;
        const shakeY = (Math.random() - 0.5) * s.shake;
        const horizonY = h * 0.45 + shakeY;

        // 1. Atmospheric Night-Twilight Skybox
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 30);
        skyGrad.addColorStop(0, "#03040D");
        skyGrad.addColorStop(0.45, "#0D0B26");
        skyGrad.addColorStop(0.78, "#29103D");
        skyGrad.addColorStop(1, "#6C2258");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, horizonY + 40);

        // Twinkling night sky stars
        for (const st of s.stars) {
          const sx = (((st.x * w - s.skyOffset * 0.4) % w) + w) % w;
          const sy = st.y * h;
          const alpha = 0.35 + Math.sin(now * 0.002 + st.tw) * 0.3;
          ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
          ctx.fillRect(sx, sy, st.r, st.r);
        }

        // Horizon Neon Sunset / Moon Glow
        const sunWrap = Math.max(100, w * 1.6);
        const sunX = (((w * 0.5 - s.skyOffset * 1.4) % sunWrap) + sunWrap) % sunWrap - w * 0.3;
        const sunGrad = ctx.createRadialGradient(sunX, horizonY - 12, 8, sunX, horizonY - 12, 185);
        sunGrad.addColorStop(0, "rgba(255, 194, 71, 0.72)");
        sunGrad.addColorStop(0.36, "rgba(240, 18, 168, 0.36)");
        sunGrad.addColorStop(1, "rgba(14, 11, 36, 0)");
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, w, horizonY + 24);

        // Parallax Distant Coastal Mountains & Illuminated City Skyline
        ctx.save();
        const skyWrap = Math.max(200, w * 1.4);
        const bgShift = (((-s.skyOffset * 2.1) % skyWrap) + skyWrap) % skyWrap;
        for (let pass = -1; pass <= 1; pass++) {
          const bx = bgShift + pass * skyWrap;
          // Mountain ridge
          ctx.fillStyle = "#0F0A24";
          ctx.beginPath();
          ctx.moveTo(bx, horizonY + 12);
          for (let m = 0; m <= 10; m++) {
            const mx = bx + (m / 10) * skyWrap;
            const mh = 22 + Math.abs(Math.sin(m * 1.7)) * 46;
            ctx.lineTo(mx, horizonY - mh);
          }
          ctx.lineTo(bx + skyWrap, horizonY + 12);
          ctx.closePath();
          ctx.fill();

          // City skyline towers with lit windows
          for (let b = 0; b < 18; b++) {
            const bw = 26 + ((b * 37) % 42);
            const bh = 26 + ((b * 53) % 86);
            const x = bx + b * (skyWrap / 18);
            ctx.fillStyle = "#0A071A";
            ctx.fillRect(x, horizonY - bh + 8, bw, bh);
            ctx.fillStyle =
              b % 3 === 0
                ? "rgba(0,212,255,0.45)"
                : b % 3 === 1
                ? "rgba(255,194,71,0.45)"
                : "rgba(240,18,168,0.45)";
            for (let wy = horizonY - bh + 16; wy < horizonY - 4; wy += 11) {
              ctx.fillRect(x + 5, wy, bw - 10, 2);
            }
          }
        }
        ctx.restore();

        // Dark ground below horizon
        ctx.fillStyle = "#080915";
        ctx.fillRect(0, horizonY, w, h - horizonY);

        // 2. Project 3D Highway Segments (Near -> Far) with True Elevation Hill Occlusion
        const speedNorm = Math.min(1.2, s.speed / s.maxSpeed);
        const fovDeg =
          (cameraRef.current === "cockpit" ? 94 : 100) + speedNorm * 8 + (s.nitroActive ? 8 : 0);
        const camDepth = 1 / Math.tan(((fovDeg / 2) * Math.PI) / 180);

        const baseIdx = Math.floor(s.pos / SEG_LEN) % segments.length;
        const basePercent = (s.pos % SEG_LEN) / SEG_LEN;
        const playerBaseY =
          segments[baseIdx].p1.world.y +
          (segments[baseIdx].p2.world.y - segments[baseIdx].p1.world.y) * basePercent;

        const camY = playerBaseY + (cameraRef.current === "cockpit" ? 680 : CAM_H);
        const camX = s.playerX * ROAD_W;

        let xCurve = 0;
        let dxCurve = -(segments[baseIdx].curve * basePercent);
        let maxY = h;

        const visibleSegs = [];

        for (let n = 0; n < DRAW_DIST; n++) {
          const seg = segments[(baseIdx + n) % segments.length];
          const looped = baseIdx + n >= segments.length;
          const loopZ = looped ? trackLen : 0;

          const z1 = seg.p1.world.z + loopZ - s.pos;
          const z2 = seg.p2.world.z + loopZ - s.pos;

          if (z1 <= camDepth * 55 || z2 <= camDepth * 55) {
            xCurve += dxCurve;
            dxCurve += seg.curve;
            continue;
          }

          const scale1 = camDepth / z1;
          const scale2 = camDepth / z2;

          const sx1 = w * 0.5 + shakeX + scale1 * (0 - camX - xCurve) * (w * 0.5);
          const sy1 = horizonY - scale1 * (seg.p1.world.y - camY) * (h * 0.5);
          const sw1 = scale1 * ROAD_W * (w * 0.5);

          const sx2 = w * 0.5 + shakeX + scale2 * (0 - camX - xCurve - dxCurve) * (w * 0.5);
          const sy2 = horizonY - scale2 * (seg.p2.world.y - camY) * (h * 0.5);
          const sw2 = scale2 * ROAD_W * (w * 0.5);

          xCurve += dxCurve;
          dxCurve += seg.curve;

          if (sy2 >= sy1 || sy2 >= maxY) continue;

          seg.p1.screen = { x: sx1, y: sy1, w: sw1, scale: scale1 };
          seg.p2.screen = { x: sx2, y: sy2, w: sw2, scale: scale2 };
          seg.clip = maxY;
          visibleSegs.push(seg);

          const fog = Math.min(1, n / DRAW_DIST);
          const dark = seg.dark;

          // Coastal dark shoulder terrain
          ctx.fillStyle = dark ? "#0B0E1D" : "#0F1326";
          ctx.fillRect(0, sy2, w, sy1 - sy2 + 1.5);

          // Metallic highway barrier / shoulder gravel border
          drawQuad(sx1, sy1, sw1 * 1.24, sx2, sy2, sw2 * 1.24, dark ? "#1E293B" : "#273449");

          // Racing red/white rumble curb strips
          drawQuad(
            sx1,
            sy1,
            sw1 * 1.1,
            sx2,
            sy2,
            sw2 * 1.1,
            seg.isCheckpoint ? "#00D4FF" : dark ? "#E11D48" : "#F8FAFC"
          );

          // Dark textured wet highway asphalt
          const roadCol = seg.isCheckpoint
            ? "#0E7490"
            : dark
            ? "#161A2C"
            : "#1D2238";
          drawQuad(sx1, sy1, sw1, sx2, sy2, sw2, roadCol);

          // Wet-asphalt specular streetlamp reflection sheen
          if (seg.hasLamp) {
            drawQuad(
              sx1,
              sy1,
              sw1 * 0.88,
              sx2,
              sy2,
              sw2 * 0.88,
              "rgba(0, 212, 255, 0.085)"
            );
          }

          // Outer solid white shoulder edge lines
          const edgeW1 = Math.max(1, sw1 * 0.016);
          const edgeW2 = Math.max(1, sw2 * 0.016);
          drawQuad(sx1 - sw1 * 0.96, sy1, edgeW1, sx2 - sw2 * 0.96, sy2, edgeW2, "rgba(248,250,252,0.55)");
          drawQuad(sx1 + sw1 * 0.96, sy1, edgeW1, sx2 + sw2 * 0.96, sy2, edgeW2, "rgba(248,250,252,0.55)");

          // Double Amber Center Divider
          const cLine1 = Math.max(1, sw1 * 0.014);
          const cLine2 = Math.max(1, sw2 * 0.014);
          drawQuad(sx1 - sw1 * 0.018, sy1, cLine1 * 0.55, sx2 - sw2 * 0.018, sy2, cLine2 * 0.55, "#F59E0B");
          drawQuad(sx1 + sw1 * 0.018, sy1, cLine1 * 0.55, sx2 + sw2 * 0.018, sy2, cLine2 * 0.55, "#F59E0B");

          // Dashed white highway lane dividers at -0.5 and +0.5
          if (!dark) {
            drawQuad(sx1 - sw1 * 0.5, sy1, cLine1 * 0.65, sx2 - sw2 * 0.5, sy2, cLine2 * 0.65, "rgba(248,250,252,0.78)");
            drawQuad(sx1 + sw1 * 0.5, sy1, cLine1 * 0.65, sx2 + sw2 * 0.5, sy2, cLine2 * 0.65, "rgba(248,250,252,0.78)");
          }

          // Distance atmospheric twilight haze
          if (fog > 0.55) {
            ctx.fillStyle = `rgba(22, 12, 42, ${Math.min(0.85, (fog - 0.55) * 1.45)})`;
            ctx.fillRect(0, sy2, w, sy1 - sy2 + 1.5);
          }

          maxY = sy2;
        }

        // 3. Back-to-Front Painter Pass: Streetlamps, Gantries, Props & Traffic Cars
        const segCars = new Map();
        let oncomingThreatX = null;

        for (const car of s.traffic) {
          const idx = Math.floor(car.z / SEG_LEN) % segments.length;
          if (!segCars.has(idx)) segCars.set(idx, []);
          segCars.get(idx).push(car);

          // Check immediate oncoming threat ahead in player's lane
          if (active && car.oncoming) {
            let relZ = car.z - s.pos;
            if (relZ < -trackLen / 2) relZ += trackLen;
            if (relZ > trackLen / 2) relZ -= trackLen;
            if (relZ > 1100 && relZ < 9000 && Math.abs(car.offset - s.playerX) < 0.38) {
              oncomingThreatX = car.offset;
            }
          }
        }

        for (let i = visibleSegs.length - 1; i >= 0; i--) {
          const seg = visibleSegs[i];
          const sc = seg.p1.screen;

          // Highway Streetlamps arching over both sides
          if (seg.hasLamp && sc.w > 18) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w, seg.clip);
            ctx.clip();
            const poleH = sc.w * 1.15;
            const poleW = Math.max(1.5, sc.w * 0.018);
            const lx = sc.x - sc.w * 1.18;
            const rx = sc.x + sc.w * 1.18;

            ctx.fillStyle = "#334155";
            ctx.fillRect(lx, sc.y - poleH, poleW, poleH);
            ctx.fillRect(rx - poleW, sc.y - poleH, poleW, poleH);
            ctx.fillRect(lx, sc.y - poleH, sc.w * 0.28, poleW);
            ctx.fillRect(rx - sc.w * 0.28, sc.y - poleH, sc.w * 0.28, poleW);

            const glowR = Math.max(4, sc.w * 0.14);
            [
              [lx + sc.w * 0.28, "#F012A8"],
              [rx - sc.w * 0.28, "#00D4FF"],
            ].forEach(([gx, col]) => {
              const g = ctx.createRadialGradient(gx, sc.y - poleH, 1, gx, sc.y - poleH, glowR);
              g.addColorStop(0, "#FFFFFF");
              g.addColorStop(0.35, col);
              g.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(gx, sc.y - poleH, glowR, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }

          // Overhead Highway Gantry / Checkpoint Arch
          if (seg.hasGantry && sc.w > 22) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w, seg.clip);
            ctx.clip();
            const archH = sc.w * 0.96;
            const postW = Math.max(3, sc.w * 0.05);
            ctx.fillStyle = "#1E293B";
            ctx.fillRect(sc.x - sc.w * 1.14, sc.y - archH, postW, archH);
            ctx.fillRect(sc.x + sc.w * 1.14 - postW, sc.y - archH, postW, archH);

            ctx.fillStyle = seg.isCheckpoint ? "#082F49" : "#064E3B";
            ctx.strokeStyle = seg.isCheckpoint ? "#00D4FF" : "#34D399";
            ctx.lineWidth = Math.max(1.5, sc.w * 0.015);
            const signH = archH * 0.22;
            ctx.fillRect(sc.x - sc.w * 1.14, sc.y - archH, sc.w * 2.28, signH);
            ctx.strokeRect(sc.x - sc.w * 1.14, sc.y - archH, sc.w * 2.28, signH);

            if (sc.w > 90) {
              ctx.fillStyle = "#F8FAFC";
              ctx.font = `700 ${Math.max(8, Math.floor(sc.w * 0.085))}px 'JetBrains Mono', monospace`;
              ctx.textAlign = "center";
              ctx.fillText(
                seg.isCheckpoint ? "CHECKPOINT +18s" : seg.gantryTitle,
                sc.x,
                sc.y - archH + signH * 0.65
              );
            }
            ctx.restore();
          }

          // Roadside Props (Palms, Signs, Neon Billboards)
          if (seg.propL) {
            drawRoadsideProp(seg.propL, sc.x + sc.w * seg.propL.offset, sc.y, sc.w, seg.clip);
          }
          if (seg.propR) {
            drawRoadsideProp(seg.propR, sc.x + sc.w * seg.propR.offset, sc.y, sc.w, seg.clip);
          }

          // Traffic Cars smoothly sub-segment interpolated at 60fps and scaled cleanly to road width!
          const carsHere = segCars.get(seg.index);
          if (carsHere) {
            const sc2 = seg.p2.screen;
            for (const car of carsHere) {
              const pct = (((car.z % SEG_LEN) + SEG_LEN) % SEG_LEN) / SEG_LEN;
              const ix = sc.x + (sc2.x - sc.x) * pct;
              const iy = sc.y + (sc2.y - sc.y) * pct;
              const iw = sc.w + (sc2.w - sc.w) * pct;
              const carX = ix + car.offset * iw;
              drawTrafficCar(car, carX, iy, iw, seg.clip, now);
            }
          }
        }

        // 4. Tire Smoke & Collision Spark Particles
        for (const p of s.particles) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
        }

        // 5. High-Speed Nitro Warp Streaks
        if (s.nitroActive && active) {
          ctx.save();
          ctx.strokeStyle = "rgba(0, 212, 255, 0.28)";
          ctx.lineWidth = 2;
          for (let k = 0; k < 14; k++) {
            const ang = (k / 14) * Math.PI * 2 + now * 0.0025;
            ctx.beginPath();
            ctx.moveTo(w * 0.5 + Math.cos(ang) * (w * 0.34), h * 0.5 + Math.sin(ang) * (h * 0.34));
            ctx.lineTo(w * 0.5 + Math.cos(ang) * (w * 0.66), h * 0.5 + Math.sin(ang) * (h * 0.66));
            ctx.stroke();
          }
          ctx.restore();
        }

        // 6. Oncoming Lane Threat Radar Warning
        if (oncomingThreatX !== null && Math.floor(now / 140) % 2 === 0) {
          ctx.save();
          ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
          ctx.font = "700 11px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText("⚠ ONCOMING TRAFFIC AHEAD", w * 0.5, horizonY - 16);
          ctx.restore();
        }

        // 7. Player Supercar (ALWAYS visible — both during Menu showcase and Racing!)
        const kmhNow = Math.round((s.speed / s.maxSpeed) * 290);
        const bounce = s.speed > 400 ? Math.sin(now * 0.048) * (s.speed / s.maxSpeed) * 2.2 : 0;
        if (!isMenu && cameraRef.current === "cockpit") {
          drawCockpitOverlay(w, h, s.steerAngle, kmhNow, s.rpm, s.gear, paintRef.current);
        } else {
          drawPlayerSupercar(
            s,
            w,
            h,
            Boolean(active && (brake || handbrake)),
            s.steerAngle,
            bounce,
            paintRef.current
          );
        }

        // Crash Impact Vignette Flash
        if (s.crashFlash > 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.45, s.crashFlash * 0.4)})`;
          ctx.fillRect(0, 0, w, h);
        }
      } catch (err) {
        if (!errLogged) {
          errLogged = true;
          console.error("[ApexRacer3D render error]", err);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
    };
  }, [syncHud]);

  // Optional smooth mouse/touch drag steering right on the canvas
  const handleCanvasPointerMove = (e) => {
    if (phaseRef.current !== "playing" || e.buttons !== 1) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const rel = ((e.clientX - rect.left) / rect.width - 0.5) * 2.4;
    simRef.current.pointerSteer = Math.max(-1, Math.min(1, rel));
  };
  const handleCanvasPointerUp = () => {
    if (simRef.current) simRef.current.pointerSteer = null;
  };

  // Tachometer arc calculations
  const rpmRatio = Math.min(1, Math.max(0, hud.rpm / 9000));
  const arcLen = 176;

  return (
    <div
      ref={containerRef}
      className="neon-corridor-frame relative overflow-hidden rounded-[28px] border border-white/15 bg-[#06040D] shadow-2xl"
    >
      {/* Top Racing Telemetry HUD */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0617]/95 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Score
            </p>
            <p className="font-display text-lg font-extrabold text-white">
              {hud.score.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Time
            </p>
            <p
              className={`font-mono text-base font-bold ${
                hud.timeLeft <= 10 ? "animate-pulse text-rose-400" : "text-[#00D4FF]"
              }`}
            >
              {hud.timeLeft}s
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Distance
            </p>
            <p className="font-mono text-base font-bold text-[#FFC247]">
              {hud.distanceKm} KM
            </p>
          </div>

          {/* Car Chassis Integrity */}
          <div className="w-24">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-muted">CHASSIS</span>
              <span className={hud.integrity < 35 ? "text-rose-400" : "text-emerald-300"}>
                {hud.integrity}%
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all ${
                  hud.integrity < 35 ? "bg-rose-500" : "bg-emerald-400"
                }`}
                style={{ width: `${hud.integrity}%` }}
              />
            </div>
          </div>
        </div>

        {/* Auto-Gas / Camera / Audio / Pause / Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoGas((a) => !a)}
            title="Toggle Automatic Cruise Throttle"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition ${
              autoGas
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/15 bg-white/5 text-ink-muted hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{autoGas ? "Auto-Gas ON" : "Manual Gas"}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setCameraMode((prev) => (prev === "chase" ? "cockpit" : "chase"))
            }
            title="Switch Chase / Cockpit Camera (Press C)"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#7EE8FF] hover:bg-[#00D4FF]/25"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{cameraMode === "chase" ? "Chase Cam" : "Cockpit Cam"}</span>
          </button>

          {(phase === "playing" || phase === "paused") && (
            <button
              type="button"
              onClick={() =>
                setPhase((prev) => {
                  const next = prev === "playing" ? "paused" : "playing";
                  phaseRef.current = next;
                  return next;
                })
              }
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15"
            >
              {phase === "paused" ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>
          )}

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

      {/* 3D Racing Viewport */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-64px)]" : "h-[64vh] min-h-[480px] max-h-[680px]"
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          className="block h-full w-full cursor-ew-resize"
        />

        {/* Dynamic Event Banner (Near Miss / Checkpoint / Crash) */}
        {phase === "playing" && hud.bannerText && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
            <span className="rounded-full border border-[#F012A8]/60 bg-[#0B0718]/85 px-5 py-1.5 font-mono text-xs font-bold tracking-wider text-[#FFC247] shadow-neon-magenta backdrop-blur-md">
              {hud.bannerText}
            </span>
          </div>
        )}

        {/* Realistic Automotive Tachometer & Speedometer Cluster (Bottom Right) */}
        {phase === "playing" && (
          <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-end gap-3">
            {/* Nitro Pressure Gauge */}
            <div className="rounded-2xl border border-white/12 bg-black/72 px-3 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#00D4FF]">
                <Flame
                  className={`h-3.5 w-3.5 ${
                    hud.nitroActive ? "text-[#FF3CC7]" : "text-[#00D4FF]"
                  }`}
                />
                <span>NOS</span>
              </div>
              <div className="mt-1.5 h-16 w-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-[#F012A8] via-[#00D4FF] to-white transition-all"
                  style={{
                    height: `${hud.nitro}%`,
                    marginTop: `${100 - hud.nitro}%`,
                  }}
                />
              </div>
            </div>

            {/* Analog Arc Tachometer + Digital KM/H + Gear */}
            <div className="relative flex h-32 w-36 flex-col items-center justify-center rounded-3xl border border-white/15 bg-black/75 p-2 backdrop-blur-md">
              <svg viewBox="0 0 120 75" className="w-28 overflow-visible">
                <path
                  d="M 14 66 A 46 46 0 1 1 106 66"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 14 66 A 46 46 0 1 1 106 66"
                  fill="none"
                  stroke={
                    hud.rpm > 7400 ? "#FF2E63" : hud.nitroActive ? "#00D4FF" : "#F012A8"
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={arcLen}
                  strokeDashoffset={arcLen * (1 - rpmRatio)}
                />
              </svg>

              <div className="-mt-7 text-center">
                <p className="font-display text-2xl font-extrabold leading-none text-white">
                  {hud.kmh}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                  KM/H
                </p>
              </div>

              <div className="mt-1 flex items-center gap-2 font-mono text-[10px]">
                <span className="rounded bg-[#00D4FF]/20 px-1.5 py-0.5 font-bold text-[#7EE8FF]">
                  GEAR {hud.gear}
                </span>
                <span className="text-ink-muted">{(hud.rpm / 1000).toFixed(1)}k</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive On-Screen Pedals & Steering Buttons (Works on BOTH Mobile Touch & Desktop Click!) */}
        {phase === "playing" && (
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onPointerDown={() => (simRef.current.touch.left = true)}
              onPointerUp={() => (simRef.current.touch.left = false)}
              onPointerLeave={() => (simRef.current.touch.left = false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/65 font-bold text-white backdrop-blur-md active:bg-[#00D4FF]/40"
              title="Steer Left (A / ◀)"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => (simRef.current.touch.right = true)}
              onPointerUp={() => (simRef.current.touch.right = false)}
              onPointerLeave={() => (simRef.current.touch.right = false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/65 font-bold text-white backdrop-blur-md active:bg-[#00D4FF]/40"
              title="Steer Right (D / ▶)"
            >
              ▶
            </button>
            <button
              type="button"
              onPointerDown={() => (simRef.current.touch.brake = true)}
              onPointerUp={() => (simRef.current.touch.brake = false)}
              onPointerLeave={() => (simRef.current.touch.brake = false)}
              className={`flex h-11 px-3 items-center justify-center rounded-xl border font-mono text-[11px] font-bold backdrop-blur-md ${
                hud.brakeActive
                  ? "border-rose-400 bg-rose-500/45 text-white"
                  : "border-white/20 bg-black/65 text-rose-300"
              }`}
              title="Brake (S / ▼)"
            >
              BRK
            </button>
            <button
              type="button"
              onPointerDown={() => (simRef.current.touch.gas = true)}
              onPointerUp={() => (simRef.current.touch.gas = false)}
              onPointerLeave={() => (simRef.current.touch.gas = false)}
              className={`flex h-11 px-3.5 items-center justify-center rounded-xl border font-mono text-[11px] font-bold backdrop-blur-md ${
                hud.gasActive
                  ? "border-emerald-400 bg-emerald-500/40 text-white"
                  : "border-white/20 bg-black/65 text-emerald-300"
              }`}
              title="Full Throttle (W / ▲)"
            >
              GAS
            </button>
            <button
              type="button"
              onPointerDown={() => {
                simRef.current.touch.gas = true;
                simRef.current.touch.nitro = true;
              }}
              onPointerUp={() => {
                simRef.current.touch.gas = false;
                simRef.current.touch.nitro = false;
              }}
              onPointerLeave={() => {
                simRef.current.touch.gas = false;
                simRef.current.touch.nitro = false;
              }}
              className={`flex h-11 px-3 items-center justify-center rounded-xl border font-mono text-[11px] font-bold backdrop-blur-md ${
                hud.nitroActive
                  ? "border-[#00D4FF] bg-[#F012A8]/55 text-white shadow-neon-magenta"
                  : "border-[#F012A8]/50 bg-[#F012A8]/20 text-white"
              }`}
              title="Nitro Boost (Shift / N)"
            >
              NOS
            </button>
          </div>
        )}

        {/* Start Menu Overlay — Positioned cleanly in upper-center so your live 3D Supercar & Highway shine right below! */}
        {phase === "menu" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start bg-gradient-to-b from-[#06040D]/80 via-[#06040D]/48 to-transparent px-5 pt-6 text-center sm:pt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FF8A1F]/55 bg-[#06040D]/75 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFC247] backdrop-blur-md">
              <Car className="h-3.5 w-3.5" />
              3D Night Highway Simulator
            </span>

            <h2 className="mt-2.5 font-display text-3xl font-extrabold text-white drop-shadow sm:text-5xl">
              APEX HORIZON:{" "}
              <span className="text-neon-gradient">NIGHT DRIVE</span>
            </h2>

            {/* Paint Selector + Traffic Mode Row */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
              {/* Traffic Mode Toggle */}
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/65 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => handleSelectMode(true)}
                  className={`rounded-full px-3.5 py-1 font-mono text-[11px] font-semibold transition ${
                    twoWayMode
                      ? "bg-[#F012A8] text-white"
                      : "text-ink-muted hover:text-white"
                  }`}
                >
                  2-Way Traffic
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMode(false)}
                  className={`rounded-full px-3.5 py-1 font-mono text-[11px] font-semibold transition ${
                    !twoWayMode
                      ? "bg-[#00D4FF] text-[#06040D]"
                      : "text-ink-muted hover:text-white"
                  }`}
                >
                  1-Way Highway
                </button>
              </div>

              {/* Supercar Paint Spec */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-3 py-1 backdrop-blur-md">
                <span className="font-mono text-[10px] uppercase text-ink-muted">Paint:</span>
                {CAR_PAINTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaintId(p.id)}
                    title={p.name}
                    className={`h-5 w-5 rounded-full border-2 transition ${
                      paintId === p.id ? "scale-110 border-white" : "border-white/25 opacity-70"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${p.top}, ${p.dark})` }}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={startRace}
              className="mt-5 inline-flex items-center gap-2.5 rounded-full px-9 py-3.5 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105 active:scale-95"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Ignite Engine & Race</span>
            </button>

            <p className="mt-2.5 font-mono text-[11px] text-white/80 drop-shadow">
              Press <span className="text-[#00D4FF]">Enter</span> or click Start • Steer with{" "}
              <span className="text-[#FFC247]">A/D</span> or{" "}
              <span className="text-[#FFC247]">◀/▶</span> •{" "}
              <span className="text-[#FF3CC7]">Shift</span> for Nitro
            </p>

            {hud.bestScore > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-0.5 font-mono text-[11px] text-[#FFC247]">
                <Trophy className="h-3.5 w-3.5" />
                Best Score: {hud.bestScore.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Pause Overlay */}
        {phase === "paused" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06040D]/78 p-6 text-center backdrop-blur-md">
            <h3 className="font-display text-3xl font-bold text-white">RACE PAUSED</h3>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  phaseRef.current = "playing";
                  setPhase("playing");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#00D4FF] px-6 py-3 text-sm font-bold text-[#06040D]"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
              <button
                type="button"
                onClick={startRace}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
            </div>
          </div>
        )}

        {/* Game Over Summary */}
        {phase === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-[#06040D]/88 p-5 text-center backdrop-blur-md">
            {hud.isNewBest && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFC247]/60 bg-[#FFC247]/20 px-4 py-1 font-mono text-xs font-bold text-[#FFC247]">
                <Trophy className="h-3.5 w-3.5" />
                NEW TRACK RECORD!
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              {hud.integrity <= 0 ? "VEHICLE WRECKED" : "CHECKPOINT TIME EXPIRED"}
            </span>

            <h3 className="mt-1.5 font-display text-3xl font-extrabold text-white sm:text-4xl">
              RUN COMPLETE
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Final Score", val: hud.score.toLocaleString(), col: "text-white" },
                { label: "Top Speed", val: `${hud.topSpeed} KM/H`, col: "text-[#00D4FF]" },
                { label: "Distance", val: `${hud.distanceKm} KM`, col: "text-[#FFC247]" },
                { label: "Near Misses", val: `${hud.nearMisses}`, col: "text-[#FF3CC7]" },
              ].map((st) => (
                <div
                  key={st.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    {st.label}
                  </p>
                  <p className={`mt-1 font-display text-lg font-bold ${st.col}`}>
                    {st.val}
                  </p>
                </div>
              ))}
            </div>

            {hud.score > 0 && (
              <LeaderboardSubmitCard
                key={`racer-${hud.score}-${hud.distanceKm}`}
                gameId="racer"
                score={hud.score}
                badge={`${hud.topSpeed} KM/H`}
                meta={`${hud.distanceKm} KM • ${hud.nearMisses} Near Misses`}
                highlightLabel={
                  hud.isNewBest
                    ? "New Best Score! Add Your Name"
                    : "Save Score to Leaderboard"
                }
                isNewRecord={hud.isNewBest}
              />
            )}

            <button
              type="button"
              onClick={startRace}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-8 py-3 font-heading text-sm font-bold text-white shadow-neon-magenta transition hover:scale-105"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Race Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#080514] px-5 py-2.5 font-mono text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-[#00D4FF]" />
          SMSC GT Twin-Turbo • 6-Speed Sequential • Dynamic RPM Audio
        </span>
        <span>
          [A/D or ◀/▶] Steer • [W/S] Gas/Brake • [Shift] Nitro • [Space] Drift • [C] Cockpit
        </span>
      </div>
    </div>
  );
}
