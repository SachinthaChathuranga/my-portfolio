import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Lock, ArrowLeft, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { auth } from "../utils/firebase";

export default function StudioAuthGate({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        setError("Invalid email or password. Use the admin user created in Firebase Authentication.");
      } else {
        setError(err?.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06040D] p-5 text-white">
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full opacity-35 blur-[130px]"
        style={{ background: "#F012A8" }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full opacity-35 blur-[130px]"
        style={{ background: "#00D4FF" }}
      />

      <div className="neon-corridor-frame glass-panel relative z-10 w-full max-w-md rounded-3xl p-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-ink-muted transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Portfolio
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#F012A8] to-[#0099FF] text-white shadow-neon-magenta">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              SMSC Cloud Studio
            </h1>
            <p className="font-mono text-[11px] text-ink-muted">
              Protected by Firebase Authentication
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Admin Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="abc@gmail.com"
              className="w-full rounded-xl border border-white/12 bg-[#0D091A] px-4 py-3 text-sm text-white placeholder-ink-muted/70 outline-none transition focus:border-[#00D4FF]"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/12 bg-[#0D091A] px-4 py-3 text-sm text-white placeholder-ink-muted/70 outline-none transition focus:border-[#00D4FF]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-neon-magenta transition hover:scale-[1.01] disabled:opacity-55"
            style={{
              background: "linear-gradient(110deg, #F012A8 0%, #9E1EFF 50%, #0099FF 100%)",
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>{loading ? "Signing in..." : "Sign In to Cloud Studio"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
