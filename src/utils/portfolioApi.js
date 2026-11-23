/**
 * Portfolio media URL & Local Studio CMS API client.
 * - On GitHub Pages / production build: reads static public/data/portfolio.json & public/images/*
 * - In local `npm run dev`: also enables direct disk save & image upload via Vite middleware
 */

export const IS_LOCAL_STUDIO = import.meta.env.DEV;

export function assetUrl(relPath) {
  if (!relPath) return "";
  if (/^(https?:|data:|blob:)/i.test(relPath)) return relPath;
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanRel = relPath.replace(/^\/+/, "");
  return `${cleanBase}${cleanRel}`;
}

export async function fetchPortfolioData() {
  if (IS_LOCAL_STUDIO) {
    try {
      const res = await fetch("/api/local-cms/portfolio", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {
      // Fallback to static fetch if middleware is unreachable
    }
  }
  const url = `${assetUrl("data/portfolio.json")}${IS_LOCAL_STUDIO ? `?t=${Date.now()}` : ""}`;
  const res = await fetch(url, { cache: IS_LOCAL_STUDIO ? "no-store" : "default" });
  if (!res.ok) {
    throw new Error(`Failed to load portfolio data (${res.status})`);
  }
  return await res.json();
}

export async function savePortfolioData(portfolioData) {
  if (!IS_LOCAL_STUDIO) {
    throw new Error("Local Studio CMS is disabled in published builds.");
  }
  const res = await fetch("/api/local-cms/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(portfolioData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to save portfolio.json");
  return json;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadLocalImage(file, folder = "projects/uploads") {
  if (!IS_LOCAL_STUDIO) {
    throw new Error("Image upload is only available when running locally.");
  }
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch("/api/local-cms/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      filename: file.name,
      dataUrl,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Image upload failed");
  return json;
}

export async function deleteLocalImage(relPath) {
  if (!IS_LOCAL_STUDIO) return { ok: false };
  const res = await fetch("/api/local-cms/image", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: relPath }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to delete image");
  return json;
}

export async function checkLocalCmsHealth() {
  if (!IS_LOCAL_STUDIO) return null;
  try {
    const res = await fetch("/api/local-cms/health", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGitStatus() {
  if (!IS_LOCAL_STUDIO) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/status", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Could not read Git status");
  return json;
}

export async function createGitBranch({ branchName, baseBranch = "", switchTo = true }) {
  if (!IS_LOCAL_STUDIO) throw new Error("Git actions are local-dev only.");
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
  if (!IS_LOCAL_STUDIO) throw new Error("Git actions are local-dev only.");
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
  if (!IS_LOCAL_STUDIO) throw new Error("Git actions are local-dev only.");
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
  if (!IS_LOCAL_STUDIO) throw new Error("Git actions are local-dev only.");
  const res = await fetch("/api/local-cms/git/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch, commitMessage, pushSourceFirst }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to publish branch");
  return json;
}
