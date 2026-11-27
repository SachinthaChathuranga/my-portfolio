import React, { useState } from "react";
import { Trophy, CheckCircle2, Send, Sparkles } from "lucide-react";
import { getSavedPlayerName, submitGameScore } from "../utils/leaderboardApi";

/**
 * Compact inline Name-Entry Form shown on Best Score / Mission Completed screens across all 4 games.
 */
export default function LeaderboardSubmitCard({
  gameId,
  score,
  badge = "",
  meta = "",
  highlightLabel = "Submit to Leaderboard",
  isNewRecord = false,
}) {
  const [name, setName] = useState(() => getSavedPlayerName());
  const [submitting, setSubmitting] = useState(false);
  const [savedState, setSavedState] = useState(null); // { name, syncedToCloud }
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) {
      setError("Enter your player name first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await submitGameScore({
        gameId,
        playerName: name,
        score,
        badge,
        meta,
      });
      setSavedState({ name: res.entry.playerName, syncedToCloud: res.syncedToCloud });
    } catch (err) {
      setError(err?.message || "Could not save score.");
    } finally {
      setSubmitting(false);
    }
  };

  if (savedState) {
    return (
      <div className="mt-4 w-full max-w-md rounded-2xl border border-emerald-400/45 bg-emerald-500/15 px-4 py-3 text-center backdrop-blur-md">
        <p className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Saved to Leaderboard as {savedState.name}!
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-emerald-200/75">
          {savedState.syncedToCloud
            ? "Synced globally to live leaderboard below."
            : "Saved to this device's leaderboard below."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => e.stopPropagation()}
      className="mt-4 w-full max-w-md rounded-2xl border border-white/15 bg-black/60 p-3.5 text-left backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFC247]">
          {isNewRecord ? <Sparkles className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
          {highlightLabel}
        </span>
        <span className="font-mono text-xs font-bold text-[#00D4FF]">
          {Math.floor(score).toLocaleString()} PTS
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="text"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name (e.g. Sachintha)"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-[#00D4FF]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#00D4FF] px-3.5 py-2 font-mono text-xs font-bold text-[#06040D] transition hover:bg-[#5BE7FF] disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{submitting ? "Saving..." : "Save"}</span>
        </button>
      </div>

      {error && <p className="mt-1.5 font-mono text-[10px] text-rose-400">{error}</p>}
    </form>
  );
}
