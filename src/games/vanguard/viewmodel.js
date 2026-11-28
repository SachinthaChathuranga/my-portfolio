import * as THREE from "three";
import { getFlashTexture, getProcTexture } from "./assets";

/**
 * First-person weapon & arms rendered in their own scene/camera on top of the
 * world (so the gun never clips into walls and keeps a fixed FOV while the
 * world camera zooms for ADS).
 */

const MAT = {
  metal: () => new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.36, metalness: 0.8 }),
  poly: () => new THREE.MeshStandardMaterial({ color: 0x242420, roughness: 0.72, metalness: 0.08 }),
  wood: () => new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.55, metalness: 0 }),
  olive: () => new THREE.MeshStandardMaterial({ color: 0x4a5034, roughness: 0.7, metalness: 0.05 }),
  glove: () => new THREE.MeshStandardMaterial({ color: 0x1d1d1b, roughness: 0.85 }),
  lens: () => new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.35 }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xc8962e, roughness: 0.3, metalness: 1 }),
  red: () => new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
};

function part(group, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  group.add(m);
  return m;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r0, r1, len, seg = 14) => new THREE.CylinderGeometry(r0, r1, len, seg).rotateX(Math.PI / 2);

function redDot(g, m, z) {
  part(g, B(0.03, 0.01, 0.06), m.metal, 0, 0.044, z); // mount
  // tube-style red-dot: thin ring housing so the sight picture stays open
  const ring = new THREE.TorusGeometry(0.017, 0.0035, 8, 24);
  part(g, ring, m.metal, 0, 0.068, z - 0.028);
  part(g, B(0.006, 0.014, 0.05), m.metal, 0, 0.05, z);
  part(g, new THREE.CircleGeometry(0.016, 20), m.lens, 0, 0.068, z - 0.03);
  const dot = part(g, new THREE.SphereGeometry(0.0014, 8, 8), m.red, 0, 0.068, z - 0.031);
  return dot;
}

function buildM4(m) {
  const g = new THREE.Group();
  part(g, B(0.05, 0.055, 0.27), m.metal, 0, 0.012, -0.03); // upper
  part(g, B(0.045, 0.05, 0.19), m.metal, 0, -0.04, 0.0); // lower
  const hg = part(g, B(0.058, 0.058, 0.3), m.poly, 0, 0.01, -0.31); // quad rail
  for (let i = 0; i < 12; i++) part(g, B(0.026, 0.006, 0.012), m.metal, 0, 0.043, -0.18 - i * 0.022);
  void hg;
  part(g, C(0.009, 0.009, 0.2), m.metal, 0, 0.012, -0.55);
  part(g, C(0.013, 0.012, 0.055), m.metal, 0, 0.012, -0.67); // flash hider
  const mag = part(g, B(0.028, 0.16, 0.065), m.poly, 0, -0.12, -0.07, -0.18); // mag
  part(g, B(0.03, 0.1, 0.042), m.poly, 0, -0.09, 0.07, 0.38); // grip
  part(g, C(0.016, 0.016, 0.16), m.metal, 0, -0.005, 0.18); // buffer tube
  part(g, B(0.045, 0.075, 0.13), m.poly, 0, -0.025, 0.25); // stock
  part(g, B(0.012, 0.02, 0.03), m.metal, -0.02, 0.03, 0.02); // charging handle
  const dot = redDot(g, m, -0.06);
  return { group: g, sightY: 0.068, muzzleZ: -0.71, leftZ: -0.33, ejectZ: -0.02, dot, mag };
}

function buildMP5(m) {
  const g = new THREE.Group();
  part(g, B(0.048, 0.07, 0.3), m.metal, 0, 0.005, -0.05);
  part(g, C(0.022, 0.022, 0.27), m.metal, 0, 0.005, -0.33); // integral suppressor
  for (let i = 0; i < 4; i++) part(g, C(0.0235, 0.0235, 0.006), m.poly, 0, 0.005, -0.24 - i * 0.06);
  part(g, B(0.054, 0.05, 0.14), m.poly, 0, -0.03, -0.2); // handguard
  const mag = part(g, B(0.024, 0.15, 0.04), m.metal, 0, -0.1, -0.04, -0.3);
  part(g, B(0.03, 0.095, 0.042), m.poly, 0, -0.08, 0.07, 0.35);
  part(g, B(0.006, 0.04, 0.2), m.metal, -0.018, -0.01, 0.22); // collapsible stock rails
  part(g, B(0.006, 0.04, 0.2), m.metal, 0.018, -0.01, 0.22);
  part(g, B(0.045, 0.07, 0.02), m.poly, 0, -0.02, 0.32);
  const dot = redDot(g, m, -0.04);
  return { group: g, sightY: 0.068, muzzleZ: -0.47, leftZ: -0.2, ejectZ: -0.04, dot, mag, suppressed: true };
}

function buildM24(m) {
  const g = new THREE.Group();
  part(g, B(0.06, 0.07, 0.62), m.olive, 0, -0.03, 0.02); // stock body
  part(g, B(0.05, 0.11, 0.2), m.olive, 0, -0.055, 0.25); // butt
  part(g, B(0.045, 0.045, 0.2), m.metal, 0, 0.018, -0.02); // action
  part(g, C(0.011, 0.012, 0.6), m.metal, 0, 0.02, -0.55);
  part(g, B(0.012, 0.012, 0.05), m.metal, 0.03, 0.02, 0.03).rotation.z = 0.6; // bolt handle
  part(g, C(0.02, 0.02, 0.3), m.metal, 0, 0.075, -0.03); // scope tube
  part(g, C(0.027, 0.02, 0.07), m.metal, 0, 0.075, -0.2); // objective bell
  part(g, C(0.021, 0.025, 0.05), m.metal, 0, 0.075, 0.12); // eyepiece
  for (const z of [-0.1, 0.04]) part(g, B(0.03, 0.04, 0.02), m.metal, 0, 0.048, z);
  part(g, B(0.03, 0.09, 0.04), m.olive, 0, -0.1, 0.09, 0.35); // grip
  return { group: g, sightY: 0.075, muzzleZ: -0.86, leftZ: -0.3, ejectZ: 0.0, dot: null, mag: null, bolt: true };
}

function buildM870(m) {
  const g = new THREE.Group();
  part(g, B(0.05, 0.065, 0.24), m.metal, 0, 0.005, -0.02);
  part(g, C(0.012, 0.012, 0.52), m.metal, 0, 0.02, -0.4);
  part(g, C(0.011, 0.011, 0.42), m.metal, 0, -0.012, -0.35); // tube mag
  const pump = part(g, B(0.05, 0.045, 0.16), m.wood, 0, -0.014, -0.32);
  for (let i = 0; i < 6; i++) part(g, B(0.052, 0.004, 0.006), m.poly, 0, 0.0, -0.26 - i * 0.022);
  part(g, B(0.045, 0.07, 0.26), m.wood, 0, -0.04, 0.2, 0.12); // stock
  part(g, B(0.03, 0.1, 0.04), m.wood, 0, -0.07, 0.07, 0.4);
  part(g, new THREE.SphereGeometry(0.004, 6, 6), m.brass, 0, 0.034, -0.65); // bead
  return { group: g, sightY: 0.034, muzzleZ: -0.67, leftZ: -0.32, ejectZ: -0.03, dot: null, mag: null, pump };
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class ViewModel {
  constructor(uniform) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    this.m = Object.fromEntries(Object.entries(MAT).map(([k, f]) => [k, f()]));
    const camo = getProcTexture("camoTent");
    this.m.sleeve = new THREE.MeshStandardMaterial({
      map: camo,
      color: new THREE.Color(...uniform.jacket).multiplyScalar(2.2),
      roughness: 1,
    });

    this.hemi = new THREE.HemisphereLight(0xc9d4de, 0x2e2a22, 0.7);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.flashLight = new THREE.PointLight(0xffb45a, 0, 2.5, 1.5);
    this.scene.add(this.hemi, this.sun, this.flashLight);

    this.rig = new THREE.Group(); // overall placement
    this.scene.add(this.rig);
    this.weapons = [buildM4(this.m), buildMP5(this.m), buildM24(this.m), buildM870(this.m)];
    this.weapons.forEach((w) => {
      w.group.visible = false;
      w.group.traverse((o) => {
        if (o.isMesh) o.frustumCulled = false;
      });
      this.rig.add(w.group);
    });

    // Arms: gloved hands on the grip / handguard, sleeves running off-screen
    this.limbGeo = new THREE.CapsuleGeometry(0.036, 1, 6, 12);
    this.gloveGeo = new THREE.BoxGeometry(0.045, 0.085, 0.1);
    this.palmGeo = new THREE.BoxGeometry(0.075, 0.04, 0.1);
    this.rightHand = new THREE.Mesh(this.gloveGeo, this.m.glove);
    this.leftHand = new THREE.Mesh(this.palmGeo, this.m.glove);
    this.rightFore = new THREE.Mesh(this.limbGeo, this.m.sleeve);
    this.leftFore = new THREE.Mesh(this.limbGeo, this.m.sleeve);
    this.rig.add(this.rightHand, this.leftHand, this.rightFore, this.leftFore);
    [this.rightHand, this.leftHand, this.rightFore, this.leftFore].forEach((o) => (o.frustumCulled = false));

    // Muzzle flash
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: getFlashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
    );
    this.flash.visible = false;
    this.rig.add(this.flash);

    // Brass shell pool
    const shellGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 8).rotateZ(Math.PI / 2);
    this.shells = Array.from({ length: 14 }, () => {
      const s = new THREE.Mesh(shellGeo, this.m.brass);
      s.visible = false;
      s.userData = { vx: 0, vy: 0, vz: 0, life: 0 };
      this.scene.add(s);
      return s;
    });
    this.shellIdx = 0;

    this.current = -1;
    this.swapT = 1;
    this.sway = new THREE.Vector2();
    this.swayTarget = new THREE.Vector2();
    this._tmp = new THREE.Vector3();
  }

  setEnvironment(envMap) {
    this.scene.environment = envMap;
  }

  setSize(w, h) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  addMouse(dx, dy) {
    this.swayTarget.x = Math.max(-1, Math.min(1, this.swayTarget.x + dx * 0.004));
    this.swayTarget.y = Math.max(-1, Math.min(1, this.swayTarget.y + dy * 0.004));
  }

  ejectShell(shotgun) {
    const w = this.weapons[this.current];
    if (!w) return;
    const s = this.shells[this.shellIdx++ % this.shells.length];
    s.material = this.m.brass;
    s.scale.setScalar(shotgun ? 2.2 : 1);
    s.position.set(0.03, 0.02, w.ejectZ).applyMatrix4(w.group.matrixWorld);
    s.userData.vx = 0.9 + Math.random() * 0.5;
    s.userData.vy = 0.9 + Math.random() * 0.6;
    s.userData.vz = 0.2 + Math.random() * 0.2;
    s.userData.life = 0.7;
    s.visible = true;
  }

  /**
   * @param {object} st  game state slice
   */
  update(dt, st) {
    if (st.weaponId !== this.current) {
      this.weapons.forEach((w, i) => (w.group.visible = i === st.weaponId));
      this.current = st.weaponId;
      this.swapT = 0;
    }
    this.swapT = Math.min(1, this.swapT + dt * 3.2);
    const w = this.weapons[this.current];

    // lighting follows world sun relative to the camera
    if (st.sunDirView) this.sun.position.copy(st.sunDirView).multiplyScalar(5);
    this.sun.intensity = st.night ? 0.4 : 1.6;
    this.hemi.intensity = st.night ? 0.3 : 0.7;

    this.swayTarget.multiplyScalar(Math.max(0, 1 - dt * 6));
    this.sway.lerp(this.swayTarget, Math.min(1, dt * 10));

    const ads = st.adsLerp;
    const hip = this._hip || (this._hip = new THREE.Vector3(0.16, -0.17, -0.42));
    const adsPos = this._ads || (this._ads = new THREE.Vector3());
    adsPos.set(0, -w.sightY, -0.27);
    const pos = this._tmp.lerpVectors(hip, adsPos, ads);

    const bobAmt = st.moving ? (st.sprinting ? 1.6 : 1) : 0.15;
    const bobK = (1 - ads * 0.85) * bobAmt;
    pos.x += Math.cos(st.walkBob) * 0.011 * bobK;
    pos.y += Math.abs(Math.sin(st.walkBob)) * 0.013 * bobK - (st.idleBreath || 0) * 0.002;
    pos.x += this.sway.x * -0.02 * (1 - ads * 0.7);
    pos.y += this.sway.y * 0.015 * (1 - ads * 0.7);

    let rx = this.sway.y * 0.04;
    let ry = this.sway.x * 0.06;
    let rz = -this.sway.x * 0.05;

    // sprint carry
    const spr = st.sprinting ? 1 : 0;
    this._spr = (this._spr || 0) + (spr - (this._spr || 0)) * Math.min(1, dt * 8);
    pos.x -= this._spr * 0.05;
    pos.y -= this._spr * 0.05;
    ry += this._spr * 0.75;
    rz += this._spr * 0.3;
    rx -= this._spr * 0.15;

    // recoil kick
    pos.z += st.recoil * 0.045;
    rx += st.recoil * 0.07;

    // reload
    if (st.reloadP > 0 && st.reloadP < 1) {
      const k = Math.sin(st.reloadP * Math.PI);
      pos.y -= k * 0.09;
      rx -= k * 0.45;
      rz += k * 0.35;
      if (w.mag) w.mag.position.y = -0.12 - Math.sin(Math.min(1, st.reloadP * 1.6) * Math.PI) * 0.25;
    } else if (w.mag) {
      w.mag.position.y = this.current === 1 ? -0.1 : -0.12;
    }
    // pump action on shotgun
    if (w.pump) w.pump.position.z = -0.32 + Math.sin(Math.min(1, st.cycleP || 0) * Math.PI) * 0.07;

    // weapon swap raise
    const sw = 1 - this.swapT;
    pos.y -= sw * sw * 0.3;
    rx -= sw * 0.6;

    pos.y -= (st.landDip || 0) * 0.12;
    if (st.stance === "prone") {
      pos.y -= 0.015;
      rz -= 0.05;
    }

    this.rig.position.copy(pos);
    this.rig.rotation.set(rx, ry, rz);
    this.rig.visible = !st.hidden;

    // arms hold the current gun
    const lz = w.leftZ + (w.pump ? this.pump(w) : 0);
    this.rightHand.position.set(0.004, -0.085, 0.075);
    this.rightHand.rotation.set(0.35, 0, 0);
    this.leftHand.position.set(-0.012, -0.05, lz);
    this.leftHand.rotation.set(0, 0, -0.35);
    this.limb(this.rightFore, _a.set(0.012, -0.11, 0.115), _b.set(0.13, -0.27, 0.3));
    this.limb(this.leftFore, _a.set(-0.03, -0.07, lz + 0.04), _b.set(-0.24, -0.32, lz + 0.42));

    // muzzle flash
    const mf = st.muzzleFlash;
    this.flash.visible = mf > 0.35 && !st.hidden;
    if (this.flash.visible) {
      this.flash.position.set(0, 0.012, w.muzzleZ - 0.06);
      const sc = (w.suppressed ? 0.09 : this.current === 3 ? 0.32 : 0.22) * (0.8 + Math.random() * 0.4);
      this.flash.scale.setScalar(sc);
      this.flash.material.rotation = Math.random() * Math.PI * 2;
      this.flash.material.opacity = w.suppressed ? 0.5 : 1;
    }
    this.flashLight.intensity = mf > 0.2 && !w.suppressed ? mf * 3 : 0;
    this.flashLight.position.set(pos.x, pos.y + 0.05, pos.z + w.muzzleZ);

    // shells
    for (const s of this.shells) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      u.vy -= 6 * dt;
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      s.position.z += u.vz * dt;
      s.rotation.x += dt * 20;
      s.rotation.y += dt * 14;
      if (u.life <= 0) s.visible = false;
    }
  }

  /** Stretch & orient a capsule between two joint positions (rig space). */
  limb(mesh, from, to) {
    _d.subVectors(to, from);
    const len = _d.length();
    mesh.position.addVectors(from, to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
    mesh.scale.set(1, len, 1);
  }

  pump(w) {
    return w.pump ? w.pump.position.z + 0.32 : 0;
  }

  render(renderer) {
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        o.geometry?.dispose();
      }
    });
    Object.values(this.m).forEach((m) => m.dispose());
    this.flash.material.dispose();
  }
}
