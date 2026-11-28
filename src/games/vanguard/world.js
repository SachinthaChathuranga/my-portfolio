import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import {
  getSurfaceMaterial,
  getTexturePair,
  getProcTexture,
  getChainLink,
  getFrondTexture,
  getGrassTexture,
  getCloudTexture,
  getScreenTexture,
  getSoftDot,
  loadFreshTexture,
} from "./assets";
import { mulberry32 } from "./missionExpand";

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Theater look & feel keyed by mission weather
const THEATER = {
  rain: { mountain: 24, road: "dirt", rockH: [7, 16], snow: 0, grassTint: [0.5, 0.66, 0.38], cloud: 0.8, cloudTint: 0.72, turbidity: 9, rayleigh: 2.2, sunI: 2.2, hemiI: 0.9, fence: "chain" },
  dust: { mountain: 13, road: "gravel", rockH: [18, 30], snow: 0, grassTint: [1.05, 0.86, 0.55], cloud: 0.22, cloudTint: 1, turbidity: 11, rayleigh: 1.1, sunI: 3.2, hemiI: 0.8, fence: "chain" },
  snow: { mountain: 34, road: "gravel", rockH: [7, 15], snow: 1, grassTint: [1, 1, 1], cloud: 0.6, cloudTint: 0.95, turbidity: 6, rayleigh: 1.6, sunI: 2.6, hemiI: 1.0, fence: "chain" },
  embers: { mountain: 6, road: "concrete", rockH: [40, 50], snow: 0, grassTint: [0.72, 0.7, 0.45], cloud: 0.55, cloudTint: 0.55, turbidity: 10, rayleigh: 3.2, sunI: 2.0, hemiI: 0.65, fence: "wall", skyline: true },
  storm: { mountain: 40, road: "gravel", rockH: [6, 14], snow: 1, grassTint: [0.55, 0.65, 0.55], cloud: 0.9, cloudTint: 0.25, turbidity: 12, rayleigh: 0.8, sunI: 0.95, hemiI: 0.85, fence: "chain", night: true },
};

// ---------------------------------------------------------------------------
// Geometry builder with world-scaled UVs (ported from the old raw-WebGL engine)
// ---------------------------------------------------------------------------
class GeoBuilder {
  constructor() {
    this.pos = [];
    this.norm = [];
    this.uv = [];
  }
  quad(p0, p1, p2, p3, n, uS, vS) {
    const verts = [p0, p1, p2, p0, p2, p3];
    const uvs = [[0, 0], [uS, 0], [uS, vS], [0, 0], [uS, vS], [0, vS]];
    for (let i = 0; i < 6; i++) {
      this.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      this.norm.push(n[0], n[1], n[2]);
      this.uv.push(uvs[i][0], uvs[i][1]);
    }
  }
  box(x0, y0, z0, x1, y1, z1, tile = 2) {
    const w = Math.max(0.01, x1 - x0);
    const h = Math.max(0.01, y1 - y0);
    const d = Math.max(0.01, z1 - z0);
    const uW = w / tile;
    const uH = h / tile;
    const uD = d / tile;
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uW, uH);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uW, uH);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uD, uH);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uD, uH);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], uW, uD);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], uW, uD);
  }
  get empty() {
    return this.pos.length === 0;
  }
  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.norm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// Shared wind uniform for vegetation sway
const windUniforms = { uTime: { value: 0 } };
function addWind(material, strength = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 ip = instanceMatrix[3];
        #else
          vec4 ip = vec4(0.0);
        #endif
        float hgt = max(position.y, 0.0);
        float sway = (sin(uTime * 1.6 + ip.x * 0.37 + ip.z * 0.29) + 0.4 * sin(uTime * 3.7 + ip.x)) * ${(0.035 * strength).toFixed(4)} * hgt;
        transformed.x += sway;
        transformed.z += sway * 0.6;`
      );
  };
  material.customProgramCacheKey = () => `wind${strength}`;
}

// ---------------------------------------------------------------------------
// Vegetation & rock geometry factories
// ---------------------------------------------------------------------------
function jitter(geo, amt, seed) {
  const r = mulberry32(seed);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + (r() - 0.5) * amt, p.getY(i) + (r() - 0.5) * amt, p.getZ(i) + (r() - 0.5) * amt);
  }
  geo.computeVertexNormals();
  return geo;
}

function colorize(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i), i);
    col[i * 3] = c[0];
    col[i * 3 + 1] = c[1];
    col[i * 3 + 2] = c[2];
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

function cardCluster(count, radius, height, cardW, cardH, seed, yBase = 0) {
  const r = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.PlaneGeometry(cardW, cardH);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 1.6, r() * Math.PI * 2, (r() - 0.5) * 1.6));
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * radius;
    m.compose(
      new THREE.Vector3(Math.cos(ang) * rad, yBase + (r() * 0.8 + 0.1) * height, Math.sin(ang) * rad),
      q,
      new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

function makeTreeKinds(snowy) {
  const kinds = {};

  // PINE: trunk + stacked jittered cones with snow-dusted tops
  {
    const trunk = new THREE.CylinderGeometry(0.11, 0.26, 3.2, 7).translate(0, 1.6, 0);
    const tiers = [];
    for (let i = 0; i < 5; i++) {
      const r = 2.3 - i * 0.42;
      const h = 2.6 - i * 0.25;
      tiers.push(jitter(new THREE.ConeGeometry(r, h, 10, 2).translate(0, 2.2 + i * 1.35 + h / 2, 0), 0.28, 11 + i));
    }
    const canopy = mergeGeometries(tiers.map((g) => g.toNonIndexed()));
    colorize(canopy, (x, y, z, i) => {
      const ny = canopy.attributes.normal.getY(i);
      const v = 0.8 + hash2(x * 3, z * 3) * 0.35;
      const base = [0.13 * v, 0.24 * v, 0.15 * v];
      const sn = snowy ? smooth(0.25, 0.7, ny) * 0.9 : 0;
      return [base[0] + (0.9 - base[0]) * sn, base[1] + (0.93 - base[1]) * sn, base[2] + (0.96 - base[2]) * sn];
    });
    kinds.pine = { trunk, canopy, canopyMode: "solid", height: 9 };
  }

  // PALM: curved trunk + drooping frond cards
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.25, 2.2, 0),
      new THREE.Vector3(0.75, 4.4, 0),
      new THREE.Vector3(1.3, 6.2, 0),
    ]);
    const trunk = new THREE.TubeGeometry(curve, 14, 0.19, 7, false);
    const top = curve.getPoint(1);
    const fronds = [];
    for (let i = 0; i < 11; i++) {
      const g = new THREE.PlaneGeometry(1.25, 3.6, 1, 4).translate(0, 1.8, 0);
      // droop: bend the frond downward along its length
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const y = p.getY(v);
        p.setZ(v, -Math.pow(y / 3.6, 2) * 1.6);
      }
      g.rotateX(-Math.PI / 2 + 0.55);
      g.rotateY((i / 11) * Math.PI * 2 + (i % 2) * 0.2);
      g.translate(top.x, top.y, top.z);
      fronds.push(g);
    }
    kinds.palm = { trunk, canopy: mergeGeometries(fronds), canopyMode: "card", height: 7 };
  }

  // BROADLEAF jungle tree: tall trunk + leaf-card crown
  {
    const trunk = jitter(new THREE.CylinderGeometry(0.2, 0.38, 5.2, 8, 4).translate(0, 2.6, 0), 0.08, 3);
    const crown = [];
    const r = mulberry32(77);
    for (let i = 0; i < 5; i++) {
      const c = cardCluster(16, 1.4, 1.6, 1.6, 1.6, 100 + i, 0);
      c.translate((r() - 0.5) * 2.4, 4.8 + r() * 1.8, (r() - 0.5) * 2.4);
      crown.push(c);
    }
    kinds.broadleaf = { trunk, canopy: mergeGeometries(crown), canopyMode: "card", height: 8 };
  }

  // DESERT SCRUB bush
  {
    const trunk = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 5).translate(0, 0.25, 0);
    kinds.scrub = { trunk, canopy: cardCluster(14, 0.9, 0.9, 1.1, 0.9, 9, 0), canopyMode: "grass", height: 1.2 };
  }

  // DEAD burnt tree
  {
    const parts = [jitter(new THREE.CylinderGeometry(0.12, 0.3, 5, 7, 4).translate(0, 2.5, 0), 0.1, 5)];
    const r = mulberry32(42);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.CylinderGeometry(0.04, 0.1, 2.2, 5).translate(0, 1.1, 0);
      b.rotateZ(0.6 + r() * 0.5);
      b.rotateY(r() * Math.PI * 2);
      b.translate(0, 2.4 + i * 0.55, 0);
      parts.push(b);
    }
    kinds.dead = { trunk: mergeGeometries(parts), canopy: null, height: 5 };
  }
  return kinds;
}

// ---------------------------------------------------------------------------
// Main world builder
// ---------------------------------------------------------------------------
export function buildWorld(mission, renderer) {
  const S = mission.size;
  const env = mission.env;
  const th = THEATER[env.weather] || THEATER.rain;
  const night = Boolean(th.night);

  const root = new THREE.Group();
  const disposables = [];
  const colliders = [];
  const doors = [];
  const barrels = [];
  const lamps = [];
  const addCollider = (minX, maxX, minZ, maxZ, maxBulletY = 99, minBulletY = 0, blocksWalk = true) =>
    colliders.push({ minX, maxX, minZ, maxZ, minBulletY, maxBulletY, blocksWalk });

  const track = (o) => {
    disposables.push(o);
    return o;
  };

  // Material buckets (merged static geometry per material)
  const buckets = new Map();
  const bucket = (key, makeMat) => {
    if (!buckets.has(key)) buckets.set(key, { b: new GeoBuilder(), makeMat });
    return buckets.get(key).b;
  };
  const surf = (name, tint) => bucket(`s:${name}:${tint ? tint.join(",") : ""}`, () => getSurfaceMaterial(name, tint));
  const solid = (hex, rough = 0.8, metal = 0) =>
    bucket(`c:${hex}:${rough}:${metal}`, () => track(new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal })));
  const glow = (hex, intensity = 2.2) =>
    bucket(`e:${hex}:${intensity}`, () =>
      track(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: hex, emissiveIntensity: intensity, roughness: 0.4 }))
    );

  const shared = {
    darkMetal: track(new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.45, metalness: 0.7 })),
    rubber: track(new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.92 })),
    glass: track(
      new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })
    ),
    headlight: track(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2cc, emissiveIntensity: 2.4 })),
  };

  // ======================= TERRAIN =======================
  const M = 95;
  const T = S + M * 2;
  const seg = 220;
  const heightAt = (x, z) => {
    const dx = Math.max(-x, 0, x - S);
    const dz = Math.max(-z, 0, z - S);
    const d = Math.hypot(dx, dz);
    if (d < 1.5) return 0;
    const ramp = smooth(1.5, 55, d);
    const n = fbm(x * 0.022, z * 0.022);
    const ridges = 1 - Math.abs(fbm(x * 0.011 + 7, z * 0.011 + 3) * 2 - 1);
    return ramp * th.mountain * (0.35 + 0.65 * n) * (0.6 + 0.6 * ridges) + smooth(1.5, 12, d) * fbm(x * 0.2, z * 0.2) * 1.4;
  };

  const terrainGeo = new THREE.PlaneGeometry(T, T, seg, seg);
  terrainGeo.rotateX(-Math.PI / 2);
  {
    const p = terrainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + S / 2;
      const z = p.getZ(i) + S / 2;
      p.setY(i, heightAt(x, z));
    }
    terrainGeo.computeVertexNormals();
  }
  track(terrainGeo);

  // Road / yard mask painted on a canvas covering the whole terrain
  const maskSize = 1024;
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskCanvas.height = maskSize;
  {
    const ctx = maskCanvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, maskSize, maskSize);
    const toPx = (v) => ((v + M) / T) * maskSize;
    ctx.filter = "blur(3px)";
    ctx.strokeStyle = "#f00";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const r of mission.roads || []) {
      ctx.lineWidth = (r.w / T) * maskSize;
      ctx.beginPath();
      ctx.moveTo(toPx(r.ax), toPx(r.az));
      ctx.lineTo(toPx(r.bx), toPx(r.bz));
      ctx.stroke();
    }
    // packed-earth yards around buildings
    ctx.fillStyle = "rgba(255,0,0,0.75)";
    for (const b of mission.buildings) {
      ctx.fillRect(toPx(b.x - 2.5), toPx(b.z - 2.5), ((b.w + 5) / T) * maskSize, ((b.d + 5) / T) * maskSize);
    }
    // worn ground under the extraction pad
    ctx.beginPath();
    ctx.arc(toPx(mission.extraction.x), toPx(mission.extraction.z), (8 / T) * maskSize, 0, Math.PI * 2);
    ctx.fill();
  }
  const maskTex = track(new THREE.CanvasTexture(maskCanvas));
  maskTex.flipY = false;

  const ground = getTexturePair(env.groundTex);
  const groundNormal = track(loadFreshTexture(env.groundTex, "nor", false));
  groundNormal.repeat.set(T / 5, T / 5);
  const roadTex = getTexturePair(th.road).map;
  const rockTex = getTexturePair("cliff").map;

  const terrainMat = track(
    new THREE.MeshStandardMaterial({
      map: ground.map,
      normalMap: groundNormal,
      normalScale: new THREE.Vector2(1, 1),
      roughness: env.weather === "snow" ? 0.72 : 0.95,
    })
  );
  terrainMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uRoad: { value: roadTex },
      uRock: { value: rockTex },
      uMask: { value: maskTex },
      uMaskOffset: { value: M },
      uMaskSize: { value: T },
      uRockH: { value: new THREE.Vector2(th.rockH[0], th.rockH[1]) },
      uSnow: { value: th.snow },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWPos;
        uniform sampler2D uRoad; uniform sampler2D uRock; uniform sampler2D uMask;
        uniform float uMaskOffset; uniform float uMaskSize; uniform vec2 uRockH; uniform float uSnow;`
      )
      .replace(
        "#include <map_fragment>",
        `
        vec2 tuv = vWPos.xz / 5.0;
        vec4 gcol = texture2D(map, tuv);
        float macro = texture2D(map, tuv * 0.071 + 0.37).g;
        gcol.rgb *= 0.74 + 0.5 * macro;
        vec4 rcol = texture2D(uRoad, vWPos.xz / 4.0);
        vec4 kcol = texture2D(uRock, vWPos.xz / 11.0);
        vec4 msk = texture2D(uMask, (vWPos.xz + uMaskOffset) / uMaskSize);
        vec4 col = mix(gcol, rcol, clamp(msk.r * 1.15, 0.0, 1.0));
        col = mix(col, kcol, smoothstep(uRockH.x, uRockH.y, vWPos.y));
        col = mix(col, vec4(0.9, 0.93, 0.97, 1.0), uSnow * smoothstep(13.0, 21.0, vWPos.y));
        diffuseColor *= col;`
      );
  };
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.set(S / 2, 0, S / 2);
  terrain.receiveShadow = true;
  root.add(terrain);

  // ======================= SKY, CLOUDS, STARS =======================
  const sky = new Sky();
  sky.scale.setScalar(4500);
  const sd = new THREE.Vector3(...env.sunDir).normalize();
  const sunElevation = night ? -0.06 : Math.max(0.08, Math.asin(sd.y));
  const sunAz = Math.atan2(sd.z, sd.x);
  const sunPos = new THREE.Vector3(
    Math.cos(sunElevation) * Math.cos(sunAz),
    Math.sin(sunElevation),
    Math.cos(sunElevation) * Math.sin(sunAz)
  );
  const su = sky.material.uniforms;
  su.turbidity.value = th.turbidity;
  su.rayleigh.value = th.rayleigh;
  su.mieCoefficient.value = env.weather === "rain" || env.weather === "storm" ? 0.02 : 0.006;
  su.mieDirectionalG.value = 0.86;
  su.sunPosition.value.copy(sunPos);
  sky.material.fog = false;
  root.add(sky);
  track(sky.geometry);
  track(sky.material);

  // Image-based lighting from the sky for realistic PBR reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(1000);
  Object.keys(su).forEach((k) => {
    const v = su[k].value;
    envSky.material.uniforms[k].value = v && v.clone ? v.clone() : v;
  });
  envScene.add(envSky);
  const envRT = pmrem.fromScene(envScene, 0.02);
  envSky.geometry.dispose();
  envSky.material.dispose();
  pmrem.dispose();
  track(envRT);

  const cloudTex = getCloudTexture();
  const cloudMat = track(
    new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: th.cloud,
      depthWrite: false,
      fog: false,
      color: new THREE.Color(th.cloudTint, th.cloudTint, th.cloudTint * 1.02),
    })
  );
  cloudTex.repeat.set(4, 4);
  const clouds = new THREE.Mesh(track(new THREE.PlaneGeometry(3000, 3000)), cloudMat);
  clouds.rotation.x = Math.PI / 2;
  clouds.position.set(S / 2, 180, S / 2);
  clouds.renderOrder = -1;
  root.add(clouds);

  if (night) {
    const starGeo = track(new THREE.BufferGeometry());
    const pts = [];
    const r = mulberry32(5);
    for (let i = 0; i < 1600; i++) {
      const a = r() * Math.PI * 2;
      const e = 0.12 + r() * 1.4;
      pts.push(Math.cos(a) * Math.cos(e) * 1500 + S / 2, Math.sin(e) * 1500, Math.sin(a) * Math.cos(e) * 1500 + S / 2);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const stars = new THREE.Points(
      starGeo,
      track(new THREE.PointsMaterial({ color: 0xcfd8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }))
    );
    root.add(stars);
    const moon = new THREE.Sprite(
      track(new THREE.SpriteMaterial({ map: getSoftDot(), color: 0xdfe8ff, fog: false, depthWrite: false }))
    );
    moon.scale.setScalar(70);
    moon.position.set(S / 2 + sd.x * 1200, 520, S / 2 + sd.z * 1200);
    root.add(moon);
  }

  // ======================= LIGHTS =======================
  const sun = new THREE.DirectionalLight(new THREE.Color(...env.sunColor), th.sunI);
  if (night) sun.color.setRGB(0.55, 0.65, 0.95);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -48;
  sc.right = 48;
  sc.top = 48;
  sc.bottom = -48;
  sc.near = 1;
  sc.far = 320;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.045;
  root.add(sun);
  root.add(sun.target);
  const sunDirVec = night ? new THREE.Vector3(sd.x, 0.75, sd.z).normalize() : sunPos.clone().normalize();

  const skyCol = new THREE.Color(...env.skyTop).lerp(new THREE.Color(0xbfd3e6), night ? 0.1 : 0.55);
  const groundCol = new THREE.Color(...env.ambient).multiplyScalar(0.45);
  const hemi = new THREE.HemisphereLight(skyCol, groundCol, th.hemiI);
  root.add(hemi);

  // Pool of 4 nearest lamp lights + 1 flash light (fixed count avoids shader recompiles)
  const lampPool = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight(0xffd9a0, 0, 15, 1.8);
    root.add(l);
    return l;
  });
  const flash = new THREE.PointLight(0xffb060, 0, 22, 1.6);
  root.add(flash);

  // ======================= PERIMETER =======================
  if (th.fence === "wall") {
    const wb = surf("concrete", [0.78, 0.78, 0.76]);
    for (let a = 0; a < S; a += 2.5) {
      const h = 3.2 + ((a * 7.3) % 1) * 0.25;
      wb.box(a + 0.04, 0, -0.35, a + 2.46, h, 0.15, 2);
      wb.box(a + 0.04, 0, S - 0.15, a + 2.46, h, S + 0.35, 2);
      wb.box(-0.35, 0, a + 0.04, 0.15, h, a + 2.46, 2);
      wb.box(S - 0.15, 0, a + 0.04, S + 0.35, h, a + 2.46, 2);
    }
  } else {
    const postB = solid(0x6b6f73, 0.5, 0.7);
    for (let a = 0; a <= S; a += 3.2) {
      for (const [x, z] of [[a, 0], [a, S], [0, a], [S, a]]) postB.box(x - 0.05, 0, z - 0.05, x + 0.05, 3.1, z + 0.05, 1);
    }
    // top rails & barbed wire strands
    for (const y of [3.0, 3.25, 3.45]) {
      postB.box(0, y, -0.02, S, y + 0.02, 0.02, 1);
      postB.box(0, y, S - 0.02, S, y + 0.02, S + 0.02, 1);
      postB.box(-0.02, y, 0, 0.02, y + 0.02, S, 1);
      postB.box(S - 0.02, y, 0, S + 0.02, y + 0.02, S, 1);
    }
    const chain = getChainLink();
    const chainMat = track(
      new THREE.MeshStandardMaterial({ map: chain, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.7 })
    );
    chain.repeat.set(S / 1.2, 3.0 / 1.2);
    const fencePlane = track(new THREE.PlaneGeometry(S, 3.0));
    const placements = [
      [S / 2, 0, 0],
      [S / 2, S, Math.PI],
      [0, S / 2, Math.PI / 2],
      [S, S / 2, -Math.PI / 2],
    ];
    for (const [x, z, ry] of placements) {
      const m = new THREE.Mesh(fencePlane, chainMat);
      m.position.set(x, 1.5, z);
      m.rotation.y = ry;
      m.castShadow = true;
      root.add(m);
    }
  }
  addCollider(-2, S + 2, -2, 0.4);
  addCollider(-2, S + 2, S - 0.4, S + 2);
  addCollider(-2, 0.4, -2, S + 2);
  addCollider(S - 0.4, S + 2, -2, S + 2);

  // Ruined city skyline beyond the wall (urban theater)
  if (th.skyline) {
    const r = mulberry32(17);
    for (let i = 0; i < 46; i++) {
      const side = i % 4;
      const along = -30 + r() * (S + 60);
      const out = 14 + r() * 50;
      const x = side === 0 ? along : side === 1 ? along : side === 2 ? -out : S + out;
      const z = side === 0 ? -out : side === 1 ? S + out : along;
      const w = 8 + r() * 12;
      const d = 8 + r() * 12;
      const h = 10 + r() * 28;
      const y0 = heightAt(x, z) - 0.5;
      surf(r() > 0.5 ? "brick" : "concrete").box(x - w / 2, y0, z - d / 2, x + w / 2, y0 + h, z + d / 2, 3);
      // dark window grid
      const win = solid(0x0c0d10, 0.3, 0.2);
      for (let fy = y0 + 3; fy < y0 + h - 2; fy += 3.4) {
        for (let fx = -w / 2 + 1.5; fx < w / 2 - 1; fx += 2.6) {
          if (r() > 0.75) continue;
          win.box(x + fx, fy, z - d / 2 - 0.05, x + fx + 1.2, fy + 1.6, z - d / 2 + 0.05, 1);
          win.box(x + fx, fy, z + d / 2 - 0.05, x + fx + 1.2, fy + 1.6, z + d / 2 + 0.05, 1);
        }
      }
    }
  }

  // ======================= EXTRACTION HELIPAD =======================
  {
    const ex = mission.extraction.x;
    const ez = mission.extraction.z;
    const pad = new THREE.Mesh(
      track(new THREE.CircleGeometry(3.4, 48)),
      track(new THREE.MeshStandardMaterial({ map: getProcTexture("helipad"), roughness: 0.85 }))
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(ex, 0.03, ez);
    pad.receiveShadow = true;
    root.add(pad);
    const lights = glow(0x33ff99, 2.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const lx = ex + Math.cos(a) * 3.6;
      const lz = ez + Math.sin(a) * 3.6;
      lights.box(lx - 0.09, 0, lz - 0.09, lx + 0.09, 0.16, lz + 0.09, 1);
    }
  }

  // ======================= BUILDINGS =======================
  const wallT = 0.34;
  const doorW = 2.1;
  const doorH = 2.55;
  const winW = 2.2;
  const winY0 = 1.08;
  const winY1 = 2.38;
  const doorMat = track(
    new THREE.MeshStandardMaterial({ map: getProcTexture("door"), roughness: 0.6, metalness: 0.35 })
  );
  const trim = solid(0x2a2c2f, 0.6, 0.4);
  const screenMat = track(
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: getScreenTexture(), emissiveIntensity: 1.6 })
  );
  const screenGeo = track(new THREE.PlaneGeometry(1, 1));
  const glassPanes = [];

  for (const b of mission.buildings) {
    const wb = surf(b.wallTex);
    const rb = surf(b.roofTex);
    const fb = surf(b.floorTex);

    fb.quad([b.x + 0.1, 0.03, b.z + 0.1], [b.x + 0.1, 0.03, b.z + b.d - 0.1], [b.x + b.w - 0.1, 0.03, b.z + b.d - 0.1], [b.x + b.w - 0.1, 0.03, b.z + 0.1], [0, 1, 0], b.d / 2.2, b.w / 2.2);
    // roof slab with overhang + parapet trim
    rb.box(b.x - 0.3, b.h, b.z - 0.3, b.x + b.w + 0.3, b.h + 0.28, b.z + b.d + 0.3, 2.5);
    trim.box(b.x - 0.34, b.h + 0.28, b.z - 0.34, b.x + b.w + 0.34, b.h + 0.48, b.z - 0.2, 1);
    trim.box(b.x - 0.34, b.h + 0.28, b.z + b.d + 0.2, b.x + b.w + 0.34, b.h + 0.48, b.z + b.d + 0.34, 1);
    trim.box(b.x - 0.34, b.h + 0.28, b.z - 0.2, b.x - 0.2, b.h + 0.48, b.z + b.d + 0.2, 1);
    trim.box(b.x + b.w + 0.2, b.h + 0.28, b.z - 0.2, b.x + b.w + 0.34, b.h + 0.48, b.z + b.d + 0.2, 1);
    // base plinth strip
    surf("concrete", [0.62, 0.62, 0.6]).box(b.x - 0.06, 0, b.z - 0.06, b.x + b.w + 0.06, 0.22, b.z + b.d + 0.06, 1);

    // ceiling lamp
    const lx = b.x + b.w * 0.5;
    const lz = b.z + b.d * 0.5;
    const lc = b.interiorLight || [1, 0.9, 0.7];
    glow(new THREE.Color(...lc).getHex(), 2.6).box(lx - 0.5, b.h - 0.1, lz - 0.16, lx + 0.5, b.h - 0.01, lz + 0.16, 1);
    lamps.push({ x: lx, y: b.h - 0.35, z: lz, color: lc, indoor: true });

    const doorSides = new Set((b.doors || []).map((d) => d.side));
    const winSides = new Set(b.windows || []);

    const buildWallSide = (side) => {
      const horiz = side === "north" || side === "south";
      const span = horiz ? b.w : b.d;
      const fixed = side === "north" ? b.z : side === "south" ? b.z + b.d - wallT : side === "west" ? b.x : b.x + b.w - wallT;
      const start = horiz ? b.x : b.z;
      const seg = (s0, s1, y0, y1, colMaxY = 99, colMinY = 0, walk = true, target = wb) => {
        if (s1 - s0 <= 0.05) return;
        const x0 = horiz ? s0 : fixed;
        const x1 = horiz ? s1 : fixed + wallT;
        const z0 = horiz ? fixed : s0;
        const z1 = horiz ? fixed + wallT : s1;
        target.box(x0, y0, z0, x1, y1, z1, 2.2);
        if (walk || colMaxY < 99 || colMinY > 0) addCollider(x0, x1, z0, z1, colMaxY, colMinY, walk);
      };
      const mid = start + span * 0.5;
      const frame = (a0, a1, y0, y1) => {
        // thin frame around an opening, slightly proud of the wall
        const o = 0.05;
        const fx = (s0, s1, yy0, yy1) => {
          const x0 = horiz ? s0 : fixed - o;
          const x1 = horiz ? s1 : fixed + wallT + o;
          const z0 = horiz ? fixed - o : s0;
          const z1 = horiz ? fixed + wallT + o : s1;
          trim.box(x0, yy0, z0, x1, yy1, z1, 1);
        };
        fx(a0 - 0.1, a0, y0, y1);
        fx(a1, a1 + 0.1, y0, y1);
        fx(a0 - 0.1, a1 + 0.1, y1, y1 + 0.1);
      };

      if (doorSides.has(side)) {
        const d0 = mid - doorW * 0.5;
        const d1 = mid + doorW * 0.5;
        seg(start, d0, 0, b.h);
        seg(d1, start + span, 0, b.h);
        seg(d0, d1, doorH, b.h, 99, doorH, false);
        frame(d0, d1, 0, doorH);
        const pivot = new THREE.Group();
        pivot.position.set(horiz ? d0 : fixed + wallT * 0.5, 0, horiz ? fixed + wallT * 0.5 : d0);
        const baseAngle = horiz ? 0 : -Math.PI * 0.5;
        pivot.rotation.y = baseAngle;
        const dw = doorW - 0.1;
        const dh = doorH - 0.05;
        const leaf = new THREE.Mesh(track(new THREE.BoxGeometry(dw, dh, 0.07)), doorMat);
        leaf.position.set(dw / 2, dh / 2, 0);
        leaf.castShadow = true;
        leaf.receiveShadow = true;
        pivot.add(leaf);
        root.add(pivot);
        doors.push({
          pivot,
          baseAngle,
          openAmount: 0,
          cx: horiz ? mid : fixed + wallT * 0.5,
          cz: horiz ? fixed + wallT * 0.5 : mid,
        });
      } else if (winSides.has(side)) {
        const w0 = mid - winW * 0.5;
        const w1 = mid + winW * 0.5;
        seg(start, w0, 0, b.h);
        seg(w1, start + span, 0, b.h);
        seg(w0, w1, 0, winY0, winY0, 0, true);
        seg(w0, w1, winY1, b.h, 99, winY1, false);
        frame(w0, w1, winY0, winY1);
        // cracked glass pane (visual only; bullets pass through)
        const pane = new THREE.Mesh(screenGeo, shared.glass);
        pane.scale.set(winW, winY1 - winY0, 1);
        pane.position.set(horiz ? mid : fixed + wallT / 2, (winY0 + winY1) / 2, horiz ? fixed + wallT / 2 : mid);
        if (!horiz) pane.rotation.y = Math.PI / 2;
        glassPanes.push(pane);
        root.add(pane);
      } else {
        seg(start, start + span, 0, b.h);
      }
    };
    ["north", "south", "west", "east"].forEach(buildWallSide);

    for (const ip of b.interiorProps || []) {
      if (ip.kind === "crate") {
        crateAt(ip.x, ip.z, 0.55, 1.12);
      } else if (ip.kind === "desk") {
        surf("woodPlank", [0.7, 0.62, 0.52]).box(ip.x - 0.9, 0.72, ip.z - 0.5, ip.x + 0.9, 0.8, ip.z + 0.5, 1.2);
        const leg = solid(0x2b2b2b, 0.5, 0.6);
        for (const [ox, oz] of [[-0.82, -0.42], [0.76, -0.42], [-0.82, 0.36], [0.76, 0.36]]) leg.box(ip.x + ox, 0.03, ip.z + oz, ip.x + ox + 0.06, 0.72, ip.z + oz + 0.06, 1);
        // laptop + map sheet
        solid(0x1c1e22, 0.4, 0.5).box(ip.x - 0.25, 0.8, ip.z - 0.15, ip.x + 0.15, 0.82, ip.z + 0.15, 1);
        const lap = new THREE.Mesh(screenGeo, screenMat);
        lap.scale.set(0.4, 0.26, 1);
        lap.position.set(ip.x - 0.05, 0.95, ip.z - 0.16);
        lap.rotation.x = -0.25;
        root.add(lap);
        solid(0xcbbd94, 0.95).box(ip.x + 0.25, 0.8, ip.z - 0.3, ip.x + 0.8, 0.805, ip.z + 0.25, 1);
        addCollider(ip.x - 0.9, ip.x + 0.9, ip.z - 0.5, ip.z + 0.5, 0.86, 0, true);
      } else if (ip.kind === "console") {
        surf("arcticWall", [0.45, 0.5, 0.55]).box(ip.x - 0.75, 0.03, ip.z - 0.5, ip.x + 0.75, 1.55, ip.z + 0.5, 1);
        for (const side of [-1, 1]) {
          const scr = new THREE.Mesh(screenGeo, screenMat);
          scr.scale.set(1.2, 0.55, 1);
          scr.position.set(ip.x, 1.12, ip.z + side * 0.505);
          if (side < 0) scr.rotation.y = Math.PI;
          root.add(scr);
        }
        glow(0x44ff88, 3).box(ip.x - 0.6, 0.6, ip.z - 0.51, ip.x - 0.5, 0.66, ip.z + 0.51, 1);
        addCollider(ip.x - 0.75, ip.x + 0.75, ip.z - 0.5, ip.z + 0.5, 1.55, 0, true);
      }
    }
  }

  function crateAt(x, z, half, h) {
    surf("crate", [0.62, 0.66, 0.46]).box(x - half, 0.02, z - half, x + half, h, z + half, 1.1);
    const f = solid(0x3b3a2a, 0.85);
    const e = 0.06;
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      f.box(x + ox * half - e, 0.02, z + oz * half - e, x + ox * half + e, h + 0.01, z + oz * half + e, 1);
    }
    f.box(x - half - e, h - 0.06, z - half - e, x + half + e, h + 0.02, z + half + e, 1);
    addCollider(x - half, x + half, z - half, z + half, h, 0, true);
  }

  // ======================= SANDBAG INSTANCES =======================
  const bagMatrices = [];
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const bagRng = mulberry32(99);
  const addBagWall = (cx, cz, len, alongX) => {
    const bagL = 0.6;
    const rows = 6;
    const n = Math.max(2, Math.round(len / bagL));
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? bagL / 2 : 0;
      for (let depth = 0; depth < 2; depth++) {
        for (let i = 0; i < n - (row % 2 ? 1 : 0); i++) {
          const a = -len / 2 + bagL / 2 + i * bagL + off;
          const dd = (depth - 0.5) * 0.4;
          tmpP.set(alongX ? cx + a : cx + dd, 0.09 + row * 0.175, alongX ? cz + dd : cz + a);
          tmpQ.setFromEuler(new THREE.Euler((bagRng() - 0.5) * 0.08, (alongX ? 0 : Math.PI / 2) + (bagRng() - 0.5) * 0.15, (bagRng() - 0.5) * 0.08));
          tmpS.set(1 + (bagRng() - 0.5) * 0.08, 1, 1);
          bagMatrices.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
        }
      }
    }
  };

  // ======================= OUTDOOR PROPS =======================
  const truckParts = {
    wheel: track(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 18).rotateZ(Math.PI / 2)),
  };
  const truckPaint = track(new THREE.MeshStandardMaterial({ color: new THREE.Color(...env.uniform.jacket).multiplyScalar(1.15), roughness: 0.62, metalness: 0.35 }));
  const canvasMat = track(new THREE.MeshStandardMaterial({ map: getProcTexture("camoTent"), roughness: 0.95 }));

  const barrelGeo = track(new THREE.CylinderGeometry(0.34, 0.34, 1.12, 20).translate(0, 0.56, 0));
  const barrelMat = track(new THREE.MeshStandardMaterial({ map: getProcTexture("barrel"), roughness: 0.5, metalness: 0.55 }));
  const ribGeo = track(new THREE.TorusGeometry(0.345, 0.018, 6, 24).rotateX(Math.PI / 2));
  const wreckMat = track(new THREE.MeshStandardMaterial({ color: 0x16120f, roughness: 1 }));

  const addBarrel = (x, z) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(barrelGeo, barrelMat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    for (const y of [0.3, 0.82]) {
      const rib = new THREE.Mesh(ribGeo, barrelMat);
      rib.position.y = y;
      g.add(rib);
    }
    g.position.set(x, 0, z);
    g.rotation.y = x * 3.1;
    root.add(g);
    const wreck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.36, 0.42, 0.28, 12).translate(0, 0.14, 0)), wreckMat);
    wreck.position.set(x, 0, z);
    wreck.visible = false;
    root.add(wreck);
    barrels.push({ x, z, intact: true, hp: 35, mesh: g, wreck });
  };

  for (const p of mission.props || []) {
    if (p.kind === "sandbags") {
      const w = p.w || 3.2;
      const d = p.d || 0.9;
      const alongX = w >= d;
      addBagWall(p.x, p.z, Math.max(w, d), alongX);
      const hw = w / 2;
      const hd = d / 2;
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 1.08, 0, true);
    } else if (p.kind === "barrier") {
      const w = p.w || 3.4;
      const d = p.d || 0.7;
      const alongX = w >= d;
      const len = Math.max(w, d);
      const shape = new THREE.Shape();
      shape.moveTo(-0.35, 0);
      shape.lineTo(0.35, 0);
      shape.lineTo(0.33, 0.08);
      shape.lineTo(0.15, 0.3);
      shape.lineTo(0.1, 1.05);
      shape.lineTo(-0.1, 1.05);
      shape.lineTo(-0.15, 0.3);
      shape.lineTo(-0.33, 0.08);
      shape.closePath();
      const segs = Math.max(1, Math.round(len / 1.7));
      const segLen = len / segs;
      const geo = track(new THREE.ExtrudeGeometry(shape, { depth: segLen - 0.04, bevelEnabled: false }));
      // world-scaled UVs for the concrete texture
      geo.attributes.uv.array.forEach((v, i, arr) => (arr[i] = v / 1.6));
      for (let s = 0; s < segs; s++) {
        const m = new THREE.Mesh(geo, getSurfaceMaterial("concrete", [0.86, 0.86, 0.84]));
        const a = -len / 2 + s * segLen;
        if (alongX) {
          m.rotation.y = Math.PI / 2;
          m.position.set(p.x + a, 0, p.z);
        } else {
          m.position.set(p.x, 0, p.z + a);
        }
        m.castShadow = true;
        m.receiveShadow = true;
        root.add(m);
      }
      addCollider(p.x - w / 2, p.x + w / 2, p.z - d / 2, p.z + d / 2, 1.05, 0, true);
    } else if (p.kind === "tent") {
      const hw = 2.6;
      const hd = 2.2;
      const pole = solid(0x3a3d40, 0.6, 0.5);
      for (const ox of [-hw + 0.15, hw - 0.15]) {
        for (const oz of [-hd + 0.15, hd - 0.15]) {
          pole.box(p.x + ox - 0.05, 0, p.z + oz - 0.05, p.x + ox + 0.05, 2.6, p.z + oz + 0.05, 1);
          addCollider(p.x + ox - 0.16, p.x + ox + 0.16, p.z + oz - 0.16, p.z + oz + 0.16, 2.6, 0, true);
        }
      }
      pole.box(p.x - 0.05, 0, p.z - hd + 0.1, p.x + 0.05, 3.45, p.z - hd + 0.2, 1);
      pole.box(p.x - 0.05, 0, p.z + hd - 0.2, p.x + 0.05, 3.45, p.z + hd - 0.1, 1);
      // sloped canvas roof (ridge along z)
      const tb = bucket("tent", () => canvasMat);
      const e = 0.35;
      tb.quad([p.x - hw - e, 2.55, p.z - hd - e], [p.x - hw - e, 2.55, p.z + hd + e], [p.x, 3.45, p.z + hd + e], [p.x, 3.45, p.z - hd - e], [-0.7, 0.7, 0], 2.5, 1.5);
      tb.quad([p.x + hw + e, 2.55, p.z + hd + e], [p.x + hw + e, 2.55, p.z - hd - e], [p.x, 3.45, p.z - hd - e], [p.x, 3.45, p.z + hd + e], [0.7, 0.7, 0], 2.5, 1.5);
      tb.quad([p.x - hw - e, 2.55, p.z + hd + e], [p.x - hw - e, 2.55, p.z - hd - e], [p.x, 3.45, p.z - hd - e], [p.x, 3.45, p.z + hd + e], [-0.7, -0.7, 0], 2.5, 1.5);
      tb.quad([p.x + hw + e, 2.55, p.z - hd - e], [p.x + hw + e, 2.55, p.z + hd + e], [p.x, 3.45, p.z + hd + e], [p.x, 3.45, p.z - hd - e], [0.7, -0.7, 0], 2.5, 1.5);
      // folding table under the tent
      crateAt(p.x + 1, p.z, 0.4, 0.8);
    } else if (p.kind === "crate") {
      crateAt(p.x, p.z, 0.62, 1.22);
    } else if (p.kind === "container") {
      const hw = (p.w || 2.5) * 0.5;
      const hd = (p.d || 5.8) * 0.5;
      const tint = p.color === "red" ? [0.85, 0.32, 0.26] : [0.3, 0.5, 0.72];
      surf("corrugated", tint).box(p.x - hw, 0, p.z - hd, p.x + hw, 2.6, p.z + hd, 1.2);
      const bars = solid(0x2d2f31, 0.5, 0.7);
      for (const t of [-0.5, -0.15, 0.15, 0.5]) bars.box(p.x + t * hw * 1.6 - 0.03, 0.1, p.z + hd, p.x + t * hw * 1.6 + 0.03, 2.5, p.z + hd + 0.06, 1);
      bars.box(p.x - hw, 2.6, p.z - hd, p.x + hw, 2.72, p.z + hd, 1);
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 2.72, 0, true);
    } else if (p.kind === "truck") {
      const alongX = Math.abs(Math.sin(p.rot || 0)) > 0.6;
      const g = new THREE.Group();
      // build along +x, then rotate
      const box = (w, h, d, x, y, z, mat) => {
        const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        return m;
      };
      box(5.0, 0.35, 1.9, 0, 0.75, 0, shared.darkMetal); // chassis
      box(1.6, 1.25, 2.05, 1.65, 1.55, 0, truckPaint); // cab
      box(0.9, 0.7, 2.0, 2.75, 1.25, 0, truckPaint); // hood
      box(0.05, 0.6, 1.7, 2.46, 1.85, 0, shared.glass).rotation.z = 0.12; // windshield
      box(3.1, 0.12, 2.15, -0.9, 1.0, 0, truckPaint); // bed floor
      box(3.1, 0.55, 0.08, -0.9, 1.3, 1.05, truckPaint);
      box(3.1, 0.55, 0.08, -0.9, 1.3, -1.05, truckPaint);
      // canvas canopy (half cylinder)
      const canopy = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.1, 3.1, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI)), canvasMat);
      canopy.position.set(-0.9, 1.55, 0);
      canopy.rotation.x = Math.PI / 2;
      canopy.rotation.z = 0;
      canopy.castShadow = true;
      g.add(canopy);
      box(0.18, 0.3, 2.1, 3.25, 0.85, 0, shared.darkMetal); // bumper
      for (const z of [-0.65, 0.65]) box(0.06, 0.18, 0.3, 3.22, 1.2, z, shared.headlight);
      for (const [wx, wz] of [[2.0, 1.0], [2.0, -1.0], [-1.4, 1.0], [-1.4, -1.0], [-2.2, 1.0], [-2.2, -1.0]]) {
        const w = new THREE.Mesh(truckParts.wheel, shared.rubber);
        w.position.set(wx, 0.46, wz);
        w.castShadow = true;
        g.add(w);
      }
      g.position.set(p.x, 0, p.z);
      g.rotation.y = alongX ? 0 : Math.PI / 2;
      root.add(g);
      const hw = alongX ? 2.6 : 1.15;
      const hd = alongX ? 1.15 : 2.6;
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 2.55, 0, true);
    } else if (p.kind === "watchtower") {
      const r = 1.25;
      const wood = surf("woodPlank", [0.75, 0.68, 0.58]);
      for (const ox of [-r, r]) {
        for (const oz of [-r, r]) {
          wood.box(p.x + ox - 0.12, 0, p.z + oz - 0.12, p.x + ox + 0.12, 5.4, p.z + oz + 0.12, 1.2);
          addCollider(p.x + ox - 0.2, p.x + ox + 0.2, p.z + oz - 0.2, p.z + oz + 0.2, 5.4, 0, true);
        }
      }
      wood.box(p.x - r - 0.3, 3.2, p.z - r - 0.3, p.x + r + 0.3, 3.4, p.z + r + 0.3, 1.5);
      // railings
      for (const [x0, z0, x1, z1] of [
        [-r - 0.3, -r - 0.3, r + 0.3, -r - 0.22],
        [-r - 0.3, r + 0.22, r + 0.3, r + 0.3],
        [-r - 0.3, -r - 0.3, -r - 0.22, r + 0.3],
        [r + 0.22, -r - 0.3, r + 0.3, r + 0.3],
      ]) {
        wood.box(p.x + x0, 4.25, p.z + z0, p.x + x1, 4.35, p.z + z1, 1);
        wood.box(p.x + x0, 3.4, p.z + z0, p.x + x1, 4.0, p.z + z1, 1);
      }
      surf("corrugated", [0.7, 0.7, 0.7]).box(p.x - r - 0.5, 5.4, p.z - r - 0.5, p.x + r + 0.5, 5.55, p.z + r + 0.5, 1.5);
      // diagonal braces
      const braceGeo = track(new THREE.BoxGeometry(0.1, 3.6, 0.1));
      for (const side of [-1, 1]) {
        const br = new THREE.Mesh(braceGeo, getSurfaceMaterial("woodPlank", [0.75, 0.68, 0.58]));
        br.position.set(p.x, 1.6, p.z + side * r);
        br.rotation.z = 0.62;
        br.castShadow = true;
        root.add(br);
      }
      // searchlight
      glow(0xfff1c8, 2.2).box(p.x - 0.15, 4.4, p.z - 0.15, p.x + 0.15, 4.65, p.z + 0.15, 1);
      lamps.push({ x: p.x, y: 4.5, z: p.z, color: [1, 0.92, 0.75] });
    } else if (p.kind === "lamp") {
      const pole = solid(0x3a3f45, 0.45, 0.7);
      pole.box(p.x - 0.08, 0, p.z - 0.08, p.x + 0.08, 5.0, p.z + 0.08, 1);
      pole.box(p.x - 0.08, 4.85, p.z - 0.08, p.x + 0.9, 4.95, p.z + 0.08, 1);
      solid(0x22252a, 0.4, 0.6).box(p.x + 0.55, 4.7, p.z - 0.2, p.x + 1.05, 4.85, p.z + 0.2, 1);
      glow(0xffe2b0, 3).box(p.x + 0.6, 4.66, p.z - 0.16, p.x + 1.0, 4.7, p.z + 0.16, 1);
      addCollider(p.x - 0.2, p.x + 0.2, p.z - 0.2, p.z + 0.2, 5, 0, true);
      lamps.push({ x: p.x + 0.8, y: 4.4, z: p.z, color: [1.0, 0.86, 0.6] });
    } else if (p.kind === "barrel") {
      addBarrel(p.x, p.z);
    }
  }

  if (bagMatrices.length) {
    const bagGeo = track(new THREE.SphereGeometry(0.5, 12, 8));
    {
      const pa = bagGeo.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i);
        const y = pa.getY(i);
        const z = pa.getZ(i);
        // pillow shape: flatten top/bottom, square-ish corners
        pa.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x * 2), 0.6) * 0.31, y * 0.2, Math.sign(z) * Math.pow(Math.abs(z * 2), 0.7) * 0.2);
      }
      bagGeo.computeVertexNormals();
    }
    const bags = new THREE.InstancedMesh(bagGeo, getSurfaceMaterial("sandbags"), bagMatrices.length);
    bagMatrices.forEach((m, i) => bags.setMatrixAt(i, m));
    bags.castShadow = true;
    bags.receiveShadow = true;
    root.add(bags);
  }

  // ======================= VEGETATION =======================
  const snowy = env.weather === "snow" || env.weather === "storm";
  const kinds = makeTreeKinds(snowy);
  Object.values(kinds).forEach((k) => {
    track(k.trunk);
    if (k.canopy) track(k.canopy);
  });
  const barkMat = getSurfaceMaterial("bark");
  const frondTex = getFrondTexture();
  const grassTex = getGrassTexture();
  const canopyMats = {
    solid: track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: false })),
    card: track(
      new THREE.MeshStandardMaterial({
        map: frondTex,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.85,
        color: env.weather === "dust" ? 0xb7b07a : 0xffffff,
      })
    ),
    grass: track(
      new THREE.MeshStandardMaterial({
        map: grassTex,
        alphaTest: 0.4,
        side: THREE.DoubleSide,
        roughness: 0.95,
        color: new THREE.Color(1.0, 0.85, 0.55),
      })
    ),
  };
  addWind(canopyMats.solid, 0.35);
  addWind(canopyMats.card, 0.7);
  addWind(canopyMats.grass, 1.2);

  const byKind = {};
  for (const t of mission.trees || []) (byKind[t.kind] ||= []).push(t);
  for (const [kindName, list] of Object.entries(byKind)) {
    const k = kinds[kindName] || kinds.pine;
    const trunks = new THREE.InstancedMesh(k.trunk, barkMat, list.length);
    const canopy = k.canopy ? new THREE.InstancedMesh(k.canopy, canopyMats[k.canopyMode], list.length) : null;
    list.forEach((t, i) => {
      const y = t.collide ? 0 : heightAt(t.x, t.z) - 0.2;
      tmpP.set(t.x, y, t.z);
      tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r);
      tmpS.setScalar(t.s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      trunks.setMatrixAt(i, tmpM);
      if (canopy) canopy.setMatrixAt(i, tmpM);
      if (t.collide && kindName !== "scrub") {
        const r = 0.32 * t.s;
        addCollider(t.x - r, t.x + r, t.z - r, t.z + r, k.height * t.s, 0, true);
      }
    });
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    root.add(trunks);
    if (canopy) {
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      root.add(canopy);
    }
  }

  // Rocks
  if (mission.rocks && mission.rocks.length) {
    const rockGeo = track(jitter(new THREE.DodecahedronGeometry(1, 2), 0.32, 8));
    {
      // world-ish triplanar-free UVs: planar projection works fine on boulders
      const pa = rockGeo.attributes.position;
      const uv = rockGeo.attributes.uv;
      for (let i = 0; i < pa.count; i++) uv.setXY(i, pa.getX(i) * 0.6 + pa.getZ(i) * 0.3, pa.getY(i) * 0.6);
    }
    const rockMat = getSurfaceMaterial("rock", snowy ? [0.9, 0.92, 0.95] : [0.85, 0.8, 0.74]);
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, mission.rocks.length);
    mission.rocks.forEach((r, i) => {
      const y = r.collide ? r.s * 0.15 : heightAt(r.x, r.z) + r.s * 0.1;
      tmpP.set(r.x, y, r.z);
      tmpQ.setFromEuler(new THREE.Euler(r.r * 0.3, r.r, r.r * 0.2));
      tmpS.set(r.s, r.s * 0.62, r.s * 0.88);
      tmpM.compose(tmpP, tmpQ, tmpS);
      rocks.setMatrixAt(i, tmpM);
      if (r.collide) {
        const h = r.s * 0.7;
        addCollider(r.x - r.s * 0.75, r.x + r.s * 0.75, r.z - r.s * 0.75, r.z + r.s * 0.75, h, 0, true);
      }
    });
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    root.add(rocks);
  }

  // Grass tufts (visual only)
  if (mission.grass && mission.grass.length) {
    const tuft = [];
    for (let i = 0; i < 3; i++) {
      tuft.push(new THREE.PlaneGeometry(0.9, 0.5).translate(0, 0.25, 0).rotateY((i / 3) * Math.PI));
    }
    const tuftGeo = track(mergeGeometries(tuft));
    const grassMat = track(
      new THREE.MeshStandardMaterial({
        map: grassTex,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 1,
        color: new THREE.Color(...th.grassTint),
      })
    );
    addWind(grassMat, 1.6);
    const grass = new THREE.InstancedMesh(tuftGeo, grassMat, mission.grass.length);
    mission.grass.forEach((g, i) => {
      tmpP.set(g.x, 0, g.z);
      tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), g.r);
      tmpS.set(g.s, g.s * (0.8 + (i % 5) * 0.1), g.s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      grass.setMatrixAt(i, tmpM);
    });
    grass.receiveShadow = true;
    root.add(grass);
  }

  // ======================= FLUSH MERGED BUCKETS =======================
  for (const { b, makeMat } of buckets.values()) {
    if (b.empty) continue;
    const geo = track(b.toGeometry());
    const mesh = new THREE.Mesh(geo, makeMat());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // ======================= PER-FRAME UPDATE =======================
  const lampSorted = [];
  const tmpV = new THREE.Vector3();
  const baseHemi = hemi.intensity;
  const baseSun = sun.intensity;

  function update(time, camPos, { lightning = 0, flashPos = null, flashIntensity = 0, flashColor = null } = {}) {
    windUniforms.uTime.value = time;
    cloudTex.offset.x = time * 0.0018;
    cloudTex.offset.y = time * 0.0007;

    // Shadow camera follows the player (snapped to texels to avoid shimmering)
    const texel = 96 / 2048;
    const fx = Math.round(camPos.x / texel) * texel;
    const fz = Math.round(camPos.z / texel) * texel;
    sun.target.position.set(fx, 0, fz);
    sun.position.set(fx + sunDirVec.x * 120, sunDirVec.y * 120, fz + sunDirVec.z * 120);

    hemi.intensity = baseHemi + lightning * 2.5;
    sun.intensity = baseSun + lightning * 3;

    // Nearest lamps get the 4 pooled lights
    lampSorted.length = 0;
    for (const l of lamps) {
      l._d = Math.hypot(l.x - camPos.x, l.z - camPos.z);
      if (l._d < 40) lampSorted.push(l);
    }
    lampSorted.sort((a, b) => a._d - b._d);
    lampPool.forEach((pl, i) => {
      const l = lampSorted[i];
      if (!l) {
        pl.intensity = 0;
        return;
      }
      pl.position.set(l.x, l.y, l.z);
      pl.color.setRGB(l.color[0], l.color[1], l.color[2]);
      pl.intensity = (l.indoor ? 7 : 9) * (night ? 1.6 : 1) * Math.min(1, (40 - l._d) / 10);
    });

    if (flashPos && flashIntensity > 0) {
      flash.position.copy(flashPos);
      flash.intensity = flashIntensity;
      if (flashColor) flash.color.copy(flashColor);
    } else {
      flash.intensity = 0;
    }
    void tmpV;
  }

  function dispose() {
    root.removeFromParent();
    disposables.forEach((d) => d.dispose && d.dispose());
    root.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
    });
  }

  return {
    root,
    colliders,
    doors,
    barrels,
    lamps,
    heightAt,
    envMap: envRT.texture,
    sunDir: sunDirVec,
    fogColor: new THREE.Color(...env.fogColor),
    night,
    update,
    dispose,
  };
}
