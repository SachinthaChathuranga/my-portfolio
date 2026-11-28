import * as THREE from "three";
import { getFlashTexture, getSmokeTexture, getSoftDot, getMedkitTexture, getAmmoTexture } from "./assets";

/**
 * World-space effects: tracers, bullet impacts & holes, blood mist,
 * explosions with fire/smoke/debris & scorch marks, burning wrecks,
 * grenades, pickups, objective beacons and 3D weather around the camera.
 */

function holeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, "rgba(5,5,5,1)");
  g.addColorStop(0.25, "rgba(20,18,16,0.95)");
  g.addColorStop(0.5, "rgba(60,55,50,0.45)");
  g.addColorStop(1, "rgba(60,55,50,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FX {
  constructor(scene, opts) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.night = opts.night;
    this.weather = opts.weather;
    this.disposables = [];
    const track = (o) => (this.disposables.push(o), o);

    // ---------- tracers ----------
    const trGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 1, 5).rotateX(Math.PI / 2).translate(0, 0, -0.5));
    const trMat = track(new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.tracers = Array.from({ length: 30 }, () => {
      const m = new THREE.Mesh(trGeo, trMat);
      m.visible = false;
      m.userData = { from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, len: 0 };
      this.group.add(m);
      return m;
    });
    this.trIdx = 0;

    // ---------- sprite particles (sparks, dust, blood, fire, smoke) ----------
    this.particles = [];
    this.spriteMats = {
      spark: track(new THREE.SpriteMaterial({ map: getFlashTexture(), color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
      fire: track(new THREE.SpriteMaterial({ map: getSmokeTexture(), color: 0xff9a3c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
      core: track(new THREE.SpriteMaterial({ map: getSoftDot(), color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
    };
    this.smokeBase = track(new THREE.SpriteMaterial({ map: getSmokeTexture(), color: 0x5a5650, depthWrite: false, transparent: true }));
    this.dustBase = track(new THREE.SpriteMaterial({ map: getSmokeTexture(), color: 0xa08f74, depthWrite: false, transparent: true }));
    this.bloodBase = track(new THREE.SpriteMaterial({ map: getSmokeTexture(), color: 0x8a0d0d, depthWrite: false, transparent: true }));
    this.greenBase = track(new THREE.SpriteMaterial({ map: getSmokeTexture(), color: 0x3fd47a, depthWrite: false, transparent: true }));

    // ---------- bullet holes / scorch decals ----------
    const holeMat = track(new THREE.MeshBasicMaterial({ map: track(holeTexture()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const holeGeo = track(new THREE.PlaneGeometry(0.11, 0.11));
    this.holes = Array.from({ length: 90 }, () => {
      const m = new THREE.Mesh(holeGeo, holeMat);
      m.visible = false;
      this.group.add(m);
      return m;
    });
    this.holeIdx = 0;
    this.scorchMat = track(new THREE.MeshBasicMaterial({ map: holeMat.map, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    this.scorchGeo = track(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2));

    // ---------- debris ----------
    this.debrisGeo = track(new THREE.BoxGeometry(0.12, 0.08, 0.1));
    this.debrisMat = track(new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 }));
    this.debris = [];

    // ---------- grenades ----------
    this.grenadeGeo = track(new THREE.SphereGeometry(0.08, 10, 8).scale(1, 1.25, 1));
    this.grenadeMat = track(new THREE.MeshStandardMaterial({ color: 0x3b4630, roughness: 0.6, metalness: 0.3 }));
    this.grenades = [];

    // ---------- pickups ----------
    this.pickupMeshes = new Map();
    this.medMat = track(new THREE.MeshStandardMaterial({ map: getMedkitTexture(), roughness: 0.5 }));
    this.ammoMat = track(new THREE.MeshStandardMaterial({ map: getAmmoTexture(), roughness: 0.75 }));
    this.pickupGeo = track(new THREE.BoxGeometry(0.56, 0.36, 0.38));
    this.ringGeo = track(new THREE.RingGeometry(0.55, 0.7, 32).rotateX(-Math.PI / 2));
    this.ringMat = track(new THREE.MeshBasicMaterial({ color: 0x9cf7c0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));

    // ---------- objective beacon ----------
    const beamGeo = track(new THREE.CylinderGeometry(0.5, 0.5, 60, 24, 1, true).translate(0, 30, 0));
    this.beamMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(0x00d4ff) }, uTime: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform vec3 uColor; uniform float uTime; varying vec2 vUv; void main(){ float fade = pow(1.0 - vUv.y, 2.2); float edge = 1.0 - abs(vUv.x - 0.5) * 2.0; float pulse = 0.75 + 0.25 * sin(uTime * 3.0 - vUv.y * 20.0); gl_FragColor = vec4(uColor, fade * pulse * 0.55 * (0.4 + 0.6 * edge)); }",
      })
    );
    this.beam = new THREE.Mesh(beamGeo, this.beamMat);
    this.beam.visible = false;
    this.group.add(this.beam);
    this.beaconRing = new THREE.Mesh(track(new THREE.RingGeometry(1.0, 1.25, 40).rotateX(-Math.PI / 2)), track(new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.beaconRing.visible = false;
    this.group.add(this.beaconRing);
    this.smokeTimer = 0;

    // ---------- weather ----------
    this.buildWeather();
  }

  buildWeather() {
    const w = this.weather;
    this.weatherBox = { x: 34, y: 18, z: 34 };
    const { x: bx, y: by, z: bz } = this.weatherBox;
    if (w === "rain" || w === "storm") {
      const n = w === "storm" ? 5500 : 4200;
      const pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - 0.5) * bx;
        const y = Math.random() * by;
        const z = (Math.random() - 0.5) * bz;
        pos.set([x, y, z, x + 0.05, y - 0.55, z + 0.02], i * 6);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xaec6d8, transparent: true, opacity: 0.38, depthWrite: false });
      this.weatherObj = new THREE.LineSegments(geo, mat);
      this.weatherSpeed = 17;
      this.weatherKind = "lines";
    } else {
      const n = w === "snow" ? 3500 : w === "dust" ? 1600 : 900;
      const pos = new Float32Array(n * 3);
      const seeds = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([(Math.random() - 0.5) * bx, Math.random() * by, (Math.random() - 0.5) * bz], i * 3);
        seeds[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.seeds = seeds;
      const cfg =
        w === "snow"
          ? { color: 0xffffff, size: 0.09, opacity: 0.9, blending: THREE.NormalBlending, speed: 1.4 }
          : w === "dust"
          ? { color: 0xd9b98a, size: 0.12, opacity: 0.45, blending: THREE.NormalBlending, speed: 0.4 }
          : { color: 0xff8a2a, size: 0.07, opacity: 0.95, blending: THREE.AdditiveBlending, speed: -0.8 };
      const mat = new THREE.PointsMaterial({
        map: getSoftDot(),
        color: cfg.color,
        size: cfg.size,
        transparent: true,
        opacity: cfg.opacity,
        depthWrite: false,
        blending: cfg.blending,
      });
      this.weatherObj = new THREE.Points(geo, mat);
      this.weatherSpeed = cfg.speed;
      this.weatherKind = "points";
    }
    this.weatherObj.frustumCulled = false;
    this.disposables.push(this.weatherObj.geometry, this.weatherObj.material);
    this.scene.add(this.weatherObj);
    this.weatherOffset = new THREE.Vector3();
  }

  // ------------------------------------------------------------------
  spawnTracer(from, to, speed = 140) {
    const m = this.tracers[this.trIdx++ % this.tracers.length];
    m.userData.from.copy(from);
    m.userData.to.copy(to);
    m.userData.len = from.distanceTo(to);
    m.userData.t = 0;
    m.userData.speed = speed;
    m.visible = true;
    m.lookAt(to);
  }

  sprite(base, pos, { size = 0.3, grow = 1, life = 0.5, vel = null, fade = 1, rot = true, gravity = 0 } = {}) {
    const mat = base.clone();
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(size);
    if (rot) mat.rotation = Math.random() * Math.PI * 2;
    this.group.add(s);
    this.particles.push({ s, life, max: life, grow, vel: vel ? vel.clone() : new THREE.Vector3(), fade, size, gravity, baseOpacity: mat.opacity });
  }

  impact(point, normal, kind = "wall") {
    if (kind === "blood") {
      for (let i = 0; i < 3; i++) {
        this.sprite(this.bloodBase, point, { size: 0.25, grow: 2.2, life: 0.45, vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8) });
      }
      return;
    }
    this.sprite(this.spriteMats.spark, point, { size: 0.18 + Math.random() * 0.1, grow: 0.5, life: 0.08 });
    const n = normal || new THREE.Vector3(0, 1, 0);
    this.sprite(kind === "ground" ? this.dustBase : this.smokeBase, point.clone().addScaledVector(n, 0.05), {
      size: 0.2,
      grow: 4,
      life: 0.7,
      vel: n.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.3, 0)),
    });
    if (normal) {
      const h = this.holes[this.holeIdx++ % this.holes.length];
      h.position.copy(point).addScaledVector(normal, 0.012);
      h.lookAt(point.clone().add(normal));
      h.rotation.z = Math.random() * Math.PI;
      h.scale.setScalar(0.7 + Math.random() * 0.6);
      h.visible = true;
    }
  }

  explosion(pos, radius = 6) {
    const p = pos.clone();
    for (let i = 0; i < 9; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 0.5, (Math.random() - 0.5) * 3);
      this.sprite(this.spriteMats.fire, p, { size: 1.2, grow: 2.4 + Math.random(), life: 0.55 + Math.random() * 0.3, vel: v });
    }
    this.sprite(this.spriteMats.core, p, { size: radius * 0.9, grow: 0.6, life: 0.18 });
    for (let i = 0; i < 12; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2);
      this.sprite(this.smokeBase, p.clone().add(new THREE.Vector3(0, 0.4, 0)), { size: 1.4, grow: 3.4, life: 2.6 + Math.random() * 1.6, vel: v });
    }
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(this.debrisGeo, this.debrisMat);
      m.position.copy(p);
      m.castShadow = true;
      this.group.add(m);
      this.debris.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 12), life: 2.5 });
    }
    const sc = new THREE.Mesh(this.scorchGeo, this.scorchMat);
    sc.position.set(p.x, 0.035, p.z);
    sc.scale.setScalar(radius * 0.38);
    this.group.add(sc);
  }

  burning(pos, seconds = 9) {
    this.fires = this.fires || [];
    this.fires.push({ pos: pos.clone(), t: seconds, acc: 0 });
  }

  // ------------------------------------------------------------------
  syncDynamic(s, time, beacon) {
    // grenades
    while (this.grenades.length < s.activeGrenades.length) {
      const m = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
      m.castShadow = true;
      this.group.add(m);
      this.grenades.push(m);
    }
    this.grenades.forEach((m, i) => {
      const g = s.activeGrenades[i];
      m.visible = Boolean(g);
      if (g) {
        m.position.set(g.x, g.y, g.z);
        m.rotation.x = time * 9;
      }
    });

    // pickups
    for (const pk of s.pickups) {
      let entry = this.pickupMeshes.get(pk.id);
      if (!entry) {
        const g = new THREE.Group();
        const box = new THREE.Mesh(this.pickupGeo, pk.kind === "medkit" ? this.medMat : this.ammoMat);
        box.castShadow = true;
        g.add(box);
        const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
        ring.position.y = -0.3;
        g.add(ring);
        g.position.set(pk.x, 0.34, pk.z);
        this.group.add(g);
        entry = { g, box };
        this.pickupMeshes.set(pk.id, entry);
      }
      entry.g.visible = !pk.taken;
      entry.box.rotation.y = time * 1.2;
      entry.box.position.y = Math.sin(time * 2.5 + pk.x) * 0.05;
    }

    // objective / extraction beacon
    if (beacon) {
      this.beam.visible = true;
      this.beaconRing.visible = true;
      this.beam.position.set(beacon.x, 0, beacon.z);
      this.beaconRing.position.set(beacon.x, 0.05, beacon.z);
      this.beamMat.uniforms.uColor.value.set(beacon.color);
      this.beaconRing.material.color.set(beacon.color);
      const pulse = 1 + ((time * 0.8) % 1) * 1.6;
      this.beaconRing.scale.setScalar(pulse);
      this.beaconRing.material.opacity = 0.75 * (1 - ((time * 0.8) % 1));
      this.beamMat.uniforms.uTime.value = time;
      if (beacon.smoke) {
        this.smokeTimer -= 1 / 60;
        if (this.smokeTimer <= 0) {
          this.smokeTimer = 0.12;
          this.sprite(this.greenBase, new THREE.Vector3(beacon.x + 2.6, 0.3, beacon.z + 2.6), {
            size: 0.8,
            grow: 5,
            life: 4,
            vel: new THREE.Vector3(0.4, 1.4, 0.2),
          });
        }
      }
    } else {
      this.beam.visible = false;
      this.beaconRing.visible = false;
    }
  }

  update(dt, camPos, indoors) {
    // tracers
    for (const m of this.tracers) {
      if (!m.visible) continue;
      const u = m.userData;
      u.t += (u.speed * dt) / Math.max(1, u.len);
      if (u.t >= 1) {
        m.visible = false;
        continue;
      }
      const seg = Math.min(4, u.len * 0.25);
      m.position.lerpVectors(u.from, u.to, u.t);
      m.scale.set(1, 1, seg);
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.s.material.dispose();
        p.s.removeFromParent();
        this.particles.splice(i, 1);
        continue;
      }
      const k = 1 - p.life / p.max;
      p.vel.y -= p.gravity * dt;
      p.s.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 1.4));
      p.s.scale.setScalar(p.size * (1 + k * p.grow));
      p.s.material.opacity = p.baseOpacity * (1 - k) * p.fade;
    }

    // debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      d.v.y -= 18 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.rotation.x += dt * 8;
      d.m.rotation.y += dt * 6;
      if (d.m.position.y < 0.05) {
        d.m.position.y = 0.05;
        d.v.multiplyScalar(0.4);
        d.v.y = Math.abs(d.v.y) * 0.3;
      }
      if (d.life <= 0) {
        d.m.removeFromParent();
        this.debris.splice(i, 1);
      }
    }

    // burning wrecks
    if (this.fires) {
      for (let i = this.fires.length - 1; i >= 0; i--) {
        const f = this.fires[i];
        f.t -= dt;
        f.acc -= dt;
        if (f.acc <= 0) {
          f.acc = 0.07;
          const j = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4);
          this.sprite(this.spriteMats.fire, f.pos.clone().add(j), { size: 0.5, grow: 1.2, life: 0.6, vel: new THREE.Vector3(0, 1.6, 0) });
          if (Math.random() < 0.35) this.sprite(this.smokeBase, f.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), { size: 0.7, grow: 3, life: 2.4, vel: new THREE.Vector3(0.3, 1.5, 0.1) });
        }
        if (f.t <= 0) this.fires.splice(i, 1);
      }
    }

    // weather follows the camera, particles wrap inside the box
    const wo = this.weatherObj;
    wo.position.set(camPos.x, camPos.y - 6, camPos.z);
    const pa = wo.geometry.attributes.position;
    const arr = pa.array;
    const { x: bx, y: by, z: bz } = this.weatherBox;
    if (this.weatherKind === "lines") {
      const fall = this.weatherSpeed * dt;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= fall;
        arr[i + 4] -= fall;
        if (arr[i + 4] < 0) {
          const x = (Math.random() - 0.5) * bx;
          const z = (Math.random() - 0.5) * bz;
          arr[i] = x;
          arr[i + 1] = by;
          arr[i + 2] = z;
          arr[i + 3] = x + 0.05;
          arr[i + 4] = by - 0.55;
          arr[i + 5] = z + 0.02;
        }
      }
    } else {
      const t = performance.now() * 0.001;
      for (let i = 0, j = 0; i < arr.length; i += 3, j++) {
        const sd = this.seeds[j];
        arr[i + 1] -= this.weatherSpeed * dt * (0.6 + sd * 0.8);
        arr[i] += Math.sin(t * 0.9 + sd * 20) * dt * (this.weather === "dust" ? 2.2 : 0.35);
        if (arr[i + 1] < 0) arr[i + 1] += by;
        if (arr[i + 1] > by) arr[i + 1] -= by;
        if (arr[i] > bx / 2) arr[i] -= bx;
      }
    }
    pa.needsUpdate = true;
    const target = indoors ? 0.1 : 1;
    wo.userData.vis = (wo.userData.vis ?? 1) + (target - (wo.userData.vis ?? 1)) * Math.min(1, dt * 4);
    wo.material.opacity = (this.weatherKind === "lines" ? 0.38 : this.weather === "snow" ? 0.9 : this.weather === "dust" ? 0.45 : 0.95) * wo.userData.vis;
  }

  dispose() {
    this.particles.forEach((p) => p.s.material.dispose());
    this.disposables.forEach((d) => d.dispose && d.dispose());
    this.group.removeFromParent();
    this.weatherObj.removeFromParent();
  }
}
