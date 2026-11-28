import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Asset layer for Vanguard: CC0 photo-scanned PBR textures (Poly Haven) shipped
 * in /public/games/vanguard, procedural canvas textures for things no scan
 * covers (camo canvas, sandbags, helipad, chain-link, foliage), and the rigged
 * soldier model.
 */

const BASE = `${import.meta.env.BASE_URL || "/"}games/vanguard/`;

// Mission texture names → shipped texture files
const TEX_FILES = {
  jungleGround: "jungleGround",
  forestGround: "forestGround",
  desertSand: "desertSand",
  snowGround: "snowGround",
  asphalt: "asphalt",
  woodPlank: "woodPlank",
  jungleWall: "woodPlank",
  woodFloor: "woodFloor",
  corrugated: "corrugated",
  concrete: "concrete",
  brick: "brick",
  sandstone: "sandstone",
  arcticWall: "arcticWall",
  tile: "tile",
  bark: "bark",
  rock: "rock",
  cliff: "cliff",
  dirt: "dirt",
  crate: "crate",
  gravel: "gravel",
};

// Physical feel per surface
const SURFACE = {
  corrugated: { roughness: 0.55, metalness: 0.55 },
  arcticWall: { roughness: 0.5, metalness: 0.6 },
  tile: { roughness: 0.35, metalness: 0 },
  woodFloor: { roughness: 0.6, metalness: 0 },
  snowGround: { roughness: 0.75, metalness: 0 },
};

let loader = null;
const texCache = new Map();
const matCache = new Map();
let maxAniso = 8;

export function setMaxAnisotropy(v) {
  maxAniso = Math.min(8, v || 8);
}

function loadTex(file, srgb) {
  const key = `${file}|${srgb}`;
  if (texCache.has(key)) return texCache.get(key);
  if (!loader) loader = new THREE.TextureLoader();
  const t = loader.load(`${BASE}textures/${file}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Un-cached texture instance (for materials that need their own repeat). */
export function loadFreshTexture(name, kind, srgb) {
  if (!loader) loader = new THREE.TextureLoader();
  const file = TEX_FILES[name] || "concrete";
  const t = loader.load(`${BASE}textures/${file}_${kind}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Diffuse + normal texture pair for a surface key (shared, do not dispose). */
export function getTexturePair(name) {
  const file = TEX_FILES[name] || "concrete";
  return {
    map: loadTex(`${file}_diff.jpg`, true),
    normalMap: loadTex(`${file}_nor.jpg`, false),
  };
}

/**
 * Standard PBR material for a mission surface. Geometry carries world-scaled
 * UVs, so textures tile at a consistent real-world size.
 */
export function getSurfaceMaterial(name, tint = null) {
  const key = `${name}|${tint ? tint.join(",") : ""}`;
  if (matCache.has(key)) return matCache.get(key);
  let mat;
  const proc = PROCEDURAL[name];
  if (proc) {
    mat = new THREE.MeshStandardMaterial({ map: proc(), roughness: 0.9, metalness: 0 });
  } else {
    const { map, normalMap } = getTexturePair(name);
    const sf = SURFACE[name] || { roughness: 0.88, metalness: 0 };
    mat = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: sf.roughness,
      metalness: sf.metalness,
    });
  }
  if (tint) mat.color.setRGB(tint[0], tint[1], tint[2]);
  matCache.set(key, mat);
  return mat;
}

// ---------------------------------------------------------------------------
// Procedural canvas textures
// ---------------------------------------------------------------------------
function canvasTex(size, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function noise(ctx, s, amt, alpha = 0.18) {
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
    d[i + 3] = Math.max(d[i + 3], 255 * (1 - alpha) * (d[i + 3] / 255));
  }
  ctx.putImageData(img, 0, 0);
}

const procCache = {};
const memo = (k, fn) => () => (procCache[k] ||= fn());

const PROCEDURAL = {
  camoTent: memo("camo", () =>
    canvasTex(256, (ctx, s) => {
      ctx.fillStyle = "#4a5236";
      ctx.fillRect(0, 0, s, s);
      const cols = ["#2f3524", "#6b6440", "#3c4a2c", "#57502f"];
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        const x = Math.random() * s;
        const y = Math.random() * s;
        for (let a = 0; a < Math.PI * 2; a += 0.6) {
          const r = 10 + Math.random() * 22;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7);
        }
        ctx.fill();
      }
      noise(ctx, s, 26);
    })
  ),
  sandbags: memo("sandbags", () =>
    canvasTex(256, (ctx, s) => {
      ctx.fillStyle = "#8f7d58";
      ctx.fillRect(0, 0, s, s);
      // woven burlap
      for (let y = 0; y < s; y += 3) {
        ctx.fillStyle = y % 6 ? "rgba(60,45,25,0.18)" : "rgba(255,240,200,0.08)";
        ctx.fillRect(0, y, s, 1);
      }
      for (let x = 0; x < s; x += 3) {
        ctx.fillStyle = x % 6 ? "rgba(60,45,25,0.14)" : "rgba(255,240,200,0.06)";
        ctx.fillRect(x, 0, 1, s);
      }
      noise(ctx, s, 34);
    })
  ),
  helipad: memo("helipad", () =>
    canvasTex(
      512,
      (ctx, s) => {
        ctx.fillStyle = "#3a3d40";
        ctx.fillRect(0, 0, s, s);
        noise(ctx, s, 30);
        ctx.strokeStyle = "#e9e4d4";
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#e9e4d4";
        ctx.fillRect(s * 0.33, s * 0.27, s * 0.08, s * 0.46);
        ctx.fillRect(s * 0.59, s * 0.27, s * 0.08, s * 0.46);
        ctx.fillRect(s * 0.33, s * 0.46, s * 0.34, s * 0.08);
        // worn paint
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = "rgba(58,61,64,0.55)";
          ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
        }
      },
      { repeat: false }
    )
  ),
  barrel: memo("barrel", () =>
    canvasTex(256, (ctx, s) => {
      ctx.fillStyle = "#8c1c14";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#d8b02a";
      ctx.fillRect(0, s * 0.42, s, s * 0.1);
      ctx.fillStyle = "rgba(20,10,5,0.35)";
      for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 6 + Math.random() * 16, 2 + Math.random() * 6);
      noise(ctx, s, 30);
    })
  ),
  door: memo("door", () =>
    canvasTex(256, (ctx, s) => {
      ctx.fillStyle = "#4b4f47";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 6;
      ctx.strokeRect(22, 18, s - 44, s * 0.4);
      ctx.strokeRect(22, s * 0.52, s - 44, s * 0.4);
      ctx.fillStyle = "#b9b2a0";
      ctx.fillRect(s - 46, s * 0.48, 16, 10);
      noise(ctx, s, 30);
    })
  ),
};

export function getProcTexture(name) {
  return PROCEDURAL[name] ? PROCEDURAL[name]() : null;
}

/** Chain-link fence (alpha) */
export const getChainLink = memo("chain", () =>
  canvasTex(
    128,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(170,175,180,1)";
      ctx.lineWidth = 3;
      for (let i = -s; i < s * 2; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + s, s);
        ctx.moveTo(i + s, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
      }
    },
    { srgb: true }
  )
);

/** Palm / broadleaf frond with alpha */
export const getFrondTexture = memo("frond", () =>
  canvasTex(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.translate(s / 2, s);
      // central rib
      ctx.strokeStyle = "#5e6b2c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(6, -s * 0.5, 0, -s);
      ctx.stroke();
      // leaflets
      for (let i = 0; i < 34; i++) {
        const t = i / 34;
        const y = -t * s * 0.96;
        const len = Math.sin(t * Math.PI) * s * 0.46 + 10;
        for (const side of [-1, 1]) {
          const g = 90 + Math.random() * 60;
          ctx.strokeStyle = `rgb(${40 + Math.random() * 30},${g},${30 + Math.random() * 25})`;
          ctx.lineWidth = 5 + Math.random() * 3;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.quadraticCurveTo(side * len * 0.5, y - 10, side * len, y + 14 + Math.random() * 10);
          ctx.stroke();
        }
      }
    },
    { repeat: false }
  )
);

/** Grass blade cluster with alpha */
export const getGrassTexture = memo("grass", () =>
  canvasTex(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 46; i++) {
        const x = s * 0.08 + Math.random() * s * 0.84;
        const h = s * (0.45 + Math.random() * 0.55);
        const bend = (Math.random() - 0.5) * 50;
        const g = ctx.createLinearGradient(0, s, 0, s - h);
        g.addColorStop(0, "rgb(60,70,30)");
        g.addColorStop(1, `rgb(${150 + Math.random() * 60},${170 + Math.random() * 50},${80 + Math.random() * 40})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 3 + Math.random() * 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, s);
        ctx.quadraticCurveTo(x + bend * 0.3, s - h * 0.6, x + bend, s - h);
        ctx.stroke();
      }
    },
    { repeat: false }
  )
);

/** Soft round particle sprite */
export const getSoftDot = memo("dot", () =>
  canvasTex(
    64,
    (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.6)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    { repeat: false }
  )
);

/** Billowy smoke puff */
export const getSmokeTexture = memo("smoke", () =>
  canvasTex(
    128,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const x = s / 2 + (Math.random() - 0.5) * s * 0.45;
        const y = s / 2 + (Math.random() - 0.5) * s * 0.45;
        const r = s * (0.12 + Math.random() * 0.2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(255,255,255,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
      }
    },
    { repeat: false }
  )
);

/** Star-shaped muzzle flash */
export const getFlashTexture = memo("flash", () =>
  canvasTex(
    128,
    (ctx, s) => {
      ctx.translate(s / 2, s / 2);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
      g.addColorStop(0, "rgba(255,255,240,1)");
      g.addColorStop(0.25, "rgba(255,220,120,0.95)");
      g.addColorStop(0.6, "rgba(255,140,40,0.35)");
      g.addColorStop(1, "rgba(255,90,20,0)");
      ctx.fillStyle = g;
      for (let i = 0; i < 7; i++) {
        ctx.rotate((Math.PI * 2) / 7);
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(0, -s / 2);
        ctx.lineTo(6, 0);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    },
    { repeat: false }
  )
);

/** Fluffy fbm cloud layer */
export const getCloudTexture = memo("clouds", () =>
  canvasTex(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 12 + Math.random() * 60;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, "rgba(255,255,255,0.16)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  })
);

/** Radar / command UI for console screens */
export const getScreenTexture = memo("screen", () =>
  canvasTex(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#03141a";
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(40,220,200,0.8)";
      ctx.lineWidth = 2;
      for (let r = 20; r < s / 2; r += 26) {
        ctx.beginPath();
        ctx.arc(s * 0.35, s / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,80,80,0.95)";
      for (let i = 0; i < 6; i++) ctx.fillRect(s * 0.15 + Math.random() * s * 0.4, s * 0.25 + Math.random() * s * 0.5, 5, 5);
      ctx.fillStyle = "rgba(60,230,200,0.9)";
      ctx.font = "14px monospace";
      for (let i = 0; i < 10; i++) ctx.fillText(Math.random().toString(16).slice(2, 10).toUpperCase(), s * 0.68, 24 + i * 22);
    },
    { repeat: false }
  )
);

/** Medkit / ammo crate faces */
export const getMedkitTexture = memo("medkit", () =>
  canvasTex(
    128,
    (ctx, s) => {
      ctx.fillStyle = "#e9ecee";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#c8161d";
      ctx.fillRect(s * 0.4, s * 0.15, s * 0.2, s * 0.7);
      ctx.fillRect(s * 0.15, s * 0.4, s * 0.7, s * 0.2);
      noise(ctx, s, 16);
    },
    { repeat: false }
  )
);
export const getAmmoTexture = memo("ammo", () =>
  canvasTex(
    128,
    (ctx, s) => {
      ctx.fillStyle = "#47502f";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#e1c45a";
      ctx.font = "bold 26px monospace";
      ctx.fillText("AMMO", 22, 58);
      ctx.font = "14px monospace";
      ctx.fillText("5.56 NATO", 26, 84);
      noise(ctx, s, 22);
    },
    { repeat: false }
  )
);

// ---------------------------------------------------------------------------
// Rigged soldier model
// ---------------------------------------------------------------------------
let soldierPromise = null;
export function loadSoldierModel() {
  if (!soldierPromise) {
    soldierPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(`${BASE}models/soldier.glb`, resolve, undefined, reject);
    });
  }
  return soldierPromise;
}
