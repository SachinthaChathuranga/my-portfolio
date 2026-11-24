import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Upload,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Search,
  Image as ImageIcon,
  Type,
  Quote,
  Code2,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  BookOpen,
} from "lucide-react";
import { assetUrl, uploadLocalImage } from "../utils/portfolioApi";
import { BlogBlockRenderer } from "../pages/BlogPage";

const BLOCK_TYPES = [
  { type: "h1", label: "H1", icon: Heading1 },
  { type: "h2", label: "H2", icon: Heading2 },
  { type: "h3", label: "H3", icon: Heading3 },
  { type: "h4", label: "H4", icon: Heading4 },
  { type: "paragraph", label: "Body", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code", icon: Code2 },
  { type: "divider", label: "Divider", icon: Minus },
];

function createEmptyPost() {
  const id = `note-${Date.now().toString(36)}`;
  return {
    id,
    title: "Untitled Note",
    subtitle: "",
    category: "Notes",
    tags: [],
    date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    readTime: "2 min read",
    isPublic: true,
    coverImage: "",
    blocks: [
      {
        id: `blk-${Date.now().toString(36)}`,
        type: "paragraph",
        content: "",
      },
    ],
  };
}

function createBlock(type = "paragraph") {
  return {
    id: `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    type,
    content: "",
    image: "",
    caption: "",
  };
}

export default function BlogStudioTab({
  blogs = [],
  onChangeBlogs,
  showToast,
  inputClass,
  labelClass,
}) {
  const [selectedId, setSelectedId] = useState(blogs[0]?.id || null);
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragPostId, setDragPostId] = useState(null);
  const [dragBlockId, setDragBlockId] = useState(null);

  const selectedPost = useMemo(
    () => blogs.find((b) => b.id === selectedId) || blogs[0] || null,
    [blogs, selectedId]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return blogs;
    return blogs.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [blogs, search]);

  const patchPost = (id, patch) => {
    onChangeBlogs(blogs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleAddPost = () => {
    const fresh = createEmptyPost();
    onChangeBlogs([fresh, ...blogs]);
    setSelectedId(fresh.id);
    setPreviewMode(false);
    showToast("info", "Created new blog note — add headings, paragraphs & images!");
  };

  const handleDeletePost = (post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    const remaining = blogs.filter((b) => b.id !== post.id);
    onChangeBlogs(remaining);
    setSelectedId(remaining[0]?.id || null);
    showToast("info", `Deleted "${post.title}" (click Save to Cloud)`);
  };

  const movePostById = (id, delta, e) => {
    e?.stopPropagation?.();
    const list = [...blogs];
    const idx = list.findIndex((b) => b.id === id);
    const target = idx + delta;
    if (idx === -1 || target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    onChangeBlogs(list);
  };

  const reorderPostDrop = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const list = [...blogs];
    const from = list.findIndex((b) => b.id === sourceId);
    const to = list.findIndex((b) => b.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    onChangeBlogs(list);
  };

  // Block operations
  const addBlockAt = (type, insertAfterIndex = null) => {
    if (!selectedPost) return;
    const block = createBlock(type);
    const list = [...(selectedPost.blocks || [])];
    if (insertAfterIndex === null || insertAfterIndex < 0) {
      list.push(block);
    } else {
      list.splice(insertAfterIndex + 1, 0, block);
    }
    patchPost(selectedPost.id, { blocks: list });
  };

  const patchBlock = (blockId, patch) => {
    if (!selectedPost) return;
    patchPost(selectedPost.id, {
      blocks: (selectedPost.blocks || []).map((blk) =>
        blk.id === blockId ? { ...blk, ...patch } : blk
      ),
    });
  };

  const deleteBlock = (blockId) => {
    if (!selectedPost) return;
    patchPost(selectedPost.id, {
      blocks: (selectedPost.blocks || []).filter((blk) => blk.id !== blockId),
    });
  };

  const moveBlock = (index, delta) => {
    if (!selectedPost) return;
    const list = [...(selectedPost.blocks || [])];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    patchPost(selectedPost.id, { blocks: list });
  };

  const reorderBlockDrop = (sourceId, targetId) => {
    if (!selectedPost || !sourceId || !targetId || sourceId === targetId) return;
    const list = [...(selectedPost.blocks || [])];
    const from = list.findIndex((b) => b.id === sourceId);
    const to = list.findIndex((b) => b.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    patchPost(selectedPost.id, { blocks: list });
  };

  const handleUploadCover = async (file) => {
    if (!selectedPost || !file) return;
    setUploading(true);
    try {
      const res = await uploadLocalImage(file, `blogs/${selectedPost.id}`);
      patchPost(selectedPost.id, { coverImage: res.path });
      showToast("success", "Uploaded blog cover image to Cloudinary!");
    } catch (err) {
      showToast("error", err?.message || "Cover upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBlockImage = async (blockId, file) => {
    if (!selectedPost || !file) return;
    setUploading(true);
    try {
      const res = await uploadLocalImage(file, `blogs/${selectedPost.id}`);
      patchBlock(blockId, { image: res.path });
      showToast("success", "Uploaded block image to Cloudinary!");
    } catch (err) {
      showToast("error", err?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Posts List Column */}
      <div className="space-y-3.5 xl:col-span-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className={`${inputClass} pl-10`}
            />
          </div>
          <button
            type="button"
            onClick={handleAddPost}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#F012A8] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff2bb5]"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {filteredPosts.map((post) => {
            const active = selectedPost?.id === post.id;
            const isPub = post.isPublic !== false;
            const masterIdx = blogs.findIndex((b) => b.id === post.id);

            return (
              <div
                key={post.id}
                draggable
                onDragStart={() => setDragPostId(post.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  reorderPostDrop(dragPostId, post.id);
                  setDragPostId(null);
                }}
                onDragEnd={() => setDragPostId(null)}
                onClick={() => setSelectedId(post.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 transition ${
                  active
                    ? "border-[#00D4FF]/60 bg-[#171230]"
                    : "border-white/8 bg-[#100B20] hover:border-white/20"
                } ${!isPub ? "opacity-65" : ""}`}
              >
                <div className="flex flex-col items-center gap-0.5 text-ink-muted">
                  <button
                    type="button"
                    onClick={(e) => movePostById(post.id, -1, e)}
                    disabled={masterIdx <= 0}
                    className="rounded p-0.5 hover:bg-white/10 hover:text-white disabled:opacity-25"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-3.5 w-3.5 cursor-grab opacity-55" />
                  <button
                    type="button"
                    onClick={(e) => movePostById(post.id, 1, e)}
                    disabled={masterIdx >= blogs.length - 1}
                    className="rounded p-0.5 hover:bg-white/10 hover:text-white disabled:opacity-25"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {post.title || "Untitled Note"}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-ink-muted">
                    {post.category || "Note"} • {(post.blocks || []).length} blocks •{" "}
                    {isPub ? "Public" : "Draft"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    patchPost(post.id, { isPublic: !isPub });
                  }}
                  title={isPub ? "Public" : "Draft / Hidden"}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                    isPub
                      ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                      : "border-white/15 bg-white/5 text-ink-muted"
                  }`}
                >
                  {isPub ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-ink-muted">
              No notes yet. Click &ldquo;New Note&rdquo; to start writing!
            </div>
          )}
        </div>
      </div>

      {/* Block Editor / Live Preview Column */}
      <div className="xl:col-span-8">
        {selectedPost ? (
          <div className="space-y-6 rounded-2xl border border-white/10 bg-[#100B20] p-6">
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="font-mono text-[11px] text-[#FFC247]">
                  Blog & Notes Block Editor
                </span>
                <h2 className="font-display text-xl font-bold text-white">
                  {selectedPost.title || "Untitled Note"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition ${
                    previewMode
                      ? "border-[#00D4FF] bg-[#00D4FF]/20 text-[#7EE8FF]"
                      : "border-white/15 bg-white/5 text-ink-secondary hover:text-white"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {previewMode ? "Back to Editor" : "Live Preview"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePost(selectedPost)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="rounded-2xl border border-white/10 bg-[#06040D] p-6 sm:p-8">
                {selectedPost.coverImage && (
                  <img
                    src={assetUrl(selectedPost.coverImage)}
                    alt=""
                    className="mb-6 max-h-72 w-full rounded-2xl object-cover"
                  />
                )}
                <h1 className="font-display text-3xl font-extrabold text-white">
                  {selectedPost.title}
                </h1>
                {selectedPost.subtitle && (
                  <p className="mt-2 text-base text-ink-secondary">
                    {selectedPost.subtitle}
                  </p>
                )}
                <div className="mt-8 border-t border-white/10 pt-8">
                  <BlogBlockRenderer blocks={selectedPost.blocks || []} />
                </div>
              </div>
            ) : (
              <>
                {/* Post Metadata */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Post / Note Title</label>
                    <input
                      type="text"
                      value={selectedPost.title || ""}
                      onChange={(e) =>
                        patchPost(selectedPost.id, { title: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Subtitle / Short Summary</label>
                    <input
                      type="text"
                      value={selectedPost.subtitle || ""}
                      onChange={(e) =>
                        patchPost(selectedPost.id, { subtitle: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Category</label>
                    <input
                      type="text"
                      value={selectedPost.category || ""}
                      onChange={(e) =>
                        patchPost(selectedPost.id, { category: e.target.value })
                      }
                      placeholder="Notes / Engineering / Tutorial"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tags (comma separated)</label>
                    <input
                      type="text"
                      value={(selectedPost.tags || []).join(", ")}
                      onChange={(e) =>
                        patchPost(selectedPost.id, {
                          tags: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Date & Read Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={selectedPost.date || ""}
                        onChange={(e) =>
                          patchPost(selectedPost.id, { date: e.target.value })
                        }
                        placeholder="Nov 2026"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={selectedPost.readTime || ""}
                        onChange={(e) =>
                          patchPost(selectedPost.id, { readTime: e.target.value })
                        }
                        placeholder="3 min read"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#0D091A] px-4 py-2.5 text-sm text-white">
                      <span>Public on Blog Page</span>
                      <input
                        type="checkbox"
                        checked={selectedPost.isPublic !== false}
                        onChange={(e) =>
                          patchPost(selectedPost.id, { isPublic: e.target.checked })
                        }
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </label>
                  </div>
                </div>

                {/* Optional Cover Image */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B0718] p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-void-950">
                      {selectedPost.coverImage ? (
                        <img
                          src={assetUrl(selectedPost.coverImage)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-muted">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-[#7EE8FF]">
                        Cover Image (Optional)
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Uploads directly to Cloudinary
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-xl border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3 py-1.5 font-mono text-xs font-semibold text-[#7EE8FF] hover:bg-[#00D4FF]/25">
                      {uploading ? "Uploading..." : selectedPost.coverImage ? "Replace" : "Upload Cover"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={(e) => {
                          handleUploadCover(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                    {selectedPost.coverImage && (
                      <button
                        type="button"
                        onClick={() => patchPost(selectedPost.id, { coverImage: "" })}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mixed Content Blocks List */}
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF8DE0]">
                      Content Blocks ({(selectedPost.blocks || []).length}) — Drag or ↑↓ to reorder
                    </span>
                  </div>

                  {(selectedPost.blocks || []).map((block, bIdx) => (
                    <div
                      key={block.id || bIdx}
                      draggable
                      onDragStart={() => setDragBlockId(block.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        reorderBlockDrop(dragBlockId, block.id);
                        setDragBlockId(null);
                      }}
                      onDragEnd={() => setDragBlockId(null)}
                      className="rounded-2xl border border-white/10 bg-[#0A0716] p-4"
                    >
                      {/* Block Control Strip */}
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 cursor-grab text-ink-muted" />
                          <span className="font-mono text-[10px] text-ink-muted">
                            #{bIdx + 1}
                          </span>
                          <select
                            value={block.type}
                            onChange={(e) =>
                              patchBlock(block.id, { type: e.target.value })
                            }
                            className="rounded-lg border border-white/15 bg-[#140E29] px-2.5 py-1 font-mono text-[11px] font-semibold text-white outline-none focus:border-[#00D4FF]"
                          >
                            <option value="h1">H1 — Main Title</option>
                            <option value="h2">H2 — Section Heading</option>
                            <option value="h3">H3 — Subheading</option>
                            <option value="h4">H4 — Eyebrow / Small Heading</option>
                            <option value="paragraph">Body Paragraph</option>
                            <option value="image">Image Block</option>
                            <option value="quote">Quote / Note Callout</option>
                            <option value="code">Code Snippet</option>
                            <option value="divider">Divider Line</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => addBlockAt("paragraph", bIdx)}
                            title="Insert Body Paragraph below"
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-ink-secondary hover:text-white"
                          >
                            +Text
                          </button>
                          <button
                            type="button"
                            onClick={() => addBlockAt("image", bIdx)}
                            title="Insert Image below"
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-[#7EE8FF] hover:bg-[#00D4FF]/15"
                          >
                            +Img
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(bIdx, -1)}
                            disabled={bIdx === 0}
                            className="rounded p-1 text-ink-muted hover:bg-white/10 hover:text-white disabled:opacity-25"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(bIdx, 1)}
                            disabled={bIdx === (selectedPost.blocks?.length || 1) - 1}
                            className="rounded p-1 text-ink-muted hover:bg-white/10 hover:text-white disabled:opacity-25"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBlock(block.id)}
                            className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Block Content Input */}
                      {block.type === "divider" ? (
                        <hr className="my-2 h-[1px] border-0 bg-gradient-to-r from-transparent via-[#F012A8]/60 to-transparent" />
                      ) : block.type === "image" ? (
                        <div className="space-y-3">
                          {block.image ? (
                            <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                              <img
                                src={assetUrl(block.image)}
                                alt=""
                                className="max-h-64 w-full object-contain"
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3.5 py-2 font-mono text-xs font-semibold text-[#7EE8FF] hover:bg-[#00D4FF]/25">
                              <Upload className="h-3.5 w-3.5" />
                              <span>
                                {uploading
                                  ? "Uploading..."
                                  : block.image
                                  ? "Replace Image"
                                  : "Upload Image to Cloudinary"}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                  handleUploadBlockImage(block.id, e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                            <input
                              type="text"
                              placeholder="Optional caption..."
                              value={block.caption || ""}
                              onChange={(e) =>
                                patchBlock(block.id, { caption: e.target.value })
                              }
                              className={`${inputClass} flex-1`}
                            />
                          </div>
                        </div>
                      ) : ["h1", "h2", "h3", "h4"].includes(block.type) ? (
                        <input
                          type="text"
                          placeholder={`Enter ${block.type.toUpperCase()} heading...`}
                          value={block.content || ""}
                          onChange={(e) =>
                            patchBlock(block.id, { content: e.target.value })
                          }
                          className={`${inputClass} ${
                            block.type === "h1"
                              ? "font-display text-xl font-bold"
                              : block.type === "h2"
                              ? "font-display text-lg font-bold"
                              : block.type === "h3"
                              ? "font-heading text-base font-semibold"
                              : "font-mono text-xs uppercase tracking-widest"
                          }`}
                        />
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={block.type === "code" ? 5 : 4}
                            placeholder={
                              block.type === "quote"
                                ? "Write a quote or highlighted note..."
                                : block.type === "code"
                                ? "Paste code snippet..."
                                : "Write your paragraph..."
                            }
                            value={block.content || ""}
                            onChange={(e) =>
                              patchBlock(block.id, { content: e.target.value })
                            }
                            className={`${inputClass} ${
                              block.type === "code" ? "font-mono text-xs text-[#7EE8FF]" : ""
                            }`}
                          />
                          {(block.type === "quote" || block.type === "code") && (
                            <input
                              type="text"
                              placeholder={
                                block.type === "code"
                                  ? "Language / filename (e.g. App.jsx)"
                                  : "Attribution (optional)"
                              }
                              value={block.caption || ""}
                              onChange={(e) =>
                                patchBlock(block.id, { caption: e.target.value })
                              }
                              className={inputClass}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Quick-Add Block Bar */}
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
                    <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Add Content Block
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addBlockAt(type)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-[#120D24] px-3 py-2 font-mono text-xs font-medium text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
                        >
                          <Icon className="h-3.5 w-3.5 text-[#00D4FF]" />
                          <span>+ {label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#100B20] p-12 text-center text-ink-muted">
            Select a post or click &ldquo;New Note&rdquo; to begin writing.
          </div>
        )}
      </div>
    </div>
  );
}
