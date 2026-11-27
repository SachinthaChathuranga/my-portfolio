import React, { useCallback, useEffect, useState } from "react";
import { Trophy, RefreshCw, Medal, Crown, Globe, HardDrive } from "lucide-react";
import { fetchGameLeaderboard, LEADERBOARD_GAMES } from "../utils/leaderboardApi";

export default function GameLeaderboard({ activeGame }) {
  const [selectedTab, setSelectedTab] = useState(activeGame || "vanguard");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloudConnected, setCloudConnected] = useState(false);

  // Sync leaderboard tab automatically when user switches the active game
  useEffect(() => {
    if (activeGame) setSelectedTab(activeGame);
  }, [activeGame]);

  const load = useCallback(async (gameId) => {
    setLoading(true);
    const res = await fetchGameLeaderboard(gameId, 12);
    setEntries(res.entries);
    setCloudConnected(res.cloudConnected);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(selectedTab);
  }, [selectedTab, load]);

  // Listen for instant score submissions from any of the 4 games
  useEffect(() => {
    const onUpdated = (e) => {
      const updatedGameId = e?.detail?.gameId;
      if (!updatedGameId || updatedGameId === selectedTab) {
        load(selectedTab);
      }
    };
    window.addEventListener("smsc-leaderboard-updated", onUpdated);
    return () => window.removeEventListener("smsc-leaderboard-updated", onUpdated);
  }, [selectedTab, load]);

  const activeMeta =
    LEADERBOARD_GAMES.find((g) => g.id === selectedTab) || LEADERBOARD_GAMES[0];

  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <section className="mt-10 rounded-[28px] border border-white/12 bg-[#0A0617]/85 p-5 shadow-2xl backdrop-blur-md sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#FFC247]">
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame • Per-Game Rankings
          </p>
          <h3 className="mt-1 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Arcade <span className="text-neon-gradient">Leaderboard</span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold ${
              cloudConnected
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
                : "border-white/15 bg-white/5 text-ink-muted"
            }`}
          >
            {cloudConnected ? (
              <>
                <Globe className="h-3 w-3" /> Live Global Board
              </>
            ) : (
              <>
                <HardDrive className="h-3 w-3" /> Local Board
              </>
            )}
          </span>

          <button
            type="button"
            onClick={() => load(selectedTab)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Per-Game Selector Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {LEADERBOARD_GAMES.map((g) => {
          const isCurrent = selectedTab === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedTab(g.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-xs font-semibold transition ${
                isCurrent
                  ? "border-white/40 bg-white/15 text-white shadow-glass-3d"
                  : "border-white/10 bg-white/[0.03] text-ink-muted hover:border-white/25 hover:text-white"
              }`}
              style={isCurrent ? { borderColor: g.accent } : undefined}
            >
              {g.short}
            </button>
          );
        })}
      </div>

      {/* Rankings Table */}
      <div className="mt-5">
        {loading && entries.length === 0 ? (
          <div className="py-10 text-center font-mono text-xs text-ink-muted">
            Loading {activeMeta.title} rankings...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
            <Trophy className="mx-auto h-8 w-8 text-[#FFC247]/60" />
            <p className="mt-3 font-display text-base font-bold text-white">
              No records yet for {activeMeta.title}
            </p>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              Complete a mission or set a Best Score above to put your name at #1!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  <th className="py-2.5 pl-3 pr-2">Rank</th>
                  <th className="px-2 py-2.5">Player</th>
                  <th className="px-2 py-2.5">Achievement</th>
                  <th className="px-2 py-2.5 text-right">Score</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {entries.map((row, idx) => {
                  const rank = idx + 1;
                  const medalColor =
                    rank === 1
                      ? "text-[#FFC247]"
                      : rank === 2
                      ? "text-slate-300"
                      : rank === 3
                      ? "text-amber-600"
                      : "text-ink-muted";
                  return (
                    <tr
                      key={row.clientId || row.id || idx}
                      className={`transition hover:bg-white/[0.04] ${
                        rank === 1 ? "bg-[#FFC247]/[0.05]" : ""
                      }`}
                    >
                      <td className="py-3 pl-3 pr-2 font-mono text-xs font-bold">
                        <span className={`inline-flex items-center gap-1.5 ${medalColor}`}>
                          {rank === 1 ? (
                            <Crown className="h-4 w-4" />
                          ) : rank <= 3 ? (
                            <Medal className="h-3.5 w-3.5" />
                          ) : null}
                          #{rank}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-display text-sm font-bold text-white">
                        {row.playerName}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.badge && (
                            <span
                              className="rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
                              style={{
                                backgroundColor: `${activeMeta.accent}22`,
                                color: activeMeta.accent,
                              }}
                            >
                              {row.badge}
                            </span>
                          )}
                          {row.meta && (
                            <span className="font-mono text-[11px] text-ink-secondary">
                              {row.meta}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-sm font-extrabold text-[#00D4FF]">
                        {Number(row.score || 0).toLocaleString()}
                      </td>
                      <td className="py-3 pl-2 pr-3 text-right font-mono text-[11px] text-ink-muted">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
