import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PHASES = [
  { at: 0, label: "INITIALIZING 3D CORRIDOR" },
  { at: 32, label: "CALIBRATING NEON OPTICS" },
  { at: 66, label: "LOADING SELECTED WORKS" },
  { at: 92, label: "ENTERING PORTFOLIO" },
];

export default function Preloader3D({ ready, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const minDuration = 1650;

    const tick = (now) => {
      const elapsed = now - start;
      const ratio = Math.min(1, Math.max(0, elapsed / minDuration));
      const eased = 1 - Math.pow(1 - ratio, 3);
      const cap = ready ? 100 : 88;
      const next = Math.min(cap, Math.round(eased * 100));
      setProgress(next);

      if (next < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setExiting(true);
          setTimeout(() => onComplete?.(), 650);
        }, 220);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, onComplete]);

  const currentPhase =
    [...PHASES].reverse().find((p) => progress >= p.at)?.label || PHASES[0].label;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="preloader-3d"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, filter: "blur(12px)" }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#06040D]"
        >
          {/* Neon ambient glows matching left-magenta / right-cyan / warm-amber portraits */}
          <div
            className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full opacity-45 blur-[130px]"
            style={{ background: "#F012A8" }}
          />
          <div
            className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full opacity-45 blur-[130px]"
            style={{ background: "#00D4FF" }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-35 blur-[120px]"
            style={{ background: "#FF8A1F" }}
          />

          {/* 3D Perspective Corridor Tunnel */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ perspective: "950px", perspectiveOrigin: "50% 50%" }}
          >
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="corridor-ring"
                style={{
                  animationDelay: `${idx * -0.46}s`,
                  border: "1.5px solid transparent",
                  background:
                    "linear-gradient(#06040D, #06040D) padding-box, linear-gradient(125deg, rgba(240,18,168,0.85), rgba(255,138,31,0.55) 50%, rgba(0,212,255,0.85)) border-box",
                  boxShadow:
                    idx % 2 === 0
                      ? "0 0 36px rgba(240,18,168,0.22), inset 0 0 36px rgba(0,212,255,0.16)"
                      : "0 0 36px rgba(0,212,255,0.22), inset 0 0 36px rgba(255,138,31,0.15)",
                }}
              />
            ))}
          </div>

          {/* Center 3D Monogram Prism + Progress */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="perspective-1200 mb-8 flex h-28 w-28 items-center justify-center">
              <div className="prism-spin-3d relative h-20 w-20">
                {/* 3D Wireframe Cube Faces */}
                <div
                  className="absolute inset-0 rounded-xl border border-[#F012A8]/70 bg-[#F012A8]/10 shadow-neon-magenta backdrop-blur-sm"
                  style={{ transform: "translateZ(40px)" }}
                />
                <div
                  className="absolute inset-0 rounded-xl border border-[#00D4FF]/70 bg-[#00D4FF]/10 shadow-neon-cyan"
                  style={{ transform: "rotateY(180deg) translateZ(40px)" }}
                />
                <div
                  className="absolute inset-0 rounded-xl border border-[#FF8A1F]/70 bg-[#FF8A1F]/10"
                  style={{ transform: "rotateY(90deg) translateZ(40px)" }}
                />
                <div
                  className="absolute inset-0 rounded-xl border border-[#FF3CC7]/70 bg-[#FF3CC7]/10"
                  style={{ transform: "rotateY(-90deg) translateZ(40px)" }}
                />
                <div
                  className="absolute inset-0 rounded-xl border border-white/25 bg-white/5"
                  style={{ transform: "rotateX(90deg) translateZ(40px)" }}
                />
                <div
                  className="absolute inset-0 rounded-xl border border-white/25 bg-white/5"
                  style={{ transform: "rotateX(-90deg) translateZ(40px)" }}
                />
              </div>
              <span className="pointer-events-none absolute font-display text-lg font-extrabold tracking-[0.22em] text-white drop-shadow-[0_0_16px_rgba(240,18,168,0.85)]">
                SMSC
              </span>
            </div>

            {/* Monospace Editorial Counter */}
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold tracking-tight text-neon-gradient sm:text-6xl">
                {String(progress).padStart(2, "0")}
              </span>
              <span className="font-mono text-sm text-ink-muted">%</span>
            </div>

            {/* Neon Progress Track */}
            <div className="mt-5 h-[3px] w-60 overflow-hidden rounded-full bg-white/10 sm:w-72">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #F012A8 0%, #FF8A1F 50%, #00D4FF 100%)",
                  boxShadow: "0 0 18px rgba(0, 212, 255, 0.75)",
                }}
              />
            </div>

            <p className="mt-4 font-mono text-[11px] tracking-[0.28em] text-ink-secondary/80">
              {currentPhase}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
