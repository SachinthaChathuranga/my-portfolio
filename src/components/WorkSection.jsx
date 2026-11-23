import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Images,
  Sparkles,
  Globe,
  Lock,
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import Tilt3DCard from "./Tilt3DCard";
import { assetUrl } from "../utils/portfolioApi";
import { getProjectStoreLinks } from "../utils/storeLinks";

export const WORK_CATEGORIES = [
  { id: "all", label: "All Works" },
  { id: "mobile", label: "Mobile Apps" },
  { id: "web", label: "Web Development" },
  { id: "research", label: "Research & AI" },
  { id: "uiux", label: "UI / UX Design" },
  { id: "graphic", label: "Graphic & Art" },
];

export const WORK_CATEGORY_ACCENT = {
  web: {
    pill: "border-[#00D4FF]/40 bg-[#00D4FF]/15 text-[#7EE8FF]",
    glow: "rgba(0, 212, 255, 0.28)",
    secondary: "rgba(240, 18, 168, 0.2)",
  },
  mobile: {
    pill: "border-[#F012A8]/40 bg-[#F012A8]/15 text-[#FF8DE0]",
    glow: "rgba(240, 18, 168, 0.3)",
    secondary: "rgba(255, 138, 31, 0.2)",
  },
  research: {
    pill: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    glow: "rgba(16, 185, 129, 0.28)",
    secondary: "rgba(0, 212, 255, 0.22)",
  },
  uiux: {
    pill: "border-[#A78BFA]/45 bg-[#A78BFA]/15 text-[#DDD6FE]",
    glow: "rgba(167, 139, 250, 0.3)",
    secondary: "rgba(0, 212, 255, 0.22)",
  },
  graphic: {
    pill: "border-[#FF8A1F]/45 bg-[#FF8A1F]/15 text-[#FFD18C]",
    glow: "rgba(255, 138, 31, 0.32)",
    secondary: "rgba(240, 18, 168, 0.22)",
  },
};

export function ProjectShowcaseCard({
  project,
  index,
  isHeroSpan = false,
  onSelectProject,
  onOpenStorePreview,
}) {
  const coverPath = project.coverImage || project.images?.[0] || "";
  const cover = coverPath ? assetUrl(coverPath) : "";
  const logoSrc = project.logo ? assetUrl(project.logo) : "";
  const screenshotCount = (project.images || []).length;
  const accent = WORK_CATEGORY_ACCENT[project.category] || WORK_CATEGORY_ACCENT.web;
  const { appStoreUrl, playStoreUrl, websiteUrl } = getProjectStoreLinks(project);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.04, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={isHeroSpan ? "md:col-span-2" : ""}
    >
      <Tilt3DCard
        maxTilt={7}
        glowColor={accent.glow}
        secondaryGlow={accent.secondary}
        onClick={() => onSelectProject(project)}
        className="neon-corridor-frame glass-panel h-full cursor-pointer transition-transform duration-300 hover:-translate-y-1"
      >
        <div
          className={`grid h-full grid-cols-1 ${
            isHeroSpan ? "lg:grid-cols-12" : ""
          }`}
        >
          {/* Visual Cover Stage */}
          <div
            className={`relative overflow-hidden bg-void-900 ${
              isHeroSpan
                ? "aspect-[16/10] lg:col-span-7 lg:aspect-auto lg:min-h-[360px]"
                : "aspect-[16/10]"
            }`}
          >
            {cover ? (
              <img
                src={cover}
                alt={project.title}
                loading="lazy"
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#F012A8]/20 via-void-900 to-[#00D4FF]/20 p-8 text-center">
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#F012A8]/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#00D4FF]/25 blur-3xl" />
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={`${project.title} logo`}
                    className="mb-3 h-20 w-20 rounded-2xl border border-white/20 object-cover shadow-2xl"
                  />
                ) : (
                  <Sparkles className="mb-3 h-7 w-7 text-[#FFC247]/85" />
                )}
                <span className="font-display text-xl font-bold text-white/95">
                  {project.title}
                </span>
                <span className="mt-1.5 font-mono text-[11px] text-ink-secondary">
                  {project.subtitle || project.projectType}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D] via-[#06040D]/20 to-transparent opacity-80" />

            {/* Top Floating Badges */}
            <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md ${accent.pill}`}
              >
                {project.projectType || project.category}
              </span>

              {screenshotCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur-md">
                  <Images className="h-3 w-3 text-[#00D4FF]" />
                  {screenshotCount}
                </span>
              )}
            </div>

            {/* Floating Brand / App Logo Squircle on Cover */}
            {logoSrc && cover && (
              <div className="absolute bottom-4 left-4 z-20 h-14 w-14 overflow-hidden rounded-2xl border border-white/25 bg-[#0B0716]/85 p-1 shadow-2xl backdrop-blur-md">
                <img
                  src={logoSrc}
                  alt={`${project.title} logo`}
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
            )}
          </div>

          {/* Editorial Caption Area */}
          <div
            className={`flex flex-col justify-between p-6 sm:p-7 ${
              isHeroSpan ? "lg:col-span-5 lg:p-9" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-ink-muted">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{project.date || project.status}</span>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                {logoSrc && !cover && (
                  <img
                    src={logoSrc}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl border border-white/15 object-cover"
                  />
                )}
                <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-neon-gradient sm:text-2xl">
                  {project.title}
                </h3>
              </div>

              {project.subtitle && (
                <p className="mt-1 font-sans text-xs font-medium uppercase tracking-[0.16em] text-[#FFC247]/90">
                  {project.subtitle}
                </p>
              )}

              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-secondary">
                {project.description}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {appStoreUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStorePreview?.(project, "appstore");
                    }}
                    title="Preview App Store Listing"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#0A84FF]/50 bg-[#0A84FF]/15 px-3 py-1.5 font-sans text-[11px] font-semibold text-[#7DC0FF] transition hover:border-[#0A84FF] hover:bg-[#0A84FF]/30 hover:text-white"
                  >
                    <FaApple className="h-3.5 w-3.5" />
                    <span>App Store</span>
                  </button>
                )}
                {playStoreUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStorePreview?.(project, "playstore");
                    }}
                    title="Preview Google Play Listing"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#00C896]/45 bg-[#01875F]/20 px-3 py-1.5 font-sans text-[11px] font-semibold text-[#5CEAC3] transition hover:border-[#00C896] hover:bg-[#01875F]/40 hover:text-white"
                  >
                    <FaGooglePlay className="h-3 w-3" />
                    <span>Play Store</span>
                  </button>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Visit Live Website"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/45 bg-[#00D4FF]/12 px-3 py-1.5 font-sans text-[11px] font-semibold text-[#7EE8FF] transition hover:border-[#00D4FF] hover:bg-[#00D4FF]/25 hover:text-white"
                  >
                    <Globe className="h-3 w-3" />
                    <span>Live Web</span>
                  </a>
                )}
                {project.status?.toLowerCase().includes("private") && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FFC247]/35 bg-[#FFC247]/10 px-2.5 py-1 font-mono text-[10px] text-[#FFC247]">
                    <Lock className="h-2.5 w-2.5" />
                    Private
                  </span>
                )}
                {!appStoreUrl &&
                  !playStoreUrl &&
                  !websiteUrl &&
                  (project.technologies || []).slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-ink-secondary"
                    >
                      {tech}
                    </span>
                  ))}
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 font-heading text-xs font-semibold text-white transition-transform duration-300 group-hover:translate-x-0.5">
                Inspect
                <ArrowUpRight className="h-4 w-4 text-[#00D4FF]" />
              </span>
            </div>
          </div>
        </div>
      </Tilt3DCard>
    </motion.article>
  );
}

/**
 * Curated Home Showcase: shows up to 3 projects per selected category
 * with a prominent button linking to the dedicated /work archive page.
 */
export default function WorkSection({
  projects = [],
  onSelectProject,
  onOpenStorePreview,
  onNavigateWork,
  previewLimit = 3,
}) {
  const [activeCategory, setActiveCategory] = useState("all");

  const publicProjects = useMemo(
    () => projects.filter((p) => p.isPublic !== false),
    [projects]
  );

  const categoryMatches = useMemo(() => {
    if (activeCategory === "all") return publicProjects;
    return publicProjects.filter((p) => p.category === activeCategory);
  }, [publicProjects, activeCategory]);

  const displayed = useMemo(
    () => categoryMatches.slice(0, previewLimit),
    [categoryMatches, previewLimit]
  );

  const activeCategoryLabel =
    WORK_CATEGORIES.find((c) => c.id === activeCategory)?.label || "Works";

  return (
    <section id="work" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Editorial Heading + Filter Bar */}
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#00D4FF]">
              02 / Selected Highlights
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
              Crafted <span className="text-neon-gradient">Projects & Visuals</span>
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {WORK_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative rounded-full px-4 py-2 font-sans text-xs font-semibold tracking-wide transition-colors sm:text-sm ${
                    isActive
                      ? "text-white"
                      : "text-ink-muted hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="work-category-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full border border-white/20"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.55), rgba(0,153,255,0.55))",
                        boxShadow: "0 0 24px rgba(240, 18, 168, 0.35)",
                      }}
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-Item Curated Editorial Preview Grid (1 Featured Full-Span + 2 Columns) */}
        <motion.div
          layout
          className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2"
        >
          <AnimatePresence mode="popLayout">
            {displayed.map((project, index) => (
              <ProjectShowcaseCard
                key={project.id}
                project={project}
                index={index}
                isHeroSpan={index === 0}
                onSelectProject={onSelectProject}
                onOpenStorePreview={onOpenStorePreview}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {displayed.length === 0 && (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center text-ink-muted">
            No public projects in this category yet.
          </div>
        )}

        {/* Dedicated Full Archive Page CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-6 backdrop-blur-md sm:flex-row sm:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFC247]">
              Showing {displayed.length} of {categoryMatches.length} {activeCategoryLabel}
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              Explore the complete filterable showcase with all apps, websites, research & design works.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateWork?.(activeCategory)}
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-full px-7 py-3.5 font-heading text-sm font-semibold text-white shadow-neon-magenta transition-transform duration-300 hover:scale-[1.03]"
            style={{
              background:
                "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
            }}
          >
            <span>
              {activeCategory === "all"
                ? `Explore All Projects (${publicProjects.length})`
                : `View All ${activeCategoryLabel} (${categoryMatches.length})`}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
