import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Zap,
  Shield,
  Crosshair,
  Trophy,
} from "lucide-react";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const HIGH_SCORE_KEY = "smsc_neon_shooter_highscore_v1";

/**
 * Procedural Web Audio arcade sound synthesizer (zero external audio files).
 */
function createAudioEngine() {
  let ctx = null;
  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  };

  return {
    laser(muted) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    },
    hit(muted) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    },
    explode(muted, heavy = false) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const dur = heavy ? 0.38 : 0.22;
      const bufferSize = Math.floor(c.sampleRate * dur);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
      }
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(heavy ? 620 : 1200, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + dur);
      const gain = c.createGain();
      gain.gain.setValueAtTime(heavy ? 0.22 : 0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      noise.connect(filter).connect(gain).connect(c.destination);
      noise.start(now);
    },
    damage(muted) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(55, now + 0.22);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    },
    emp(muted) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.55);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      osc.connect(gain).connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    },
    powerup(muted) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const now = c.currentTime;
      [523, 659, 880].forEach((freq, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.14);
        osc.connect(gain).connect(c.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    },
  };
}

export default function NeonShooter3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const [gameState, setGameState] = useState("idle"); // "idle" | "playing" | "paused" | "gameover"
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hud, setHud] = useState({
    score: 0,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
    wave: 1,
    combo: 1,
    shield: 5,
    maxShield: 5,
    overdrive: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    isNewHigh: false,
  });

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Mutable 60fps simulation state
  const simRef = useRef({
    time: 0,
    width: 960,
    height: 580,
    aimX: 0, // normalized -1..1
    aimY: 0,
    smoothAimX: 0,
    smoothAimY: 0,
    firing: false,
    fireCooldown: 0,
    recoilL: 0,
    recoilR: 0,
    gunSide: 1,
    shake: 0,
    damageFlash: 0,
    empFlash: 0,
    score: 0,
    highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
    wave: 1,
    combo: 1,
    comboTimer: 0,
    shield: 5,
    maxShield: 5,
    overdrive: 25,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    spawnTimer: 0.4,
    enemies: [],
    lasers: [],
    enemyOrbs: [],
    particles: [],
    popups: [],
    stars: Array.from({ length: 85 }, () => ({
      x: (Math.random() - 0.5) * 1800,
      y: (Math.random() - 0.5) * 1100,
      z: Math.random() * 1400 + 60,
    })),
  });

  if (!audioRef.current) {
    audioRef.current = createAudioEngine();
  }

  const syncHud = useCallback((isNewHigh = false) => {
    const s = simRef.current;
    setHud({
      score: Math.floor(s.score),
      highScore: Math.floor(s.highScore),
      wave: s.wave,
      combo: s.combo,
      shield: s.shield,
      maxShield: s.maxShield,
      overdrive: Math.min(100, Math.floor(s.overdrive)),
      kills: s.kills,
      shotsFired: s.shotsFired,
      shotsHit: s.shotsHit,
      isNewHigh,
    });
  }, []);

  const resetGame = useCallback(() => {
    const s = simRef.current;
    s.time = 0;
    s.firing = false;
    s.fireCooldown = 0;
    s.recoilL = 0;
    s.recoilR = 0;
    s.shake = 0;
    s.damageFlash = 0;
    s.empFlash = 0;
    s.score = 0;
    s.wave = 1;
    s.combo = 1;
    s.comboTimer = 0;
    s.shield = 5;
    s.overdrive = 30;
    s.kills = 0;
    s.shotsFired = 0;
    s.shotsHit = 0;
    s.spawnTimer = 0.5;
    s.enemies = [];
    s.lasers = [];
    s.enemyOrbs = [];
    s.particles = [];
    s.popups = [];
    setGameState("playing");
    syncHud(false);
  }, [syncHud]);

  const triggerOverdrive = useCallback(() => {
    const s = simRef.current;
    if (stateRef.current !== "playing" || s.overdrive < 100) return;
    s.overdrive = 0;
    s.empFlash = 1;
    s.shake = 18;
    audioRef.current.emp(mutedRef.current);

    let bonus = 0;
    for (const e of s.enemies) {
      if (e.kind === "shield") continue;
      bonus += e.points * s.combo;
      s.kills++;
      for (let i = 0; i < 16; i++) {
        s.particles.push({
          x: e.x,
          y: e.y,
          z: e.z,
          vx: (Math.random() - 0.5) * 420,
          vy: (Math.random() - 0.5) * 420,
          vz: (Math.random() - 0.5) * 280,
          life: 0.75 + Math.random() * 0.35,
          maxLife: 1,
          color: e.color,
          size: 3 + Math.random() * 3,
        });
      }
    }
    s.enemies = s.enemies.filter((e) => e.kind === "shield");
    s.enemyOrbs = [];
    if (bonus > 0) {
      s.score += bonus;
      s.popups.push({
        x: 0,
        y: -40,
        z: 420,
        text: `EMP OVERDRIVE +${bonus}`,
        color: "#00D4FF",
        life: 1.2,
      });
    }
    syncHud();
  }, [syncHud]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore if unsupported
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && stateRef.current === "playing") {
        e.preventDefault();
        simRef.current.firing = true;
      }
      if ((e.key === "e" || e.key === "E" || e.key === "Shift") && stateRef.current === "playing") {
        triggerOverdrive();
      }
      if ((e.key === "p" || e.key === "P" || e.key === "Escape") && (stateRef.current === "playing" || stateRef.current === "paused")) {
        setGameState((prev) => (prev === "playing" ? "paused" : "playing"));
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") simRef.current.firing = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [triggerOverdrive]);

  // Main 60fps 3D Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(320, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      simRef.current.width = rect.width;
      simRef.current.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf;
    let lastTime = performance.now();
    let hudTick = 0;

    const FOV = 520;
    const project = (x, y, z, cx, cy) => {
      const safeZ = Math.max(25, z);
      const scale = FOV / safeZ;
      return {
        sx: cx + x * scale,
        sy: cy + y * scale,
        scale,
      };
    };

    const spawnEnemy = (s) => {
      const wave = s.wave;
      const roll = Math.random();
      let kind = "drone";
      if (roll < 0.08 && s.shield < s.maxShield) kind = "shield";
      else if (roll > 0.84 && wave >= 2) kind = "titan";
      else if (roll > 0.52) kind = "striker";

      const spreadX = 390;
      const spreadY = 230;
      const cfg =
        kind === "titan"
          ? {
              hp: 4 + Math.floor(wave / 2),
              radius: 56,
              speed: 145 + wave * 12,
              points: 350,
              color: "#FF8A1F",
            }
          : kind === "striker"
          ? {
              hp: 2,
              radius: 36,
              speed: 220 + wave * 18,
              points: 180,
              color: "#F012A8",
            }
          : kind === "shield"
          ? {
              hp: 1,
              radius: 30,
              speed: 210,
              points: 120,
              color: "#34D399",
            }
          : {
              hp: 1,
              radius: 32,
              speed: 265 + wave * 20,
              points: 100,
              color: "#00D4FF",
            };

      s.enemies.push({
        id: Math.random(),
        kind,
        x: (Math.random() - 0.5) * 2 * spreadX,
        y: (Math.random() - 0.5) * 2 * spreadY,
        z: 1480 + Math.random() * 240,
        phase: Math.random() * Math.PI * 2,
        weaveAmp: kind === "titan" ? 45 : 115,
        weaveFreq: kind === "drone" ? 2.4 : 1.5,
        rot: Math.random() * Math.PI * 2,
        hp: cfg.hp,
        maxHp: cfg.hp,
        radius: cfg.radius,
        speed: cfg.speed,
        points: cfg.points,
        color: cfg.color,
        hitFlash: 0,
        shootCooldown: 1.1 + Math.random() * 1.4,
      });
    };

    const spawnBurst = (s, x, y, z, color, count = 16) => {
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x,
          y,
          z,
          vx: (Math.random() - 0.5) * 380,
          vy: (Math.random() - 0.5) * 380,
          vz: (Math.random() - 0.5) * 260,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9,
          color,
          size: 2.5 + Math.random() * 3.5,
        });
      }
    };

    const fireShot = (s) => {
      s.gunSide *= -1;
      const startX = s.gunSide * 190 + s.smoothAimX * 70;
      const startY = 175 + s.smoothAimY * 40;
      const startZ = 95;

      const targetZ = 1150;
      const targetX = s.smoothAimX * (s.width * 0.48) * (targetZ / FOV);
      const targetY = s.smoothAimY * (s.height * 0.48) * (targetZ / FOV);

      const dx = targetX - startX;
      const dy = targetY - startY;
      const dz = targetZ - startZ;
      const len = Math.hypot(dx, dy, dz) || 1;
      const speed = 2650;

      s.lasers.push({
        x: startX,
        y: startY,
        z: startZ,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        vz: (dz / len) * speed,
        color: s.gunSide > 0 ? "#00D4FF" : "#FF3CC7",
      });

      if (s.gunSide > 0) s.recoilR = 1;
      else s.recoilL = 1;
      s.shotsFired++;
      audioRef.current.laser(mutedRef.current);
    };

    const step = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = simRef.current;
      const w = s.width;
      const h = s.height;
      const active = stateRef.current === "playing";

      s.smoothAimX += (s.aimX - s.smoothAimX) * Math.min(1, dt * 16);
      s.smoothAimY += (s.aimY - s.smoothAimY) * Math.min(1, dt * 16);

      if (active) {
        s.time += dt;
        s.wave = 1 + Math.floor(s.kills / 10);
        s.fireCooldown = Math.max(0, s.fireCooldown - dt);
        s.recoilL = Math.max(0, s.recoilL - dt * 7);
        s.recoilR = Math.max(0, s.recoilR - dt * 7);
        s.shake = Math.max(0, s.shake - dt * 36);
        s.damageFlash = Math.max(0, s.damageFlash - dt * 2.4);
        s.empFlash = Math.max(0, s.empFlash - dt * 1.9);

        if (s.comboTimer > 0) {
          s.comboTimer -= dt;
          if (s.comboTimer <= 0) s.combo = 1;
        }

        if (s.firing && s.fireCooldown <= 0) {
          fireShot(s);
          s.fireCooldown = 0.135;
        }

        // Spawn enemies
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
          spawnEnemy(s);
          s.spawnTimer = Math.max(0.36, 1.25 - s.wave * 0.085);
        }

        // Update stars
        const starSpeed = 380 + s.wave * 40;
        for (const st of s.stars) {
          st.z -= starSpeed * dt;
          if (st.z < 30) {
            st.z = 1480;
            st.x = (Math.random() - 0.5) * 1800;
            st.y = (Math.random() - 0.5) * 1100;
          }
        }

        // Update lasers & check hits against enemies and enemy orbs
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const l = s.lasers[i];
          l.x += l.vx * dt;
          l.y += l.vy * dt;
          l.z += l.vz * dt;

          let consumed = false;

          // Shoot incoming enemy plasma orbs!
          for (let j = s.enemyOrbs.length - 1; j >= 0; j--) {
            const orb = s.enemyOrbs[j];
            if (Math.abs(l.z - orb.z) < 120) {
              const dist = Math.hypot(l.x - orb.x, l.y - orb.y);
              if (dist < 42) {
                spawnBurst(s, orb.x, orb.y, orb.z, "#FFC247", 8);
                s.enemyOrbs.splice(j, 1);
                s.score += 40;
                s.shotsHit++;
                audioRef.current.hit(mutedRef.current);
                consumed = true;
                break;
              }
            }
          }

          if (!consumed) {
            for (let j = s.enemies.length - 1; j >= 0; j--) {
              const e = s.enemies[j];
              if (Math.abs(l.z - e.z) < 130) {
                const dist = Math.hypot(l.x - e.x, l.y - e.y);
                if (dist < e.radius * 1.32) {
                  e.hp -= 1;
                  e.hitFlash = 1;
                  s.shotsHit++;
                  consumed = true;

                  if (e.hp <= 0) {
                    if (e.kind === "shield") {
                      s.shield = Math.min(s.maxShield, s.shield + 1);
                      s.overdrive = Math.min(100, s.overdrive + 25);
                      s.popups.push({
                        x: e.x,
                        y: e.y,
                        z: e.z,
                        text: "+1 SHIELD",
                        color: "#34D399",
                        life: 1.0,
                      });
                      audioRef.current.powerup(mutedRef.current);
                    } else {
                      s.kills++;
                      s.combo = Math.min(8, s.combo + 1);
                      s.comboTimer = 3.2;
                      const gained = e.points * s.combo;
                      s.score += gained;
                      s.overdrive = Math.min(100, s.overdrive + (e.kind === "titan" ? 24 : 11));
                      s.shake = Math.max(s.shake, e.kind === "titan" ? 10 : 4);
                      s.popups.push({
                        x: e.x,
                        y: e.y,
                        z: e.z,
                        text: s.combo > 1 ? `+${gained} x${s.combo}` : `+${gained}`,
                        color: e.color,
                        life: 0.9,
                      });
                      audioRef.current.explode(mutedRef.current, e.kind === "titan");
                    }
                    spawnBurst(s, e.x, e.y, e.z, e.color, e.kind === "titan" ? 28 : 16);
                    s.enemies.splice(j, 1);
                  } else {
                    audioRef.current.hit(mutedRef.current);
                    spawnBurst(s, l.x, l.y, l.z, "#FFFFFF", 5);
                  }
                  break;
                }
              }
            }
          }

          if (consumed || l.z > 1650) {
            s.lasers.splice(i, 1);
          }
        }

        // Update enemies
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          e.z -= e.speed * dt;
          e.rot += dt * (e.kind === "titan" ? 1.2 : 2.5);
          e.x += Math.sin(s.time * e.weaveFreq + e.phase) * e.weaveAmp * dt;
          e.y += Math.cos(s.time * (e.weaveFreq * 0.7) + e.phase) * (e.weaveAmp * 0.45) * dt;
          e.hitFlash = Math.max(0, e.hitFlash - dt * 8);

          // Strikers fire amber plasma orbs
          if (e.kind === "striker" && e.z > 320 && e.z < 1200) {
            e.shootCooldown -= dt;
            if (e.shootCooldown <= 0) {
              e.shootCooldown = 2.0 + Math.random();
              s.enemyOrbs.push({
                x: e.x,
                y: e.y,
                z: e.z - 20,
                vx: -e.x * 0.35,
                vy: -e.y * 0.35,
                vz: -460 - s.wave * 20,
              });
            }
          }

          // Reached player plane
          if (e.z <= 85) {
            if (e.kind === "shield") {
              s.shield = Math.min(s.maxShield, s.shield + 1);
              audioRef.current.powerup(mutedRef.current);
            } else {
              s.shield -= 1;
              s.combo = 1;
              s.damageFlash = 1;
              s.shake = 14;
              audioRef.current.damage(mutedRef.current);
            }
            s.enemies.splice(i, 1);
          }
        }

        // Update enemy plasma orbs
        for (let i = s.enemyOrbs.length - 1; i >= 0; i--) {
          const orb = s.enemyOrbs[i];
          orb.x += orb.vx * dt;
          orb.y += orb.vy * dt;
          orb.z += orb.vz * dt;
          if (orb.z <= 80) {
            s.shield -= 1;
            s.combo = 1;
            s.damageFlash = 0.85;
            s.shake = 12;
            audioRef.current.damage(mutedRef.current);
            s.enemyOrbs.splice(i, 1);
          }
        }

        // Update 3D particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }

        // Update popups
        for (let i = s.popups.length - 1; i >= 0; i--) {
          const pop = s.popups[i];
          pop.y -= 55 * dt;
          pop.life -= dt;
          if (pop.life <= 0) s.popups.splice(i, 1);
        }

        // Check game over
        if (s.shield <= 0) {
          s.shield = 0;
          let isNewHigh = false;
          if (s.score > s.highScore) {
            s.highScore = Math.floor(s.score);
            localStorage.setItem(HIGH_SCORE_KEY, String(s.highScore));
            isNewHigh = true;
          }
          setGameState("gameover");
          syncHud(isNewHigh);
        }

        hudTick += dt;
        if (hudTick > 0.08) {
          hudTick = 0;
          syncHud();
        }
      } else {
        // Gentle idle corridor drift
        s.time += dt * 0.45;
      }

      // ================= RENDER 3D SCENE =================
      const shakeX = (Math.random() - 0.5) * s.shake;
      const shakeY = (Math.random() - 0.5) * s.shake;
      const cx = w * 0.5 - s.smoothAimX * 62 + shakeX;
      const cy = h * 0.5 - s.smoothAimY * 44 + shakeY;

      // Deep corridor void background
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.75);
      bgGrad.addColorStop(0, "#190B2E");
      bgGrad.addColorStop(0.45, "#0B0618");
      bgGrad.addColorStop(1, "#04020A");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 3D Corridor Corner Rails
      ctx.save();
      const corners = [
        [-580, -340],
        [580, -340],
        [580, 340],
        [-580, 340],
      ];
      corners.forEach(([rx, ry], idx) => {
        const near = project(rx, ry, 80, cx, cy);
        const far = project(rx, ry, 1600, cx, cy);
        const g = ctx.createLinearGradient(near.sx, near.sy, far.sx, far.sy);
        const isLeft = idx === 0 || idx === 3;
        g.addColorStop(0, isLeft ? "rgba(240,18,168,0.55)" : "rgba(0,212,255,0.55)");
        g.addColorStop(1, "rgba(255,138,31,0.05)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(near.sx, near.sy);
        ctx.lineTo(far.sx, far.sy);
        ctx.stroke();
      });

      // Moving 3D Neon Corridor Frames
      const ringCount = 9;
      const corridorSpeed = 340 + s.wave * 35;
      for (let i = 0; i < ringCount; i++) {
        const z = 1600 - (((s.time * corridorSpeed + i * (1600 / ringCount)) % 1540) + 60);
        const tl = project(-580, -340, z, cx, cy);
        const br = project(580, 340, z, cx, cy);
        const rw = br.sx - tl.sx;
        const rh = br.sy - tl.sy;
        const alpha = Math.max(0.05, Math.min(0.65, 1 - z / 1600));

        const grad = ctx.createLinearGradient(tl.sx, tl.sy, br.sx, tl.sy);
        grad.addColorStop(0, `rgba(240, 18, 168, ${alpha})`);
        grad.addColorStop(0.5, `rgba(255, 138, 31, ${alpha * 0.55})`);
        grad.addColorStop(1, `rgba(0, 212, 255, ${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1, (1 - z / 1600) * 2.5);
        ctx.strokeRect(tl.sx, tl.sy, rw, rh);
      }

      // 3D Starfield motes
      for (const st of s.stars) {
        const p = project(st.x, st.y, st.z, cx, cy);
        const a = Math.max(0.1, (1 - st.z / 1500) * 0.8);
        ctx.fillStyle = `rgba(200, 230, 255, ${a})`;
        ctx.fillRect(p.sx, p.sy, Math.max(1.2, p.scale * 3), Math.max(1.2, p.scale * 3));
      }

      // Sort enemies far-to-near (Painter's algorithm for true 3D depth)
      const sortedEnemies = [...s.enemies].sort((a, b) => b.z - a.z);
      for (const e of sortedEnemies) {
        const p = project(e.x, e.y, e.z, cx, cy);
        const r = Math.max(6, e.radius * p.scale);

        ctx.save();
        ctx.translate(p.sx, p.sy);
        ctx.rotate(e.rot);

        // Outer neon aura
        const aura = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.9);
        aura.addColorStop(0, e.hitFlash > 0 ? "rgba(255,255,255,0.9)" : `${e.color}66`);
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
        ctx.fill();

        // 3D Geometric Enemy Hull
        ctx.strokeStyle = e.hitFlash > 0 ? "#FFFFFF" : e.color;
        ctx.fillStyle = e.hitFlash > 0 ? "rgba(255,255,255,0.75)" : `${e.color}28`;
        ctx.lineWidth = Math.max(1.5, r * 0.08);

        ctx.beginPath();
        if (e.kind === "titan") {
          // Armored rotating hexagon + inner core
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * r;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.rotate(-e.rot * 2);
          ctx.strokeStyle = "#FFC247";
          ctx.strokeRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
        } else if (e.kind === "striker") {
          // Sharp interceptor diamond
          ctx.moveTo(0, -r * 1.2);
          ctx.lineTo(r * 0.95, 0);
          ctx.lineTo(0, r * 1.2);
          ctx.lineTo(-r * 0.95, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Wings
          ctx.beginPath();
          ctx.moveTo(-r * 1.45, -r * 0.2);
          ctx.lineTo(r * 1.45, -r * 0.2);
          ctx.stroke();
        } else if (e.kind === "shield") {
          // Emerald shield plus prism
          ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-r * 0.42, 0);
          ctx.lineTo(r * 0.42, 0);
          ctx.moveTo(0, -r * 0.42);
          ctx.lineTo(0, r * 0.42);
          ctx.stroke();
        } else {
          // Octahedron cyber drone
          for (let k = 0; k < 4; k++) {
            const ang = (k / 4) * Math.PI * 2;
            const px = Math.cos(ang) * r;
            const py = Math.sin(ang) * r;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Glowing core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, r * 0.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // HP bar for multi-hit enemies
        if (e.maxHp > 1) {
          const bw = r * 1.7;
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(p.sx - bw / 2, p.sy - r - 12, bw, 4);
          ctx.fillStyle = e.color;
          ctx.fillRect(p.sx - bw / 2, p.sy - r - 12, bw * (e.hp / e.maxHp), 4);
        }
      }

      // Enemy Plasma Orbs
      for (const orb of s.enemyOrbs) {
        const p = project(orb.x, orb.y, orb.z, cx, cy);
        const r = Math.max(4, 18 * p.scale);
        const g = ctx.createRadialGradient(p.sx, p.sy, 1, p.sx, p.sy, r * 1.8);
        g.addColorStop(0, "#FFF7CC");
        g.addColorStop(0.45, "#FF8A1F");
        g.addColorStop(1, "rgba(240,18,168,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player 3D Laser Bolts
      for (const l of s.lasers) {
        const head = project(l.x, l.y, l.z, cx, cy);
        const tail = project(l.x - l.vx * 0.045, l.y - l.vy * 0.045, Math.max(30, l.z - l.vz * 0.045), cx, cy);
        ctx.strokeStyle = l.color;
        ctx.lineWidth = Math.max(2, head.scale * 11);
        ctx.lineCap = "round";
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(tail.sx, tail.sy);
        ctx.lineTo(head.sx, head.sy);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 3D Particle Explosions
      for (const pt of s.particles) {
        const p = project(pt.x, pt.y, pt.z, cx, cy);
        const alpha = Math.max(0, pt.life / pt.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        const sz = Math.max(1.5, pt.size * p.scale * 2.2);
        ctx.fillRect(p.sx - sz / 2, p.sy - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;

      // Floating 3D Score Popups
      ctx.font = "700 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      for (const pop of s.popups) {
        const p = project(pop.x, pop.y, pop.z, cx, cy);
        ctx.globalAlpha = Math.max(0, Math.min(1, pop.life));
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, p.sx, p.sy);
      }
      ctx.globalAlpha = 1;

      // First-Person Twin Cyber-Cannons (Foreground 3D Cockpit Feel)
      const aimPxX = w * 0.5 + s.smoothAimX * (w * 0.48);
      const aimPxY = h * 0.5 + s.smoothAimY * (h * 0.48);

      const drawCannon = (side, recoil) => {
        const baseX = side < 0 ? w * 0.16 : w * 0.84;
        const baseY = h + 18 + recoil * 18;
        const angle = Math.atan2(aimPxY - baseY, aimPxX - baseX);

        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(angle);

        ctx.fillStyle = "#140D28";
        ctx.strokeStyle = side < 0 ? "#F012A8" : "#00D4FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(0, -14, 92 - recoil * 14, 28, 8);
        ctx.fill();
        ctx.stroke();

        // Neon barrel core
        ctx.fillStyle = side < 0 ? "#FF3CC7" : "#00D4FF";
        ctx.fillRect(22, -3, 62 - recoil * 14, 6);

        // Muzzle flash
        if (recoil > 0.55) {
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(94 - recoil * 14, 0, 12 * recoil, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      drawCannon(-1, s.recoilL);
      drawCannon(1, s.recoilR);

      // Holographic 3D Aim Reticle
      if (active) {
        ctx.save();
        ctx.translate(aimPxX, aimPxY);
        ctx.strokeStyle = "#00D4FF";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#FF3CC7";
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(-10, 0);
        ctx.moveTo(10, 0);
        ctx.lineTo(26, 0);
        ctx.moveTo(0, -26);
        ctx.lineTo(0, -10);
        ctx.moveTo(0, 10);
        ctx.lineTo(0, 26);
        ctx.stroke();

        ctx.fillStyle = "#FFC247";
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Damage & EMP Overdrive Screen Vignettes
      if (s.damageFlash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${s.damageFlash * 0.34})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (s.empFlash > 0) {
        ctx.fillStyle = `rgba(0, 212, 255, ${s.empFlash * 0.36})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [syncHud]);

  const updatePointerAim = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((clientY - rect.top) / rect.height - 0.5) * 2;
    simRef.current.aimX = Math.max(-1, Math.min(1, nx));
    simRef.current.aimY = Math.max(-1, Math.min(1, ny));
  };

  const accuracy =
    hud.shotsFired > 0
      ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100))
      : 0;

  return (
    <div
      ref={containerRef}
      className="neon-corridor-frame relative overflow-hidden rounded-[28px] border border-white/15 bg-[#06040D] shadow-2xl"
    >
      {/* Top Arcade HUD Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0A0617]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Score
            </p>
            <p className="font-display text-lg font-extrabold text-white sm:text-xl">
              {hud.score.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Wave
            </p>
            <p className="font-mono text-base font-bold text-[#00D4FF]">
              W-{String(hud.wave).padStart(2, "0")}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Combo
            </p>
            <p className="font-mono text-base font-bold text-[#FF3CC7]">
              x{hud.combo}
            </p>
          </div>

          {/* Shield Bars */}
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-400" />
            <div className="flex gap-1">
              {Array.from({ length: hud.maxShield }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 w-4 rounded-sm transition-all ${
                    i < hud.shield
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Controls + EMP Overdrive */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={gameState !== "playing" || hud.overdrive < 100}
            onClick={triggerOverdrive}
            title="EMP Overdrive (Press E or Right-Click when 100%)"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-bold transition ${
              hud.overdrive >= 100
                ? "animate-pulse border-[#00D4FF] bg-[#00D4FF]/25 text-white shadow-neon-cyan"
                : "border-white/10 bg-white/5 text-ink-muted"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-[#FFC247]" />
            <span>EMP {hud.overdrive}%</span>
          </button>

          {gameState === "playing" || gameState === "paused" ? (
            <button
              type="button"
              onClick={() =>
                setGameState((prev) => (prev === "playing" ? "paused" : "playing"))
              }
              aria-label="Pause or Resume"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15"
            >
              {gameState === "paused" ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label="Toggle Sound"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
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

      {/* 3D Interactive Canvas Stage */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-64px)]" : "h-[64vh] min-h-[440px] max-h-[680px]"
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={(e) => updatePointerAim(e.clientX, e.clientY)}
          onPointerDown={(e) => {
            if (e.button === 2) {
              triggerOverdrive();
              return;
            }
            updatePointerAim(e.clientX, e.clientY);
            if (stateRef.current === "playing") {
              simRef.current.firing = true;
            }
          }}
          onPointerUp={() => {
            simRef.current.firing = false;
          }}
          onPointerLeave={() => {
            simRef.current.firing = false;
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            triggerOverdrive();
          }}
          className={`h-full w-full touch-none ${
            gameState === "playing" ? "cursor-none" : "cursor-default"
          }`}
        />

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#06040D]/72 p-6 text-center backdrop-blur-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F012A8]/50 bg-[#F012A8]/15 px-4 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FF8DE0]">
              <Crosshair className="h-3.5 w-3.5" />
              3D Neon Rail Shooter
            </span>

            <h2 className="mt-4 font-display text-4xl font-extrabold text-white sm:text-5xl">
              NEON CORRIDOR:{" "}
              <span className="text-neon-gradient">OVERDRIVE</span>
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-secondary">
              Blast incoming 3D cyber drones, intercept crimson plasma orbs, shatter
              heavy amber Titans, and unleash EMP Overdrive down the neon tunnel.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-2.5 text-left font-mono text-[11px] text-ink-secondary sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5">
                <span className="text-[#00D4FF]">AIM:</span> Move Mouse / Touch
              </div>
              <div className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5">
                <span className="text-[#FF3CC7]">FIRE:</span> Click / Hold / Space
              </div>
              <div className="rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5">
                <span className="text-[#FFC247]">EMP:</span> Right-Click / E
              </div>
            </div>

            <button
              type="button"
              onClick={resetGame}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full px-8 py-4 font-heading text-sm font-bold tracking-wide text-white shadow-neon-magenta transition hover:scale-105"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Launch Mission</span>
            </button>

            {hud.highScore > 0 && (
              <p className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-[#FFC247]">
                <Trophy className="h-3.5 w-3.5" />
                Best Score: {hud.highScore.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#06040D]/75 p-6 text-center backdrop-blur-md">
            <h3 className="font-display text-3xl font-bold text-white">PAUSED</h3>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setGameState("playing")}
                className="inline-flex items-center gap-2 rounded-full bg-[#00D4FF] px-6 py-3 text-sm font-bold text-[#06040D]"
              >
                <Play className="h-4 w-4" />
                Resume
              </button>
              <button
                type="button"
                onClick={resetGame}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-[#06040D]/85 p-5 text-center backdrop-blur-md">
            {hud.isNewHigh && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFC247]/60 bg-[#FFC247]/20 px-4 py-1 font-mono text-xs font-bold text-[#FFC247]">
                <Trophy className="h-3.5 w-3.5" />
                NEW HIGH SCORE!
              </span>
            )}

            <h3 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              SHIELD DEPLETED
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Final Score", val: hud.score.toLocaleString(), color: "text-white" },
                { label: "Best Score", val: hud.highScore.toLocaleString(), color: "text-[#FFC247]" },
                { label: "Destroyed", val: `${hud.kills} targets`, color: "text-[#FF3CC7]" },
                { label: "Accuracy", val: `${accuracy}%`, color: "text-[#00D4FF]" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    {stat.label}
                  </p>
                  <p className={`mt-1 font-display text-lg font-bold ${stat.color}`}>
                    {stat.val}
                  </p>
                </div>
              ))}
            </div>

            {hud.score > 0 && (
              <LeaderboardSubmitCard
                key={`corridor-${hud.score}-${hud.kills}`}
                gameId="corridor"
                score={hud.score}
                badge={`WAVE ${hud.wave}`}
                meta={`${hud.kills} Kills • ${accuracy}% Accuracy`}
                highlightLabel={
                  hud.isNewHigh
                    ? "New Best Score! Add Your Name"
                    : "Save Score to Leaderboard"
                }
                isNewRecord={hud.isNewHigh}
              />
            )}

            <button
              type="button"
              onClick={resetGame}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-8 py-3 font-heading text-sm font-bold text-white shadow-neon-magenta transition hover:scale-105"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
