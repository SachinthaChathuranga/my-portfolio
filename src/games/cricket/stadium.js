import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Wicket } from "./players";

/**
 * Builds the cricket stadium for a ground: outfield, pitch, wickets, rope,
 * LED boards, sight screens, stands with an animated crowd, floodlights,
 * big screen, sky & lighting for day / dusk / night.
 */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return { tex: t, canvas: c, ctx };
}

function grain(ctx, w, h, amt) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function buildStadium({ ground, format, renderer }) {
  const group = new THREE.Group();
  const disposables = [];
  const T = (o) => (disposables.push(o), o);
  const bx = ground.boundary.x;
  const bz = ground.boundary.z;
  const r = rng(ground.id.length * 7919 + bx);
  const night = ground.time === "night";
  const dusk = ground.time === "dusk";
  const whiteBall = format.ball === "white";

  // ======================= OUTFIELD =======================
  const fx = bx + 9;
  const fz = bz + 9;
  const N = 2048;
  const field = canvasTex(N, N, (ctx) => {
    ctx.fillStyle = "#3d7a2f";
    ctx.fillRect(0, 0, N, N);
    const toPx = (x) => ((x / fx + 1) / 2) * N;
    const toPy = (z) => ((1 + z / fz) / 2) * N;
    // mowing stripes parallel to the pitch
    const stripeW = 5.2;
    for (let x = -fx, i = 0; x < fx; x += stripeW, i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,230,0.075)" : "rgba(0,30,0,0.08)";
      ctx.fillRect(toPx(x), 0, toPx(x + stripeW) - toPx(x), N);
    }
    // cross-cut faint stripes
    for (let z = -fz, i = 0; z < fz; z += stripeW * 1.6, i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,230,0.025)" : "rgba(0,0,0,0.025)";
      ctx.fillRect(0, toPy(z), N, toPy(z + stripeW * 1.6) - toPy(z));
    }
    // the square (slightly lighter, finer grass)
    ctx.fillStyle = "rgba(210,220,150,0.16)";
    ctx.fillRect(toPx(-9), toPy(-14), toPx(9) - toPx(-9), toPy(14) - toPy(-14));
    // 30-yard circle (dashed)
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 16]);
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.01) {
      const x = Math.sin(a) * 27.4;
      const z = Math.cos(a) * 37.4;
      if (a === 0) ctx.moveTo(toPx(x), toPy(z));
      else ctx.lineTo(toPx(x), toPy(z));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // beyond the rope: worn darker strip
    ctx.strokeStyle = "rgba(40,60,20,0.35)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.ellipse(N / 2, N / 2, ((bx + 2.5) / fx) * (N / 2), ((bz + 2.5) / fz) * (N / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
    grain(ctx, N, N, 22);
  });
  T(field.tex);
  const detail = canvasTex(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = 100 + Math.random() * 70;
        ctx.fillStyle = `rgb(${v},${v + 10},${v})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 2);
      }
    },
    { srgb: false, repeat: true }
  );
  T(detail.tex);
  const fieldMat = T(new THREE.MeshStandardMaterial({ map: field.tex, roughness: 0.92 }));
  fieldMat.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: detail.tex };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vW;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvW = (modelMatrix * vec4(transformed,1.0)).xz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vW; uniform sampler2D uDetail;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n float dd = texture2D(uDetail, vW / 1.7).r; diffuseColor.rgb *= 0.72 + dd * 0.6;");
  };
  const outfield = new THREE.Mesh(T(new THREE.CircleGeometry(1, 160)), fieldMat);
  outfield.rotation.x = -Math.PI / 2;
  outfield.scale.set(fx, fz, 1);
  outfield.receiveShadow = true;
  group.add(outfield);

  // ======================= PITCH =======================
  const PW = 3.05;
  const PL = 24;
  const pitchTex = canvasTex(256, 2048, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#b49a66");
    g.addColorStop(0.5, "#cdb684");
    g.addColorStop(1, "#b49a66");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // grass tinge on the edges & cracks
    ctx.fillStyle = "rgba(110,130,60,0.25)";
    ctx.fillRect(0, 0, 18, h);
    ctx.fillRect(w - 18, 0, 18, h);
    ctx.strokeStyle = "rgba(90,70,40,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 160; i++) {
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (Math.random() - 0.5) * 30;
        y += (Math.random() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // bowlers' footmarks near each end
    ctx.fillStyle = "rgba(120,95,60,0.35)";
    for (const zc of [-9.4, 9.4]) {
      for (let i = 0; i < 60; i++) {
        const z = zc + (Math.random() - 0.5) * 2.2;
        const x = (Math.random() - 0.5) * 1.6;
        ctx.beginPath();
        ctx.arc(((x + PW / 2) / PW) * w, ((z + PL / 2) / PL) * h, 3 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    grain(ctx, w, h, 26);
    // creases
    const px = (x) => ((x + PW / 2) / PW) * w;
    const py = (z) => ((z + PL / 2) / PL) * h;
    ctx.fillStyle = "#fbfbf6";
    const line = (x0, z0, x1) => ctx.fillRect(px(x0), py(z0) - 2, px(x1) - px(x0), 4);
    const vline = (x, z0, z1) => ctx.fillRect(px(x) - 2, py(z0), 4, py(z1) - py(z0));
    for (const s of [-1, 1]) {
      line(-1.32, s * 10.06, 1.32, s * 10.06); // bowling crease
      line(-1.525, s * 8.84, 1.525, s * 8.84); // popping crease
      for (const x of [-1.32, 1.32]) vline(x, Math.min(s * 8.84, s * 11.3), Math.max(s * 8.84, s * 11.3)); // return creases
      // wide guidelines
      for (const x of [-0.89, 0.89]) ctx.fillRect(px(x) - 1, py(s * 8.84) - 18, 2, 36);
    }
  });
  T(pitchTex.tex);
  const pitch = new THREE.Mesh(T(new THREE.PlaneGeometry(PW, PL)), T(new THREE.MeshStandardMaterial({ map: pitchTex.tex, roughness: 0.95 })));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.006;
  pitch.receiveShadow = true;
  group.add(pitch);

  const strikerWicket = new Wicket(10.06);
  const bowlerWicket = new Wicket(-10.06);
  group.add(strikerWicket.group, bowlerWicket.group);

  // ======================= ROPE, BOARDS, SIGHT SCREENS =======================
  const ropePts = [];
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    ropePts.push(new THREE.Vector3(Math.sin(a) * bx, 0.06, Math.cos(a) * bz));
  }
  const rope = new THREE.Mesh(
    T(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts, true), 400, 0.07, 6, true)),
    T(new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 }))
  );
  rope.castShadow = true;
  group.add(rope);

  const adTex = canvasTex(
    2048,
    64,
    (ctx, w, h) => {
      const msgs = ["SMSC CRICKET 26", "★ ★ ★", "BOUNDARY ZONE", "PLAY HARD • PLAY FAIR", ground.city.toUpperCase(), "LIVE"];
      const cols = ["#0b1f4d", "#a3122a", "#0d6b3a", "#2a2a2a", "#6b2bd1", "#c9650c"];
      const seg = w / msgs.length;
      msgs.forEach((m, i) => {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(i * seg, 0, seg, h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m, i * seg + seg / 2, h / 2 + 2);
      });
    },
    { repeat: true }
  );
  T(adTex.tex);
  adTex.tex.repeat.set(6, 1);
  const adMat = T(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: adTex.tex, emissiveIntensity: night ? 1.3 : 0.9 }));
  {
    const segs = 120;
    const parts = [];
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const ox = bx + 3.2;
      const oz = bz + 3.2;
      const p0 = new THREE.Vector3(Math.sin(a0) * ox, 0, Math.cos(a0) * oz);
      const p1 = new THREE.Vector3(Math.sin(a1) * ox, 0, Math.cos(a1) * oz);
      const len = p0.distanceTo(p1);
      const g = new THREE.PlaneGeometry(len, 0.9);
      // UV across the whole ring so text scrolls continuously
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - (i + uv.getX(k)) / segs);
      g.translate(0, 0.45, 0);
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(p1.x - p0.x, p1.z - p0.z) - Math.PI / 2);
      g.applyMatrix4(m);
      g.translate((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);
      parts.push(g);
    }
    const boards = new THREE.Mesh(T(mergeGeometries(parts)), adMat);
    adMat.side = THREE.DoubleSide;
    group.add(boards);
  }

  const screenMat = T(new THREE.MeshStandardMaterial({ color: whiteBall ? 0x0c0c0e : 0xf4f4f0, roughness: 0.9 }));
  for (const s of [-1, 1]) {
    const ss = new THREE.Mesh(T(new THREE.BoxGeometry(16, 8, 0.4)), screenMat);
    ss.position.set(0, 4, s * (bz + 6));
    group.add(ss);
  }

  // ======================= STANDS + CROWD =======================
  const standMat = T(new THREE.MeshStandardMaterial({ color: new THREE.Color(ground.stands), roughness: 0.85 }));
  const standParts = [];
  const crowdMatrices = [];
  const crowdColors = [];
  const seatColors = ground.seatColors.map((c) => new THREE.Color(c));
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3(1, 1, 1);
  const tmpP = new THREE.Vector3();
  const segs = 110;
  const tiers = 14;
  const startOff = 9;
  const stepD = 1.0;
  const stepH = 0.55;
  const coastal = ground.coastal;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    // gaps behind the sight screens
    const nearEnd = Math.abs(Math.sin(am)) < 0.14;
    if (nearEnd) continue;
    if (coastal && Math.sin(am) > 0.15) continue; // open sea-facing side
    for (let k = 0; k < tiers; k++) {
      const off0 = startOff + k * stepD;
      const off1 = off0 + stepD;
      const y1 = 1.2 + k * stepH;
      const q = (a, off) => new THREE.Vector3(Math.sin(a) * (bx + off), 0, Math.cos(a) * (bz + off));
      const c00 = q(a0, off0);
      const c10 = q(a1, off0);
      const c01 = q(a0, off1);
      const c11 = q(a1, off1);
      // step top + riser
      const g = new THREE.BufferGeometry();
      const v = [
        c00.x, y1, c00.z, c10.x, y1, c10.z, c11.x, y1, c11.z,
        c00.x, y1, c00.z, c11.x, y1, c11.z, c01.x, y1, c01.z,
        c00.x, y1 - stepH, c00.z, c10.x, y1 - stepH, c10.z, c10.x, y1, c10.z,
        c00.x, y1 - stepH, c00.z, c10.x, y1, c10.z, c00.x, y1, c00.z,
      ];
      g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      g.computeVertexNormals();
      standParts.push(g);
      // spectators along this step
      const segLen = c00.distanceTo(c10);
      const n = Math.floor(segLen / 0.62);
      for (let s = 0; s < n; s++) {
        if (r() > ground.capacity * (0.75 + 0.25 * (1 - k / tiers))) continue;
        const f = (s + 0.5) / n;
        tmpP.set(c00.x + (c10.x - c00.x) * f, y1, c00.z + (c10.z - c00.z) * f);
        const dir = Math.atan2(-tmpP.x, -tmpP.z);
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dir);
        const h = 0.9 + r() * 0.25;
        tmpS.set(1, h, 1);
        tmpM.compose(tmpP, tmpQ, tmpS);
        crowdMatrices.push(tmpM.clone());
        const col = r() < 0.55 ? seatColors[Math.floor(r() * seatColors.length)].clone() : new THREE.Color().setHSL(r(), 0.35, 0.35 + r() * 0.3);
        crowdColors.push(col);
      }
    }
    // back wall + roof panel
    const off = startOff + tiers * stepD;
    const topY = 1.2 + tiers * stepH;
    const w0 = new THREE.Vector3(Math.sin(a0) * (bx + off), 0, Math.cos(a0) * (bz + off));
    const w1 = new THREE.Vector3(Math.sin(a1) * (bx + off), 0, Math.cos(a1) * (bz + off));
    const wall = new THREE.BufferGeometry();
    wall.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([w0.x, 0, w0.z, w1.x, 0, w1.z, w1.x, topY + 6, w1.z, w0.x, 0, w0.z, w1.x, topY + 6, w1.z, w0.x, topY + 6, w0.z], 3)
    );
    wall.computeVertexNormals();
    standParts.push(wall);
    const roofIn = off - 9;
    const ri0 = new THREE.Vector3(Math.sin(a0) * (bx + roofIn), 0, Math.cos(a0) * (bz + roofIn));
    const ri1 = new THREE.Vector3(Math.sin(a1) * (bx + roofIn), 0, Math.cos(a1) * (bz + roofIn));
    const roof = new THREE.BufferGeometry();
    roof.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([ri0.x, topY + 4.2, ri0.z, w0.x, topY + 6, w0.z, w1.x, topY + 6, w1.z, ri0.x, topY + 4.2, ri0.z, w1.x, topY + 6, w1.z, ri1.x, topY + 4.2, ri1.z], 3)
    );
    roof.computeVertexNormals();
    standParts.push(roof);
  }
  // front wall under the first tier
  if (standParts.length) {
    const standsMesh = new THREE.Mesh(T(mergeGeometries(standParts)), standMat);
    standMat.side = THREE.DoubleSide;
    standsMesh.receiveShadow = true;
    group.add(standsMesh);
  }
  const crowdUniforms = { uTime: { value: 0 }, uCheer: { value: 0 } };
  let crowd = null;
  if (crowdMatrices.length) {
    const bodyGeo = T(mergeGeometries([new THREE.BoxGeometry(0.42, 0.55, 0.3).translate(0, 0.38, 0), new THREE.SphereGeometry(0.13, 8, 6).translate(0, 0.8, 0)]));
    const crowdMat = T(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    crowdMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = crowdUniforms.uTime;
      sh.uniforms.uCheer = crowdUniforms.uCheer;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uCheer;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
          float idle = sin(uTime * 1.3 + ph) * 0.02;
          float jump = max(0.0, sin(uTime * 9.0 + ph * 3.0)) * 0.35 * uCheer;
          transformed.y += idle + jump;`
        );
    };
    crowd = new THREE.InstancedMesh(bodyGeo, crowdMat, crowdMatrices.length);
    crowdMatrices.forEach((m, i) => {
      crowd.setMatrixAt(i, m);
      crowd.setColorAt(i, crowdColors[i]);
    });
    group.add(crowd);
  }

  // Coastal ground: grassy bank, palms and the sea
  if (coastal) {
    const sea = new THREE.Mesh(T(new THREE.PlaneGeometry(1200, 900)), T(new THREE.MeshStandardMaterial({ color: 0x1d5f86, roughness: 0.15, metalness: 0.3 })));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(bx + 330, -0.6, 0);
    group.add(sea);
    const wallM = T(new THREE.MeshStandardMaterial({ color: 0x9c8a6a, roughness: 0.95 }));
    const fort = new THREE.Mesh(T(new THREE.BoxGeometry(6, 7, bz * 2.6)), wallM);
    fort.position.set(bx + 28, 3, 0);
    group.add(fort);
    const trunk = T(new THREE.CylinderGeometry(0.15, 0.25, 9, 6).translate(0, 4.5, 0));
    const crown = T(new THREE.ConeGeometry(2.6, 1.4, 7).translate(0, 9.2, 0));
    const tm = T(new THREE.MeshStandardMaterial({ color: 0x6b5235 }));
    const cm = T(new THREE.MeshStandardMaterial({ color: 0x2f6b2a }));
    for (let i = 0; i < 26; i++) {
      const a = 0.2 + (i / 26) * 2.7;
      const x = Math.sin(a) * (bx + 14 + r() * 8);
      const z = Math.cos(a) * (bz + 14 + r() * 8);
      if (x < bx * 0.3) continue;
      const t1 = new THREE.Mesh(trunk, tm);
      const c1 = new THREE.Mesh(crown, cm);
      t1.position.set(x, 0, z);
      c1.position.set(x, 0, z);
      t1.rotation.z = (r() - 0.5) * 0.3;
      group.add(t1, c1);
    }
  }

  // Ground beyond the stadium
  const apron = new THREE.Mesh(T(new THREE.RingGeometry(1, 6, 64)), T(new THREE.MeshStandardMaterial({ color: night ? 0x1a1d22 : 0x5b6b4a, roughness: 1 })));
  apron.rotation.x = -Math.PI / 2;
  apron.scale.set(bx + 8, bz + 8, 1);
  apron.position.y = -0.02;
  group.add(apron);

  // ======================= FLOODLIGHTS =======================
  const towerMat = T(new THREE.MeshStandardMaterial({ color: 0x7c828a, roughness: 0.5, metalness: 0.6 }));
  const lampMat = T(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff6e0, emissiveIntensity: night || dusk ? 3.2 : 0.2 }));
  const glowTex = canvasTex(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,240,1)");
    g.addColorStop(0.3, "rgba(255,245,210,0.5)");
    g.addColorStop(1, "rgba(255,240,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  T(glowTex.tex);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [1.3, 0], [-1.3, 0]]) {
    if (coastal && sx > 0 && Math.abs(sx) > 1.2) continue;
    const x = sx * (bx + 30) * (Math.abs(sx) > 1.2 ? 0.95 : 0.82);
    const z = sz * (bz + 30) * 0.82;
    const pole = new THREE.Mesh(T(new THREE.CylinderGeometry(0.5, 1.1, 48, 8).translate(0, 24, 0)), towerMat);
    pole.position.set(x, 0, z);
    group.add(pole);
    const head = new THREE.Mesh(T(new THREE.BoxGeometry(9, 5, 1)), lampMat);
    head.position.set(x, 50, z);
    head.lookAt(0, 0, 0);
    group.add(head);
    if (night || dusk) {
      const s = new THREE.Sprite(T(new THREE.SpriteMaterial({ map: glowTex.tex, color: 0xfff4dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })));
      s.scale.setScalar(26);
      s.position.set(x * 0.98, 50, z * 0.98);
      group.add(s);
    }
  }

  // ======================= BIG SCREEN =======================
  const bigScreen = canvasTex(1024, 512, () => {});
  T(bigScreen.tex);
  const screenMesh = new THREE.Mesh(
    T(new THREE.PlaneGeometry(22, 11)),
    T(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: bigScreen.tex, emissiveIntensity: 1.1 }))
  );
  screenMesh.position.set(-(bx + 16) * 0.72, 18, -(bz + 16) * 0.72);
  screenMesh.lookAt(0, 6, 0);
  group.add(screenMesh);
  const frame = new THREE.Mesh(T(new THREE.BoxGeometry(23.2, 12.2, 0.6)), towerMat);
  frame.position.copy(screenMesh.position);
  frame.quaternion.copy(screenMesh.quaternion);
  frame.translateZ(-0.35);
  group.add(frame);

  function drawScreen({ title, line1, line2, flash }) {
    const ctx = bigScreen.ctx;
    const w = 1024;
    const h = 512;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, flash ? "#5b0a6b" : "#04122e");
    g.addColorStop(1, flash ? "#d1176f" : "#0a2a5e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = flash ? "bold 190px Arial" : "bold 70px Arial";
    ctx.fillText(title, w / 2, flash ? 320 : 150);
    if (!flash) {
      ctx.font = "bold 110px Arial";
      ctx.fillStyle = "#ffd34d";
      ctx.fillText(line1 || "", w / 2, 300);
      ctx.font = "48px Arial";
      ctx.fillStyle = "#cfe3ff";
      ctx.fillText(line2 || "", w / 2, 410);
    }
    bigScreen.tex.needsUpdate = true;
  }

  // ======================= SKY & LIGHTS =======================
  let skyObj;
  let envRT = null;
  const sunDir = new THREE.Vector3();
  if (night) {
    const skyGeo = T(new THREE.SphereGeometry(900, 32, 16));
    const skyMat = T(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);}",
        fragmentShader:
          "varying vec3 vP; float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} void main(){ vec3 d = normalize(vP); float t = clamp(d.y,0.0,1.0); vec3 col = mix(vec3(0.06,0.08,0.16), vec3(0.01,0.015,0.04), pow(t,0.5)); vec2 g = floor(d.xz/(d.y+0.3)*300.0); float s = step(0.997, h(g)) * t; gl_FragColor = vec4(col + s*0.8, 1.0);}",
      })
    );
    skyObj = new THREE.Mesh(skyGeo, skyMat);
    sunDir.set(0.2, 1, 0.3).normalize();
  } else {
    const sky = new Sky();
    sky.scale.setScalar(4000);
    const u = sky.material.uniforms;
    u.turbidity.value = dusk ? 7 : 4;
    u.rayleigh.value = dusk ? 2.6 : 1.4;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    const elev = dusk ? 0.12 : 0.85;
    const az = dusk ? -2.2 : 0.7;
    sunDir.set(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az));
    u.sunPosition.value.copy(sunDir);
    skyObj = sky;
    T(sky.geometry);
    T(sky.material);
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    const s2 = new Sky();
    s2.scale.setScalar(1000);
    Object.keys(u).forEach((k) => {
      const v = u[k].value;
      s2.material.uniforms[k].value = v && v.clone ? v.clone() : v;
    });
    es.add(s2);
    envRT = pm.fromScene(es, 0.03);
    s2.geometry.dispose();
    s2.material.dispose();
    pm.dispose();
    T(envRT);
  }
  group.add(skyObj);

  const key = new THREE.DirectionalLight(night ? 0xf4f6ff : dusk ? 0xffc890 : 0xfff3e0, night ? 2.6 : dusk ? 2.2 : 3.0);
  const keyDir = night ? new THREE.Vector3(0.35, 1, -0.45).normalize() : sunDir.clone().setY(Math.max(0.35, sunDir.y)).normalize();
  key.position.copy(keyDir).multiplyScalar(120);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera;
  sc.left = -80;
  sc.right = 80;
  sc.top = 85;
  sc.bottom = -85;
  sc.near = 10;
  sc.far = 300;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.03;
  group.add(key);
  // secondary floodlight fill (night) so players are lit from several towers
  if (night || dusk) {
    const fill = new THREE.DirectionalLight(0xf2f4ff, night ? 1.3 : 0.6);
    fill.position.set(-80, 90, 60);
    group.add(fill);
  }
  const hemi = new THREE.HemisphereLight(night ? 0x8a96b8 : 0xbcd4ff, night ? 0x2b3b22 : 0x4a5d32, night ? 0.9 : 0.75);
  group.add(hemi);

  // ======================= FIREWORKS =======================
  const fw = [];
  const fwMat = T(new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex.tex, fog: false }));
  function fireworks(count = 6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const center = new THREE.Vector3(Math.sin(a) * (bx + 25), 28 + Math.random() * 20, Math.cos(a) * (bz + 25));
      const n = 140;
      const pos = new Float32Array(n * 3);
      const vel = [];
      const col = new Float32Array(n * 3);
      const c = new THREE.Color().setHSL(Math.random(), 1, 0.6);
      for (let k = 0; k < n; k++) {
        pos.set([center.x, center.y, center.z], k * 3);
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(10 + Math.random() * 8);
        vel.push(v);
        col.set([c.r, c.g, c.b], k * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(g, fwMat.clone());
      group.add(pts);
      fw.push({ pts, vel, life: 2.2, delay: i * 0.25 });
    }
  }

  function update(dt, time, cheer) {
    crowdUniforms.uTime.value = time;
    crowdUniforms.uCheer.value += (cheer - crowdUniforms.uCheer.value) * Math.min(1, dt * 3);
    adTex.tex.offset.x = (time * 0.02) % 1;
    strikerWicket.update(dt);
    bowlerWicket.update(dt);
    for (let i = fw.length - 1; i >= 0; i--) {
      const f = fw[i];
      if (f.delay > 0) {
        f.delay -= dt;
        f.pts.visible = false;
        continue;
      }
      f.pts.visible = true;
      f.life -= dt;
      const p = f.pts.geometry.attributes.position;
      for (let k = 0; k < f.vel.length; k++) {
        f.vel[k].y -= 6 * dt;
        f.vel[k].multiplyScalar(1 - dt * 0.9);
        p.setXYZ(k, p.getX(k) + f.vel[k].x * dt, p.getY(k) + f.vel[k].y * dt, p.getZ(k) + f.vel[k].z * dt);
      }
      p.needsUpdate = true;
      f.pts.material.opacity = Math.max(0, f.life / 2.2);
      if (f.life <= 0) {
        f.pts.geometry.dispose();
        f.pts.material.dispose();
        f.pts.removeFromParent();
        fw.splice(i, 1);
      }
    }
  }

  function dispose() {
    group.removeFromParent();
    disposables.forEach((d) => d.dispose && d.dispose());
    if (crowd) crowd.dispose();
  }

  return {
    group,
    strikerWicket,
    bowlerWicket,
    drawScreen,
    fireworks,
    update,
    dispose,
    envMap: envRT ? envRT.texture : null,
    fogColor: new THREE.Color(night ? 0x0a0e1a : dusk ? 0xd9a77c : 0xbfd3e6),
    night,
    dusk,
  };
}
