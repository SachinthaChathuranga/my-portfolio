import React from "react";

export default function Footer({
  profile,
  onNavigateHome,
  onNavigateWork,
  onNavigateGallery,
}) {
  return (
    <footer className="relative z-10 border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-8 sm:text-left">
        <div>
          <span className="font-display text-lg font-extrabold tracking-[0.22em] text-neon-gradient">
            {profile?.brand || "SMSC"}
          </span>
          <p className="mt-1 text-xs text-ink-muted">
            © {new Date().getFullYear()} {profile?.fullName || "S.M. Sachintha Chathuranga"}. Crafted with React, Motion UI & Neon Optics.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-ink-muted">
          <button
            type="button"
            onClick={() => onNavigateHome?.(null)}
            className="transition hover:text-white"
          >
            Home ↑
          </button>
          <button
            type="button"
            onClick={() => onNavigateWork?.()}
            className="transition hover:text-white"
          >
            All Work
          </button>
          <button
            type="button"
            onClick={() => onNavigateGallery?.()}
            className="transition hover:text-white"
          >
            My Gallery
          </button>
          <button
            type="button"
            onClick={() => onNavigateHome?.("contact")}
            className="transition hover:text-white"
          >
            Contact
          </button>
        </div>
      </div>
    </footer>
  );
}
