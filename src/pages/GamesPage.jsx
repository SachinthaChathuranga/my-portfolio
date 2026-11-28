import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Crosshair, Target, Sparkles, Car, Shield, Trophy } from "lucide-react";
import NeonShooter3D from "../games/NeonShooter3D";
import TacticalIgi3D from "../games/TacticalIgi3D";
import ApexRacer3D from "../games/ApexRacer3D";
import VanguardArmy3D from "../games/VanguardArmy3D";
import CricketGame from "../games/CricketGame";
import GameLeaderboard from "../components/GameLeaderboard";

const GAMES = [
  {
    id: "cricket",
    title: "SMSC Cricket 26",
    tag: "Full 3D Cricket Sim",
    badge: "NEW • T20 / ODI / Test",
    desc: "10 nations, 6 stadiums, T20/ODI/Test/custom overs. Bat & bowl with timing, set your field, DRS with Hawk-Eye & UltraEdge, replays, 4s & 6s, and 50/100/wicket celebrations.",
    accent: "border-emerald-400/60 bg-emerald-500/10",
  },
  {
    id: "vanguard",
    title: "Vanguard: Frontline Ops",
    tag: "Realistic 3D Army FPS",
    badge: "UPDATED • 130m Maps",
    desc: "Huge 130×130m theaters with photo-real terrain, forests & weather, animated rifle-carrying soldiers, real shadows, 3D weapons, and ordered TASK 1 → 2 → 3 missions across 5 war zones.",
    accent: "border-emerald-400/60 bg-emerald-500/10",
  },
  {
    id: "racer",
    title: "Apex Horizon: Night Drive",
    tag: "3D Highway Racing Sim",
    badge: "Realistic 3D",
    desc: "6-speed twin-turbo GT supercar with rolling hills, banked curves, 2-way highway traffic, cockpit cam, drift physics & live RPM engine audio.",
    accent: "border-[#FF8A1F]/60 bg-[#FF8A1F]/10",
  },
  {
    id: "igi",
    title: "Operation: Neon I.G.I.",
    tag: "3D Tactical Stealth FPS",
    badge: "4 Missions • I.G.I.",
    desc: "4-mission tactical campaign (Iron Compound, Arctic Airbase, Desert Sandstorm, Blacksite Night Raid) with textured compounds, animated soldiers, NVG, C4 & sniper scope.",
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

export default function GamesPage({ onBackHome, isOwnerPreview = false }) {
  const [activeGame, setActiveGame] = useState("cricket");

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

        {isOwnerPreview && (
          <div className="mb-6 rounded-2xl border border-amber-400/45 bg-amber-500/15 px-4 py-2.5 font-mono text-xs text-amber-200">
            Owner Preview: Games Arcade is currently set to HIDDEN from public visitors in Studio.
          </div>
        )}

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

        {/* 4-Game Switcher Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((g) => {
            const selected = activeGame === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGame(g.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? `${g.accent} shadow-glass-3d`
                    : "border-white/10 bg-white/[0.025] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-[#FFC247]">
                    {g.id === "cricket" ? (
                      <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                    ) : g.id === "vanguard" ? (
                      <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    ) : g.id === "racer" ? (
                      <Car className="h-3.5 w-3.5 text-[#FF8A1F]" />
                    ) : g.id === "igi" ? (
                      <Target className="h-3.5 w-3.5 text-[#00D4FF]" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[#FF3CC7]" />
                    )}
                    {g.tag}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-semibold ${
                      selected
                        ? "bg-emerald-500/25 text-emerald-300"
                        : "bg-white/10 text-ink-muted"
                    }`}
                  >
                    {selected ? "Playing" : g.badge}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-base font-bold text-white sm:text-lg">
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
        {activeGame === "cricket" ? (
          <CricketGame />
        ) : activeGame === "vanguard" ? (
          <VanguardArmy3D />
        ) : activeGame === "racer" ? (
          <ApexRacer3D />
        ) : activeGame === "igi" ? (
          <TacticalIgi3D />
        ) : (
          <NeonShooter3D />
        )}

        {/* Per-Game Live Hall of Fame Leaderboard */}
        <GameLeaderboard activeGame={activeGame} />
      </div>
    </div>
  );
}
