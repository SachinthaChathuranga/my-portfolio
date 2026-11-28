import React, { useState } from "react";
import { Trophy, CheckCircle2, Send, Sparkles, AlertCircle } from "lucide-react";
import { submitGameScore } from "../utils/leaderboardApi";

/**
 * Global Firebase Top-20 Name-Entry Form shown on Best Score / Mission Completed screens.
 * Writes directly to Firebase Firestore (no localStorage leaderboard caching).
 */
export default function LeaderboardSubmitCard({
  gameId,
  score,
  badge = "",
  meta = "",
  highlightLabel = "Submit to Global Top 20",
  isNewRecord = false,
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { madeTop20, rank, minTopScore, name }
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
      setResult({
        madeTop20: res.madeTop20,
        rank: res.rank,
        minTopScore: res.minTopScore,
        name: res.entry.playerName,
      });
    } catch (err) {
      const code = err?.code || err?.message || "Firebase write failed";
      setError(
        code.includes("permission")
          ? "Firebase permission denied — publish the game_leaderboards Firestore rule."
          : code
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div
        className={`mt-4 w-full max-w-md rounded-2xl border px-4 py-3 text-center backdrop-blur-md ${
          result.madeTop20
            ? "border-emerald-400/45 bg-emerald-500/15"
            : "border-amber-400/45 bg-amber-500/15"
        }`}
      >
        {result.madeTop20 ? (
          <>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Ranked #{result.rank} Globally as {result.name}!
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-emerald-200/80">
              ● Live synced to Firebase Global Top 20 Leaderboard across all devices.
            </p>
          </>
        ) : (
          <>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300">
              <AlertCircle className="h-4 w-4" />
              Top 20 Cutoff Not Reached
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-amber-200/80">
              Current #20 score is {Number(result.minTopScore || 0).toLocaleString()} PTS — beat it to enter the Top 20!
            </p>
          </>
        )}
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

      {error && (
        <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-rose-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
