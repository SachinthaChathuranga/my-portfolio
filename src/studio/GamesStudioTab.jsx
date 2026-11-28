import React, { useEffect, useState } from "react";
import {
  Gamepad2,
  Eye,
  EyeOff,
  Trophy,
  Trash2,
  RefreshCw,
  Crown,
  Medal,
  AlertTriangle,
  Globe,
  Check,
  Copy,
} from "lucide-react";
import {
  clearGameLeaderboard,
  fetchGameLeaderboard,
  LEADERBOARD_GAMES,
  MAX_LEADERBOARD_ENTRIES,
  removeLeaderboardEntry,
  subscribeGameLeaderboard,
} from "../utils/leaderboardApi";

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /game_leaderboards/{gameId} {
      allow read: if true;
      allow create, update: if request.resource.data.entries is list
                            && request.resource.data.entries.size() <= 20;
      allow delete: if request.auth != null;
    }
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`;

export default function GamesStudioTab({ draft, updateDraft, showToast }) {
  const [selectedGame, setSelectedGame] = useState("vanguard");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [cloudConnected, setCloudConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedRule, setCopiedRule] = useState(false);

  const isGamesPublic = draft.showGames !== false;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeGameLeaderboard(selectedGame, (res) => {
      setEntries(res.entries);
      setCloudConnected(res.cloudConnected);
      setErrorMsg(res.error || "");
      setLoading(false);
    });
    return () => unsub();
  }, [selectedGame]);

  const handleToggleGamesPublic = () => {
    const next = !isGamesPublic;
    updateDraft((prev) => ({ ...prev, showGames: next }));
    showToast(
      "info",
      next
        ? "Games Arcade set to PUBLIC — click Save Live to Cloud!"
        : "Games Arcade set to HIDDEN from public — click Save Live to Cloud!"
    );
  };

  const handleDeleteEntry = async (row) => {
    if (!window.confirm(`Remove "${row.playerName}" (${row.score.toLocaleString()} PTS) from Firebase leaderboard?`)) {
      return;
    }
    setBusyId(row.id);
    try {
      await removeLeaderboardEntry(selectedGame, row.id);
      showToast("success", `Removed ${row.playerName} from global leaderboard.`);
    } catch (err) {
      showToast("error", err?.message || "Could not remove entry.");
    } finally {
      setBusyId("");
    }
  };

  const handleClearBoard = async () => {
    const meta = LEADERBOARD_GAMES.find((g) => g.id === selectedGame);
    if (
      !window.confirm(
        `Clear ALL leaderboard scores for "${meta?.title || selectedGame}" in Firebase? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId("__clear__");
    try {
      await clearGameLeaderboard(selectedGame);
      showToast("success", `Cleared all scores for ${meta?.short || selectedGame}.`);
    } catch (err) {
      showToast("error", err?.message || "Could not clear leaderboard.");
    } finally {
      setBusyId("");
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    const res = await fetchGameLeaderboard(selectedGame);
    setEntries(res.entries);
    setCloudConnected(res.cloudConnected);
    setErrorMsg(res.error || "");
    setLoading(false);
  };

  const activeMeta =
    LEADERBOARD_GAMES.find((g) => g.id === selectedGame) || LEADERBOARD_GAMES[0];

  return (
    <div className="space-y-6">
      {/* 1. Public Visibility Control for Games Arcade */}
      <div className="rounded-2xl border border-white/10 bg-[#100B20] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Gamepad2 className="h-5 w-5 text-[#00D4FF]" />
              Games Arcade Visibility
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Control whether visitors can see the <strong className="text-white">Games</strong> button
              in Navbar/Footer and access <code className="text-[#7EE8FF]">#/games</code> publicly.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleGamesPublic}
            className={`inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold transition ${
              isGamesPublic
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                : "border-rose-400/45 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
            }`}
          >
            {isGamesPublic ? (
              <>
                <Eye className="h-4 w-4" />
                <span>PUBLIC (Visible to Everyone)</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <span>HIDDEN (Private / Owner Only)</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-white/8 bg-black/30 px-3.5 py-2 font-mono text-[11px] text-ink-secondary">
          Status:{" "}
          <span className={isGamesPublic ? "text-emerald-300" : "text-amber-300"}>
            {isGamesPublic
              ? "Games page & navigation links are visible on the public website."
              : "Games button is hidden from public Navbar/Footer & public visitors cannot open #/games."}
          </span>{" "}
          (Remember to click <strong className="text-white">Save Live to Cloud</strong> at top-right!)
        </p>
      </div>

      {/* 2. Global Firebase Top-20 Leaderboard Moderator */}
      <div className="rounded-2xl border border-white/10 bg-[#100B20] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <Trophy className="h-5 w-5 text-[#FFC247]" />
              Global Firebase Leaderboard Manager
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Live Firebase Firestore Top {MAX_LEADERBOARD_ENTRIES} per game (ranks 21+ auto-prune
              from DB). Remove individual rows or clear an entire game board below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold ${
                cloudConnected
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                  : "border-rose-400/40 bg-rose-500/15 text-rose-300"
              }`}
            >
              <Globe className="h-3 w-3" />
              {cloudConnected ? "Firebase Live" : "Offline / Rule Needed"}
            </span>

            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              type="button"
              disabled={entries.length === 0 || busyId === "__clear__"}
              onClick={handleClearBoard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/45 bg-rose-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Board
            </button>
          </div>
        </div>

        {/* Game Switcher Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {LEADERBOARD_GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGame(g.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-xs font-semibold transition ${
                selectedGame === g.id
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-ink-muted hover:text-white"
              }`}
              style={selectedGame === g.id ? { borderColor: g.accent } : undefined}
            >
              {g.short}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 font-mono text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Editable Rankings Table */}
        <div className="mt-5">
          {loading && entries.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-ink-muted">
              Loading {activeMeta.title} scores from Firebase...
            </p>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/12 bg-black/25 py-8 text-center font-mono text-xs text-ink-muted">
              No Firebase leaderboard entries for {activeMeta.title}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0A0716]">
              <table className="w-full min-w-[540px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    <th className="py-2.5 pl-3 pr-2">Rank</th>
                    <th className="px-2 py-2.5">Player</th>
                    <th className="px-2 py-2.5">Details</th>
                    <th className="px-2 py-2.5 text-right">Score</th>
                    <th className="py-2.5 pl-2 pr-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {entries.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-white/[0.03]">
                      <td className="py-2.5 pl-3 pr-2 font-mono text-xs font-bold text-[#FFC247]">
                        <span className="inline-flex items-center gap-1">
                          {idx === 0 ? (
                            <Crown className="h-3.5 w-3.5" />
                          ) : idx < 3 ? (
                            <Medal className="h-3.5 w-3.5 text-slate-300" />
                          ) : null}
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-sm font-semibold text-white">
                        {row.playerName}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[11px] text-ink-secondary">
                        {row.badge && (
                          <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[#7EE8FF]">
                            {row.badge}
                          </span>
                        )}
                        {row.meta}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-xs font-bold text-[#00D4FF]">
                        {Number(row.score || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 pl-2 pr-3 text-right">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDeleteEntry(row)}
                          title="Delete score from Firebase"
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Firebase Firestore Security Rules Reference */}
      <div className="rounded-2xl border border-white/10 bg-[#0B0718] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D4FF]">
            Firebase Firestore Rule (Required for Public Global Top-20 Sync)
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(FIRESTORE_RULES_SNIPPET);
              setCopiedRule(true);
              setTimeout(() => setCopiedRule(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] text-white hover:border-[#00D4FF]"
          >
            {copiedRule ? (
              <>
                <Check className="h-3 w-3 text-[#00D4FF]" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy Rule
              </>
            )}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-3.5 font-mono text-[11px] leading-relaxed text-ink-secondary">
          {FIRESTORE_RULES_SNIPPET}
        </pre>
      </div>
    </div>
  );
}
