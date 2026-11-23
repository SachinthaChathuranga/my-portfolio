import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
  Users,
  UserCheck,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { FaGithub, FaApple, FaGooglePlay } from "react-icons/fa";
import { assetUrl, IS_LOCAL_STUDIO } from "../utils/portfolioApi";
import { getProjectStoreLinks } from "../utils/storeLinks";

export default function ProjectModal({
  project,
  onClose,
  onEditInStudio,
  onOpenStorePreview,
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const screenshots = project?.images || [];
  const coverImage = project?.coverImage || "";
  const logoSrc = project?.logo ? assetUrl(project.logo) : "";
  // Combine coverImage (if not already in screenshots) + screenshots for the media stage
  const images =
    coverImage && !screenshots.includes(coverImage)
      ? [coverImage, ...screenshots]
      : screenshots;
  const { appStoreUrl, playStoreUrl, websiteUrl } = getProjectStoreLinks(project);

  useEffect(() => {
    setImgIdx(0);
  }, [project?.id]);

  useEffect(() => {
    if (!project) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (images.length > 1 && e.key === "ArrowRight") {
        setImgIdx((i) => (i + 1) % images.length);
      }
      if (images.length > 1 && e.key === "ArrowLeft") {
        setImgIdx((i) => (i - 1 + images.length) % images.length);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [project, images.length, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#04020A]/85 p-3 backdrop-blur-xl sm:p-6"
        >
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="neon-corridor-frame glass-panel relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] scrollbar-hide"
          >
            {/* Top Sticky Controls */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0B0716]/85 px-6 py-4 backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/15 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#7EE8FF]">
                  {project.projectType || project.category}
                </span>
                {project.status && (
                  <span className="font-mono text-xs text-ink-muted">
                    {project.status} • {project.date}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {IS_LOCAL_STUDIO && onEditInStudio && (
                  <button
                    type="button"
                    onClick={() => onEditInStudio(project.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#FF8A1F]/45 bg-[#FF8A1F]/15 px-3.5 py-1.5 font-mono text-xs text-[#FFC247] transition-colors hover:bg-[#FF8A1F]/25"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Edit in Studio
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Interactive Media Stage */}
            {images.length > 0 && (
              <div className="relative bg-black/50 p-4 sm:p-6">
                <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-void-950">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={images[imgIdx]}
                      src={assetUrl(images[imgIdx])}
                      alt={`${project.title} — slide ${imgIdx + 1}`}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="max-h-full max-w-full object-contain"
                    />
                  </AnimatePresence>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setImgIdx((i) => (i - 1 + images.length) % images.length)
                        }
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:border-[#F012A8] hover:bg-[#F012A8]/40"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:border-[#00D4FF] hover:bg-[#00D4FF]/40"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/65 px-3 py-1 font-mono text-xs text-white backdrop-blur-md">
                        {imgIdx + 1} / {images.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                    {images.map((src, idx) => (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => setImgIdx(idx)}
                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition-all ${
                          idx === imgIdx
                            ? "border-[#00D4FF] ring-2 ring-[#00D4FF]/40"
                            : "border-white/10 opacity-55 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={assetUrl(src)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Case Study Narrative */}
            <div className="p-6 sm:p-9">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-4">
                  {logoSrc && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-void-950 p-1 shadow-xl">
                      <img
                        src={logoSrc}
                        alt={`${project.title} logo`}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white sm:text-4xl">
                      {project.title}
                    </h2>
                    {project.subtitle && (
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-[#FFC247]">
                        {project.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {appStoreUrl && (
                    <button
                      type="button"
                      onClick={() => onOpenStorePreview?.(project, "appstore")}
                      className="inline-flex items-center gap-2 rounded-full border border-[#0A84FF]/60 bg-[#0A84FF]/20 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0A84FF]/35"
                    >
                      <FaApple className="h-4 w-4" />
                      <span>Available on App Store</span>
                    </button>
                  )}
                  {playStoreUrl && (
                    <button
                      type="button"
                      onClick={() => onOpenStorePreview?.(project, "playstore")}
                      className="inline-flex items-center gap-2 rounded-full border border-[#00C896]/55 bg-[#01875F]/25 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#01875F]/45"
                    >
                      <FaGooglePlay className="h-3.5 w-3.5" />
                      <span>Available on Google Play</span>
                    </button>
                  )}
                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-neon-magenta transition hover:scale-105"
                      style={{
                        background:
                          "linear-gradient(110deg, #F012A8 0%, #0099FF 100%)",
                      }}
                    >
                      <span>Live Website</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                    >
                      <FaGithub className="h-3.5 w-3.5" />
                      <span>Source Code</span>
                    </a>
                  )}
                </div>
              </div>

              <p className="mt-6 text-base leading-relaxed text-ink-secondary">
                {project.description}
              </p>
              {project.more && (
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {project.more}
                </p>
              )}

              {/* Metadata Row */}
              <div className="mt-8 grid grid-cols-1 gap-4 border-y border-white/10 py-5 sm:grid-cols-3">
                {project.role && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="mt-0.5 h-4 w-4 text-[#FF3CC7]" />
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                        Role
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-white">
                        {project.role}
                      </p>
                    </div>
                  </div>
                )}
                {project.duration && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-[#00D4FF]" />
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                        Timeline
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-white">
                        {project.duration}
                      </p>
                    </div>
                  </div>
                )}
                {project.teamMembers?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-[#FFC247]" />
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                        Collaborators
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-white">
                        {project.teamMembers.join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Highlights & Tech */}
              <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                {project.features?.length > 0 && (
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-[0.22em] text-[#00D4FF]">
                      Key Highlights
                    </h4>
                    <ul className="mt-3 space-y-2.5">
                      {project.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2.5 text-sm text-ink-secondary"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF3CC7]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-6">
                  {project.technologies?.length > 0 && (
                    <div>
                      <h4 className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF3CC7]">
                        Stack & Tools
                      </h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 font-mono text-xs text-white"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.challenges && project.challenges !== "null" && (
                    <div>
                      <h4 className="font-mono text-xs uppercase tracking-[0.22em] text-[#FFC247]">
                        Challenge Solved
                      </h4>
                      <p className="mt-2 text-sm text-ink-secondary">
                        {project.challenges}
                      </p>
                    </div>
                  )}

                  {project.learnings && project.learnings !== "null" && (
                    <div>
                      <h4 className="font-mono text-xs uppercase tracking-[0.22em] text-[#00D4FF]">
                        Takeaways
                      </h4>
                      <p className="mt-2 text-sm text-ink-secondary">
                        {project.learnings}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
