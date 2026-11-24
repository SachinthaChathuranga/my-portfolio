import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const DATA_FILE_REL = "public/data/portfolio.json";
const IMAGES_DIR_REL = "public/images";
const MAX_BODY_BYTES = 30 * 1024 * 1024; // 30MB for high-res image uploads

function sanitizeSegment(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
}

function isValidBranchName(name = "") {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) return false;
  if (trimmed.startsWith("-") || trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.endsWith(".")) {
    return false;
  }
  if (trimmed.includes("..") || trimmed.includes("@{") || trimmed.includes("//")) {
    return false;
  }
  return /^[a-zA-Z0-9._/-]+$/.test(trimmed);
}

function runProcess(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      },
      (err, stdout, stderr) => {
        if (err) {
          const msg = [stderr, stdout, err.message]
            .filter(Boolean)
            .join("\n")
            .trim();
          reject(new Error(msg || `${cmd} ${args.join(" ")} failed`));
          return;
        }
        resolve({ stdout: String(stdout || "").trim(), stderr: String(stderr || "").trim() });
      }
    );
  });
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function toHttpsGitHubUrl(remoteUrl = "") {
  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (sshMatch) return `https://github.com/${sshMatch[1]}.git`;
  return remoteUrl;
}

function toSsh443GitHubUrl(remoteUrl = "") {
  const m = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (m) return `ssh://git@ssh.github.com:443/${m[1]}.git`;
  return "";
}

async function gitPushSmart(cwd, targetRemote, refspec, { force = false, setUpstream = false } = {}) {
  let resolvedUrl = targetRemote;
  if (targetRemote === "origin") {
    try {
      resolvedUrl = (await runProcess("git", ["remote", "get-url", "origin"], cwd)).stdout;
    } catch {
      resolvedUrl = targetRemote;
    }
  }

  const ssh443Url = toSsh443GitHubUrl(resolvedUrl);
  const httpsUrl = toHttpsGitHubUrl(resolvedUrl);

  const candidates = Array.from(
    new Set([targetRemote, ssh443Url, httpsUrl].filter(Boolean))
  );

  let lastErr = null;
  for (const remote of candidates) {
    const args = [
      "-c",
      "http.postBuffer=524288000",
      "-c",
      "core.sshCommand=ssh -o ConnectTimeout=10 -o ServerAliveInterval=15",
      "push",
    ];
    if (force) args.push("--force");
    if (setUpstream && remote === targetRemote) args.push("-u");
    args.push(remote, refspec);

    try {
      return await runProcess("git", args, cwd);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function deriveGitHubPagesUrl(remoteUrl = "") {
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) return "";
  const owner = match[1].toLowerCase();
  const repo = match[2];
  return `https://${owner}.github.io/${repo}/`;
}

async function getGitStatus(rootDir) {
  const [branchRes, localRes, remoteRes, statusRes, logRes, urlRes] =
    await Promise.all([
      runProcess("git", ["branch", "--show-current"], rootDir),
      runProcess("git", ["for-each-ref", "--format=%(refname:short)", "refs/heads"], rootDir),
      runProcess("git", ["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"], rootDir),
      runProcess("git", ["status", "--short"], rootDir),
      runProcess("git", ["log", "-n", "6", "--pretty=format:%h|%s|%cr"], rootDir).catch(() => ({ stdout: "" })),
      runProcess("git", ["remote", "get-url", "origin"], rootDir).catch(() => ({ stdout: "" })),
    ]);

  const currentBranch = branchRes.stdout || "main";
  const localBranches = localRes.stdout
    ? localRes.stdout.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];
  const remoteBranches = remoteRes.stdout
    ? remoteRes.stdout
        .split("\n")
        .map((s) => s.trim().replace(/^origin\//, ""))
        .filter((b) => b && b !== "HEAD" && b !== "origin")
    : [];

  const allBranches = Array.from(
    new Set([...localBranches, ...remoteBranches.filter((b) => b !== "gh-pages")])
  );

  const changedFiles = statusRes.stdout
    ? statusRes.stdout.split("\n").filter(Boolean)
    : [];

  const recentCommits = logRes.stdout
    ? logRes.stdout.split("\n").filter(Boolean).map((line) => {
        const [hash, message, relativeTime] = line.split("|");
        return { hash, message, relativeTime };
      })
    : [];

  return {
    ok: true,
    currentBranch,
    localBranches,
    remoteBranches,
    allBranches,
    hasGhPagesBranch: remoteBranches.includes("gh-pages") || localBranches.includes("gh-pages"),
    remoteUrl: urlRes.stdout,
    ghPagesUrl: deriveGitHubPagesUrl(urlRes.stdout),
    changedFiles,
    hasChanges: changedFiles.length > 0,
    recentCommits,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload too large (max 30MB)"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

/**
 * Vite dev-only plugin that gives the Local Studio Dashboard direct read/write
 * access to public/data/portfolio.json, public/images/*, and local Git/GitHub Pages actions.
 * Never included in production builds (`vite build` / GitHub Pages).
 */
export function localCmsPlugin() {
  return {
    name: "portfolio-local-cms",
    apply: "serve",
    configureServer(server) {
      const rootDir = server.config.root || process.cwd();
      const dataFilePath = path.resolve(rootDir, DATA_FILE_REL);
      const imagesRootDir = path.resolve(rootDir, IMAGES_DIR_REL);

      server.middlewares.use(async (req, res, next) => {
        const rawUrl = (req.url || "").split("?")[0];
        const apiIndex = rawUrl.indexOf("/api/local-cms/");
        if (apiIndex === -1) return next();

        const route = rawUrl.slice(apiIndex + "/api/local-cms".length);

        try {
          if (req.method === "GET" && route === "/health") {
            return sendJson(res, 200, {
              ok: true,
              mode: "local-dev",
              dataFile: DATA_FILE_REL,
              imagesDir: IMAGES_DIR_REL,
            });
          }

          if (req.method === "GET" && route === "/portfolio") {
            if (!fs.existsSync(dataFilePath)) {
              return sendJson(res, 404, { error: "portfolio.json not found" });
            }
            const raw = fs.readFileSync(dataFilePath, "utf8");
            return sendJson(res, 200, JSON.parse(raw));
          }

          if (req.method === "POST" && route === "/portfolio") {
            const payload = await readJsonBody(req);
            if (!payload || typeof payload !== "object" || !Array.isArray(payload.projects)) {
              return sendJson(res, 400, {
                error: "Invalid portfolio schema: expected { profile, skills, education, projects[] }",
              });
            }
            fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
            fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
            return sendJson(res, 200, {
              ok: true,
              savedTo: DATA_FILE_REL,
              updatedAt: new Date().toISOString(),
            });
          }

          if (req.method === "POST" && route === "/upload") {
            const { folder = "projects/misc", filename = "image.png", dataUrl } = await readJsonBody(req);
            if (!dataUrl || typeof dataUrl !== "string") {
              return sendJson(res, 400, { error: "Missing image dataUrl" });
            }

            const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if (!match) {
              return sendJson(res, 400, { error: "Unsupported image format; expected base64 data URL" });
            }

            const mime = match[1].toLowerCase();
            const base64Data = match[2];
            const extMap = {
              "image/png": ".png",
              "image/jpeg": ".jpg",
              "image/jpg": ".jpg",
              "image/webp": ".webp",
              "image/gif": ".gif",
              "image/svg+xml": ".svg",
            };
            const fallbackExt = extMap[mime] || ".png";

            const safeFolderSegments = String(folder)
              .split("/")
              .map(sanitizeSegment)
              .filter(Boolean);
            const targetFolder = safeFolderSegments.length ? safeFolderSegments.join("/") : "projects/uploads";

            const parsed = path.parse(filename);
            const safeBase = sanitizeSegment(parsed.name) || "upload";
            const safeExt = /\.(png|jpe?g|webp|gif|svg)$/i.test(parsed.ext)
              ? parsed.ext.toLowerCase()
              : fallbackExt;

            const destDir = path.resolve(imagesRootDir, targetFolder);
            if (!destDir.startsWith(imagesRootDir + path.sep) && destDir !== imagesRootDir) {
              return sendJson(res, 403, { error: "Invalid upload folder path" });
            }
            fs.mkdirSync(destDir, { recursive: true });

            const uniqueName = `${safeBase}-${Date.now().toString(36)}${safeExt}`;
            const destFile = path.join(destDir, uniqueName);
            fs.writeFileSync(destFile, Buffer.from(base64Data, "base64"));

            const publicRelPath = `images/${targetFolder}/${uniqueName}`;
            return sendJson(res, 200, {
              ok: true,
              path: publicRelPath,
              diskPath: `public/${publicRelPath}`,
              filename: uniqueName,
            });
          }

          if (req.method === "DELETE" && route === "/image") {
            const { path: relPath } = await readJsonBody(req);
            if (!relPath || typeof relPath !== "string" || !relPath.startsWith("images/")) {
              return sendJson(res, 400, { error: "Invalid image path" });
            }
            const subPath = relPath.slice("images/".length);
            const resolved = path.resolve(imagesRootDir, subPath);
            if (!resolved.startsWith(imagesRootDir + path.sep)) {
              return sendJson(res, 403, { error: "Forbidden image path" });
            }
            if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
              fs.unlinkSync(resolved);
            }
            return sendJson(res, 200, { ok: true, deleted: relPath });
          }

          // ================= GIT & GITHUB PAGES ENDPOINTS =================
          if (req.method === "GET" && route === "/git/status") {
            const status = await getGitStatus(rootDir);
            return sendJson(res, 200, status);
          }

          if (req.method === "POST" && route === "/git/create-branch") {
            const { branchName, baseBranch, switchTo = true } = await readJsonBody(req);
            const cleanName = String(branchName || "").trim();
            if (!isValidBranchName(cleanName)) {
              return sendJson(res, 400, {
                error: "Invalid branch name. Use letters, numbers, '-', '_', or '/'.",
              });
            }
            const cleanBase = baseBranch ? String(baseBranch).trim() : "";
            if (cleanBase && !isValidBranchName(cleanBase)) {
              return sendJson(res, 400, { error: "Invalid base branch name." });
            }

            const args = switchTo ? ["checkout", "-b", cleanName] : ["branch", cleanName];
            if (cleanBase) args.push(cleanBase);

            const out = await runProcess("git", args, rootDir);
            const status = await getGitStatus(rootDir);
            return sendJson(res, 200, {
              ok: true,
              log: [out.stdout, out.stderr].filter(Boolean).join("\n") || `Created branch ${cleanName}`,
              status,
            });
          }

          if (req.method === "POST" && route === "/git/checkout") {
            const { branch } = await readJsonBody(req);
            const cleanBranch = String(branch || "").trim();
            if (!isValidBranchName(cleanBranch)) {
              return sendJson(res, 400, { error: "Invalid branch name." });
            }

            const statusBefore = await getGitStatus(rootDir);
            const args = statusBefore.localBranches.includes(cleanBranch)
              ? ["checkout", cleanBranch]
              : ["checkout", "-b", cleanBranch, `origin/${cleanBranch}`];

            const out = await runProcess("git", args, rootDir);
            const status = await getGitStatus(rootDir);
            return sendJson(res, 200, {
              ok: true,
              log: [out.stdout, out.stderr].filter(Boolean).join("\n") || `Switched to ${cleanBranch}`,
              status,
            });
          }

          if (req.method === "POST" && route === "/git/push") {
            const { branch, commitMessage = "Update portfolio via Local Studio" } =
              await readJsonBody(req);
            const cleanBranch = String(branch || "").trim();
            if (!isValidBranchName(cleanBranch)) {
              return sendJson(res, 400, { error: "Please select a valid branch to push." });
            }
            if (cleanBranch === "gh-pages") {
              return sendJson(res, 400, {
                error: "Use the Publish button to deploy to gh-pages instead of pushing source code to gh-pages.",
              });
            }

            const logs = [];
            const current = (await runProcess("git", ["branch", "--show-current"], rootDir)).stdout;
            if (current !== cleanBranch) {
              const statusBefore = await getGitStatus(rootDir);
              const coArgs = statusBefore.localBranches.includes(cleanBranch)
                ? ["checkout", cleanBranch]
                : ["checkout", "-b", cleanBranch, `origin/${cleanBranch}`];
              const co = await runProcess("git", coArgs, rootDir);
              logs.push(`$ git ${coArgs.join(" ")}\n${co.stdout || co.stderr || `Switched to ${cleanBranch}`}`);
            }

            await runProcess("git", ["add", "-A"], rootDir);
            logs.push("$ git add -A");

            const diff = await runProcess("git", ["status", "--short"], rootDir);
            if (diff.stdout) {
              const safeMsg = String(commitMessage || "Update portfolio").trim() || "Update portfolio";
              const commit = await runProcess("git", ["commit", "-m", safeMsg], rootDir);
              logs.push(`$ git commit -m "${safeMsg}"\n${commit.stdout || commit.stderr}`);
            } else {
              logs.push("Working tree already clean — pushing existing commits.");
            }

            const push = await gitPushSmart(rootDir, "origin", cleanBranch, {
              setUpstream: true,
            });
            logs.push(`$ git push -u origin ${cleanBranch}\n${push.stdout || push.stderr || "Pushed successfully!"}`);

            const status = await getGitStatus(rootDir);
            return sendJson(res, 200, {
              ok: true,
              log: logs.join("\n\n"),
              status,
            });
          }

          if (req.method === "POST" && route === "/git/publish") {
            const {
              branch,
              commitMessage = "Publish portfolio to GitHub Pages",
              pushSourceFirst = true,
            } = await readJsonBody(req);
            const cleanBranch = String(branch || "").trim();
            if (!isValidBranchName(cleanBranch) || cleanBranch === "gh-pages") {
              return sendJson(res, 400, { error: "Select a source branch (not gh-pages) to publish." });
            }

            const logs = [];
            const initialStatus = await getGitStatus(rootDir);

            // 1. Switch to selected source branch
            if (initialStatus.currentBranch !== cleanBranch) {
              const coArgs = initialStatus.localBranches.includes(cleanBranch)
                ? ["checkout", cleanBranch]
                : ["checkout", "-b", cleanBranch, `origin/${cleanBranch}`];
              const co = await runProcess("git", coArgs, rootDir);
              logs.push(`$ git ${coArgs.join(" ")}\n${co.stdout || co.stderr || `Switched to ${cleanBranch}`}`);
            }

            // 2. Commit & push selected branch to GitHub if requested
            if (pushSourceFirst) {
              await runProcess("git", ["add", "-A"], rootDir);
              const pending = await runProcess("git", ["status", "--short"], rootDir);
              if (pending.stdout) {
                const safeMsg = String(commitMessage || "Update portfolio").trim();
                const commit = await runProcess("git", ["commit", "-m", safeMsg], rootDir);
                logs.push(`$ git commit -m "${safeMsg}"\n${commit.stdout || commit.stderr}`);
              }
              const pushSrc = await gitPushSmart(rootDir, "origin", cleanBranch, {
                setUpstream: true,
              });
              logs.push(`$ git push -u origin ${cleanBranch}\n${pushSrc.stdout || pushSrc.stderr || "Source branch pushed"}`);
            }

            // 3. Build production bundle
            const buildRes = await runProcess("npm", ["run", "build"], rootDir);
            logs.push(`$ npm run build\n${buildRes.stdout.split("\n").slice(-6).join("\n")}`);

            const distDir = path.resolve(rootDir, "dist");
            if (!fs.existsSync(distDir)) {
              throw new Error("dist/ folder not found after npm run build");
            }

            // 4. Deploy dist/ directly to origin/gh-pages using a clean temp directory
            const remoteUrl = (await runProcess("git", ["remote", "get-url", "origin"], rootDir)).stdout;
            if (!remoteUrl) {
              throw new Error("Git origin remote URL is not configured.");
            }
            const authorName = (await runProcess("git", ["config", "user.name"], rootDir).catch(() => ({ stdout: "SMSC Portfolio" }))).stdout || "SMSC Portfolio";
            const authorEmail = (await runProcess("git", ["config", "user.email"], rootDir).catch(() => ({ stdout: "smschathu1234@gmail.com" }))).stdout || "smschathu1234@gmail.com";
            const shortSha = (await runProcess("git", ["rev-parse", "--short", "HEAD"], rootDir)).stdout;
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smsc-gh-pages-"));

            try {
              copyDirRecursive(distDir, tmpDir);
              fs.writeFileSync(path.join(tmpDir, ".nojekyll"), "", "utf8");

              await runProcess("git", ["init", "-b", "gh-pages"], tmpDir);
              await runProcess("git", ["config", "user.name", authorName], tmpDir);
              await runProcess("git", ["config", "user.email", authorEmail], tmpDir);
              await runProcess("git", ["add", "-A"], tmpDir);
              await runProcess(
                "git",
                ["commit", "-m", `Deploy ${cleanBranch}@${shortSha} to GitHub Pages`],
                tmpDir
              );
              const deployOut = await gitPushSmart(
                tmpDir,
                remoteUrl,
                "HEAD:refs/heads/gh-pages",
                { force: true }
              );
              logs.push(
                `$ publish dist/ -> origin/gh-pages\n${deployOut.stdout || deployOut.stderr || "Deployed to gh-pages!"}`
              );
            } finally {
              fs.rmSync(tmpDir, { recursive: true, force: true });
            }

            const status = await getGitStatus(rootDir);
            return sendJson(res, 200, {
              ok: true,
              publishedBranch: cleanBranch,
              ghPagesUrl: status.ghPagesUrl,
              log: logs.join("\n\n"),
              status,
            });
          }

          return sendJson(res, 404, { error: `Unknown CMS route: ${route}` });
        } catch (err) {
          return sendJson(res, 500, { error: err?.message || "Local CMS internal error" });
        }
      });
    },
  };
}
