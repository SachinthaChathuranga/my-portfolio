import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import {
  WORK_CATEGORIES,
  ProjectShowcaseCard,
} from "../components/WorkSection";

export default function WorkArchivePage({
  projects = [],
  initialCategory = "all",
  onBackHome,
  onSelectProject,
  onOpenStorePreview,
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory || "all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setActiveCategory(initialCategory || "all");
  }, [initialCategory]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const publicProjects = useMemo(
    () => projects.filter((p) => p.isPublic !== false),
    [projects]
  );

  const filtered = useMemo(() => {
    return publicProjects.filter((p) => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        (p.technologies || []).some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [publicProjects, activeCategory, query]);

  return (
    <div className="relative z-10 min-h-screen pt-28 pb-24 sm:pt-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Back Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>

          <span className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted">
            <Sparkles className="h-3.5 w-3.5 text-[#FFC247]" />
            {filtered.length} {filtered.length === 1 ? "project" : "projects"} shown
          </span>
        </motion.div>

        {/* Page Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#00D4FF]">
            Complete Archive / Work
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-6xl">
            All <span className="text-neon-gradient">Projects & Creations</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
            Browse every commercial mobile app, full-stack web platform, computer vision
            research project, Figma UI/UX system, and graphic art collection.
          </p>
        </motion.div>

        {/* Filter & Search Bar */}
        <div className="mt-10 flex flex-col justify-between gap-4 border-y border-white/10 py-5 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {WORK_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count =
                cat.id === "all"
                  ? publicProjects.length
                  : publicProjects.filter((p) => p.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    isActive ? "text-white" : "text-ink-muted hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="archive-work-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full border border-white/20"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.55), rgba(0,153,255,0.55))",
                      }}
                    />
                  )}
                  <span>{cat.label}</span>
                  <span className="font-mono text-[10px] opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title or stack..."
              className="w-full rounded-full border border-white/12 bg-white/[0.04] py-2.5 pl-10 pr-4 text-xs text-white placeholder-ink-muted outline-none transition focus:border-[#00D4FF]/70"
            />
          </div>
        </div>

        {/* Full Projects Grid */}
        <motion.div
          layout
          className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((project, idx) => (
              <ProjectShowcaseCard
                key={project.id}
                project={project}
                index={idx}
                isHeroSpan={activeCategory === "all" && !query && idx === 0}
                onSelectProject={onSelectProject}
                onOpenStorePreview={onOpenStorePreview}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-14 text-center text-ink-muted">
            No matching projects found.
          </div>
        )}
      </div>
    </div>
  );
}
