import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera } from "lucide-react";
import {
  GALLERY_FILTERS,
  GalleryCard,
  GalleryLightbox,
} from "../components/GallerySection";

export default function GalleryArchivePage({
  gallery = [],
  initialFilter = "all",
  onBackHome,
}) {
  const [filter, setFilter] = useState(initialFilter || "all");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setFilter(initialFilter || "all");
  }, [initialFilter]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

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

  return (
    <div className="relative z-10 min-h-screen pt-28 pb-24 sm:pt-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:border-[#F012A8]/60 hover:bg-[#F012A8]/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>

          <span className="font-mono text-xs text-ink-muted">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end"
        >
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-[#FF3CC7]">
              <Camera className="h-3.5 w-3.5" />
              Complete Exhibition / My Gallery
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-6xl">
              Personal <span className="text-neon-gradient">Albums & Frames</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {GALLERY_FILTERS.map((f) => {
              const active = filter === f.id;
              const count =
                f.id === "all"
                  ? visibleItems.length
                  : visibleItems.filter((item) => item.type === f.id).length;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    active ? "text-white" : "text-ink-muted hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="archive-gallery-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full border border-white/20"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.55), rgba(0,153,255,0.55))",
                      }}
                    />
                  )}
                  <span>{f.label}</span>
                  <span className="font-mono text-[10px] opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          layout
          className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-12"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <GalleryCard
                key={item.id || idx}
                item={item}
                idx={idx}
                onOpen={openItem}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredItems.length === 0 && (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-14 text-center text-ink-muted">
            No public gallery frames in this view yet.
          </div>
        )}
      </div>

      <GalleryLightbox
        lightbox={lightbox}
        activeSlides={activeSlides}
        setLightbox={setLightbox}
      />
    </div>
  );
}
