import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { optimizeCloudinaryUrl, uploadToCloudinary } from "./cloudinary";

export const IS_LOCAL_DEV = import.meta.env.DEV;
// Cloud Studio is enabled both locally and on live GitHub Pages (protected by Firebase Auth)
export const IS_LOCAL_STUDIO = true;

const PORTFOLIO_DOC_REF = () => doc(db, "portfolio", "main");

export function assetUrl(relPath) {
  if (!relPath) return "";
  if (/^(https?:|data:|blob:)/i.test(relPath)) {
    return optimizeCloudinaryUrl(relPath);
  }
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanRel = relPath.replace(/^\/+/, "");
  return `${cleanBase}${cleanRel}`;
}

export async function fetchStaticPortfolioJson() {
  if (IS_LOCAL_DEV) {
    try {
      const res = await fetch("/api/local-cms/portfolio", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {
      // fall through to static asset
    }
  }
  const url = `${assetUrl("data/portfolio.json")}${IS_LOCAL_DEV ? `?t=${Date.now()}` : ""}`;
  const res = await fetch(url, { cache: IS_LOCAL_DEV ? "no-store" : "default" });
  if (!res.ok) {
    throw new Error(`Failed to load portfolio data (${res.status})`);
  }
  return await res.json();
}

/**
 * Loads live portfolio data from Firebase Firestore first.
 * Gracefully falls back to static data/portfolio.json if Firestore is empty
 * or not yet configured with public read rules.
 */
export async function fetchPortfolioData() {
  try {
    const snap = await getDoc(PORTFOLIO_DOC_REF());
    if (snap.exists()) {
      const cloudData = snap.data();
      if (cloudData && cloudData.profile && Array.isArray(cloudData.projects)) {
        return {
          ...cloudData,
          blogs: Array.isArray(cloudData.blogs) ? cloudData.blogs : [],
          gallery: Array.isArray(cloudData.gallery) ? cloudData.gallery : [],
          _source: "firestore",
        };
      }
    }
  } catch (err) {
    console.warn("[Firestore] Falling back to static portfolio.json:", err?.message || err);
  }

  const staticData = await fetchStaticPortfolioJson();
  return {
    ...staticData,
    blogs: Array.isArray(staticData.blogs) ? staticData.blogs : [],
    gallery: Array.isArray(staticData.gallery) ? staticData.gallery : [],
    _source: "static",
  };
}

/**
 * Saves portfolio data directly to Firebase Firestore (instant live update on GitHub Pages!).
 * When running locally in Vite dev mode, also mirrors to public/data/portfolio.json as backup.
 */
export async function savePortfolioData(portfolioData) {
  const cleanPayload = { ...portfolioData };
  delete cleanPayload._source;
  cleanPayload.updatedAt = new Date().toISOString();

  let savedCloud = false;
  let cloudError = null;

  try {
    await setDoc(PORTFOLIO_DOC_REF(), cleanPayload);
    savedCloud = true;
  } catch (err) {
    cloudError = err;
  }

  // Optional local JSON mirror when running locally
  if (IS_LOCAL_DEV) {
    try {
      await fetch("/api/local-cms/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });
    } catch {
      // ignore if local middleware isn't running
    }
  }

  if (!savedCloud) {
    throw new Error(
      cloudError?.message ||
        "Firestore save failed. Check your Firebase login & Firestore security rules."
    );
  }

  return { ok: true, savedTo: "firestore", updatedAt: cleanPayload.updatedAt };
}

/**
 * Uploads any image directly to Cloudinary (auto-optimized WebP/quality) from any device.
 */
export async function uploadLocalImage(file, folder = "uploads") {
  return await uploadToCloudinary(file, folder);
}

/**
 * Deleting from unsigned Cloudinary requires signed API secret on a server;
 * for local legacy paths in dev, removes local file; for Cloudinary URLs, detaches cleanly.
 */
export async function deleteLocalImage(relPath) {
  if (!relPath || /^https?:/i.test(relPath)) {
    return { ok: true, detachedOnly: true };
  }
  if (!IS_LOCAL_DEV) return { ok: true };
  try {
    const res = await fetch("/api/local-cms/image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: relPath }),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export async function checkLocalCmsHealth() {
  if (!IS_LOCAL_DEV) return null;
  try {
    const res = await fetch("/api/local-cms/health", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGitStatus() {
  if (!IS_LOCAL_DEV) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/status", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Could not read Git status");
  return json;
}

export async function createGitBranch({ branchName, baseBranch = "", switchTo = true }) {
  if (!IS_LOCAL_DEV) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/create-branch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchName, baseBranch, switchTo }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create branch");
  return json;
}

export async function checkoutGitBranch(branch) {
  if (!IS_LOCAL_DEV) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to switch branch");
  return json;
}

export async function pushGitBranch({ branch, commitMessage }) {
  if (!IS_LOCAL_DEV) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch, commitMessage }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to push branch");
  return json;
}

export async function publishGitBranch({ branch, commitMessage, pushSourceFirst = true }) {
  if (!IS_LOCAL_DEV) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch, commitMessage, pushSourceFirst }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to publish branch");
  return json;
}
