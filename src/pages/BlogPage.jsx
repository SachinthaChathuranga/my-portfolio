import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Search,
  Copy,
  Check,
  Tag,
  ArrowUpRight,
  Share2,
  X,
} from "lucide-react";
import Tilt3DCard from "../components/Tilt3DCard";
import { assetUrl } from "../utils/portfolioApi";

export function BlogBlockRenderer({ blocks = [], onZoomImage }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyCode = (id, text) => {
    navigator.clipboard?.writeText(text || "");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      {blocks.map((block, idx) => {
        const key = block.id || `blk-${idx}`;
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={key}
                className="pt-4 font-display text-3xl font-extrabold leading-tight text-neon-gradient sm:text-5xl"
              >
                {block.content}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={key}
                className="border-l-4 border-[#F012A8] pl-4 pt-3 font-display text-2xl font-bold text-white sm:text-3xl"
              >
                {block.content}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={key}
                className="pt-2 font-heading text-xl font-bold text-[#7EE8FF] sm:text-2xl"
              >
                {block.content}
              </h3>
            );
          case "h4":
            return (
              <h4
                key={key}
                className="pt-1 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[#FFC247] sm:text-sm"
              >
                {block.content}
              </h4>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="rounded-2xl border border-[#F012A8]/35 bg-gradient-to-r from-[#F012A8]/12 via-[#120D24]/80 to-[#00D4FF]/10 px-6 py-5 italic text-white/95"
              >
                <p className="whitespace-pre-line text-base leading-relaxed sm:text-lg">
                  &ldquo;{block.content}&rdquo;
                </p>
                {block.caption && (
                  <footer className="mt-2 font-mono text-xs not-italic text-[#FFC247]">
                    — {block.caption}
                  </footer>
                )}
              </blockquote>
            );
          case "code":
            return (
              <div
                key={key}
                className="overflow-hidden rounded-2xl border border-white/12 bg-[#070510]"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    {block.caption || "Snippet"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(key, block.content)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-secondary hover:text-white"
                  >
                    {copiedId === key ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#00D4FF]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#7EE8FF] sm:text-sm">
                  {block.content}
                </pre>
              </div>
            );
          case "image":
            if (!block.image) return null;
            return (
              <figure key={key} className="my-8">
                <button
                  type="button"
                  onClick={() => onZoomImage?.(assetUrl(block.image))}
                  className="group block w-full overflow-hidden rounded-3xl border border-white/12 bg-void-900 shadow-2xl"
                >
                  <img
                    src={assetUrl(block.image)}
                    alt={block.caption || "Article visual"}
                    loading="lazy"
                    className="max-h-[70vh] w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  />
                </button>
                {block.caption && (
                  <figcaption className="mt-3 text-center font-mono text-xs text-ink-muted">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "divider":
            return (
              <hr
                key={key}
                className="my-8 h-[1px] border-0 bg-gradient-to-r from-transparent via-[#F012A8]/50 to-transparent"
              />
            );
          case "paragraph":
          default:
            return (
              <p
                key={key}
                className="whitespace-pre-line text-base leading-[1.85] text-ink-secondary sm:text-[1.06rem]"
              >
                {block.content}
              </p>
            );
        }
      })}
    </div>
  );
}

export default function BlogPage({
  blogs = [],
  activePostId = null,
  onSelectPost,
  onBackToBlogList,
  onBackHome,
}) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activePostId]);

  const publicPosts = useMemo(
    () => (blogs || []).filter((b) => b.isPublic !== false),
    [blogs]
  );

  const categories = useMemo(() => {
    const set = new Set(["all"]);
    publicPosts.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [publicPosts]);

  const activePost = useMemo(() => {
    if (!activePostId) return null;
    return publicPosts.find((b) => b.id === activePostId) || null;
  }, [publicPosts, activePostId]);

  const filteredPosts = useMemo(() => {
    return publicPosts.filter((b) => {
      const matchCat = category === "all" || b.category === category;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        b.title?.toLowerCase().includes(q) ||
        b.subtitle?.toLowerCase().includes(q) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [publicPosts, category, query]);

  const copyShareUrl = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  // ================= SINGLE ARTICLE / NOTE READER VIEW =================
  if (activePost) {
    return (
      <div className="relative z-10 min-h-screen pt-28 pb-24 sm:pt-36">
        <article className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackToBlogList}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Posts & Notes</span>
            </button>

            <button
              type="button"
              onClick={copyShareUrl}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs text-ink-secondary transition hover:border-[#F012A8]/60 hover:text-white"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#00D4FF]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          </div>

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              {activePost.category && (
                <span className="rounded-full border border-[#F012A8]/45 bg-[#F012A8]/15 px-3 py-1 font-semibold uppercase tracking-widest text-[#FF8DE0]">
                  {activePost.category}
                </span>
              )}
              {activePost.date && (
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Calendar className="h-3.5 w-3.5 text-[#00D4FF]" />
                  {activePost.date}
                </span>
              )}
              {activePost.readTime && (
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Clock className="h-3.5 w-3.5 text-[#FFC247]" />
                  {activePost.readTime}
                </span>
              )}
            </div>

            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              {activePost.title}
            </h1>

            {activePost.subtitle && (
              <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
                {activePost.subtitle}
              </p>
            )}

            {activePost.tags?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {activePost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-ink-secondary"
                  >
                    <Tag className="h-3 w-3 text-[#00D4FF]" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {activePost.coverImage && (
            <div className="neon-corridor-frame mb-12 overflow-hidden rounded-[28px] border border-white/10 bg-void-900">
              <img
                src={assetUrl(activePost.coverImage)}
                alt={activePost.title}
                className="max-h-[520px] w-full object-cover"
              />
            </div>
          )}

          <div className="glass-panel rounded-[32px] p-6 sm:p-11">
            <BlogBlockRenderer
              blocks={activePost.blocks || []}
              onZoomImage={(src) => setZoomSrc(src)}
            />
          </div>
        </article>

        <AnimatePresence>
          {zoomSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomSrc(null)}
              className="fixed inset-0 z-[98] flex items-center justify-center bg-black/92 p-6 backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => setZoomSrc(null)}
                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={zoomSrc}
                alt=""
                className="max-h-[88vh] max-w-full rounded-2xl border border-white/15 object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ================= BLOG & NOTES INDEX PAGE =================
  return (
    <div className="relative z-10 min-h-screen pt-28 pb-24 sm:pt-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>

          <span className="font-mono text-xs text-ink-muted">
            {filteredPosts.length}{" "}
            {filteredPosts.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-[#FFC247]">
            <BookOpen className="h-3.5 w-3.5" />
            Journal / Blog & Notes
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-6xl">
            Writing, <span className="text-neon-gradient">Notes & Ideas</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
            Engineering breakdowns, mobile development notes, UI/UX thoughts, and
            personal write-ups.
          </p>
        </motion.div>

        {/* Category Filters & Search */}
        <div className="mt-10 flex flex-col justify-between gap-4 border-y border-white/10 py-5 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`relative rounded-full px-4 py-2 text-xs font-semibold capitalize transition sm:text-sm ${
                    active ? "text-white" : "text-ink-muted hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="blog-cat-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full border border-white/20"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.55), rgba(0,153,255,0.55))",
                      }}
                    />
                  )}
                  {cat === "all" ? "All Notes" : cat}
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
              placeholder="Search notes or tags..."
              className="w-full rounded-full border border-white/12 bg-white/[0.04] py-2.5 pl-10 pr-4 text-xs text-white placeholder-ink-muted outline-none transition focus:border-[#00D4FF]/70"
            />
          </div>
        </div>

        {/* Posts Grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {filteredPosts.map((post, idx) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.25) }}
              className={idx === 0 && category === "all" && !query ? "md:col-span-2" : ""}
            >
              <Tilt3DCard
                maxTilt={6}
                onClick={() => onSelectPost(post.id)}
                className="neon-corridor-frame glass-panel h-full cursor-pointer transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className={`grid h-full grid-cols-1 ${
                    idx === 0 && category === "all" && !query
                      ? "lg:grid-cols-12"
                      : ""
                  }`}
                >
                  {post.coverImage && (
                    <div
                      className={`relative overflow-hidden bg-void-900 ${
                        idx === 0 && category === "all" && !query
                          ? "aspect-[16/10] lg:col-span-6 lg:aspect-auto lg:min-h-[320px]"
                          : "aspect-[16/9]"
                      }`}
                    >
                      <img
                        src={assetUrl(post.coverImage)}
                        alt={post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D]/80 via-transparent to-transparent" />
                    </div>
                  )}

                  <div
                    className={`flex flex-col justify-between p-6 sm:p-8 ${
                      idx === 0 && category === "all" && !query && post.coverImage
                        ? "lg:col-span-6"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="rounded-full border border-[#FF8A1F]/40 bg-[#FF8A1F]/15 px-3 py-0.5 text-[#FFC247]">
                          {post.category || "Note"}
                        </span>
                        <span className="text-ink-muted">
                          {post.date}
                          {post.readTime ? ` • ${post.readTime}` : ""}
                        </span>
                      </div>

                      <h2 className="mt-4 font-display text-2xl font-bold text-white transition group-hover:text-neon-gradient sm:text-3xl">
                        {post.title}
                      </h2>

                      {post.subtitle && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-secondary">
                          {post.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(post.tags || []).slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] text-ink-secondary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 font-heading text-xs font-semibold text-white">
                        Read
                        <ArrowUpRight className="h-4 w-4 text-[#00D4FF]" />
                      </span>
                    </div>
                  </div>
                </div>
              </Tilt3DCard>
            </motion.article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-14 text-center text-ink-muted">
            No published notes or posts yet.
          </div>
        )}
      </div>
    </div>
  );
}
