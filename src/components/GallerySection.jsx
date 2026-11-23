import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Maximize2,
  Images,
  Layers,
  ArrowRight,
} from "lucide-react";
import Tilt3DCard from "./Tilt3DCard";
import { assetUrl } from "../utils/portfolioApi";

export const GALLERY_FILTERS = [
  { id: "all", label: "All" },
  { id: "album", label: "Albums" },
  { id: "photo", label: "Photos" },
];

export function GalleryLightbox({ lightbox, activeSlides, setLightbox }) {
  useEffect(() => {
    if (!lightbox || activeSlides.length === 0) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (activeSlides.length > 1 && e.key === "ArrowRight") {
        setLightbox((cur) =>
          cur ? { ...cur, slideIdx: (cur.slideIdx + 1) % activeSlides.length } : null
        );
      }
      if (activeSlides.length > 1 && e.key === "ArrowLeft") {
        setLightbox((cur) =>
          cur
            ? {
                ...cur,
                slideIdx: (cur.slideIdx - 1 + activeSlides.length) % activeSlides.length,
              }
            : null
        );
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, activeSlides.length, setLightbox]);

  const currentSlide =
    lightbox && activeSlides[lightbox.slideIdx] ? activeSlides[lightbox.slideIdx] : null;

  return (
    <AnimatePresence>
      {lightbox && currentSlide && (
        <motion.div
          key="gallery-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#04020A]/94 p-4 backdrop-blur-2xl sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-5 top-5 z-20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              {lightbox.mode === "album" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F012A8]/50 bg-[#F012A8]/20 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-white">
                  <Layers className="h-3.5 w-3.5" />
                  Album
                </span>
              )}
              <span className="font-mono text-xs text-ink-secondary">
                {lightbox.slideIdx + 1} / {activeSlides.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {activeSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((cur) =>
                    cur
                      ? {
                          ...cur,
                          slideIdx:
                            (cur.slideIdx - 1 + activeSlides.length) %
                            activeSlides.length,
                        }
                      : null
                  );
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-[#F012A8] hover:bg-[#F012A8]/40 sm:left-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((cur) =>
                    cur
                      ? { ...cur, slideIdx: (cur.slideIdx + 1) % activeSlides.length }
                      : null
                  );
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:border-[#00D4FF] hover:bg-[#00D4FF]/40 sm:right-8"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <motion.div
            key={`${lightbox.mode}-${lightbox.slideIdx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82vh] max-w-5xl flex-col items-center"
          >
            <img
              src={assetUrl(currentSlide.image)}
              alt={currentSlide.title || ""}
              className="max-h-[62vh] w-auto rounded-2xl border border-white/15 object-contain shadow-2xl"
            />
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#FFC247]">
                {currentSlide.tag && <span>{currentSlide.tag}</span>}
                {currentSlide.date && <span>• {currentSlide.date}</span>}
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
                {currentSlide.title}
              </h3>
              {currentSlide.caption && (
                <p className="mt-1 max-w-xl text-xs text-ink-secondary sm:text-sm">
                  {currentSlide.caption}
                </p>
              )}
            </div>

            {activeSlides.length > 1 && (
              <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {activeSlides.map((slide, sIdx) => (
                  <button
                    key={`${slide.image}-${sIdx}`}
                    type="button"
                    onClick={() =>
                      setLightbox((cur) => (cur ? { ...cur, slideIdx: sIdx } : null))
                    }
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl border transition ${
                      sIdx === lightbox.slideIdx
                        ? "border-[#00D4FF] ring-2 ring-[#00D4FF]/45"
                        : "border-white/15 opacity-55 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={assetUrl(slide.image)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GalleryCard({ item, idx, onOpen }) {
  const isAlbum = item.type === "album";
  const coverImage = isAlbum ? item.photos?.[0]?.image : item.image;
  const photoCount = isAlbum ? item.photos?.length || 0 : 1;

  const spanClass =
    item.aspect === "wide"
      ? "lg:col-span-7"
      : item.aspect === "tall"
      ? "lg:col-span-5"
      : "lg:col-span-6";

  const aspectClass =
    item.aspect === "wide"
      ? "aspect-[16/10]"
      : item.aspect === "tall"
      ? "aspect-[4/5] lg:aspect-[5/6]"
      : "aspect-[4/3]";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(idx * 0.05, 0.25) }}
      className={`relative ${spanClass}`}
    >
      {isAlbum && (
        <>
          <div className="pointer-events-none absolute -top-2 inset-x-5 h-5 rounded-t-3xl border border-white/10 bg-[#17112B]/80" />
          <div className="pointer-events-none absolute -top-3.5 inset-x-9 h-4 rounded-t-3xl border border-[#F012A8]/25 bg-[#120C24]/70" />
        </>
      )}

      <Tilt3DCard
        maxTilt={7}
        glowColor={
          isAlbum
            ? "rgba(240, 18, 168, 0.34)"
            : idx % 2 === 0
            ? "rgba(0, 212, 255, 0.28)"
            : "rgba(255, 138, 31, 0.28)"
        }
        onClick={() => onOpen(item)}
        className="neon-corridor-frame glass-panel h-full cursor-pointer p-2"
      >
        <div
          className={`relative w-full overflow-hidden rounded-[22px] bg-void-900 ${aspectClass}`}
        >
          {coverImage ? (
            <img
              src={assetUrl(coverImage)}
              alt={item.title || "Gallery frame"}
              loading="lazy"
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F012A8]/20 via-void-900 to-[#00D4FF]/20 text-ink-muted">
              <Images className="mb-2 h-8 w-8" />
              <span className="font-mono text-xs">Empty Album</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D]/92 via-[#06040D]/15 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-95" />

          <div className="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isAlbum && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F012A8]/55 bg-[#F012A8]/25 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Layers className="h-3 w-3" />
                  Album • {photoCount}
                </span>
              )}
              {item.tag && (
                <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFC247] backdrop-blur-md">
                  {item.tag}
                </span>
              )}
            </div>

            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="absolute inset-x-5 bottom-5 z-20">
            {isAlbum && item.photos?.length > 1 && (
              <div className="mb-3 flex items-center gap-1.5">
                {item.photos.slice(0, 4).map((ph, pIdx) => (
                  <div
                    key={ph.id || pIdx}
                    className="h-9 w-12 overflow-hidden rounded-lg border border-white/25 bg-black/40 shadow-md"
                  >
                    <img
                      src={assetUrl(ph.image)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {item.photos.length > 4 && (
                  <span className="flex h-9 items-center justify-center rounded-lg border border-white/20 bg-black/65 px-2 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                    +{item.photos.length - 4}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                  {item.title}
                </h3>
                {item.caption && (
                  <p className="mt-1 line-clamp-2 text-xs text-ink-secondary">
                    {item.caption}
                  </p>
                )}
              </div>
              {item.date && (
                <span className="shrink-0 font-mono text-[11px] text-[#00D4FF]">
                  {item.date}
                </span>
              )}
            </div>
          </div>
        </div>
      </Tilt3DCard>
    </motion.div>
  );
}

/**
 * Curated Home Gallery Preview: shows up to 4 frames/albums per filter
 * with a CTA button leading to the dedicated /gallery page.
 */
export default function GallerySection({
  gallery = [],
  onNavigateGallery,
  previewLimit = 4,
}) {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);

  const visibleItems = useMemo(
    () =>
      gallery
        .filter((item) => item.isPublic !== false)
        .map((item) => ({ ...item, type: item.type || "photo" })),
    [gallery]
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") return visibleItems;
    return visibleItems.filter((item) => item.type === filter);
  }, [visibleItems, filter]);

  const displayed = useMemo(
    () => filteredItems.slice(0, previewLimit),
    [filteredItems, previewLimit]
  );

  const singlePhotos = useMemo(
    () => visibleItems.filter((item) => item.type === "photo"),
    [visibleItems]
  );

  const activeSlides = useMemo(() => {
    if (!lightbox) return [];
    if (lightbox.mode === "album") {
      return (lightbox.album.photos || []).map((ph) => ({
        image: ph.image,
        title: lightbox.album.title,
        caption: ph.caption || lightbox.album.caption,
        tag: lightbox.album.tag,
        date: lightbox.album.date,
      }));
    }
    return lightbox.list.map((p) => ({
      image: p.image,
      title: p.title,
      caption: p.caption,
      tag: p.tag,
      date: p.date,
    }));
  }, [lightbox]);

  if (visibleItems.length === 0) return null;

  const openItem = (item) => {
    if (item.type === "album") {
      if (!item.photos?.length) return;
      setLightbox({ mode: "album", album: item, slideIdx: 0 });
    } else {
      const idx = Math.max(
        0,
        singlePhotos.findIndex((p) => p.id === item.id)
      );
      setLightbox({ mode: "photo", list: singlePhotos, slideIdx: idx });
    }
  };

  const activeLabel =
    GALLERY_FILTERS.find((f) => f.id === filter)?.label || "Gallery";

  return (
    <section id="gallery" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-[#FF3CC7]">
              <Camera className="h-3.5 w-3.5" />
              My Gallery
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
              Personal <span className="text-neon-gradient">Albums & Frames</span>
            </h2>
          </motion.div>

          <div className="flex flex-wrap gap-2">
            {GALLERY_FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`relative rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition sm:text-sm ${
                    active ? "text-white" : "text-ink-muted hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="gallery-filter-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full border border-white/20"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.55), rgba(0,153,255,0.55))",
                        boxShadow: "0 0 22px rgba(240,18,168,0.35)",
                      }}
                    />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-Item Curated Gallery Preview Grid */}
        <motion.div
          layout
          className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-12"
        >
          <AnimatePresence mode="popLayout">
            {displayed.map((item, idx) => (
              <GalleryCard
                key={item.id || idx}
                item={item}
                idx={idx}
                onOpen={openItem}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Dedicated Full Gallery Archive Page CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-6 backdrop-blur-md sm:flex-row sm:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF3CC7]">
              Showing {displayed.length} of {filteredItems.length} in {activeLabel}
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              Open the full My Gallery exhibition to browse every album and personal frame.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateGallery?.(filter)}
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-7 py-3.5 font-heading text-sm font-semibold text-white transition-all duration-300 hover:border-[#F012A8]/70 hover:bg-[#F012A8]/20 hover:shadow-neon-magenta"
          >
            <span>
              {filter === "all"
                ? `Explore Full Gallery (${visibleItems.length})`
                : `View All ${activeLabel} (${filteredItems.length})`}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <GalleryLightbox
        lightbox={lightbox}
        activeSlides={activeSlides}
        setLightbox={setLightbox}
      />
    </section>
  );
}
