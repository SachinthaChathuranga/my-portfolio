import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Crosshair, Target, Sparkles } from "lucide-react";
import NeonShooter3D from "../games/NeonShooter3D";
import TacticalIgi3D from "../games/TacticalIgi3D";

const GAMES = [
  {
    id: "igi",
    title: "Operation: Neon I.G.I.",
    tag: "3D Tactical Stealth FPS",
    badge: "NEW • I.G.I. Style",
    desc: "First-person 3D compound infiltration with silenced pistol, M4 rifle, scoped sniper, satellite radar, cameras & server hack mission.",
    accent: "border-[#00D4FF]/55 bg-[#00D4FF]/10",
  },
  {
    id: "corridor",
    title: "Neon Corridor: Overdrive",
    tag: "3D Arcade Rail Shooter",
    badge: "60fps Arcade",
    desc: "High-speed 3D neon tunnel shooter with cyber drones, crimson interceptors, armored Titans, combo multipliers & EMP overdrive.",
    accent: "border-[#F012A8]/55 bg-[#F012A8]/10",
  },
];

export default function GamesPage({ onBackHome }) {
  const [activeGame, setActiveGame] = useState("igi");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="relative z-10 min-h-screen pt-28 pb-24 sm:pt-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>

          <span className="inline-flex items-center gap-2 font-mono text-xs text-[#FFC247]">
            <Gamepad2 className="h-4 w-4" />
            SMSC Interactive 3D Arcade
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-[#FF3CC7]">
            <Crosshair className="h-3.5 w-3.5" />
            Playable 3D Experiments
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-6xl">
            Neon <span className="text-neon-gradient">Arcade & Games</span>
          </h1>
        </motion.div>

        {/* Game Switcher Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GAMES.map((g) => {
            const selected = activeGame === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGame(g.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected
                    ? `${g.accent} shadow-glass-3d`
                    : "border-white/10 bg-white/[0.025] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#FFC247]">
                    {g.id === "igi" ? (
                      <Target className="h-3.5 w-3.5 text-[#00D4FF]" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[#FF3CC7]" />
                    )}
                    {g.tag}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                      selected
                        ? "bg-emerald-500/25 text-emerald-300"
                        : "bg-white/10 text-ink-muted"
                    }`}
                  >
                    {selected ? "Playing" : g.badge}
                  </span>
                </div>
                <h2 className="mt-2.5 font-display text-xl font-bold text-white">
                  {g.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                  {g.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active 3D Game Stage */}
        {activeGame === "igi" ? <TacticalIgi3D /> : <NeonShooter3D />}
      </div>
    </div>
  );
}
