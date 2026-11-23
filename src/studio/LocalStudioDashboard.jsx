import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Camera,
  User,
  GraduationCap,
  Rocket,
  Plus,
  Save,
  Trash2,
  Upload,
  ArrowLeft,
  Star,
  Image as ImageIcon,
  Search,
  Check,
  Copy,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Sparkles,
  AlertCircle,
  Briefcase,
  Layers,
  FolderPlus,
  GitBranch,
  GitCommitHorizontal,
  RefreshCw,
  ExternalLink,
  Terminal,
  Award,
  Loader2,
} from "lucide-react";
import {
  assetUrl,
  checkLocalCmsHealth,
  checkoutGitBranch,
  createGitBranch,
  deleteLocalImage,
  fetchGitStatus,
  fetchPortfolioData,
  publishGitBranch,
  pushGitBranch,
  savePortfolioData,
  uploadLocalImage,
} from "../utils/portfolioApi";

const TABS = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "gallery", label: "My Gallery", icon: Camera },
  { id: "profile", label: "Profile & Portraits", icon: User },
  { id: "skills", label: "Experience & Skills", icon: GraduationCap },
  { id: "publish", label: "GitHub Publish", icon: Rocket },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "mobile", label: "Mobile" },
  { id: "web", label: "Web" },
  { id: "research", label: "Research & AI" },
  { id: "uiux", label: "UI / UX" },
  { id: "graphic", label: "Graphic" },
];

const VISIBILITY_FILTERS = [
  { id: "all", label: "All" },
  { id: "public", label: "Public" },
  { id: "hidden", label: "Hidden" },
];

function createEmptyProject() {
  const id = `p-${Date.now().toString(36)}`;
  return {
    id,
    title: "New Project",
    subtitle: "",
    category: "mobile",
    projectType: "React Native (Expo)",
    featured: false,
    isPublic: true,
    description: "",
    more: "",
    role: "Associate Software Engineer",
    duration: "1 Month",
    date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    status: "Completed",
    teamMembers: ["Sachintha"],
    technologies: ["React Native", "Expo"],
    features: [],
    challenges: "",
    learnings: "",
    liveUrl: "",
    appStoreUrl: "",
    playStoreUrl: "",
    repoUrl: "",
    logo: "",
    coverImage: "",
    images: [],
  };
}

export default function LocalStudioDashboard({
  data,
  initialProjectId = null,
  onDataSaved,
  onExitStudio,
}) {
  const [draft, setDraft] = useState(() => structuredClone(data));
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId || data?.projects?.[0]?.id || null
  );
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [visFilter, setVisFilter] = useState("all");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [dragProjectId, setDragProjectId] = useState(null);
  const [dragGalleryId, setDragGalleryId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const [cmsHealth, setCmsHealth] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Live Git & GitHub Publish state
  const [gitStatus, setGitStatus] = useState(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitBusyAction, setGitBusyAction] = useState(""); // "create" | "checkout" | "push" | "publish"
  const [newBranchName, setNewBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [switchAfterCreate, setSwitchAfterCreate] = useState(true);
  const [selectedPushBranch, setSelectedPushBranch] = useState("main");
  const [selectedPublishBranch, setSelectedPublishBranch] = useState("main");
  const [commitMessage, setCommitMessage] = useState("Update portfolio via Local Studio");
  const [pushBeforePublish, setPushBeforePublish] = useState(true);
  const [gitLog, setGitLog] = useState("");

  const loadGitStatus = async () => {
    setGitLoading(true);
    try {
      const st = await fetchGitStatus();
      setGitStatus(st);
      if (st.currentBranch) {
        setSelectedPushBranch((prev) =>
          st.allBranches.includes(prev) ? prev : st.currentBranch
        );
        setSelectedPublishBranch((prev) =>
          st.allBranches.includes(prev) ? prev : st.currentBranch
        );
        setBaseBranch((prev) => prev || st.currentBranch);
      }
    } catch (err) {
      showToast("error", err?.message || "Could not load Git status");
    } finally {
      setGitLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "publish") {
      loadGitStatus();
    }
  }, [activeTab]);

  const handleCreateBranch = async () => {
    const clean = newBranchName.trim();
    if (!clean) {
      showToast("error", "Enter a new branch name first (e.g. feature/new-projects)");
      return;
    }
    setGitBusyAction("create");
    try {
      const res = await createGitBranch({
        branchName: clean,
        baseBranch,
        switchTo: switchAfterCreate,
      });
      setGitStatus(res.status);
      setGitLog(res.log);
      setNewBranchName("");
      setSelectedPushBranch(clean);
      setSelectedPublishBranch(clean);
      showToast("success", `Branch "${clean}" created!`);
    } catch (err) {
      setGitLog(`ERROR: ${err?.message || "Failed to create branch"}`);
      showToast("error", err?.message || "Failed to create branch");
    } finally {
      setGitBusyAction("");
    }
  };

  const handleCheckoutBranch = async (branch) => {
    if (!branch) return;
    setGitBusyAction("checkout");
    try {
      const res = await checkoutGitBranch(branch);
      setGitStatus(res.status);
      setGitLog(res.log);
      showToast("success", `Switched to branch "${branch}"`);
    } catch (err) {
      setGitLog(`ERROR: ${err?.message || "Checkout failed"}`);
      showToast("error", err?.message || "Checkout failed");
    } finally {
      setGitBusyAction("");
    }
  };

  const handlePushBranch = async () => {
    if (!selectedPushBranch) return;
    setGitBusyAction("push");
    try {
      if (dirty) {
        await persistToDisk(draft, "Auto-saved portfolio.json before pushing");
      }
      const res = await pushGitBranch({
        branch: selectedPushBranch,
        commitMessage,
      });
      setGitStatus(res.status);
      setGitLog(res.log);
      showToast("success", `Pushed changes to origin/${selectedPushBranch}!`);
    } catch (err) {
      setGitLog(`ERROR: ${err?.message || "Push failed"}`);
      showToast("error", err?.message || "Push failed");
    } finally {
      setGitBusyAction("");
    }
  };

  const handlePublishBranch = async () => {
    if (!selectedPublishBranch) return;
    if (
      !window.confirm(
        `Build and publish branch "${selectedPublishBranch}" directly to GitHub Pages (gh-pages)?`
      )
    ) {
      return;
    }
    setGitBusyAction("publish");
    try {
      if (dirty) {
        await persistToDisk(draft, "Auto-saved portfolio.json before publishing");
      }
      const res = await publishGitBranch({
        branch: selectedPublishBranch,
        commitMessage: commitMessage || `Publish ${selectedPublishBranch} to GitHub Pages`,
        pushSourceFirst: pushBeforePublish,
      });
      setGitStatus(res.status);
      setGitLog(res.log);
      showToast(
        "success",
        `Published "${selectedPublishBranch}" to GitHub Pages! Live in ~1 min.`
      );
    } catch (err) {
      setGitLog(`ERROR: ${err?.message || "Publish failed"}`);
      showToast("error", err?.message || "Publish failed");
    } finally {
      setGitBusyAction("");
    }
  };

  useEffect(() => {
    checkLocalCmsHealth().then(setCmsHealth);
    fetchPortfolioData()
      .then((fresh) => {
        setDraft(structuredClone(fresh));
        setDirty(false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialProjectId) {
      setActiveTab("projects");
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const updateDraft = (updater) => {
    setDraft((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
    setDirty(true);
  };

  const persistToDisk = async (nextData = draft, customMsg) => {
    setSaving(true);
    try {
      await savePortfolioData(nextData);
      setDirty(false);
      onDataSaved(nextData);
      showToast("success", customMsg || "Saved directly to public/data/portfolio.json");
    } catch (err) {
      showToast("error", err?.message || "Failed to write portfolio.json");
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return (draft.projects || []).filter((p) => {
      const matchCat = catFilter === "all" || p.category === catFilter;
      const isPub = p.isPublic !== false;
      const matchVis =
        visFilter === "all" ||
        (visFilter === "public" && isPub) ||
        (visFilter === "hidden" && !isPub);
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q) ||
        p.projectType?.toLowerCase().includes(q);
      return matchCat && matchVis && matchQ;
    });
  }, [draft.projects, catFilter, visFilter, search]);

  const selectedProject = useMemo(
    () => (draft.projects || []).find((p) => p.id === selectedProjectId) || null,
    [draft.projects, selectedProjectId]
  );

  const patchProject = (id, patch) => {
    updateDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const handleToggleProjectPublic = (project, e) => {
    e?.stopPropagation?.();
    const nextPublic = project.isPublic === false ? true : false;
    patchProject(project.id, { isPublic: nextPublic });
    showToast(
      "info",
      nextPublic
        ? `"${project.title}" set to Public (click Save to Disk)`
        : `"${project.title}" hidden from Public Portfolio (click Save to Disk)`
    );
  };

  const handleMoveProjectById = (id, delta, e) => {
    e?.stopPropagation?.();
    updateDraft((prev) => {
      const list = [...(prev.projects || [])];
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const target = idx + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return { ...prev, projects: list };
    });
  };

  const handleReorderProjectDrop = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    updateDraft((prev) => {
      const list = [...(prev.projects || [])];
      const fromIdx = list.findIndex((p) => p.id === sourceId);
      const toIdx = list.findIndex((p) => p.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return { ...prev, projects: list };
    });
  };

  const handleAddProject = () => {
    const fresh = createEmptyProject();
    updateDraft((prev) => ({
      ...prev,
      projects: [fresh, ...(prev.projects || [])],
    }));
    setSelectedProjectId(fresh.id);
    setCatFilter("all");
    setVisFilter("all");
    setSearch("");
    showToast("info", "Created new project draft — upload images & click Save!");
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete "${project.title}" from portfolio.json?`)) return;
    const remaining = draft.projects.filter((p) => p.id !== project.id);
    const next = { ...draft, projects: remaining };
    setDraft(next);
    setSelectedProjectId(remaining[0]?.id || null);
    await persistToDisk(next, `Deleted "${project.title}" & updated portfolio.json`);
  };

  const handleUploadProjectAsset = async (field, file) => {
    if (!selectedProject || !file) return;
    setUploading(true);
    try {
      const sub = field === "logo" ? "logo" : "cover";
      const res = await uploadLocalImage(file, `projects/${selectedProject.id}/${sub}`);
      const next = {
        ...draft,
        projects: draft.projects.map((p) =>
          p.id === selectedProject.id ? { ...p, [field]: res.path } : p
        ),
      };
      setDraft(next);
      await persistToDisk(
        next,
        `Saved ${field === "logo" ? "Project Logo" : "Cover Image"} to public/${res.path}`
      );
    } catch (err) {
      showToast("error", err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProjectAsset = async (field) => {
    if (!selectedProject) return;
    const currentPath = selectedProject[field];
    try {
      if (currentPath && currentPath.startsWith("images/projects/")) {
        await deleteLocalImage(currentPath);
      }
      const next = {
        ...draft,
        projects: draft.projects.map((p) =>
          p.id === selectedProject.id ? { ...p, [field]: "" } : p
        ),
      };
      setDraft(next);
      await persistToDisk(
        next,
        `Removed ${field === "logo" ? "Project Logo" : "Cover Image"}`
      );
    } catch (err) {
      showToast("error", err?.message || "Could not remove asset");
    }
  };

  const handleUploadProjectImages = async (files) => {
    if (!selectedProject || !files?.length) return;
    setUploading(true);
    try {
      const uploadedPaths = [];
      for (const file of Array.from(files)) {
        const res = await uploadLocalImage(file, `projects/${selectedProject.id}`);
        uploadedPaths.push(res.path);
      }
      const next = {
        ...draft,
        projects: draft.projects.map((p) =>
          p.id === selectedProject.id
            ? { ...p, images: [...(p.images || []), ...uploadedPaths] }
            : p
        ),
      };
      setDraft(next);
      await persistToDisk(
        next,
        `Uploaded ${uploadedPaths.length} image(s) to public/images/projects/${selectedProject.id}/`
      );
    } catch (err) {
      showToast("error", err?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProjectImage = async (imgPath, deleteFromDisk = false) => {
    if (!selectedProject) return;
    try {
      if (deleteFromDisk) {
        await deleteLocalImage(imgPath);
      }
      const next = {
        ...draft,
        projects: draft.projects.map((p) =>
          p.id === selectedProject.id
            ? { ...p, images: (p.images || []).filter((i) => i !== imgPath) }
            : p
        ),
      };
      setDraft(next);
      await persistToDisk(
        next,
        deleteFromDisk ? "Removed image from project & disk" : "Removed image from project"
      );
    } catch (err) {
      showToast("error", err?.message || "Could not remove image");
    }
  };

  const handleMoveImage = (index, delta) => {
    if (!selectedProject) return;
    const arr = [...(selectedProject.images || [])];
    const target = index + delta;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    patchProject(selectedProject.id, { images: arr });
  };

  const handleSetCover = (index) => {
    if (!selectedProject || index === 0) return;
    const arr = [...(selectedProject.images || [])];
    const [picked] = arr.splice(index, 1);
    arr.unshift(picked);
    patchProject(selectedProject.id, { images: arr });
  };

  // ================= MY GALLERY (PHOTOS & ALBUMS) HANDLERS =================
  const handleUploadGalleryPhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const added = [];
      for (const file of Array.from(files)) {
        const res = await uploadLocalImage(file, "gallery");
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        added.push({
          id: `gal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          type: "photo",
          title: cleanTitle || "Untitled Frame",
          caption: "",
          tag: "Personal",
          date: String(new Date().getFullYear()),
          aspect: "standard",
          isPublic: true,
          image: res.path,
        });
      }
      const next = {
        ...draft,
        gallery: [...added, ...(draft.gallery || [])],
      };
      setDraft(next);
      await persistToDisk(
        next,
        `Uploaded ${added.length} single photo(s) to public/images/gallery/`
      );
    } catch (err) {
      showToast("error", err?.message || "Gallery upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateGalleryAlbum = () => {
    const albumId = `alb-${Date.now().toString(36)}`;
    const newAlbum = {
      id: albumId,
      type: "album",
      title: "New Photo Album",
      caption: "",
      tag: "Album",
      date: String(new Date().getFullYear()),
      aspect: "wide",
      isPublic: true,
      photos: [],
    };
    updateDraft((prev) => ({
      ...prev,
      gallery: [newAlbum, ...(prev.gallery || [])],
    }));
    setGalleryFilter("all");
    showToast("info", "Created new Album — upload photos into it & save!");
  };

  const handleUploadAlbumPhotos = async (albumId, files) => {
    if (!albumId || !files?.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        const res = await uploadLocalImage(file, `gallery/albums/${albumId}`);
        const cleanCaption = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
        uploaded.push({
          id: `ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          image: res.path,
          caption: cleanCaption,
        });
      }
      const next = {
        ...draft,
        gallery: (draft.gallery || []).map((g) =>
          g.id === albumId
            ? { ...g, photos: [...(g.photos || []), ...uploaded] }
            : g
        ),
      };
      setDraft(next);
      await persistToDisk(
        next,
        `Added ${uploaded.length} photo(s) to album in public/images/gallery/albums/${albumId}/`
      );
    } catch (err) {
      showToast("error", err?.message || "Album photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAlbumPhotoCaption = (albumId, photoId, caption) => {
    updateDraft((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).map((g) =>
        g.id === albumId
          ? {
              ...g,
              photos: (g.photos || []).map((ph) =>
                ph.id === photoId ? { ...ph, caption } : ph
              ),
            }
          : g
      ),
    }));
  };

  const handleMoveAlbumPhoto = (albumId, photoIdx, delta) => {
    updateDraft((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).map((g) => {
        if (g.id !== albumId) return g;
        const arr = [...(g.photos || [])];
        const target = photoIdx + delta;
        if (target < 0 || target >= arr.length) return g;
        [arr[photoIdx], arr[target]] = [arr[target], arr[photoIdx]];
        return { ...g, photos: arr };
      }),
    }));
  };

  const handleSetAlbumCover = (albumId, photoIdx) => {
    if (photoIdx === 0) return;
    updateDraft((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).map((g) => {
        if (g.id !== albumId) return g;
        const arr = [...(g.photos || [])];
        const [picked] = arr.splice(photoIdx, 1);
        arr.unshift(picked);
        return { ...g, photos: arr };
      }),
    }));
  };

  const handleDeleteAlbumPhoto = async (albumId, photo) => {
    try {
      if (photo.image?.startsWith("images/gallery/albums/")) {
        await deleteLocalImage(photo.image);
      }
      const next = {
        ...draft,
        gallery: (draft.gallery || []).map((g) =>
          g.id === albumId
            ? { ...g, photos: (g.photos || []).filter((ph) => ph.id !== photo.id) }
            : g
        ),
      };
      setDraft(next);
      await persistToDisk(next, "Removed photo from album");
    } catch (err) {
      showToast("error", err?.message || "Could not delete album photo");
    }
  };

  const patchGalleryItem = (id, patch) => {
    updateDraft((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const moveGalleryItemById = (id, delta) => {
    updateDraft((prev) => {
      const arr = [...(prev.gallery || [])];
      const idx = arr.findIndex((g) => g.id === id);
      if (idx === -1) return prev;
      const target = idx + delta;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, gallery: arr };
    });
  };

  const handleReorderGalleryDrop = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    updateDraft((prev) => {
      const arr = [...(prev.gallery || [])];
      const fromIdx = arr.findIndex((g) => g.id === sourceId);
      const toIdx = arr.findIndex((g) => g.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, gallery: arr };
    });
  };

  const deleteGalleryItem = async (item) => {
    const isAlbum = item.type === "album";
    if (
      !window.confirm(
        `Delete ${isAlbum ? "album" : "photo"} "${item.title}" from My Gallery?`
      )
    )
      return;
    try {
      if (isAlbum) {
        for (const ph of item.photos || []) {
          if (ph.image?.startsWith("images/gallery/albums/")) {
            await deleteLocalImage(ph.image);
          }
        }
      } else if (item.image?.startsWith("images/gallery/")) {
        await deleteLocalImage(item.image);
      }
      const next = {
        ...draft,
        gallery: (draft.gallery || []).filter((g) => g.id !== item.id),
      };
      setDraft(next);
      await persistToDisk(next, `Deleted "${item.title}" from gallery`);
    } catch (err) {
      showToast("error", err?.message || "Could not delete gallery item");
    }
  };

  const handleUploadPortrait = async (slot, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadLocalImage(file, "portraits");
      const next = {
        ...draft,
        profile: {
          ...draft.profile,
          portraits: {
            ...(draft.profile?.portraits || {}),
            [slot]: res.path,
          },
        },
      };
      setDraft(next);
      await persistToDisk(next, `Updated ${slot} portrait in public/${res.path}`);
    } catch (err) {
      showToast("error", err?.message || "Portrait upload failed");
    } finally {
      setUploading(false);
    }
  };

  const publicProjectCount = (draft.projects || []).filter(
    (p) => p.isPublic !== false
  ).length;
  const hiddenProjectCount = (draft.projects || []).length - publicProjectCount;

  const gitPublishCommand = `git add public/data/portfolio.json public/images\ngit commit -m "Update portfolio projects and gallery"\ngit push origin main`;

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#0D091A] px-3.5 py-2.5 text-sm text-white placeholder-ink-muted/70 outline-none transition focus:border-[#00D4FF]/70 focus:ring-2 focus:ring-[#00D4FF]/15";
  const labelClass =
    "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted";

  return (
    <div className="min-h-screen bg-[#070510] text-white">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0718]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onExitStudio}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Live Portfolio
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-white">
                  SMSC Local Studio
                </span>
                <span className="rounded-full border border-[#FF8A1F]/40 bg-[#FF8A1F]/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FFC247]">
                  Dev Only
                </span>
              </div>
              <p className="font-mono text-[11px] text-ink-muted">
                {cmsHealth?.ok
                  ? `Connected to disk • ${cmsHealth.dataFile}`
                  : "Local file writer active"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#FFC247]">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved edits
              </span>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => persistToDisk(draft)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-neon-magenta transition hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: "linear-gradient(110deg, #F012A8 0%, #0099FF 100%)",
              }}
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Writing to disk..." : "Save to Disk"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-medium shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "border-rose-500/50 bg-rose-950/90 text-rose-200"
                : "border-[#00D4FF]/50 bg-[#0B0F24]/95 text-[#9EEFFF]"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Shell */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 sm:px-8 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 space-y-2 rounded-2xl border border-white/10 bg-[#100B20] p-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "border border-[#F012A8]/40 bg-gradient-to-r from-[#F012A8]/20 to-[#00D4FF]/15 text-white"
                      : "text-ink-secondary hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                  {tab.id === "projects" && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px]">
                      {publicProjectCount}/{draft.projects?.length || 0}
                    </span>
                  )}
                  {tab.id === "gallery" && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px]">
                      {draft.gallery?.length || 0}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3.5 text-xs text-ink-muted">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#00D4FF]">
                <HardDrive className="h-3.5 w-3.5" />
                Local Storage Paths
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-secondary">
                Data: <span className="text-white">public/data/portfolio.json</span>
                <br />
                Projects: <span className="text-white">public/images/projects/</span>
                <br />
                Gallery: <span className="text-white">public/images/gallery/</span>
              </p>
              <p className="mt-2 text-[11px] text-ink-muted">
                Public: <span className="text-emerald-300">{publicProjectCount}</span> • Hidden:{" "}
                <span className="text-[#FFC247]">{hiddenProjectCount}</span>
              </p>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9">
          {/* ================= PROJECTS TAB ================= */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* Project List + Ordering + Public Toggle Column */}
              <div className="space-y-3.5 xl:col-span-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects..."
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#F012A8] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff2bb5]"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </button>
                </div>

                {/* Category & Visibility Filters */}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCatFilter(c.id)}
                      className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition ${
                        catFilter === c.id
                          ? "bg-[#00D4FF]/20 text-[#7EE8FF] ring-1 ring-[#00D4FF]/50"
                          : "bg-white/5 text-ink-muted hover:text-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Drag or use ↑↓ to reorder
                  </span>
                  <div className="flex gap-1">
                    {VISIBILITY_FILTERS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVisFilter(v.id)}
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] transition ${
                          visFilter === v.id
                            ? "bg-[#F012A8]/25 text-[#FF8DE0]"
                            : "text-ink-muted hover:text-white"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Reorderable Project List */}
                <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
                  {filteredProjects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    const isPub = p.isPublic !== false;
                    const masterIndex = (draft.projects || []).findIndex(
                      (x) => x.id === p.id
                    );
                    const thumbPath = p.logo || p.coverImage || p.images?.[0] || "";
                    const thumb = thumbPath ? assetUrl(thumbPath) : "";

                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragProjectId(p.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          handleReorderProjectDrop(dragProjectId, p.id);
                          setDragProjectId(null);
                        }}
                        onDragEnd={() => setDragProjectId(null)}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 transition ${
                          isSelected
                            ? "border-[#00D4FF]/60 bg-[#171230]"
                            : "border-white/8 bg-[#100B20] hover:border-white/20"
                        } ${!isPub ? "opacity-65" : ""}`}
                      >
                        {/* Drag Handle & Order Arrows */}
                        <div className="flex flex-col items-center gap-0.5 text-ink-muted">
                          <button
                            type="button"
                            onClick={(e) => handleMoveProjectById(p.id, -1, e)}
                            disabled={masterIndex <= 0}
                            title="Move up"
                            className="rounded p-0.5 hover:bg-white/10 hover:text-white disabled:opacity-25"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <GripVertical className="h-3.5 w-3.5 cursor-grab opacity-60" />
                          <button
                            type="button"
                            onClick={(e) => handleMoveProjectById(p.id, 1, e)}
                            disabled={masterIndex >= (draft.projects?.length || 1) - 1}
                            title="Move down"
                            className="rounded p-0.5 hover:bg-white/10 hover:text-white disabled:opacity-25"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Thumbnail */}
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-void-950">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-muted">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* Title + Meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-ink-muted">
                              #{masterIndex + 1}
                            </span>
                            <p className="truncate text-sm font-semibold text-white">
                              {p.title}
                            </p>
                            {p.featured && (
                              <Star className="h-3 w-3 shrink-0 fill-[#FFC247] text-[#FFC247]" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-ink-muted">
                            {p.category.toUpperCase()} • {p.images?.length || 0} img •{" "}
                            {isPub ? "Public" : "Hidden"}
                          </p>
                        </div>

                        {/* Quick Public / Hidden Toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleProjectPublic(p, e)}
                          title={
                            isPub
                              ? "Public on portfolio (click to hide)"
                              : "Hidden from portfolio (click to make public)"
                          }
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                            isPub
                              ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "border-white/15 bg-white/5 text-ink-muted hover:text-white"
                          }`}
                        >
                          {isPub ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Editor Column */}
              <div className="xl:col-span-7">
                {selectedProject ? (
                  <div className="space-y-6 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#00D4FF]">
                            ID: {selectedProject.id}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                              selectedProject.isPublic !== false
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {selectedProject.isPublic !== false
                              ? "PUBLIC ON PORTFOLIO"
                              : "HIDDEN / PRIVATE"}
                          </span>
                        </div>
                        <h2 className="mt-1 font-display text-xl font-bold text-white">
                          {selectedProject.title || "Untitled Project"}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(selectedProject)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    {/* Visibility & Featured Controls */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#0D091A] px-4 py-3 text-sm text-white">
                        <span className="flex items-center gap-2.5">
                          {selectedProject.isPublic !== false ? (
                            <Eye className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-amber-400" />
                          )}
                          <span>Show on Public Portfolio</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedProject.isPublic !== false}
                          onChange={(e) =>
                            patchProject(selectedProject.id, {
                              isPublic: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-emerald-400"
                        />
                      </label>

                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#0D091A] px-4 py-3 text-sm text-white">
                        <span className="flex items-center gap-2.5">
                          <Star className="h-4 w-4 text-[#FFC247]" />
                          <span>Featured Hero Span</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedProject.featured)}
                          onChange={(e) =>
                            patchProject(selectedProject.id, {
                              featured: e.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-[#F012A8]"
                        />
                      </label>
                    </div>

                    {/* 1. Separate Project Logo & Cover Image Uploaders */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                      {/* Logo / App Icon */}
                      <div className="rounded-2xl border border-white/10 bg-[#0B0718] p-4 sm:col-span-5">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#FF8DE0]">
                            App / Project Logo
                          </span>
                          {selectedProject.logo && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectAsset("logo")}
                              title="Remove logo"
                              className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3.5">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-void-950">
                            {selectedProject.logo ? (
                              <img
                                src={assetUrl(selectedProject.logo)}
                                alt="Logo"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-ink-muted">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] text-ink-muted">
                              Shown on cards, modal & App/Play Store preview icon.
                            </p>
                            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#F012A8]/45 bg-[#F012A8]/15 px-3 py-1.5 font-mono text-[10px] font-semibold text-[#FF8DE0] hover:bg-[#F012A8]/25">
                              <Upload className="h-3 w-3" />
                              <span>{selectedProject.logo ? "Replace Logo" : "Upload Logo"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                  handleUploadProjectAsset("logo", e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Cover Banner */}
                      <div className="rounded-2xl border border-white/10 bg-[#0B0718] p-4 sm:col-span-7">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#7EE8FF]">
                            Cover Banner Image
                          </span>
                          {selectedProject.coverImage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectAsset("coverImage")}
                              title="Remove cover"
                              className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3.5">
                          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-void-950">
                            {selectedProject.coverImage ? (
                              <img
                                src={assetUrl(selectedProject.coverImage)}
                                alt="Cover"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-ink-muted">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] text-ink-muted">
                              Main card banner (falls back to 1st screenshot if empty).
                            </p>
                            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3 py-1.5 font-mono text-[10px] font-semibold text-[#7EE8FF] hover:bg-[#00D4FF]/25">
                              <Upload className="h-3 w-3" />
                              <span>
                                {selectedProject.coverImage ? "Replace Cover" : "Upload Cover"}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                  handleUploadProjectAsset("coverImage", e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Screenshots & Gallery Upload & Reorder Manager */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className={labelClass}>
                          Screenshots & Gallery ({selectedProject.images?.length || 0})
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3.5 py-1.5 font-mono text-xs font-semibold text-[#7EE8FF] transition hover:bg-[#00D4FF]/25">
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploading ? "Uploading..." : "Upload Screenshots"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploading}
                            onChange={(e) => {
                              handleUploadProjectImages(e.target.files);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {selectedProject.images?.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedProject.images.map((imgPath, idx) => (
                            <div
                              key={`${imgPath}-${idx}`}
                              className="group relative overflow-hidden rounded-xl border border-white/10 bg-void-950"
                            >
                              <div className="aspect-[16/11] w-full overflow-hidden">
                                <img
                                  src={assetUrl(imgPath)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              {idx === 0 && (
                                <span className="absolute left-2 top-2 rounded-md bg-[#F012A8] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                  COVER
                                </span>
                              )}

                              <div className="flex items-center justify-between gap-1 bg-black/75 px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, -1)}
                                    disabled={idx === 0}
                                    title="Move left"
                                    className="rounded p-1 text-ink-secondary hover:bg-white/10 disabled:opacity-30"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 1)}
                                    disabled={idx === selectedProject.images.length - 1}
                                    title="Move right"
                                    className="rounded p-1 text-ink-secondary hover:bg-white/10 disabled:opacity-30"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                  {idx !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCover(idx)}
                                      title="Make cover"
                                      className="rounded px-1.5 py-0.5 font-mono text-[10px] text-[#FFC247] hover:bg-white/10"
                                    >
                                      Cover
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveProjectImage(imgPath, true)}
                                  title="Delete image from disk"
                                  className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-7 text-center transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5">
                          <Upload className="mb-2 h-6 w-6 text-[#00D4FF]" />
                          <p className="text-sm font-medium text-white">
                            Click to upload project screenshots or artwork
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-ink-muted">
                            Saved directly to public/images/projects/{selectedProject.id}/
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploading}
                            onChange={(e) => {
                              handleUploadProjectImages(e.target.files);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Core Fields */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Project Title</label>
                        <input
                          type="text"
                          value={selectedProject.title || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { title: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Subtitle / Region / Client</label>
                        <input
                          type="text"
                          value={selectedProject.subtitle || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { subtitle: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Category</label>
                        <select
                          value={selectedProject.category || "web"}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { category: e.target.value })
                          }
                          className={inputClass}
                        >
                          <option value="mobile">Mobile App</option>
                          <option value="web">Web Development</option>
                          <option value="research">Research & AI</option>
                          <option value="uiux">UI / UX Design</option>
                          <option value="graphic">Graphic Design & Art</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Project Type Badge</label>
                        <input
                          type="text"
                          value={selectedProject.projectType || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { projectType: e.target.value })
                          }
                          placeholder="e.g. React Native (Expo), Next.js"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Status</label>
                        <input
                          type="text"
                          value={selectedProject.status || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { status: e.target.value })
                          }
                          placeholder="Published / Completed / Private Release"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Date & Duration</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={selectedProject.date || ""}
                            onChange={(e) =>
                              patchProject(selectedProject.id, { date: e.target.value })
                            }
                            placeholder="2025"
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={selectedProject.duration || ""}
                            onChange={(e) =>
                              patchProject(selectedProject.id, { duration: e.target.value })
                            }
                            placeholder="Commercial"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Your Role</label>
                        <input
                          type="text"
                          value={selectedProject.role || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { role: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Website URL (optional)</label>
                        <input
                          type="url"
                          value={selectedProject.liveUrl || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { liveUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Apple App Store URL (optional)</label>
                        <input
                          type="url"
                          value={selectedProject.appStoreUrl || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { appStoreUrl: e.target.value })
                          }
                          placeholder="https://apps.apple.com/..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Google Play Store URL (optional)</label>
                        <input
                          type="url"
                          value={selectedProject.playStoreUrl || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { playStoreUrl: e.target.value })
                          }
                          placeholder="https://play.google.com/store/apps/..."
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Short Description</label>
                      <textarea
                        rows={3}
                        value={selectedProject.description || ""}
                        onChange={(e) =>
                          patchProject(selectedProject.id, { description: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Extended Overview / Story</label>
                      <textarea
                        rows={3}
                        value={selectedProject.more || ""}
                        onChange={(e) =>
                          patchProject(selectedProject.id, { more: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>GitHub / Figma URL (optional)</label>
                        <input
                          type="url"
                          value={selectedProject.repoUrl || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, { repoUrl: e.target.value })
                          }
                          placeholder="https://github.com/..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          Technologies (comma separated)
                        </label>
                        <input
                          type="text"
                          value={(selectedProject.technologies || []).join(", ")}
                          onChange={(e) =>
                            patchProject(selectedProject.id, {
                              technologies: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          Team Members (comma separated)
                        </label>
                        <input
                          type="text"
                          value={(selectedProject.teamMembers || []).join(", ")}
                          onChange={(e) =>
                            patchProject(selectedProject.id, {
                              teamMembers: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Challenges</label>
                        <input
                          type="text"
                          value={selectedProject.challenges || ""}
                          onChange={(e) =>
                            patchProject(selectedProject.id, {
                              challenges: e.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Key Features (one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={(selectedProject.features || []).join("\n")}
                        onChange={(e) =>
                          patchProject(selectedProject.id, {
                            features: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#100B20] p-12 text-center text-ink-muted">
                    Select a project to edit, or click &ldquo;New&rdquo; to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= MY GALLERY (ALBUMS & PHOTOS) TAB ================= */}
          {activeTab === "gallery" && (
            <div className="space-y-6 rounded-2xl border border-white/10 bg-[#100B20] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    My Gallery — Albums & Single Photos
                  </h2>
                  <p className="mt-1 text-xs text-ink-muted">
                    Upload standalone photos or create multi-photo Albums saved directly in{" "}
                    <code className="text-[#00D4FF]">public/images/gallery/</code>. Drag or
                    use ↑↓ to reorder.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCreateGalleryAlbum}
                    className="inline-flex items-center gap-2 rounded-full border border-[#F012A8]/55 bg-[#F012A8]/15 px-4 py-2.5 text-xs font-semibold text-[#FF8DE0] transition hover:bg-[#F012A8]/25"
                  >
                    <FolderPlus className="h-4 w-4" />
                    <span>New Album</span>
                  </button>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#F012A8] to-[#0099FF] px-5 py-2.5 text-xs font-semibold text-white shadow-neon-magenta transition hover:scale-[1.02]">
                    <Upload className="h-4 w-4" />
                    <span>{uploading ? "Uploading..." : "Upload Single Photos"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      onChange={(e) => {
                        handleUploadGalleryPhotos(e.target.files);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {[
                    { id: "all", label: "All Items" },
                    { id: "album", label: "Albums" },
                    { id: "photo", label: "Single Photos" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setGalleryFilter(f.id)}
                      className={`rounded-lg px-3 py-1.5 font-mono text-[11px] transition ${
                        galleryFilter === f.id
                          ? "bg-[#00D4FF]/20 text-[#7EE8FF] ring-1 ring-[#00D4FF]/50"
                          : "bg-white/5 text-ink-muted hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-ink-muted">
                  Albums: {(draft.gallery || []).filter((g) => g.type === "album").length} •
                  Photos: {(draft.gallery || []).filter((g) => g.type !== "album").length}
                </span>
              </div>

              {(draft.gallery || []).filter(
                (g) => galleryFilter === "all" || (g.type || "photo") === galleryFilter
              ).length > 0 ? (
                <div className="space-y-4">
                  {(draft.gallery || [])
                    .filter(
                      (g) =>
                        galleryFilter === "all" || (g.type || "photo") === galleryFilter
                    )
                    .map((item) => {
                      const isAlbum = item.type === "album";
                      const isPub = item.isPublic !== false;
                      const masterIdx = (draft.gallery || []).findIndex(
                        (x) => x.id === item.id
                      );
                      const coverSrc = isAlbum
                        ? item.photos?.[0]?.image
                        : item.image;

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDragGalleryId(item.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            handleReorderGalleryDrop(dragGalleryId, item.id);
                            setDragGalleryId(null);
                          }}
                          onDragEnd={() => setDragGalleryId(null)}
                          className={`space-y-4 rounded-2xl border p-4 ${
                            isAlbum
                              ? "border-[#F012A8]/30 bg-[#0D081D]"
                              : "border-white/10 bg-[#0B0718]"
                          } ${!isPub ? "opacity-65" : ""}`}
                        >
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                            {/* Reorder + Cover Preview */}
                            <div className="flex items-center gap-3 sm:col-span-4">
                              <div className="flex flex-col items-center gap-1 text-ink-muted">
                                <button
                                  type="button"
                                  onClick={() => moveGalleryItemById(item.id, -1)}
                                  disabled={masterIdx <= 0}
                                  className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-25"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                                <GripVertical className="h-4 w-4 cursor-grab opacity-60" />
                                <button
                                  type="button"
                                  onClick={() => moveGalleryItemById(item.id, 1)}
                                  disabled={
                                    masterIdx >= (draft.gallery?.length || 1) - 1
                                  }
                                  className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-25"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="relative aspect-[4/3] flex-1 overflow-hidden rounded-xl border border-white/10 bg-void-950">
                                {coverSrc ? (
                                  <img
                                    src={assetUrl(coverSrc)}
                                    alt={item.title || ""}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center text-ink-muted">
                                    <Layers className="mb-1 h-5 w-5 text-[#F012A8]" />
                                    <span className="font-mono text-[10px]">
                                      Empty Album
                                    </span>
                                  </div>
                                )}
                                <span
                                  className={`absolute left-2 top-2 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                    isAlbum
                                      ? "bg-[#F012A8] text-white"
                                      : "bg-black/75 text-[#7EE8FF]"
                                  }`}
                                >
                                  {isAlbum
                                    ? `Album (${item.photos?.length || 0})`
                                    : "Photo"}
                                </span>
                              </div>
                            </div>

                            {/* Metadata Editor */}
                            <div className="space-y-3 sm:col-span-8">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-[11px] text-ink-muted">
                                  #{masterIdx + 1} •{" "}
                                  {isAlbum
                                    ? `Album ID: ${item.id}`
                                    : item.image}
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchGalleryItem(item.id, { isPublic: !isPub })
                                    }
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                                      isPub
                                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                                        : "border-white/15 bg-white/5 text-ink-muted"
                                    }`}
                                  >
                                    {isPub ? (
                                      <>
                                        <Eye className="h-3.5 w-3.5" /> Public
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="h-3.5 w-3.5" /> Hidden
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteGalleryItem(item)}
                                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <input
                                  type="text"
                                  placeholder={isAlbum ? "Album Title" : "Photo Title"}
                                  value={item.title || ""}
                                  onChange={(e) =>
                                    patchGalleryItem(item.id, { title: e.target.value })
                                  }
                                  className={`${inputClass} sm:col-span-2`}
                                />
                                <select
                                  value={item.aspect || "standard"}
                                  onChange={(e) =>
                                    patchGalleryItem(item.id, { aspect: e.target.value })
                                  }
                                  className={inputClass}
                                >
                                  <option value="standard">Standard Frame</option>
                                  <option value="wide">Wide Feature</option>
                                  <option value="tall">Tall Portrait</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <input
                                  type="text"
                                  placeholder="Tag (e.g. Graduation, Travel)"
                                  value={item.tag || ""}
                                  onChange={(e) =>
                                    patchGalleryItem(item.id, { tag: e.target.value })
                                  }
                                  className={inputClass}
                                />
                                <input
                                  type="text"
                                  placeholder="Year / Date"
                                  value={item.date || ""}
                                  onChange={(e) =>
                                    patchGalleryItem(item.id, { date: e.target.value })
                                  }
                                  className={inputClass}
                                />
                                <input
                                  type="text"
                                  placeholder="Caption / Description"
                                  value={item.caption || ""}
                                  onChange={(e) =>
                                    patchGalleryItem(item.id, { caption: e.target.value })
                                  }
                                  className={inputClass}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Nested Album Photos Manager */}
                          {isAlbum && (
                            <div className="border-t border-white/10 pt-4">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF8DE0]">
                                  Photos inside &ldquo;{item.title}&rdquo; (
                                  {item.photos?.length || 0})
                                </span>
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-[#7EE8FF] transition hover:bg-[#00D4FF]/25">
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>
                                    {uploading ? "Uploading..." : "Add Photos to Album"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={uploading}
                                    onChange={(e) => {
                                      handleUploadAlbumPhotos(item.id, e.target.files);
                                      e.target.value = "";
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {item.photos?.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {item.photos.map((ph, pIdx) => (
                                    <div
                                      key={ph.id || pIdx}
                                      className="overflow-hidden rounded-xl border border-white/10 bg-[#070510]"
                                    >
                                      <div className="relative aspect-[16/10] w-full overflow-hidden">
                                        <img
                                          src={assetUrl(ph.image)}
                                          alt={ph.caption || ""}
                                          className="h-full w-full object-cover"
                                        />
                                        {pIdx === 0 && (
                                          <span className="absolute left-2 top-2 rounded bg-[#F012A8] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                            ALBUM COVER
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-2 p-2.5">
                                        <input
                                          type="text"
                                          placeholder="Photo caption..."
                                          value={ph.caption || ""}
                                          onChange={(e) =>
                                            handleAlbumPhotoCaption(
                                              item.id,
                                              ph.id,
                                              e.target.value
                                            )
                                          }
                                          className="w-full rounded-lg border border-white/10 bg-[#0D091A] px-2.5 py-1.5 text-xs text-white placeholder-ink-muted/60 outline-none focus:border-[#00D4FF]/60"
                                        />
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleMoveAlbumPhoto(item.id, pIdx, -1)
                                              }
                                              disabled={pIdx === 0}
                                              className="rounded p-1 text-ink-secondary hover:bg-white/10 disabled:opacity-30"
                                            >
                                              <ChevronLeft className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleMoveAlbumPhoto(item.id, pIdx, 1)
                                              }
                                              disabled={pIdx === item.photos.length - 1}
                                              className="rounded p-1 text-ink-secondary hover:bg-white/10 disabled:opacity-30"
                                            >
                                              <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                            {pIdx !== 0 && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleSetAlbumCover(item.id, pIdx)
                                                }
                                                className="rounded px-1.5 py-0.5 font-mono text-[10px] text-[#FFC247] hover:bg-white/10"
                                              >
                                                Cover
                                              </button>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteAlbumPhoto(item.id, ph)
                                            }
                                            className="rounded p-1 text-rose-400 hover:bg-rose-500/20"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-[#00D4FF]/50">
                                  <Upload className="mb-1.5 h-5 w-5 text-[#00D4FF]" />
                                  <span className="text-xs font-medium text-white">
                                    Upload photos into this album
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    disabled={uploading}
                                    onChange={(e) => {
                                      handleUploadAlbumPhotos(item.id, e.target.files);
                                      e.target.value = "";
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-ink-muted">
                  No gallery items match this filter yet.
                </div>
              )}
            </div>
          )}

          {/* ================= PROFILE & PORTRAITS TAB ================= */}
          {activeTab === "profile" && (
            <div className="space-y-6 rounded-2xl border border-white/10 bg-[#100B20] p-6">
              <h2 className="font-display text-2xl font-bold text-white">
                Profile & Neon Portraits
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { slot: "hero", label: "Hero Backdrop & Card" },
                  { slot: "about", label: "About Section Portrait" },
                  { slot: "contact", label: "Contact Backdrop Portrait" },
                ].map(({ slot, label }) => {
                  const src = draft.profile?.portraits?.[slot];
                  return (
                    <div
                      key={slot}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-void-950"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden">
                        {src && (
                          <img
                            src={assetUrl(src)}
                            alt={label}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 p-3">
                        <span className="text-xs font-medium text-ink-secondary">
                          {label}
                        </span>
                        <label className="cursor-pointer rounded-lg border border-[#F012A8]/45 bg-[#F012A8]/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#FF8DE0] hover:bg-[#F012A8]/25">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              handleUploadPortrait(slot, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["firstName", "First Name"],
                  ["lastName", "Last Name"],
                  ["fullName", "Full Formal Name"],
                  ["brand", "Brand Monogram"],
                  ["availability", "Current Role / Badge"],
                  ["location", "Location"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className={labelClass}>{label}</label>
                    <input
                      type="text"
                      value={draft.profile?.[field] || ""}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, [field]: e.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className={labelClass}>Rotating Roles (comma separated)</label>
                <input
                  type="text"
                  value={(draft.profile?.roles || []).join(", ")}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      profile: {
                        ...prev.profile,
                        roles: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Hero Headline</label>
                <input
                  type="text"
                  value={draft.profile?.headline || ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, headline: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>About Bio</label>
                <textarea
                  rows={4}
                  value={draft.profile?.bio || ""}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, bio: e.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Social Links</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {["github", "linkedin", "instagram", "facebook", "youtube"].map((net) => (
                    <input
                      key={net}
                      type="url"
                      placeholder={`${net} URL`}
                      value={draft.profile?.socials?.[net] || ""}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          profile: {
                            ...prev.profile,
                            socials: {
                              ...(prev.profile?.socials || {}),
                              [net]: e.target.value,
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= EXPERIENCE, SKILLS & EDUCATION TAB ================= */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              {/* Work Experience Editor */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
                    <Briefcase className="h-5 w-5 text-[#FF3CC7]" />
                    Work Experience & Volunteering
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        experience: [
                          {
                            id: `exp-${Date.now().toString(36)}`,
                            role: "New Role",
                            company: "Company",
                            period: "2026 — Present",
                            type: "Full-Time",
                            highlights: [],
                          },
                          ...(prev.experience || []),
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Role
                  </button>
                </div>

                {(draft.experience || []).map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="space-y-3 rounded-xl border border-white/10 bg-[#0A0716] p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Role Title"
                        value={exp.role || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            experience: prev.experience.map((item, i) =>
                              i === idx ? { ...item, role: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Company / Organization"
                        value={exp.company || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            experience: prev.experience.map((item, i) =>
                              i === idx ? { ...item, company: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Period"
                        value={exp.period || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            experience: prev.experience.map((item, i) =>
                              i === idx ? { ...item, period: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type (Full-Time / Internship / Volunteering)"
                          value={exp.type || ""}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              experience: prev.experience.map((item, i) =>
                                i === idx ? { ...item, type: e.target.value } : item
                              ),
                            }))
                          }
                          className={`${inputClass} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              experience: prev.experience.filter((_, i) => i !== idx),
                            }))
                          }
                          className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/15"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Highlights (one per line)"
                      value={(exp.highlights || []).join("\n")}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          experience: prev.experience.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  highlights: e.target.value
                                    .split("\n")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }
                              : item
                          ),
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              {/* Skills Editor */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-white">
                    Skill Disciplines
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        skills: [
                          ...(prev.skills || []),
                          {
                            id: `sk-${Date.now().toString(36)}`,
                            category: "New Discipline",
                            accent: "cyan",
                            items: ["Tool 1"],
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Group
                  </button>
                </div>

                {(draft.skills || []).map((group, idx) => (
                  <div
                    key={group.id || idx}
                    className="space-y-3 rounded-xl border border-white/10 bg-[#0A0716] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={group.category}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            skills: prev.skills.map((s, i) =>
                              i === idx ? { ...s, category: e.target.value } : s
                            ),
                          }))
                        }
                        className={`${inputClass} flex-1`}
                      />
                      <select
                        value={group.accent || "magenta"}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            skills: prev.skills.map((s, i) =>
                              i === idx ? { ...s, accent: e.target.value } : s
                            ),
                          }))
                        }
                        className={`${inputClass} w-36`}
                      >
                        <option value="magenta">Magenta</option>
                        <option value="cyan">Cyan</option>
                        <option value="amber">Amber</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((prev) => ({
                            ...prev,
                            skills: prev.skills.filter((_, i) => i !== idx),
                          }))
                        }
                        className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={(group.items || []).join(", ")}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          skills: prev.skills.map((s, i) =>
                            i === idx
                              ? {
                                  ...s,
                                  items: e.target.value
                                    .split(",")
                                    .map((x) => x.trim())
                                    .filter(Boolean),
                                }
                              : s
                          ),
                        }))
                      }
                      placeholder="Comma separated skills..."
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              {/* Education Editor */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-white">
                    Education Timeline
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        education: [
                          {
                            id: `edu-${Date.now().toString(36)}`,
                            degree: "New Qualification",
                            institution: "Institution Name",
                            period: "2026",
                            highlight: "",
                            details: "",
                          },
                          ...(prev.education || []),
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Milestone
                  </button>
                </div>

                {(draft.education || []).map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="space-y-3 rounded-xl border border-white/10 bg-[#0A0716] p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Degree / Title"
                        value={edu.degree || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === idx ? { ...item, degree: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Institution"
                        value={edu.institution || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === idx ? { ...item, institution: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Period"
                        value={edu.period || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === idx ? { ...item, period: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Highlight (GPA / Results)"
                        value={edu.highlight || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === idx ? { ...item, highlight: e.target.value } : item
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        placeholder="Details..."
                        value={edu.details || ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.map((item, i) =>
                              i === idx ? { ...item, details: e.target.value } : item
                            ),
                          }))
                        }
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((prev) => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== idx),
                          }))
                        }
                        className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Academic & Industry References Editor */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
                      <Award className="h-5 w-5 text-[#FFC247]" />
                      Academic & Industry References
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Control whether references appear on your public portfolio & edit referee details.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          showReferences: prev.showReferences === false ? true : false,
                        }))
                      }
                      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition ${
                        draft.showReferences !== false
                          ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-300"
                          : "border-white/15 bg-white/5 text-ink-muted hover:text-white"
                      }`}
                    >
                      {draft.showReferences !== false ? (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Section Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Section Hidden
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((prev) => ({
                          ...prev,
                          references: [
                            ...(prev.references || []),
                            {
                              id: `ref-${Date.now().toString(36)}`,
                              name: "Referee Name",
                              title: "Role / Title",
                              organization: "Company / University",
                              email: "",
                              phone: "",
                              isPublic: true,
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Reference
                    </button>
                  </div>
                </div>

                {(draft.references || []).map((ref, idx) => {
                  const refPublic = ref.isPublic !== false;
                  return (
                    <div
                      key={ref.id || idx}
                      className={`space-y-3 rounded-xl border border-white/10 bg-[#0A0716] p-4 ${
                        !refPublic || draft.showReferences === false ? "opacity-65" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-muted">
                          Reference #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft((prev) => ({
                                ...prev,
                                references: prev.references.map((item, i) =>
                                  i === idx ? { ...item, isPublic: !refPublic } : item
                                ),
                              }))
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                              refPublic
                                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                                : "border-white/15 bg-white/5 text-ink-muted"
                            }`}
                          >
                            {refPublic ? (
                              <>
                                <Eye className="h-3 w-3" /> Public
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" /> Hidden
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft((prev) => ({
                                ...prev,
                                references: prev.references.filter((_, i) => i !== idx),
                              }))
                            }
                            className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={ref.name || ""}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              references: prev.references.map((item, i) =>
                                i === idx ? { ...item, name: e.target.value } : item
                              ),
                            }))
                          }
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="Title / Position"
                          value={ref.title || ""}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              references: prev.references.map((item, i) =>
                                i === idx ? { ...item, title: e.target.value } : item
                              ),
                            }))
                          }
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="Organization / University"
                          value={ref.organization || ""}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              references: prev.references.map((item, i) =>
                                i === idx
                                  ? { ...item, organization: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className={inputClass}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            placeholder="Email"
                            value={ref.email || ""}
                            onChange={(e) =>
                              updateDraft((prev) => ({
                                ...prev,
                                references: prev.references.map((item, i) =>
                                  i === idx ? { ...item, email: e.target.value } : item
                                ),
                              }))
                            }
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={ref.phone || ""}
                            onChange={(e) =>
                              updateDraft((prev) => ({
                                ...prev,
                                references: prev.references.map((item, i) =>
                                  i === idx ? { ...item, phone: e.target.value } : item
                                ),
                              }))
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= GITHUB BRANCH, PUSH & PUBLISH TAB ================= */}
          {activeTab === "publish" && (
            <div className="space-y-6">
              {/* Live Git Status Banner */}
              <div className="rounded-2xl border border-white/10 bg-[#100B20] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-2xl font-bold text-white">
                        GitHub Branch & Pages Control
                      </h2>
                      {gitStatus?.currentBranch && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/45 bg-[#00D4FF]/15 px-3 py-1 font-mono text-xs font-semibold text-[#7EE8FF]">
                          <GitBranch className="h-3.5 w-3.5" />
                          {gitStatus.currentBranch}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-ink-muted">
                      {gitStatus?.remoteUrl || "Loading repository remote..."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {gitStatus?.ghPagesUrl && (
                      <a
                        href={gitStatus.ghPagesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#F012A8]/50 bg-[#F012A8]/15 px-4 py-2 font-mono text-xs font-semibold text-[#FF8DE0] transition hover:bg-[#F012A8]/25"
                      >
                        <span>Open Live Site</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={loadGitStatus}
                      disabled={gitLoading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 font-mono text-xs text-white transition hover:border-white/35"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${gitLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Working Tree Changes Preview */}
                {gitStatus && (
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-[#070510] p-4">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Pending Local Changes ({gitStatus.changedFiles?.length || 0})
                      </p>
                      {gitStatus.changedFiles?.length > 0 ? (
                        <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-mono text-[11px] text-[#FFC247]">
                          {gitStatus.changedFiles.map((line) => (
                            <li key={line} className="truncate">
                              {line}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 font-mono text-xs text-emerald-400">
                          Working tree is clean
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#070510] p-4">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                        Recent Commits
                      </p>
                      <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                        {(gitStatus.recentCommits || []).map((c) => (
                          <li key={c.hash} className="flex items-center gap-2">
                            <span className="text-[#00D4FF]">{c.hash}</span>
                            <span className="truncate text-ink-secondary">{c.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Grid: Create Branch | Push to Branch | Publish to GitHub Pages */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* 1. Create New Branch */}
                <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F012A8]/20 text-[#FF8DE0]">
                      <GitBranch className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        1. Create New Branch
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Create a new Git branch directly in this repo
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>New Branch Name</label>
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="e.g. v2-neon-portfolio"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Base Branch</label>
                    <select
                      value={baseBranch}
                      onChange={(e) => setBaseBranch(e.target.value)}
                      className={inputClass}
                    >
                      {(gitStatus?.allBranches || ["main"]).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink-secondary">
                    <input
                      type="checkbox"
                      checked={switchAfterCreate}
                      onChange={(e) => setSwitchAfterCreate(e.target.checked)}
                      className="h-4 w-4 accent-[#F012A8]"
                    />
                    <span>Switch to new branch after creating</span>
                  </label>

                  <button
                    type="button"
                    disabled={Boolean(gitBusyAction)}
                    onClick={handleCreateBranch}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F012A8]/55 bg-[#F012A8]/20 py-3 text-xs font-semibold text-white transition hover:bg-[#F012A8]/35 disabled:opacity-50"
                  >
                    {gitBusyAction === "create" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>
                      {gitBusyAction === "create" ? "Creating Branch..." : "Create Branch"}
                    </span>
                  </button>
                </div>

                {/* 2. Select Branch & Commit/Push */}
                <div className="space-y-4 rounded-2xl border border-white/10 bg-[#100B20] p-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00D4FF]/20 text-[#7EE8FF]">
                      <GitCommitHorizontal className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">
                        2. Select Branch & Push
                      </h3>
                      <p className="text-xs text-ink-muted">
                        Switch, stage all changes, commit & push to GitHub
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Target Branch</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPushBranch}
                        onChange={(e) => setSelectedPushBranch(e.target.value)}
                        className={`${inputClass} flex-1`}
                      >
                        {(gitStatus?.allBranches || ["main"]).map((b) => (
                          <option key={b} value={b}>
                            {b}
                            {b === gitStatus?.currentBranch ? " (current)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          Boolean(gitBusyAction) ||
                          selectedPushBranch === gitStatus?.currentBranch
                        }
                        onClick={() => handleCheckoutBranch(selectedPushBranch)}
                        className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-[#00D4FF] disabled:opacity-35"
                      >
                        Switch
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Commit Message</label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Update portfolio projects & gallery"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(gitBusyAction)}
                    onClick={handlePushBranch}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00D4FF]/55 bg-[#00D4FF]/20 py-3 text-xs font-semibold text-white transition hover:bg-[#00D4FF]/35 disabled:opacity-50"
                  >
                    {gitBusyAction === "push" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>
                      {gitBusyAction === "push"
                        ? `Pushing to ${selectedPushBranch}...`
                        : `Commit & Push to "${selectedPushBranch}"`}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Select Branch & Publish Live to GitHub Pages */}
              <div className="space-y-4 rounded-2xl border border-[#FF8A1F]/35 bg-gradient-to-br from-[#160D28] via-[#100B20] to-[#0A1624] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#F012A8] to-[#0099FF] text-white shadow-neon-magenta">
                      <Rocket className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold text-white">
                        3. Publish Selected Branch to GitHub Pages
                      </h3>
                      <p className="text-xs text-ink-secondary">
                        Builds production bundle (Local Studio stripped) & deploys directly to{" "}
                        <code className="text-[#FFC247]">origin/gh-pages</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-5">
                    <label className={labelClass}>Branch to Publish</label>
                    <select
                      value={selectedPublishBranch}
                      onChange={(e) => setSelectedPublishBranch(e.target.value)}
                      className={inputClass}
                    >
                      {(gitStatus?.allBranches || ["main"]).map((b) => (
                        <option key={b} value={b}>
                          {b}
                          {b === gitStatus?.currentBranch ? " (current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-7">
                    <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-xs text-ink-secondary">
                      <input
                        type="checkbox"
                        checked={pushBeforePublish}
                        onChange={(e) => setPushBeforePublish(e.target.checked)}
                        className="h-4 w-4 accent-[#00D4FF]"
                      />
                      <span>Also commit & push source branch to GitHub before publishing</span>
                    </label>

                    <button
                      type="button"
                      disabled={Boolean(gitBusyAction)}
                      onClick={handlePublishBranch}
                      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-neon-magenta transition hover:scale-[1.01] disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(110deg, #F012A8 0%, #9E1EFF 50%, #0099FF 100%)",
                      }}
                    >
                      {gitBusyAction === "publish" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4" />
                      )}
                      <span>
                        {gitBusyAction === "publish"
                          ? `Building & Publishing "${selectedPublishBranch}"...`
                          : `Publish "${selectedPublishBranch}" to GitHub Pages`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Git Output Terminal */}
              {gitLog && (
                <div className="rounded-2xl border border-white/10 bg-[#070510] p-5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#00D4FF]">
                      <Terminal className="h-3.5 w-3.5" />
                      Git Command Output
                    </span>
                    <button
                      type="button"
                      onClick={() => setGitLog("")}
                      className="font-mono text-[11px] text-ink-muted hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-secondary">
                    {gitLog}
                  </pre>
                </div>
              )}

              {/* Manual Reference Commands */}
              <div className="rounded-2xl border border-white/8 bg-[#0B0718] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                    Manual CLI Fallback
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(gitPublishCommand);
                      setCopiedCmd(true);
                      setTimeout(() => setCopiedCmd(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white hover:border-[#00D4FF]"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="h-3 w-3 text-[#00D4FF]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-ink-muted">
                  {gitPublishCommand}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
