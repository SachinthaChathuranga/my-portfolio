/**
 * VANGUARD: FRONTLINE OPS — Zero-Dependency GPU-Accelerated WebGL 3D Engine
 * Renders true 3D enterable buildings (openable doors, shoot-through windows, ceilings, indoor lights),
 * 3D military vehicles/cover/trees/mountains, articulated 3D animated soldiers, grenades & fireballs!
 */

const VERT_SRC = `
attribute vec3 aPos;
attribute vec3 aNorm;
attribute vec2 aUV;
attribute vec3 aCol;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;

varying vec3 vWorldPos;
varying vec3 vNorm;
varying vec2 vUV;
varying vec3 vCol;

void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorldPos = wp.xyz;
  // Rotate normal by upper 3x3 of uModel (uniform or axis-aligned scaling safe after normalize)
  vNorm = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNorm);
  vUV = aUV;
  vCol = aCol;
  gl_Position = uProj * uView * wp;
}
`;

const FRAG_SRC = `
precision mediump float;

varying vec3 vWorldPos;
varying vec3 vNorm;
varying vec2 vUV;
varying vec3 vCol;

uniform sampler2D uTex;
uniform float uUseTex;
uniform vec3 uTint;
uniform float uEmissive;
uniform float uAlpha;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
uniform float uFogDensity;

uniform vec3 uPointPos;
uniform vec3 uPointColor;
uniform float uPointIntensity;
uniform float uNvg;

void main() {
  vec3 base = vCol * uTint;
  if (uUseTex > 0.5) {
    base *= texture2D(uTex, vUV).rgb;
  }

  vec3 N = normalize(vNorm);
  vec3 L = normalize(uSunDir);
  float ndl = max(dot(N, L), 0.0);
  float hemi = 0.5 + 0.5 * N.y;

  vec3 lit = base * (uAmbient * (0.72 + 0.35 * hemi) + uSunColor * ndl * 0.88);

  // Dynamic point light (muzzle flash, grenade explosion, indoor ceiling lamp!)
  if (uPointIntensity > 0.01) {
    vec3 toLight = uPointPos - vWorldPos;
    float d = length(toLight);
    float atten = uPointIntensity / (1.0 + 0.12 * d + 0.055 * d * d);
    float pNdl = max(dot(N, normalize(toLight)), 0.25);
    lit += base * uPointColor * atten * pNdl;
  }

  // Emissive surfaces (lamps, muzzle flash, fireballs, terminals)
  lit = mix(lit, base * 1.25, uEmissive);

  // Atmospheric distance fog
  float dist = length(uCamPos - vWorldPos);
  float fogF = 1.0 - exp(-pow(dist * uFogDensity, 1.45));
  vec3 finalRgb = mix(lit, uFogColor, clamp(fogF, 0.0, 0.94));

  // Optional Night-Vision Goggles (NVG) green phosphor amplification
  if (uNvg > 0.5) {
    float lum = dot(finalRgb, vec3(0.299, 0.587, 0.114));
    float boosted = clamp(pow(lum * 2.15 + 0.06, 0.82), 0.0, 1.0);
    finalRgb = vec3(boosted * 0.22, boosted * 1.0, boosted * 0.38);
  }

  gl_FragColor = vec4(finalRgb, uAlpha);
}
`;

// ================= MATRIX MATH =================
export function mat4Identity() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mat4Perspective(fovRad, aspect, near, far) {
  const f = 1 / Math.tan(fovRad * 0.5);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / Math.max(0.1, aspect);
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

export function mat4LookAt(eye, target, up) {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const m = new Float32Array(16);
  m[0] = xx;
  m[1] = yx;
  m[2] = zx;
  m[3] = 0;
  m[4] = xy;
  m[5] = yy;
  m[6] = zy;
  m[7] = 0;
  m[8] = xz;
  m[9] = yz;
  m[10] = zz;
  m[11] = 0;
  m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  m[15] = 1;
  return m;
}

export function mat4Transform(tx, ty, tz, rotY, sx, sy, sz, rotX = 0) {
  const cy = Math.cos(rotY);
  const syr = Math.sin(rotY);
  const cx = Math.cos(rotX);
  const sxr = Math.sin(rotX);

  // R = Ry * Rx, then scale (sx,sy,sz), then translate (tx,ty,tz)
  const m = new Float32Array(16);
  m[0] = cy * sx;
  m[1] = 0;
  m[2] = -syr * sx;
  m[3] = 0;

  m[4] = syr * sxr * sy;
  m[5] = cx * sy;
  m[6] = cy * sxr * sy;
  m[7] = 0;

  m[8] = syr * cx * sz;
  m[9] = -sxr * sz;
  m[10] = cy * cx * sz;
  m[11] = 0;

  m[12] = tx;
  m[13] = ty;
  m[14] = tz;
  m[15] = 1;
  return m;
}

// ================= GEOMETRY BUILDER =================
function createBuilder() {
  return { pos: [], norm: [], uv: [], col: [] };
}

function pushQuad(b, p0, p1, p2, p3, n, uScale, vScale, c = [1, 1, 1]) {
  const verts = [p0, p1, p2, p0, p2, p3];
  const uvs = [
    [0, vScale],
    [uScale, vScale],
    [uScale, 0],
    [0, vScale],
    [uScale, 0],
    [0, 0],
  ];
  for (let i = 0; i < 6; i++) {
    b.pos.push(verts[i][0], verts[i][1], verts[i][2]);
    b.norm.push(n[0], n[1], n[2]);
    b.uv.push(uvs[i][0], uvs[i][1]);
    b.col.push(c[0], c[1], c[2]);
  }
}

/** Add an axis-aligned 3D box (minX..maxX, minY..maxY, minZ..maxZ) with tiled UVs */
function pushBox(b, x0, y0, z0, x1, y1, z1, tile = 2.0, col = [1, 1, 1]) {
  const w = Math.max(0.01, x1 - x0);
  const h = Math.max(0.01, y1 - y0);
  const d = Math.max(0.01, z1 - z0);
  const uW = Math.max(0.5, w / tile);
  const uH = Math.max(0.5, h / tile);
  const uD = Math.max(0.5, d / tile);

  // Front (+Z)
  pushQuad(b, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], uW, uH, col);
  // Back (-Z)
  pushQuad(b, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], uW, uH, col);
  // Right (+X)
  pushQuad(b, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], uD, uH, col);
  // Left (-X)
  pushQuad(b, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], uD, uH, col);
  // Top (+Y)
  pushQuad(b, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], uW, uD, col);
  // Bottom (-Y)
  pushQuad(b, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], uW, uD, col);
}

function uploadMesh(gl, b) {
  const count = b.pos.length / 3;
  const makeBuf = (arr) => {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    return buf;
  };
  return {
    count,
    pos: makeBuf(b.pos),
    norm: makeBuf(b.norm),
    uv: makeBuf(b.uv),
    col: makeBuf(b.col),
  };
}

function disposeMesh(gl, mesh) {
  if (!mesh) return;
  gl.deleteBuffer(mesh.pos);
  gl.deleteBuffer(mesh.norm);
  gl.deleteBuffer(mesh.uv);
  gl.deleteBuffer(mesh.col);
}

// ================= CORE WEBGL RENDERER =================
export function createWebGLRenderer(canvas) {
  const gl =
    canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" }) ||
    canvas.getContext("experimental-webgl");
  if (!gl) return null;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("[VanguardGL Shader Error]", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("[VanguardGL Link Error]", gl.getProgramInfoLog(prog));
    return null;
  }

  const loc = {
    aPos: gl.getAttribLocation(prog, "aPos"),
    aNorm: gl.getAttribLocation(prog, "aNorm"),
    aUV: gl.getAttribLocation(prog, "aUV"),
    aCol: gl.getAttribLocation(prog, "aCol"),
    uProj: gl.getUniformLocation(prog, "uProj"),
    uView: gl.getUniformLocation(prog, "uView"),
    uModel: gl.getUniformLocation(prog, "uModel"),
    uTex: gl.getUniformLocation(prog, "uTex"),
    uUseTex: gl.getUniformLocation(prog, "uUseTex"),
    uTint: gl.getUniformLocation(prog, "uTint"),
    uEmissive: gl.getUniformLocation(prog, "uEmissive"),
    uAlpha: gl.getUniformLocation(prog, "uAlpha"),
    uCamPos: gl.getUniformLocation(prog, "uCamPos"),
    uSunDir: gl.getUniformLocation(prog, "uSunDir"),
    uSunColor: gl.getUniformLocation(prog, "uSunColor"),
    uAmbient: gl.getUniformLocation(prog, "uAmbient"),
    uFogColor: gl.getUniformLocation(prog, "uFogColor"),
    uFogDensity: gl.getUniformLocation(prog, "uFogDensity"),
    uPointPos: gl.getUniformLocation(prog, "uPointPos"),
    uPointColor: gl.getUniformLocation(prog, "uPointColor"),
    uPointIntensity: gl.getUniformLocation(prog, "uPointIntensity"),
    uNvg: gl.getUniformLocation(prog, "uNvg"),
  };

  // Reusable unit 1x1x1 centered box primitive for dynamic soldiers, doors, vehicles, tracers, explosions
  const ub = createBuilder();
  pushBox(ub, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 1.0, [1, 1, 1]);
  const unitBox = uploadMesh(gl, ub);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const identity = mat4Identity();

  const drawMesh = (mesh, modelMat, tex, tint = [1, 1, 1], emissive = 0, alpha = 1) => {
    if (!mesh || mesh.count === 0) return;

    gl.uniformMatrix4fv(loc.uModel, false, modelMat || identity);
    gl.uniform3fv(loc.uTint, tint);
    gl.uniform1f(loc.uEmissive, emissive);
    gl.uniform1f(loc.uAlpha, alpha);

    if (tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(loc.uTex, 0);
      gl.uniform1f(loc.uUseTex, 1.0);
    } else {
      gl.uniform1f(loc.uUseTex, 0.0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
    gl.enableVertexAttribArray(loc.aNorm);
    gl.vertexAttribPointer(loc.aNorm, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
    gl.enableVertexAttribArray(loc.aUV);
    gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.col);
    gl.enableVertexAttribArray(loc.aCol);
    gl.vertexAttribPointer(loc.aCol, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  };

  return { gl, prog, loc, unitBox, drawMesh };
}

// ================= MISSION WORLD GEOMETRY & COLLIDER GENERATOR =================
export function buildMissionWorld(gl, mission) {
  const buckets = {};
  const solidBucket = createBuilder();
  const emissiveBucket = createBuilder();
  const colliders = []; // { minX, maxX, minZ, maxZ, minBulletY, maxBulletY, blocksWalk }
  const doors = [];
  const barrels = [];
  const lamps = [];

  const getBucket = (texName) => {
    if (!buckets[texName]) buckets[texName] = createBuilder();
    return buckets[texName];
  };

  const addCollider = (minX, maxX, minZ, maxZ, maxBulletY = 99, minBulletY = 0, blocksWalk = true) => {
    colliders.push({ minX, maxX, minZ, maxZ, minBulletY, maxBulletY, blocksWalk });
  };

  const S = mission.size;
  const env = mission.env;

  // 1. Textured Battlefield Ground Plane (extends beyond perimeter for seamless horizon)
  pushQuad(
    getBucket(env.groundTex),
    [-25, 0, S + 25],
    [S + 25, 0, S + 25],
    [S + 25, 0, -25],
    [-25, 0, -25],
    [0, 1, 0],
    34,
    34,
    [1, 1, 1]
  );

  // 2. Outer Perimeter Fortification Walls
  const pTex = getBucket(env.perimeterTex);
  const pH = 4.2;
  const pT = 0.7;
  // North, South, West, East
  pushBox(pTex, -pT, 0, -pT, S + pT, pH, 0.2, 2.5);
  pushBox(pTex, -pT, 0, S - 0.2, S + pT, pH, S + pT, 2.5);
  pushBox(pTex, -pT, 0, 0, 0.2, pH, S, 2.5);
  pushBox(pTex, S - 0.2, 0, 0, S + pT, pH, S, 2.5);

  addCollider(-2, S + 2, -2, 0.4);
  addCollider(-2, S + 2, S - 0.4, S + 2);
  addCollider(-2, 0.4, -2, S + 2);
  addCollider(S - 0.4, S + 2, -2, S + 2);

  // 3. Distant 3D Horizon Mountain Ring / Urban Ruined Towers (Unique per theater!)
  const mCol = env.mountainColor;
  const cx = S * 0.5;
  const cz = S * 0.5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const dist = S * 0.95 + (i % 3) * 8;
    const mx = cx + Math.cos(a) * dist;
    const mz = cz + Math.sin(a) * dist;
    const mw = env.treeStyle === "dead" ? 8 + (i % 4) * 3 : 16 + (i % 5) * 4;
    const mh = env.treeStyle === "dead" ? 12 + (i % 5) * 5 : 14 + (i % 4) * 6;
    const shade = 0.85 + (i % 3) * 0.1;
    pushBox(
      solidBucket,
      mx - mw * 0.5,
      -0.5,
      mz - mw * 0.5,
      mx + mw * 0.5,
      mh,
      mz + mw * 0.5,
      4,
      [mCol[0] * shade, mCol[1] * shade, mCol[2] * shade]
    );
  }

  // 4. Enterable Multi-Room Buildings (Doors + Shoot-Through Windows + Floors + Roofs + Indoor Lights!)
  const wallT = 0.34;
  const doorW = 2.1;
  const doorH = 2.55;
  const winW = 2.2;
  const winY0 = 1.08;
  const winY1 = 2.38;

  for (const b of mission.buildings) {
    const wb = getBucket(b.wallTex);
    const rb = getBucket(b.roofTex);
    const fb = getBucket(b.floorTex);

    // Indoor floor (slightly above outdoor ground to avoid z-fighting)
    pushQuad(
      fb,
      [b.x + 0.1, 0.03, b.z + b.d - 0.1],
      [b.x + b.w - 0.1, 0.03, b.z + b.d - 0.1],
      [b.x + b.w - 0.1, 0.03, b.z + 0.1],
      [b.x + 0.1, 0.03, b.z + 0.1],
      [0, 1, 0],
      b.w / 2.2,
      b.d / 2.2,
      [0.95, 0.95, 0.95]
    );

    // Solid Roof + Interior Ceiling
    pushBox(rb, b.x - 0.25, b.h, b.z - 0.25, b.x + b.w + 0.25, b.h + 0.3, b.z + b.d + 0.25, 2.5);
    // Glowing Interior Ceiling Lamp Fixture
    const lx = b.x + b.w * 0.5;
    const lz = b.z + b.d * 0.5;
    pushBox(
      emissiveBucket,
      lx - 0.45,
      b.h - 0.12,
      lz - 0.25,
      lx + 0.45,
      b.h - 0.01,
      lz + 0.25,
      1,
      b.interiorLight || [1, 0.9, 0.7]
    );
    lamps.push({ x: lx, y: b.h - 0.25, z: lz, color: b.interiorLight || [1, 0.9, 0.7] });

    const doorSides = new Set((b.doors || []).map((d) => d.side));
    const winSides = new Set(b.windows || []);

    const buildWallSide = (side) => {
      const horiz = side === "north" || side === "south";
      const span = horiz ? b.w : b.d;
      const fixedCoord =
        side === "north" ? b.z : side === "south" ? b.z + b.d - wallT : side === "west" ? b.x : b.x + b.w - wallT;
      const startCoord = horiz ? b.x : b.z;

      const emitSeg = (s0, s1, y0, y1, colMaxY = 99, colMinY = 0, walkBlock = true) => {
        if (s1 - s0 <= 0.05) return;
        const x0 = horiz ? s0 : fixedCoord;
        const x1 = horiz ? s1 : fixedCoord + wallT;
        const z0 = horiz ? fixedCoord : s0;
        const z1 = horiz ? fixedCoord + wallT : s1;
        pushBox(wb, x0, y0, z0, x1, y1, z1, 2.2);
        if (walkBlock || colMaxY < 99 || colMinY > 0) {
          addCollider(x0, x1, z0, z1, colMaxY, colMinY, walkBlock);
        }
      };

      const mid = startCoord + span * 0.5;

      if (doorSides.has(side)) {
        const d0 = mid - doorW * 0.5;
        const d1 = mid + doorW * 0.5;
        emitSeg(startCoord, d0, 0, b.h);
        emitSeg(d1, startCoord + span, 0, b.h);
        // Header lintel above doorway (no walking block!)
        emitSeg(d0, d1, doorH, b.h, 99, doorH, false);

        // Animated hinged 3D door panel
        doors.push({
          hingeX: horiz ? d0 : fixedCoord + wallT * 0.5,
          hingeZ: horiz ? fixedCoord + wallT * 0.5 : d0,
          baseAngle: horiz ? 0 : -Math.PI * 0.5,
          openAmount: 0,
          w: doorW - 0.1,
          h: doorH - 0.05,
          cx: horiz ? mid : fixedCoord + wallT * 0.5,
          cz: horiz ? fixedCoord + wallT * 0.5 : mid,
        });
      } else if (winSides.has(side)) {
        const w0 = mid - winW * 0.5;
        const w1 = mid + winW * 0.5;
        emitSeg(startCoord, w0, 0, b.h);
        emitSeg(w1, startCoord + span, 0, b.h);
        // Window lower sill (blocks walking, bullets pass ABOVE winY0!)
        emitSeg(w0, w1, 0, winY0, winY0, 0, true);
        // Window upper header (bullets pass BELOW winY1!)
        emitSeg(w0, w1, winY1, b.h, 99, winY1, false);
        // Dark window frame trim
        const fx0 = horiz ? w0 : fixedCoord - 0.04;
        const fx1 = horiz ? w1 : fixedCoord + wallT + 0.04;
        const fz0 = horiz ? fixedCoord - 0.04 : w0;
        const fz1 = horiz ? fixedCoord + wallT + 0.04 : w1;
        pushBox(solidBucket, fx0, winY0 - 0.06, fz0, fx1, winY0 + 0.04, fz1, 1, [0.16, 0.18, 0.22]);
      } else {
        emitSeg(startCoord, startCoord + span, 0, b.h);
      }
    };

    buildWallSide("north");
    buildWallSide("south");
    buildWallSide("west");
    buildWallSide("east");

    // Interior Props (Command Desks, Server Consoles, Crates inside buildings!)
    for (const ip of b.interiorProps || []) {
      if (ip.kind === "crate") {
        pushBox(getBucket("crate"), ip.x - 0.55, 0.03, ip.z - 0.55, ip.x + 0.55, 1.15, ip.z + 0.55, 1.1);
        addCollider(ip.x - 0.55, ip.x + 0.55, ip.z - 0.55, ip.z + 0.55, 1.15, 0, true);
      } else if (ip.kind === "desk") {
        // Wooden tactical table + map top
        pushBox(getBucket("woodPlank"), ip.x - 0.9, 0.72, ip.z - 0.5, ip.x + 0.9, 0.84, ip.z + 0.5, 1.2);
        pushBox(solidBucket, ip.x - 0.8, 0.03, ip.z - 0.4, ip.x - 0.68, 0.72, ip.z + 0.4, 1, [0.18, 0.16, 0.15]);
        pushBox(solidBucket, ip.x + 0.68, 0.03, ip.z - 0.4, ip.x + 0.8, 0.72, ip.z + 0.4, 1, [0.18, 0.16, 0.15]);
        pushBox(emissiveBucket, ip.x - 0.45, 0.85, ip.z - 0.25, ip.x + 0.45, 0.87, ip.z + 0.25, 1, [0.25, 0.75, 0.9]);
        addCollider(ip.x - 0.9, ip.x + 0.9, ip.z - 0.5, ip.z + 0.5, 0.86, 0, true);
      } else if (ip.kind === "console") {
        // Military Mainframe / Comms Console with glowing monitor
        pushBox(solidBucket, ip.x - 0.75, 0.03, ip.z - 0.5, ip.x + 0.75, 1.55, ip.z + 0.5, 1, [0.14, 0.18, 0.24]);
        pushBox(emissiveBucket, ip.x - 0.58, 0.85, ip.z - 0.52, ip.x + 0.58, 1.42, ip.z + 0.52, 1, [0.1, 0.85, 0.92]);
        addCollider(ip.x - 0.75, ip.x + 0.75, ip.z - 0.5, ip.z + 0.5, 1.55, 0, true);
      }
    }
  }

  // 5. Outdoor Battlefield Props (Vehicles, Sandbags, Containers, Watchtowers, Trees, Lamps, Explosive Barrels)
  for (const p of mission.props || []) {
    if (p.kind === "sandbags") {
      const hw = (p.w || 3.2) * 0.5;
      const hd = (p.d || 0.9) * 0.5;
      pushBox(getBucket("sandbags"), p.x - hw, 0, p.z - hd, p.x + hw, 1.12, p.z + hd, 1.2);
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 1.12, 0, true);
    } else if (p.kind === "crate") {
      pushBox(getBucket("crate"), p.x - 0.65, 0, p.z - 0.65, p.x + 0.65, 1.25, p.z + 0.65, 1.25);
      addCollider(p.x - 0.65, p.x + 0.65, p.z - 0.65, p.z + 0.65, 1.25, 0, true);
    } else if (p.kind === "container") {
      const hw = (p.w || 2.5) * 0.5;
      const hd = (p.d || 5.8) * 0.5;
      const tint = p.color === "red" ? [0.78, 0.28, 0.24] : [0.24, 0.45, 0.68];
      pushBox(getBucket("corrugated"), p.x - hw, 0, p.z - hd, p.x + hw, 2.75, p.z + hd, 2.2, tint);
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 2.75, 0, true);
    } else if (p.kind === "truck") {
      // Multi-part Armored Military Cargo Truck (oriented axis-aligned based on rot ~ 0 or 1.57)
      const alongX = Math.abs(Math.sin(p.rot || 0)) > 0.6;
      const hw = alongX ? 2.6 : 1.15;
      const hd = alongX ? 1.15 : 2.6;
      // Wheels
      for (const sx of [-0.72, 0.72]) {
        for (const sz of [-0.72, 0.72]) {
          const wx = p.x + sx * hw;
          const wz = p.z + sz * hd;
          pushBox(solidBucket, wx - 0.25, 0, wz - 0.25, wx + 0.25, 0.75, wz + 0.25, 1, [0.09, 0.1, 0.12]);
        }
      }
      // Chassis bed
      pushBox(solidBucket, p.x - hw, 0.48, p.z - hd, p.x + hw, 1.15, p.z + hd, 1, [0.22, 0.28, 0.20]);
      // Armored Cab + Cargo Canopy
      if (alongX) {
        pushBox(solidBucket, p.x - hw, 1.15, p.z - hd * 0.92, p.x + hw * 0.25, 2.55, p.z + hd * 0.92, 1, [0.29, 0.34, 0.24]);
        pushBox(solidBucket, p.x + hw * 0.3, 1.15, p.z - hd * 0.88, p.x + hw * 0.95, 2.25, p.z + hd * 0.88, 1, [0.24, 0.29, 0.22]);
        // Headlights
        pushBox(emissiveBucket, p.x + hw - 0.05, 0.85, p.z - 0.75, p.x + hw + 0.05, 1.05, p.z - 0.45, 1, [1, 0.95, 0.75]);
        pushBox(emissiveBucket, p.x + hw - 0.05, 0.85, p.z + 0.45, p.x + hw + 0.05, 1.05, p.z + 0.75, 1, [1, 0.95, 0.75]);
      } else {
        pushBox(solidBucket, p.x - hw * 0.92, 1.15, p.z - hd * 0.25, p.x + hw * 0.92, 2.55, p.z + hd, 1, [0.29, 0.34, 0.24]);
        pushBox(solidBucket, p.x - hw * 0.88, 1.15, p.z - hd * 0.95, p.x + hw * 0.88, 2.25, p.z - hd * 0.3, 1, [0.24, 0.29, 0.22]);
        pushBox(emissiveBucket, p.x - 0.75, 0.85, p.z - hd - 0.05, p.x - 0.45, 1.05, p.z - hd + 0.05, 1, [1, 0.95, 0.75]);
        pushBox(emissiveBucket, p.x + 0.45, 0.85, p.z - hd - 0.05, p.x + 0.75, 1.05, p.z - hd + 0.05, 1, [1, 0.95, 0.75]);
      }
      addCollider(p.x - hw, p.x + hw, p.z - hd, p.z + hd, 2.55, 0, true);
    } else if (p.kind === "watchtower") {
      // 4 sturdy pillars + upper platform + roof
      const r = 1.25;
      for (const ox of [-r, r]) {
        for (const oz of [-r, r]) {
          pushBox(getBucket("woodPlank"), p.x + ox - 0.14, 0, p.z + oz - 0.14, p.x + ox + 0.14, 5.2, p.z + oz + 0.14, 1.2);
          addCollider(p.x + ox - 0.2, p.x + ox + 0.2, p.z + oz - 0.2, p.z + oz + 0.2, 5.2, 0, true);
        }
      }
      pushBox(getBucket("woodPlank"), p.x - r - 0.25, 3.2, p.z - r - 0.25, p.x + r + 0.25, 3.55, p.z + r + 0.25, 1.5);
      pushBox(getBucket("corrugated"), p.x - r - 0.4, 5.2, p.z - r - 0.4, p.x + r + 0.4, 5.45, p.z + r + 0.4, 1.5);
    } else if (p.kind === "tree") {
      // Trunk
      pushBox(getBucket("woodPlank"), p.x - 0.24, 0, p.z - 0.24, p.x + 0.24, 3.6, p.z + 0.24, 1.2);
      addCollider(p.x - 0.35, p.x + 0.35, p.z - 0.35, p.z + 0.35, 3.6, 0, true);
      if (env.treeStyle === "pine") {
        const col = env.weather === "snow" ? [0.76, 0.86, 0.88] : [0.14, 0.26, 0.18];
        pushBox(solidBucket, p.x - 1.5, 2.2, p.z - 1.5, p.x + 1.5, 3.4, p.z + 1.5, 1, col);
        pushBox(solidBucket, p.x - 1.0, 3.4, p.z - 1.0, p.x + 1.0, 4.6, p.z + 1.0, 1, col);
        pushBox(solidBucket, p.x - 0.5, 4.6, p.z - 0.5, p.x + 0.5, 5.5, p.z + 0.5, 1, col);
      } else if (env.treeStyle === "palm") {
        const leaf = [0.22, 0.42, 0.18];
        pushBox(solidBucket, p.x - 2.1, 3.4, p.z - 0.45, p.x + 2.1, 3.72, p.z + 0.45, 1, leaf);
        pushBox(solidBucket, p.x - 0.45, 3.4, p.z - 2.1, p.x + 0.45, 3.72, p.z + 2.1, 1, leaf);
        pushBox(solidBucket, p.x - 1.3, 3.7, p.z - 1.3, p.x + 1.3, 4.1, p.z + 1.3, 1, [0.28, 0.48, 0.22]);
      }
    } else if (p.kind === "lamp") {
      pushBox(solidBucket, p.x - 0.1, 0, p.z - 0.1, p.x + 0.1, 4.6, p.z + 0.1, 1, [0.22, 0.25, 0.3]);
      pushBox(emissiveBucket, p.x - 0.28, 4.5, p.z - 0.28, p.x + 0.28, 4.7, p.z + 0.28, 1, [1.0, 0.88, 0.62]);
      addCollider(p.x - 0.2, p.x + 0.2, p.z - 0.2, p.z + 0.2, 4.6, 0, true);
      lamps.push({ x: p.x, y: 4.3, z: p.z, color: [1.0, 0.86, 0.6] });
    } else if (p.kind === "barrel") {
      barrels.push({ x: p.x, z: p.z, intact: true, hp: 35 });
    }
  }

  // Upload all grouped static meshes to GPU
  const staticMeshes = Object.entries(buckets).map(([texName, builder]) => ({
    texName,
    mesh: uploadMesh(gl, builder),
  }));
  const solidMesh = uploadMesh(gl, solidBucket);
  const emissiveMesh = uploadMesh(gl, emissiveBucket);

  const dispose = () => {
    staticMeshes.forEach((sm) => disposeMesh(gl, sm.mesh));
    disposeMesh(gl, solidMesh);
    disposeMesh(gl, emissiveMesh);
  };

  return {
    staticMeshes,
    solidMesh,
    emissiveMesh,
    colliders,
    doors,
    barrels,
    lamps,
    dispose,
  };
}

// ================= ARTICULATED TRUE 3D SOLDIER MESH RENDERER =================
export function drawSoldier3D(renderer, enemy, uniform) {
  const { unitBox, drawMesh } = renderer;
  const isHeavy = enemy.kind === "heavy";
  const isOfficer = enemy.kind === "officer";
  const isSniper = enemy.kind === "sniper";

  const scaleW = isHeavy ? 1.18 : 1.0;
  const fallAngle = (enemy.deathAnim || 0) * (Math.PI * 0.48); // Tips backward 86° onto floor!
  const baseY = (enemy.deathAnim || 0) * 0.16;
  const stride = enemy.alive ? Math.sin(enemy.walkCycle || 0) * 0.16 : 0;
  const yaw = enemy.yaw || 0;
  const flash = enemy.hitFlash > 0;

  const white = [1, 1, 1];
  const cJacket = flash ? white : isOfficer ? [0.42, 0.12, 0.15] : isHeavy ? [0.18, 0.21, 0.26] : uniform.jacket;
  const cVest = flash ? white : isHeavy ? [0.10, 0.12, 0.16] : uniform.vest;
  const cPants = flash ? white : uniform.pants;
  const cHelmet = flash ? white : isOfficer ? [0.68, 0.12, 0.14] : uniform.helmet;
  const cSkin = flash ? white : uniform.skin;
  const cBoot = [0.09, 0.10, 0.12];

  // Local part helper rotated by soldier yaw + death fall pitch around feet!
  const drawPart = (lx, ly, lz, sx, sy, sz, color, emissive = 0) => {
    // Apply backward death fall around foot pivot (y=0)
    const cf = Math.cos(fallAngle);
    const sf = Math.sin(fallAngle);
    const fy = ly * cf - lz * sf;
    const fz = ly * sf + lz * cf;

    // Apply yaw around Y axis
    const cy = Math.cos(yaw);
    const syr = Math.sin(yaw);
    const wx = enemy.x + lx * cy + fz * syr;
    const wz = enemy.z - lx * syr + fz * cy;
    const wy = baseY + fy;

    const m = mat4Transform(wx, wy, wz, yaw, sx, sy, sz, fallAngle);
    drawMesh(unitBox, m, null, color, emissive, 1);
  };

  // Boots & Swinging Legs
  drawPart(-0.14 * scaleW, 0.12, stride, 0.16, 0.24, 0.24, cBoot);
  drawPart(0.14 * scaleW, 0.12, -stride, 0.16, 0.24, 0.24, cBoot);
  drawPart(-0.14 * scaleW, 0.48, stride * 0.65, 0.17 * scaleW, 0.52, 0.18, cPants);
  drawPart(0.14 * scaleW, 0.48, -stride * 0.65, 0.17 * scaleW, 0.52, 0.18, cPants);

  // Sculpted Torso, Kevlar Vest & Tactical Backpack
  drawPart(0, 1.02, 0, 0.44 * scaleW, 0.60, 0.26 * scaleW, cJacket);
  drawPart(0, 1.04, 0, 0.47 * scaleW, 0.44, 0.30 * scaleW, cVest);
  // Tactical Backpack on Soldier's Back (-Z in soldier local forward=+Z)
  drawPart(0, 1.06, -0.20, 0.30, 0.40, 0.15, [0.16, 0.18, 0.15]);

  // Arms & Held 3D Assault Rifle
  const aiming = enemy.alive && enemy.state === "combat";
  if (aiming) {
    drawPart(-0.28 * scaleW, 1.10, 0.16, 0.14, 0.14, 0.42, cJacket);
    drawPart(0.26 * scaleW, 1.12, 0.18, 0.14, 0.14, 0.42, cJacket);
    // 3D Assault Rifle / Sniper Rifle pointed straight forward!
    const barrelLen = isSniper ? 0.95 : 0.68;
    drawPart(0.16, 1.14, 0.36, 0.08, 0.11, barrelLen, [0.11, 0.12, 0.15]);
    if ((enemy.muzzleFlash || 0) > 0.1) {
      drawPart(0.16, 1.15, 0.38 + barrelLen * 0.55, 0.22, 0.22, 0.22, [1.0, 0.78, 0.25], 1.0);
    }
    if (isSniper || isOfficer) {
      drawPart(0.16, 1.19, 0.38 + barrelLen * 0.4, 0.05, 0.05, 0.05, [1.0, 0.12, 0.24], 1.0);
    }
  } else {
    drawPart(-0.30 * scaleW, 0.98, 0.02, 0.14, 0.46, 0.14, cJacket);
    drawPart(0.30 * scaleW, 0.98, 0.02, 0.14, 0.46, 0.14, cJacket);
    drawPart(0.05, 0.96, 0.20, 0.58, 0.09, 0.08, [0.11, 0.12, 0.15]);
  }

  // Head + Tactical Visor + Combat Helmet / Red Officer Beret
  drawPart(0, 1.50, 0.02, 0.24, 0.26, 0.24, cSkin);
  drawPart(0, 1.52, 0.14, 0.20, 0.08, 0.04, isHeavy ? [1.0, 0.35, 0.12] : [0.08, 0.10, 0.14], isHeavy ? 0.8 : 0);
  drawPart(0, 1.64, 0.01, 0.29, 0.14, 0.29, cHelmet);
}
