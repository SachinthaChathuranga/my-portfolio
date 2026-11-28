import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ClipboardList,
  Film,
  FastForward,
  Pause,
  Camera,
  Users,
  Flag,
  ChevronRight,
  Coins,
} from "lucide-react";
import { TEAMS, GROUNDS, FORMATS, DIFFICULTY, FIELD_PRESETS } from "./cricket/data";
import { createMatch, oversText, strikeRate, economy, dismissalText, inningsTotals, maxOutsideCircle } from "./cricket/match";
import { CricketEngine } from "./cricket/engine";
import { deliveryCatalogue, enforceRestriction } from "./cricket/ai";
import { insideCircle, simulateDelivery, atZ } from "./cricket/physics";
import LeaderboardSubmitCard from "../components/LeaderboardSubmitCard";

const chip = (sym) =>
  sym === "W"
    ? "bg-rose-600 text-white"
    : sym === "4"
    ? "bg-sky-500 text-white"
    : sym === "6"
    ? "bg-fuchsia-600 text-white"
    : /wd|nb/.test(sym)
    ? "bg-violet-500/80 text-white"
    : sym === "•"
    ? "bg-white/10 text-ink-muted"
    : "bg-emerald-500/80 text-white";

function TeamBadge({ team, size = "md" }) {
  const s = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-7 w-7 text-[9px]" : "h-9 w-9 text-[11px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-display font-extrabold text-white ${s}`}
      style={{ background: `linear-gradient(135deg, ${team.primary} 55%, ${team.secondary} 55%)`, borderColor: team.secondary }}
    >
      {team.short}
    </span>
  );
}

// ============================================================ Scorecard
function Scorecard({ match }) {
  return (
    <div className="space-y-5">
      {match.innings.map((inn, k) => {
        const bat = match.teams[inn.battingIdx];
        const bowl = match.teams[inn.bowlingIdx];
        const ex = inn.extras;
        return (
          <div key={k} className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <TeamBadge team={bat} size="sm" />
                <span className="font-display text-sm font-bold text-white">
                  {bat.name} — Innings {Math.floor(k / 2) + 1}
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-[#FFC247]">
                {inn.runs}/{inn.wkts} ({oversText(inn.balls)} ov){inn.declared ? " d" : ""}
              </span>
            </div>
            <table className="mt-2 w-full font-mono text-[11px] text-ink-secondary">
              <thead>
                <tr className="text-ink-muted">
                  <th className="text-left font-normal">Batter</th>
                  <th className="text-left font-normal" />
                  <th className="font-normal">R</th>
                  <th className="font-normal">B</th>
                  <th className="font-normal">4s</th>
                  <th className="font-normal">6s</th>
                  <th className="font-normal">SR</th>
                </tr>
              </thead>
              <tbody>
                {inn.batters
                  .filter((b) => b.batted)
                  .map((b) => (
                    <tr key={b.idx} className={!b.out ? "text-white" : ""}>
                      <td className="py-0.5 pr-2">
                        {bat.players[b.idx].name}
                        {b.idx === 6 ? " †" : ""}
                      </td>
                      <td className="pr-2 text-[10px] text-ink-muted">{dismissalText(match, inn, b)}</td>
                      <td className="text-center font-bold">{b.runs}</td>
                      <td className="text-center">{b.balls}</td>
                      <td className="text-center">{b.fours}</td>
                      <td className="text-center">{b.sixes}</td>
                      <td className="text-center">{strikeRate(b)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="mt-1 font-mono text-[10px] text-ink-muted">
              Extras {ex.w + ex.nb + ex.b + ex.lb} (w {ex.w}, nb {ex.nb}, b {ex.b}, lb {ex.lb})
              {inn.fow.length > 0 && <> • FoW: {inn.fow.map((f) => `${f.runs}-${f.wkt}`).join(", ")}</>}
            </p>
            <table className="mt-2 w-full font-mono text-[11px] text-ink-secondary">
              <thead>
                <tr className="text-ink-muted">
                  <th className="text-left font-normal">Bowler</th>
                  <th className="font-normal">O</th>
                  <th className="font-normal">M</th>
                  <th className="font-normal">R</th>
                  <th className="font-normal">W</th>
                  <th className="font-normal">Econ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(inn.bowlers)
                  .filter(([, s]) => s.balls > 0 || s.wides > 0)
                  .map(([i, s]) => (
                    <tr key={i}>
                      <td className="py-0.5">{bowl.players[i].name}</td>
                      <td className="text-center">{oversText(s.balls)}</td>
                      <td className="text-center">{s.maidens}</td>
                      <td className="text-center">{s.runs}</td>
                      <td className="text-center font-bold text-white">{s.wkts}</td>
                      <td className="text-center">{economy(s)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================ Field editor
function FieldEditor({ match, engine, onClose }) {
  const g = match.ground.boundary;
  const side = engine.side();
  const [spots, setSpots] = useState(() => (engine.fieldSpots || []).map((s) => s.slice()));
  const [drag, setDrag] = useState(null);
  const svgRef = useRef(null);
  const maxOut = maxOutsideCircle(match);
  const outside = spots.filter((s) => !insideCircle(s[0], s[1])).length;

  const toWorld = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [-p.x, -p.y];
  };
  const onMove = (e) => {
    if (drag == null) return;
    const [x, z] = toWorld(e);
    const r = Math.sqrt((x / g.x) ** 2 + (z / g.z) ** 2);
    const k = r > 0.97 ? 0.97 / r : 1;
    const nx = x * k;
    const nz = z * k;
    // keep clear of the pitch
    if (Math.abs(nx) < 1.8 && Math.abs(nz) < 11) return;
    setSpots((prev) => {
      const next = prev.map((s) => s.slice());
      const wasInside = insideCircle(prev[drag][0], prev[drag][1]);
      const nowOutside = !insideCircle(nx, nz);
      const count = prev.filter((s) => !insideCircle(s[0], s[1])).length;
      if (wasInside && nowOutside && count >= maxOut) return prev; // restriction
      next[drag] = [nx, nz];
      return next;
    });
  };
  const fielderLabel = (x, z) => {
    const a = Math.atan2(x * side, -(z - 9));
    const d = Math.hypot(x, z - 9);
    const names = [
      [-2.9, "Fine Leg"],
      [-2.1, "Sq Leg"],
      [-1.2, "Midwicket"],
      [-0.35, "Mid-On"],
      [0.35, "Mid-Off"],
      [1.2, "Cover"],
      [2.1, "Point"],
      [2.55, "Gully"],
      [3.3, "Slip"],
    ];
    let n = "Third Man";
    for (const [lim, nm] of names) if (a <= lim) {
      n = nm;
      break;
    }
    if (d < 12 && (n === "Slip" || n === "Gully")) return n;
    return (d > 45 ? "Deep " : d < 14 ? "Short " : "") + n;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-3xl border border-white/15 bg-[#0b1020]/95 p-4 sm:flex-row">
        <svg
          ref={svgRef}
          viewBox={`${-g.x - 4} ${-g.z - 4} ${g.x * 2 + 8} ${g.z * 2 + 8}`}
          className="aspect-[0.92] w-full max-w-[360px] touch-none select-none self-center"
          onPointerMove={onMove}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          <ellipse cx="0" cy="0" rx={g.x} ry={g.z} fill="#2f6e2a" stroke="#fff" strokeWidth="0.6" />
          <ellipse cx="0" cy="0" rx="27.4" ry="37.4" fill="none" stroke="#ffffffaa" strokeDasharray="2 2" strokeWidth="0.5" />
          <rect x="-1.5" y="-11" width="3" height="22" fill="#cdb684" />
          <circle cx="0" cy="-10" r="0.9" fill="#fff" />
          <text x="0" y="-13" fontSize="3" fill="#fff" textAnchor="middle">
            BATTER
          </text>
          <text x="0" y="16" fontSize="3" fill="#fff" textAnchor="middle">
            BOWLER
          </text>
          <text x={side > 0 ? g.x * 0.62 : -g.x * 0.62} y={g.z * 0.86} fontSize="3.5" fill="#ffffffaa" textAnchor="middle">
            LEG
          </text>
          <text x={side > 0 ? -g.x * 0.62 : g.x * 0.62} y={g.z * 0.86} fontSize="3.5" fill="#ffffffaa" textAnchor="middle">
            OFF
          </text>
          <circle cx={-engine.actors.keeper.st.x} cy={-engine.actors.keeper.st.z} r="1.6" fill="#facc15" />
          {spots.map((s, i) => (
            <g key={i} onPointerDown={(e) => { e.currentTarget.ownerSVGElement.setPointerCapture?.(e.pointerId); setDrag(i); }} style={{ cursor: "grab" }}>
              <circle cx={-s[0]} cy={-s[1]} r={drag === i ? 2.8 : 2.2} fill={insideCircle(s[0], s[1]) ? "#38bdf8" : "#f472b6"} stroke="#fff" strokeWidth="0.4" />
              <text x={-s[0]} y={-s[1] - 3.2} fontSize="2.6" fill="#fff" textAnchor="middle">
                {fielderLabel(s[0], s[1])}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">Field Setting</p>
            <h3 className="font-display text-xl font-bold text-white">Set Your Field</h3>
            <p className="mt-1 text-xs text-ink-secondary">Drag fielders. Pink = outside the 30-yard circle.</p>
            <p className={`mt-1 font-mono text-xs ${outside > maxOut ? "text-rose-400" : "text-emerald-300"}`}>
              Outside circle: {outside} / {maxOut} {maxOut < 9 ? "(fielding restriction)" : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FIELD_PRESETS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSpots(enforceRestriction(v.spots.map(([x, z]) => [x * side, z]), maxOut))}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:border-[#38bdf8]"
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="mt-auto flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/15 px-4 py-2 text-sm text-ink-secondary hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                engine.setUserField(enforceRestriction(spots, maxOut));
                onClose();
              }}
              className="flex-1 rounded-full bg-[#38bdf8] px-4 py-2 text-sm font-bold text-[#06040D]"
            >
              Apply Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================ DRS panel
function DrsPanel({ review }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 0.1), 100);
    return () => clearInterval(id);
  }, []);
  if (!review) return null;
  const a = review.analysis;
  const color = (v) => (v === "in line" || v === "hitting" ? "bg-emerald-500" : v === "umpire's call" ? "bg-amber-500" : "bg-rose-600");
  return (
    <div className="pointer-events-none absolute left-3 top-24 z-30 w-64 rounded-2xl border border-sky-400/50 bg-[#05101f]/92 p-3 font-mono text-[11px] text-white shadow-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">DRS • Third Umpire</p>
      {review.kind === "lbw" && a ? (
        <div className="mt-2 space-y-1.5">
          {[
            ["PITCHING", a.pitching, 1.2],
            ["IMPACT", a.impact, 2.6],
            ["WICKETS", a.wickets, 4.0],
          ].map(([k, v, at]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">{k}</span>
              {t > at ? <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${color(v)}`}>{v}</span> : <span className="animate-pulse text-sky-300">…</span>}
            </div>
          ))}
        </div>
      ) : review.kind === "edge" ? (
        <div className="mt-2">
          <p className="text-ink-muted">ULTRA-EDGE</p>
          <svg viewBox="0 0 200 50" className="mt-1 h-14 w-full rounded bg-black/60">
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.2"
              points={Array.from({ length: 100 }, (_, i) => {
                const x = i * 2;
                const spike = t > 1.5 && review.edge && Math.abs(i - 52) < 4 ? (Math.random() - 0.5) * 44 : 0;
                return `${x},${25 + (Math.random() - 0.5) * (t > 1 ? 4 : 2) + spike}`;
              }).join(" ")}
            />
          </svg>
          {t > 2.5 && <p className={`mt-1 font-bold ${review.edge ? "text-rose-400" : "text-emerald-300"}`}>{review.edge ? "SPIKE — BAT INVOLVED" : "NO SPIKE — NO BAT"}</p>}
        </div>
      ) : (
        <p className="mt-2 text-ink-secondary">Checking run-out replays…</p>
      )}
    </div>
  );
}

// ============================================================ Fullscreen shell
/**
 * Wraps every screen of the game (setup → toss → match → result) so fullscreen
 * works everywhere, not just during deliveries.
 */
export default function CricketGame() {
  const shellRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setFullscreen((document.fullscreenElement || document.webkitFullscreenElement) === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async (force) => {
    const el = shellRef.current;
    if (!el) return;
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    const want = typeof force === "boolean" ? force : !isFs;
    try {
      if (want && !isFs) {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        // phones: prefer landscape while playing
        try {
          await window.screen?.orientation?.lock?.("landscape");
        } catch {
          /* not supported / not allowed */
        }
      } else if (!want && isFs) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch {
      /* fullscreen blocked by the browser */
    }
  }, []);

  return (
    <div ref={shellRef} className={fullscreen ? "relative h-screen w-screen overflow-y-auto bg-[#06040D]" : "relative"}>
      <CricketGameInner fullscreen={fullscreen} toggleFullscreen={toggleFullscreen} />
      <button
        type="button"
        onClick={() => toggleFullscreen()}
        title={fullscreen ? "Exit fullscreen (Shift+F / Esc)" : "Fullscreen (Shift+F)"}
        className="absolute right-3 top-3 z-[60] flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:border-emerald-400 hover:bg-emerald-500/20"
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ============================================================ Main component
function CricketGameInner({ fullscreen, toggleFullscreen }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [ui, setUi] = useState("setup"); // setup | toss | play | inningsBreak | result
  const [cfg, setCfg] = useState({ user: "sl", opp: "in", format: "t20", customOvers: 5, testCap: 30, ground: "colombo", difficulty: "normal" });
  const [toss, setToss] = useState(null);
  const [hud, setHud] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [banners, setBanners] = useState([]);
  const [timing, setTiming] = useState(null);
  const [review, setReview] = useState(null);
  const [replaying, setReplaying] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showField, setShowField] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoFs, setAutoFs] = useState(true);
  const [, force] = useState(0);
  const [session, setSession] = useState(0);
  const matchRef = useRef(null);

  const userTeam = TEAMS.find((t) => t.id === cfg.user);
  const oppTeam = TEAMS.find((t) => t.id === cfg.opp);
  const ground = GROUNDS.find((g) => g.id === cfg.ground);

  const pushBanner = useCallback((b) => {
    const id = Math.random();
    setBanners((prev) => [...prev.slice(-1), { ...b, id }]);
    setTimeout(() => setBanners((prev) => prev.filter((x) => x.id !== id)), b.big ? 3400 : 2100);
  }, []);

  // ---------- start / stop engine ----------
  const startMatch = useCallback(
    (batFirstIdx) => {
      const teams = [userTeam, oppTeam];
      const match = createMatch({
        formatId: cfg.format,
        customOvers: cfg.customOvers,
        testCap: cfg.format === "test" && cfg.testCap ? cfg.testCap : null,
        teams,
        userTeam: 0,
        batFirst: batFirstIdx,
        ground,
        difficulty: cfg.difficulty,
      });
      matchRef.current = match;
      if (autoFs) toggleFullscreen(true);
      engineRef.current?.dispose();
      engineRef.current = null;
      setSession((n) => n + 1);
      setUi("play");
      setReview(null);
      setPrompt(null);
    },
    [cfg, userTeam, oppTeam, ground, autoFs, toggleFullscreen]
  );

  useEffect(() => {
    if (!session || !matchRef.current || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const eng = new CricketEngine({
      canvas,
      match: matchRef.current,
      callbacks: {
        onPrompt: (p) => setPrompt(p),
        onBanner: pushBanner,
        onTiming: (t) => {
          setTiming({ t, id: Math.random() });
          setTimeout(() => setTiming(null), 900);
        },
        onReview: (r) => setReview(r.stage === "end" ? null : r),
        onReplay: (v) => setReplaying(v),
        onScore: () => force((x) => x + 1),
        onInningsEnd: () => setUi("inningsBreak"),
        onMatchEnd: () => setTimeout(() => setUi("result"), 2500),
      },
    });
    engineRef.current = eng;
    if (import.meta.env.DEV) {
      window.__cricket = eng;
      window.__cricketPhys = { simulateDelivery, atZ };
    }
    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      eng.setSize(Math.max(320, r.width), Math.max(240, r.height));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    const iv = setInterval(() => setHud(eng.hud()), 120);
    return () => {
      clearInterval(iv);
      ro.disconnect();
      eng.dispose();
      if (engineRef.current === eng) engineRef.current = null;
    };
  }, [session, pushBanner]);

  // full teardown when leaving the game
  const quitToMenu = () => {
    setSession(0);
    matchRef.current = null;
    setHud(null);
    setPrompt(null);
    setUi("setup");
  };

  useEffect(() => {
    engineRef.current?.audio.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    if (engineRef.current) engineRef.current.paused = paused;
  }, [paused]);
  // Shift+F toggles fullscreen on every screen
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  // ---------- keyboard ----------
  useEffect(() => {
    if (ui !== "play") return undefined;
    const onKey = (e) => {
      const eng = engineRef.current;
      if (!eng || showField) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();
      if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "tab"].includes(k)) e.preventDefault();
      if (k === "tab") return setShowCard((v) => !v);
      if (k === "p") return setPaused((v) => !v);
      if (k === "m") return setMuted((v) => !v);
      if (k === "c") {
        eng.camMode = eng.camMode === "tv" ? "batcam" : "tv";
        return;
      }
      if (k === "enter") return eng.startReplay();
      if (eng.phase === "replay" || eng.phase === "after") {
        if (k === " ") eng.skip();
        return;
      }
      if (eng.userBatting) {
        if (k === " ") eng.playShot(e.shiftKey ? "loft" : "ground");
        else if (k === "q") eng.playShot("defend");
        else if (k === "e") eng.playShot("leave");
        else if (k === "arrowleft") eng.nudgeAim(0.18 * eng.side());
        else if (k === "arrowright") eng.nudgeAim(-0.18 * eng.side());
        else if (k === "w") eng.setFoot("advance");
        else if (k === "s") eng.setFoot("back");
        else if (k === "r") eng.callRun();
        else if (k === "x") eng.stopRun();
        else if (k === "t") eng.autoRun = !eng.autoRun;
      } else {
        if (k === " ") eng.bowlAction();
        else if (k === "o") eng.toggleWicketSide();
        else if (k === "f" && !e.shiftKey && eng.phase === "preBall") setShowField(true);
        else if (k === "arrowleft") eng.nudgeTarget(0.06 * eng.side(), 0);
        else if (k === "arrowright") eng.nudgeTarget(-0.06 * eng.side(), 0);
        else if (k === "arrowup") eng.nudgeTarget(0, 0.4);
        else if (k === "arrowdown") eng.nudgeTarget(0, -0.4);
        else if (/^[1-6]$/.test(k) && eng.inn.bowler != null) {
          const cat = deliveryCatalogue(eng.bowlTeam.players[eng.inn.bowler]);
          const d = cat[Number(k) - 1];
          if (d) eng.setDelivery(d);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ui, showField]);

  const onCanvasMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    engineRef.current?.setMouse((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const onCanvasDown = (e) => {
    const eng = engineRef.current;
    if (!eng) return;
    if (eng.phase === "replay" || eng.phase === "after") return eng.skip();
    if (eng.userBatting) eng.playShot(e.button === 2 ? "loft" : "ground");
    else if (e.button === 0) eng.bowlAction();
  };


  const eng = engineRef.current;
  const match = matchRef.current;

  // ============================================================ SETUP
  if (ui === "setup") {
    const fmt = FORMATS[cfg.format];
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#06140c] via-[#071022] to-[#06040D] p-4 sm:p-6 ${fullscreen ? "min-h-screen" : "neon-corridor-frame rounded-[28px] border border-white/15"}`}>
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-500/20 blur-[90px]" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
            🏏 Full 3D Cricket • DRS • Replays
          </span>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 pr-12">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              SMSC <span className="text-neon-gradient">Cricket 26</span>
            </h2>
            <button
              type="button"
              onClick={() => toggleFullscreen()}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 font-mono text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          </div>

          {/* Teams */}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {[
              ["user", "Your Team"],
              ["opp", "Opponent"],
            ].map(([key, label]) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">{label}</p>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {TEAMS.map((t) => {
                    const sel = cfg[key] === t.id;
                    const blocked = key === "opp" ? t.id === cfg.user : t.id === cfg.opp;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => setCfg((c) => ({ ...c, [key]: t.id }))}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                          sel ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/30"
                        } ${blocked ? "opacity-30" : ""}`}
                      >
                        <TeamBadge team={t} />
                        <span className="text-center text-[10px] leading-tight text-white">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Format + ground + difficulty */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">Format</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.values(FORMATS).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCfg((c) => ({ ...c, format: f.id }))}
                    className={`rounded-xl border px-3 py-2 text-left ${cfg.format === f.id ? "border-sky-400 bg-sky-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                  >
                    <span className="block font-display text-sm font-bold text-white">{f.label}</span>
                    <span className="font-mono text-[9px] text-ink-muted">
                      {f.id === "test" ? "2 innings • 3 reviews" : f.id === "custom" ? "Pick overs • 2 reviews" : `${f.overs} overs • 2 reviews`}
                    </span>
                  </button>
                ))}
              </div>
              {cfg.format === "custom" && (
                <label className="mt-3 block font-mono text-[11px] text-white">
                  Overs per side: <strong className="text-[#FFC247]">{cfg.customOvers}</strong>
                  <input type="range" min="1" max="50" value={cfg.customOvers} onChange={(e) => setCfg((c) => ({ ...c, customOvers: Number(e.target.value) }))} className="mt-1 w-full accent-sky-400" />
                </label>
              )}
              {cfg.format === "test" && (
                <div className="mt-3 font-mono text-[11px] text-white">
                  Overs per innings
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[0, 20, 30, 50, 90].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCfg((c) => ({ ...c, testCap: n }))}
                        className={`rounded-lg border px-2 py-1 text-[10px] ${cfg.testCap === n ? "border-sky-400 bg-sky-500/20" : "border-white/15"}`}
                      >
                        {n ? n : "Unlimited"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 lg:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">Ground</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {GROUNDS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setCfg((c) => ({ ...c, ground: g.id }))}
                    className={`rounded-xl border p-2.5 text-left ${cfg.ground === g.id ? "border-emerald-400 bg-emerald-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}
                  >
                    <span className="block font-display text-[13px] font-bold text-white">{g.name}</span>
                    <span className="block text-[10px] text-ink-secondary">
                      {g.city} • {g.time === "night" ? "🌙 Night" : g.time === "dusk" ? "🌇 Dusk" : "☀️ Day"}
                    </span>
                    <span className="mt-1 block font-mono text-[9px] text-emerald-300">{g.pitch.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">Difficulty</span>
                {Object.entries(DIFFICULTY).map(([k, d]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCfg((c) => ({ ...c, difficulty: k }))}
                    className={`rounded-full border px-3 py-1 text-xs ${cfg.difficulty === k ? "border-[#FFC247] bg-[#FFC247]/20 text-white" : "border-white/15 text-ink-secondary"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="flex items-center gap-3">
              <TeamBadge team={userTeam} size="lg" />
              <span className="font-display text-lg font-bold text-white">vs</span>
              <TeamBadge team={oppTeam} size="lg" />
              <div className="font-mono text-[11px] text-ink-secondary">
                {fmt.label}
                {cfg.format === "custom" ? ` • ${cfg.customOvers} overs` : ""} • {ground.name}, {ground.city}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setToss({ stage: "call" });
                setUi("toss");
              }}
              className="btn-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-7 py-3 font-heading text-sm font-bold text-white shadow-lg"
            >
              <Coins className="h-4 w-4" /> Go to Toss
            </button>
            <label className="flex w-full cursor-pointer items-center justify-end gap-2 font-mono text-[11px] text-ink-secondary sm:w-auto">
              <input type="checkbox" checked={autoFs} onChange={(e) => setAutoFs(e.target.checked)} className="accent-emerald-400" />
              Play in fullscreen
            </label>
          </div>
          <p className="mt-3 font-mono text-[10px] text-ink-muted">
            Batting: mouse/←→ aim • Space/LMB ground shot • Shift+Space/RMB loft • Q defend • E leave • W advance • S back foot • R run • X stop • T auto-run ┃ Bowling: 1–6 delivery • mouse/arrows line & length • Space run-up & lock meter • O over/around • F field ┃ Tab scorecard • Enter replay • C camera • P pause • Shift+F fullscreen
          </p>
        </div>
      </div>
    );
  }

  // ============================================================ TOSS
  if (ui === "toss") {
    const call = (c) => {
      const res = Math.random() < 0.5 ? "heads" : "tails";
      const won = res === c;
      let aiChoice = null;
      if (!won) aiChoice = ground.time === "night" || ground.pitch.swing > 1.3 ? "bowl" : Math.random() < 0.6 ? "bat" : "bowl";
      setToss({ stage: "result", call: c, res, won, aiChoice });
    };
    return (
      <div className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#06140c] via-[#071022] to-[#06040D] p-6 text-center ${fullscreen ? "min-h-screen" : "neon-corridor-frame min-h-[520px] rounded-[28px] border border-white/15"}`}>
        <motion.div
          animate={toss?.stage === "result" ? { rotateY: 1800 } : { rotateY: [0, 25, 0] }}
          transition={toss?.stage === "result" ? { duration: 1.2 } : { duration: 2, repeat: Infinity }}
          className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#FFC247] bg-gradient-to-br from-[#ffd76a] to-[#b8860b] font-display text-xl font-extrabold text-[#3b2a00] shadow-[0_0_40px_rgba(255,194,71,0.5)]"
        >
          {toss?.stage === "result" ? (toss.res === "heads" ? "H" : "T") : "?"}
        </motion.div>
        {toss?.stage === "call" ? (
          <>
            <h3 className="font-display text-2xl font-bold text-white">{userTeam.name} captain, call it!</h3>
            <div className="mt-4 flex gap-3">
              {["heads", "tails"].map((c) => (
                <button key={c} type="button" onClick={() => call(c)} className="rounded-full border border-[#FFC247]/60 bg-[#FFC247]/15 px-6 py-2.5 font-bold uppercase text-[#FFC247] hover:bg-[#FFC247]/30">
                  {c}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-2xl font-bold text-white">
              It&apos;s {toss.res}! {toss.won ? `${userTeam.name} win the toss` : `${oppTeam.name} win the toss`}
            </h3>
            {toss.won ? (
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => startMatch(0)} className="rounded-full bg-emerald-500 px-6 py-2.5 font-bold text-white">
                  🏏 Bat First
                </button>
                <button type="button" onClick={() => startMatch(1)} className="rounded-full bg-sky-500 px-6 py-2.5 font-bold text-white">
                  🎯 Bowl First
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-ink-secondary">
                  {oppTeam.name} elect to <strong className="text-white">{toss.aiChoice}</strong> first.
                </p>
                <button type="button" onClick={() => startMatch(toss.aiChoice === "bat" ? 1 : 0)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-7 py-3 font-bold text-white">
                  <Play className="h-4 w-4 fill-white" /> Start Match
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ============================================================ PLAY
  const h = hud;
  const bowlerOptions = prompt?.type === "bowler" ? prompt.options : null;
  const totals = match ? inningsTotals(match) : [0, 0];
  const userScore = match
    ? totals[0] +
      match.innings.filter((i) => i.bowlingIdx === 0).reduce((s, i) => s + i.wkts * 25, 0) +
      (match.result?.winner === 0 ? 400 : match.result?.winner === -1 ? 120 : 0)
    : 0;

  return (
    <div className={`relative overflow-hidden bg-black ${fullscreen ? "" : "neon-corridor-frame rounded-[28px] border border-white/15 shadow-2xl"}`}>
      <div className={`relative w-full select-none ${fullscreen ? "h-screen" : "h-[72vh] min-h-[540px] max-h-[760px]"}`}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-crosshair"
          onPointerMove={onCanvasMove}
          onPointerDown={onCanvasDown}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* ---------- Broadcast scoreboard ---------- */}
        {h && (
          <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex flex-wrap items-stretch gap-1.5 font-mono text-white sm:inset-x-3 sm:top-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#05101f]/90 px-3 py-1.5 shadow-xl">
              <TeamBadge team={h.batTeam} size="sm" />
              <div>
                <div className="font-display text-lg font-extrabold leading-none">
                  {h.runs}/{h.wkts}
                  <span className="ml-2 text-xs font-normal text-ink-secondary">
                    ({h.overs}
                    {h.oversLimit ? `/${h.oversLimit}` : ""})
                  </span>
                </div>
                <div className="text-[9.5px] text-ink-muted">
                  CRR {h.crr}
                  {h.target ? ` • Target ${h.target} • Need ${Math.max(0, h.need)}${h.ballsLeft != null ? ` off ${h.ballsLeft}` : ""}${h.rrr ? ` • RRR ${h.rrr}` : ""}` : ""}
                </div>
              </div>
              {h.powerplay && <span className="rounded bg-sky-500/30 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">PP</span>}
              {h.freeHit && <span className="animate-pulse rounded bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold">FREE HIT</span>}
            </div>
            <div className="hidden items-center gap-3 rounded-xl border border-white/15 bg-[#05101f]/90 px-3 py-1.5 text-[11px] md:flex">
              <div>
                <div>
                  <span className="text-[#FFC247]">▶</span> {h.striker.name} {h.striker.hand === "L" ? "(L)" : ""} <strong>{h.striker.runs}</strong>
                  <span className="text-ink-muted">({h.striker.balls})</span>
                </div>
                <div className="text-ink-secondary">
                  &nbsp;&nbsp;{h.nonStriker.name} <strong>{h.nonStriker.runs}</strong>
                  <span className="text-ink-muted">({h.nonStriker.balls})</span>
                </div>
              </div>
              {h.bowler && (
                <div className="border-l border-white/10 pl-3">
                  <div>
                    🎯 {h.bowler.name} <span className="text-ink-muted">{h.bowler.style === "spin" ? (h.bowler.spinType === "leg" ? "LB" : "OB") : h.bowler.style === "pace" ? "Fast" : "Med"}</span>
                  </div>
                  <div className="text-ink-secondary">
                    {h.bowler.wkts ?? 0}-{h.bowler.runs ?? 0} ({oversText(h.bowler.balls ?? 0)})
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#05101f]/90 px-2 py-1.5">
              {h.thisOver.map((sym, i) => (
                <span key={i} className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold ${chip(sym)}`}>
                  {sym}
                </span>
              ))}
              {h.speed && <span className="ml-1 text-[10px] text-sky-300">{h.speed} km/h</span>}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#05101f]/90 px-2 py-1.5 text-[9.5px]">
              <span title="Reviews left">
                DRS {h.batTeam.short} <strong className="text-sky-300">{h.reviewsBat}</strong> • {h.bowlTeam.short} <strong className="text-sky-300">{h.reviewsBowl}</strong>
              </span>
              {h.totalInnings > 2 && <span className="text-ink-muted">Inns {h.inningsNo}/4</span>}
            </div>
          </div>
        )}

        {/* ---------- Commentary ---------- */}
        {h && (
          <div className="pointer-events-none absolute right-3 top-[4.6rem] z-10 hidden w-72 flex-col gap-1 lg:flex">
            {h.feed.map((f) => (
              <div
                key={f.id}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] backdrop-blur-sm ${
                  f.tone === "wicket" ? "border-rose-500/50 bg-rose-950/70 text-rose-100" : f.tone === "boundary" ? "border-sky-400/50 bg-sky-950/70 text-sky-100" : f.tone === "info" ? "border-white/10 bg-black/60 text-[#FFC247]" : "border-white/10 bg-black/60 text-ink-secondary"
                }`}
              >
                <span className="text-ink-muted">{f.over} </span>
                {f.text}
              </div>
            ))}
          </div>
        )}

        {/* ---------- Banners ---------- */}
        <AnimatePresence>
          {banners.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="pointer-events-none absolute inset-x-0 top-[26%] z-30 flex flex-col items-center"
            >
              <span
                className={`font-display font-extrabold italic tracking-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)] ${b.big ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl"}`}
                style={{ color: b.color, WebkitTextStroke: "1.5px rgba(0,0,0,0.35)" }}
              >
                {b.title}
              </span>
              {b.sub && <span className="mt-2 rounded-full bg-black/70 px-4 py-1 font-mono text-xs text-white">{b.sub}</span>}
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {timing && (
            <motion.div key={timing.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-[58%] z-20 text-center">
              <span className="rounded-full bg-black/70 px-3 py-1 font-mono text-sm font-bold text-[#FFC247]">{timing.t}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {replaying && (
          <div className="pointer-events-none absolute inset-0 z-20 border-[6px] border-black/60">
            <span className="absolute left-4 top-[4.6rem] animate-pulse rounded bg-rose-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white">● REPLAY</span>
            <span className="absolute bottom-4 right-4 font-mono text-[10px] text-white/70">Space / click to skip</span>
          </div>
        )}
        <DrsPanel review={review} />

        {/* ---------- Review prompt ---------- */}
        {prompt?.type === "review" && (
          <div className="absolute inset-x-0 top-[44%] z-30 flex justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-sky-400/60 bg-[#05101f]/95 px-4 py-3 shadow-2xl">
              <div className="font-mono text-xs text-white">
                <p className="font-bold text-sky-300">{prompt.reviewSide === "batting" ? "Given OUT" : "Given NOT OUT"} — {prompt.how.toUpperCase()}</p>
                <p className="text-ink-secondary">Reviews left: {prompt.reviewsLeft}</p>
              </div>
              <button type="button" onClick={() => eng?.answerReview(true)} className="rounded-full bg-sky-500 px-4 py-2 text-xs font-bold text-white">
                REVIEW (DRS)
              </button>
              <button type="button" onClick={() => eng?.answerReview(false)} className="rounded-full border border-white/20 px-4 py-2 text-xs text-white">
                {prompt.reviewSide === "batting" ? "Walk off" : "Accept"}
              </button>
            </div>
          </div>
        )}

        {/* ---------- Bowler selection ---------- */}
        {bowlerOptions && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b1020]/95 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">New over</p>
              <h3 className="font-display text-xl font-bold text-white">Choose your bowler</h3>
              <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
                {bowlerOptions.map((o) => (
                  <button
                    key={o.idx}
                    type="button"
                    onClick={() => eng?.chooseBowler(o.idx)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left hover:border-emerald-400"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">{o.name}</span>
                      <span className="font-mono text-[10px] text-ink-muted">{o.style === "spin" ? (o.spinType === "leg" ? "Leg-spin" : "Off-spin") : o.style === "pace" ? "Fast" : "Medium pace"}</span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-secondary">{o.stats ? `${oversText(o.stats.balls)}-${o.stats.maidens}-${o.stats.runs}-${o.stats.wkts}` : "fresh"}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => eng?.quickSim(6)} className="mt-3 w-full rounded-full border border-white/15 py-2 text-xs text-ink-secondary hover:text-white">
                Simulate this over instead
              </button>
            </div>
          </div>
        )}

        {/* ---------- Bowling meter ---------- */}
        {h && !h.userBatting && h.meter && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 w-64 -translate-x-1/2">
            <div className="relative h-4 overflow-hidden rounded-full border border-white/30 bg-black/70">
              <div className="absolute inset-y-0 left-[62%] w-[20%] bg-emerald-500/60" />
              <div className="absolute inset-y-0 left-[94%] right-0 bg-rose-600/80" />
              <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 bg-white shadow-[0_0_8px_#fff]" style={{ left: `${(h.meter.locked ?? h.meter.v) * 100}%` }} />
            </div>
            <p className="mt-1 text-center font-mono text-[10px] text-white">{h.meter.locked == null ? "Press SPACE in the green zone • red = no-ball" : "Locked!"}</p>
          </div>
        )}

        {/* ---------- Bottom control deck ---------- */}
        {h && ["preBall", "runup", "delivery", "inPlay", "after", "dead"].includes(h.phase) && (
          <div className="absolute inset-x-2 bottom-2 z-20 flex flex-wrap items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
            {h.userBatting ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-[#05101f]/90 p-1.5 font-mono text-[10px] text-white">
                <span className="px-2 text-sky-300">Aim: {h.aimZone}</span>
                <button type="button" onClick={() => eng?.playShot("ground")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold">Drive [Space]</button>
                <button type="button" onClick={() => eng?.playShot("loft")} className="rounded-lg bg-fuchsia-600 px-2.5 py-1.5 font-bold">Loft [⇧Space]</button>
                <button type="button" onClick={() => eng?.playShot("defend")} className="rounded-lg bg-white/10 px-2.5 py-1.5">Defend [Q]</button>
                <button type="button" onClick={() => eng?.playShot("leave")} className="rounded-lg bg-white/10 px-2.5 py-1.5">Leave [E]</button>
                <span className="mx-1 h-5 w-px bg-white/15" />
                {[
                  ["advance", "Advance [W]"],
                  ["back", "Back [S]"],
                ].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => eng?.setFoot(k)} className={`rounded-lg px-2 py-1.5 ${h.foot === k ? "bg-[#FFC247] text-black" : "bg-white/10"}`}>
                    {l}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-white/15" />
                <button type="button" onClick={() => eng?.callRun()} className="rounded-lg bg-sky-600 px-2.5 py-1.5 font-bold">Run [R]</button>
                <button type="button" onClick={() => eng?.stopRun()} className="rounded-lg bg-white/10 px-2 py-1.5">Stop [X]</button>
                <button type="button" onClick={() => eng && (eng.autoRun = !eng.autoRun)} className={`rounded-lg px-2 py-1.5 ${h.autoRun ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10"}`}>
                  Auto-run {h.autoRun ? "ON" : "OFF"} [T]
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-[#05101f]/90 p-1.5 font-mono text-[10px] text-white">
                {h.bowler &&
                  deliveryCatalogue({ style: h.bowler.style }).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => eng?.setDelivery(d)}
                      className={`rounded-lg px-2 py-1.5 ${h.delivery?.label === d.label ? "bg-[#FFC247] font-bold text-black" : "bg-white/10"}`}
                    >
                      {d.key}. {d.label}
                    </button>
                  ))}
                <span className="px-1 text-sky-300">
                  {h.targetLen < 1.6 ? "Yorker" : h.targetLen < 4 ? "Full" : h.targetLen < 8 ? "Good length" : h.targetLen < 11 ? "Short" : "Bouncer"} • {h.targetLine > 0.5 ? "wide off" : h.targetLine > 0.15 ? "off stump" : h.targetLine > -0.15 ? "stumps" : "leg"}
                </span>
                <button type="button" onClick={() => eng?.toggleWicketSide()} className="rounded-lg bg-white/10 px-2 py-1.5">
                  {h.overWicket ? "Over" : "Round"} the wicket [O]
                </button>
                <button type="button" onClick={() => eng?.phase === "preBall" && setShowField(true)} className="rounded-lg bg-white/10 px-2 py-1.5">
                  <Users className="mr-1 inline h-3 w-3" />
                  Field [F]
                </button>
                <button type="button" onClick={() => eng?.bowlAction()} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold">
                  Bowl [Space]
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-[#05101f]/90 p-1.5 text-white">
              <button type="button" title="Replay (Enter)" disabled={!h.canReplay} onClick={() => eng?.startReplay()} className="rounded-lg bg-white/10 p-1.5 disabled:opacity-30">
                <Film className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Scorecard (Tab)" onClick={() => setShowCard(true)} className="rounded-lg bg-white/10 p-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Camera (C)" onClick={() => eng && (eng.camMode = eng.camMode === "tv" ? "batcam" : "tv")} className="rounded-lg bg-white/10 p-1.5">
                <Camera className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Simulate over" onClick={() => eng?.quickSim(6)} className="rounded-lg bg-white/10 px-2 py-1 font-mono text-[10px]">
                <FastForward className="mr-0.5 inline h-3 w-3" />
                Over
              </button>
              <button type="button" title="Simulate innings" onClick={() => eng?.quickSim(9999)} className="rounded-lg bg-white/10 px-2 py-1 font-mono text-[10px]">
                <FastForward className="mr-0.5 inline h-3 w-3" />
                Innings
              </button>
              {h.test && h.userBatting && (
                <button type="button" onClick={() => eng?.declareInnings()} className="rounded-lg bg-amber-500/30 px-2 py-1 font-mono text-[10px] text-amber-200">
                  <Flag className="mr-0.5 inline h-3 w-3" /> Declare
                </button>
              )}
              <button type="button" title="Pause (P)" onClick={() => setPaused((v) => !v)} className="rounded-lg bg-white/10 p-1.5">
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => setMuted((v) => !v)} className="rounded-lg bg-white/10 p-1.5">
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title="Fullscreen (Shift+F)" onClick={() => toggleFullscreen()} className="rounded-lg bg-white/10 p-1.5">
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}

        {paused && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <h3 className="font-display text-3xl font-bold text-white">Paused</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaused(false)} className="rounded-full bg-emerald-500 px-5 py-2 font-bold text-white">Resume</button>
              <button type="button" onClick={quitToMenu} className="rounded-full border border-white/20 px-5 py-2 text-white">Quit to menu</button>
            </div>
          </div>
        )}

        {showField && eng && <FieldEditor match={match} engine={eng} onClose={() => setShowField(false)} />}

        {showCard && match && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowCard(false)}>
            <div className="mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold text-white">Scorecard</h3>
                <button type="button" onClick={() => setShowCard(false)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white">Close (Tab)</button>
              </div>
              <Scorecard match={match} />
            </div>
          </div>
        )}

        {/* ---------- Innings break ---------- */}
        {ui === "inningsBreak" && match && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
            <div className="mx-auto max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#FFC247]">Innings break</p>
              <h3 className="font-display text-2xl font-bold text-white">
                {match.teams[match.innings[match.inningsIdx].battingIdx].name} {match.innings[match.inningsIdx].runs}/{match.innings[match.inningsIdx].wkts}
              </h3>
              <div className="mt-3">
                <Scorecard match={match} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setUi("play");
                  eng?.startNextInnings();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-7 py-3 font-bold text-white"
              >
                Start next innings <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------- Result ---------- */}
        {ui === "result" && match?.result && (
          <div className="absolute inset-0 z-40 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl">
                {match.result.winner === 0 ? "🏆" : match.result.winner === -1 ? "🤝" : "😔"}
              </motion.div>
              <h3 className="mt-2 font-display text-3xl font-extrabold text-white">{match.result.text}</h3>
              <PlayerOfMatch match={match} />
              <LeaderboardSubmitCard
                key={`cricket-${userScore}`}
                gameId="cricket"
                score={userScore}
                badge={`${match.teams[0].short} vs ${match.teams[1].short} • ${match.format.label}`}
                meta={match.result.text.slice(0, 60)}
                highlightLabel="Match complete! Add your name"
                isNewRecord
              />
              <div className="mt-4 text-left">
                <Scorecard match={match} />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={quitToMenu} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-6 py-3 font-bold text-white">
                  <RotateCcw className="h-4 w-4" /> New match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerOfMatch({ match }) {
  const pom = useMemo(() => {
    let best = null;
    match.innings.forEach((inn) => {
      inn.batters.forEach((b) => {
        const score = b.runs + b.sixes * 2;
        if (!best || score > best.score) best = { score, name: match.teams[inn.battingIdx].players[b.idx].name, line: `${b.runs} (${b.balls})` };
      });
      Object.entries(inn.bowlers).forEach(([i, s]) => {
        const score = s.wkts * 22 - s.runs * 0.2;
        if (!best || score > best.score) best = { score, name: match.teams[inn.bowlingIdx].players[i].name, line: `${s.wkts}/${s.runs}` };
      });
    });
    return best;
  }, [match]);
  if (!pom) return null;
  return (
    <p className="mt-2 font-mono text-sm text-[#FFC247]">
      ⭐ Player of the Match: <strong className="text-white">{pom.name}</strong> — {pom.line}
    </p>
  );
}
