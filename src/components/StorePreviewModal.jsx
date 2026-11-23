import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Star,
  Globe,
  Cpu,
} from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { assetUrl } from "../utils/portfolioApi";
import { getProjectStoreLinks } from "../utils/storeLinks";

export default function StorePreviewModal({
  project,
  initialStore = "playstore",
  onClose,
}) {
  const { appStoreUrl, playStoreUrl } = getProjectStoreLinks(project);
  const [store, setStore] = useState(initialStore);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);

  useEffect(() => {
    if (!project) return;
    if (initialStore === "appstore" && appStoreUrl) {
      setStore("appstore");
    } else if (initialStore === "playstore" && playStoreUrl) {
      setStore("playstore");
    } else if (appStoreUrl) {
      setStore("appstore");
    } else if (playStoreUrl) {
      setStore("playstore");
    }
    setZoomImg(null);
  }, [project, initialStore, appStoreUrl, playStoreUrl]);

  useEffect(() => {
    if (!project) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (zoomImg) setZoomImg(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [project, zoomImg, onClose]);

  const isAppStore = store === "appstore";
  const activeUrl = isAppStore ? appStoreUrl : playStoreUrl;
  const screenshots = project?.images || [];
  const iconSrc = project?.logo
    ? assetUrl(project.logo)
    : project?.coverImage
    ? assetUrl(project.coverImage)
    : screenshots[0]
    ? assetUrl(screenshots[0])
    : "";

  const copyLink = () => {
    if (!activeUrl) return;
    navigator.clipboard?.writeText(activeUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  return (
    <AnimatePresence>
      {project && activeUrl && (
        <motion.div
          key="store-preview-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[98] flex items-center justify-center bg-[#030208]/88 p-3 backdrop-blur-2xl sm:p-6"
        >
          <motion.div
            key={`${project.id}-${store}`}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border shadow-2xl scrollbar-hide ${
              isAppStore
                ? "border-[#0A84FF]/35 bg-[#10131C]"
                : "border-[#00C896]/35 bg-[#0F1517]"
            }`}
          >
            {/* Authentic Store Header Bar */}
            <div
              className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 backdrop-blur-xl sm:px-7 ${
                isAppStore
                  ? "border-white/10 bg-[#10131C]/92"
                  : "border-white/10 bg-[#0F1517]/92"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isAppStore ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A84FF] text-white shadow-[0_0_20px_rgba(10,132,255,0.45)]">
                    <FaApple className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#01875F] text-white shadow-[0_0_20px_rgba(0,200,150,0.4)]">
                    <FaGooglePlay className="h-3.5 w-3.5" />
                  </span>
                )}
                <div>
                  <p className="font-heading text-sm font-bold text-white">
                    {isAppStore ? "App Store Preview" : "Google Play Preview"}
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {isAppStore ? "apps.apple.com" : "play.google.com"}
                  </p>
                </div>
              </div>

              {/* Store Switcher (when available on both platforms) */}
              <div className="flex items-center gap-2">
                {appStoreUrl && playStoreUrl && (
                  <div className="flex rounded-full border border-white/10 bg-black/35 p-1">
                    <button
                      type="button"
                      onClick={() => setStore("appstore")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isAppStore
                          ? "bg-[#0A84FF] text-white"
                          : "text-ink-muted hover:text-white"
                      }`}
                    >
                      <FaApple className="h-3.5 w-3.5" />
                      App Store
                    </button>
                    <button
                      type="button"
                      onClick={() => setStore("playstore")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        !isAppStore
                          ? "bg-[#01875F] text-white"
                          : "text-ink-muted hover:text-white"
                      }`}
                    >
                      <FaGooglePlay className="h-3 w-3" />
                      Google Play
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close store preview"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Store Body */}
            <div className="p-6 sm:p-8">
              {/* App Hero Identity Row */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* App Icon */}
                <div
                  className={`relative h-24 w-24 shrink-0 overflow-hidden border shadow-xl ${
                    isAppStore
                      ? "rounded-[24px] border-white/15 bg-gradient-to-br from-[#0A84FF]/30 to-[#F012A8]/25"
                      : "rounded-[22px] border-white/15 bg-gradient-to-br from-[#01875F]/35 to-[#00D4FF]/20"
                  }`}
                >
                  {iconSrc ? (
                    <img
                      src={iconSrc}
                      alt={project.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                      <Smartphone className="h-8 w-8 text-white/90" />
                      <span className="mt-1 font-display text-[10px] font-bold tracking-widest text-white">
                        {(project.title || "APP").slice(0, 6).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* App Title, Developer, CTA */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        isAppStore
                          ? "bg-[#0A84FF]/20 text-[#66B2FF]"
                          : "bg-[#00C896]/20 text-[#5CEAC3]"
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {isAppStore ? "Available on App Store" : "Available on Google Play"}
                    </span>
                    {project.date && (
                      <span className="font-mono text-[11px] text-ink-muted">
                        {project.date}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                    {project.title}
                  </h2>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      isAppStore ? "text-[#4DA3FF]" : "text-[#34D399]"
                    }`}
                  >
                    {project.subtitle || "S.M. Sachintha Chathuranga • INTTEQ"}
                  </p>

                  {/* Primary Go to Store CTA */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:scale-[1.03] ${
                        isAppStore
                          ? "bg-[#0A84FF] shadow-[0_0_28px_rgba(10,132,255,0.45)] hover:bg-[#2491FF]"
                          : "bg-[#01875F] shadow-[0_0_28px_rgba(1,135,95,0.5)] hover:bg-[#029E6F]"
                      }`}
                    >
                      {isAppStore ? (
                        <FaApple className="h-4 w-4" />
                      ) : (
                        <FaGooglePlay className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isAppStore ? "Go to App Store" : "Go to Google Play"}
                      </span>
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs text-ink-secondary transition hover:border-white/35 hover:text-white"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copied Link
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Store Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Authentic Store Info Strip */}
              <div className="mt-7 grid grid-cols-2 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/25 py-3.5 text-center sm:grid-cols-4">
                <div className="px-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Platform
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-white">
                    <Smartphone className="h-3.5 w-3.5 text-[#00D4FF]" />
                    {isAppStore ? "iOS / iPadOS" : "Android"}
                  </p>
                </div>
                <div className="px-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Built With
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 truncate text-xs font-bold text-white">
                    <Cpu className="h-3.5 w-3.5 text-[#FF3CC7]" />
                    {project.projectType || "Mobile App"}
                  </p>
                </div>
                <div className="px-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Release
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-white">
                    <Star className="h-3.5 w-3.5 text-[#FFC247]" />
                    {project.status || "Published"}
                  </p>
                </div>
                <div className="px-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Role
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-1 truncate text-xs font-bold text-white">
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                    {project.role || "Developer"}
                  </p>
                </div>
              </div>

              {/* Device-Framed Store Screenshot Showcase */}
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-heading text-sm font-bold uppercase tracking-[0.16em] text-white">
                    {isAppStore ? "iPhone & App Previews" : "App Screenshots"}
                  </h3>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {screenshots.length > 0
                      ? `${screenshots.length} preview frames`
                      : "Official listing live on store"}
                  </span>
                </div>

                {screenshots.length > 0 ? (
                  <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-hide">
                    {screenshots.map((img, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        type="button"
                        onClick={() => setZoomImg(assetUrl(img))}
                        className={`group relative h-64 shrink-0 overflow-hidden border bg-black transition hover:scale-[1.02] ${
                          isAppStore
                            ? "rounded-[24px] border-white/15"
                            : "rounded-2xl border-white/15"
                        }`}
                      >
                        <img
                          src={assetUrl(img)}
                          alt={`${project.title} preview ${idx + 1}`}
                          className="h-full w-auto max-w-[260px] object-cover"
                        />
                        <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/25 px-6 py-8 text-center">
                    <Sparkles
                      className={`mb-2.5 h-6 w-6 ${
                        isAppStore ? "text-[#4DA3FF]" : "text-[#34D399]"
                      }`}
                    />
                    <p className="text-sm font-semibold text-white">
                      Live Listing on {isAppStore ? "Apple App Store" : "Google Play"}
                    </p>
                    <p className="mt-1 max-w-md text-xs text-ink-secondary">
                      Tap &ldquo;{isAppStore ? "Go to App Store" : "Go to Google Play"}&rdquo; to
                      open the official store page with live screenshots, ratings, and direct
                      download.
                    </p>
                  </div>
                )}
              </div>

              {/* About this app / Description */}
              <div className="mt-7 space-y-5 border-t border-white/10 pt-6">
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    {isAppStore ? "Description" : "About this app"}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {project.description}
                  </p>
                  {project.more && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {project.more}
                    </p>
                  )}
                </div>

                {project.features?.length > 0 && (
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
                      Key Highlights
                    </h4>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {project.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-xs text-ink-secondary sm:text-sm"
                        >
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              isAppStore ? "text-[#4DA3FF]" : "text-[#34D399]"
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {project.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-ink-secondary"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Store URL & Open Button */}
              <div className="mt-7 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                    Official Store URL
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-ink-secondary">
                    {activeUrl}
                  </p>
                </div>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white transition hover:scale-[1.03] ${
                    isAppStore
                      ? "bg-[#0A84FF] hover:bg-[#2491FF]"
                      : "bg-[#01875F] hover:bg-[#029E6F]"
                  }`}
                >
                  <span>
                    {isAppStore ? "Open in App Store" : "Open in Google Play"}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Zoomed Screenshot Overlay */}
          <AnimatePresence>
            {zoomImg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomImg(null);
                }}
                className="fixed inset-0 z-[99] flex items-center justify-center bg-black/90 p-6"
              >
                <img
                  src={zoomImg}
                  alt=""
                  className="max-h-[88vh] max-w-full rounded-2xl border border-white/20 object-contain shadow-2xl"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
