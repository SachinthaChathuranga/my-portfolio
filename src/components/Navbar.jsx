import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

export default function Navbar({
  brand = "SMSC",
  activePage = "home",
  onNavigateHome,
  onNavigateWork,
  onNavigateGallery,
  onNavigateBlog,
  onNavigateGames,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { label: "About", action: () => onNavigateHome?.("about"), active: false },
    { label: "Work", action: () => onNavigateWork?.(), active: activePage === "work" },
    { label: "Capabilities", action: () => onNavigateHome?.("skills"), active: false },
    { label: "Journey", action: () => onNavigateHome?.("journey"), active: false },
    {
      label: "My Gallery",
      action: () => onNavigateGallery?.(),
      active: activePage === "gallery",
    },
    {
      label: "Blog",
      action: () => onNavigateBlog?.(),
      active: activePage === "blog",
    },
    {
      label: "Games",
      action: () => onNavigateGames?.(),
      active: activePage === "games",
    },
    { label: "Contact", action: () => onNavigateHome?.("contact"), active: false },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8"
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-3 transition-all duration-500 ${
            scrolled || activePage !== "home"
              ? "glass-panel shadow-glass-3d"
              : "border border-transparent bg-transparent"
          }`}
        >
          {/* Brand Monogram */}
          <button
            type="button"
            onClick={() => onNavigateHome?.(null)}
            className="group flex items-center gap-2.5 focus:outline-none"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-void-800/80 font-display text-xs font-extrabold tracking-widest text-white transition-transform duration-300 group-hover:scale-105">
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F012A8]/40 via-transparent to-[#00D4FF]/40 opacity-80 blur-[2px]" />
              <span className="relative">{brand.slice(0, 2)}</span>
            </span>
            <span className="font-display text-sm font-bold tracking-[0.22em] text-white">
              {brand}
            </span>
          </button>

          {/* Editorial Navigation Links */}
          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`relative font-sans text-sm font-medium transition-colors duration-200 after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:bg-gradient-to-r after:from-[#F012A8] after:to-[#00D4FF] after:transition-all after:duration-300 ${
                  item.active
                    ? "text-white after:w-full"
                    : "text-ink-secondary hover:text-white after:w-0 hover:after:w-full"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateHome?.("contact")}
              className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-white transition-all duration-300 hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15 hover:shadow-neon-cyan md:inline-flex"
            >
              <span>Let&apos;s Talk</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle Menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-4 top-20 z-50 rounded-3xl p-6 glass-panel lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item, idx) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    item.action();
                  }}
                  className="flex items-center justify-between border-b border-white/10 pb-3 text-left font-display text-lg font-semibold text-white"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-ink-muted">
                    0{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
