import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getFlashTexture } from "./assets";

/**
 * Animated enemy soldiers built from a rigged, skinned character model.
 * Legs and torso come from blended Idle / Walk / Run clips; both arms are
 * re-posed every frame with two-bone IK so the soldier actually holds the
 * rifle (low-ready on patrol, shouldered when engaging).
 */

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pw = new THREE.Quaternion();

function boneMap(model) {
  const map = {};
  model.traverse((o) => {
    if (o.isBone) map[o.name.replace(/^mixamorig:?/, "")] = o;
  });
  return map;
}

/** Rotate `bone` (in world space) so the direction bone→childPos points at `target`. */
function swingTo(bone, childWorld, target) {
  bone.getWorldPosition(_v0);
  _v1.subVectors(childWorld, _v0).normalize();
  _v2.subVectors(target, _v0).normalize();
  if (_v1.lengthSq() < 1e-6 || _v2.lengthSq() < 1e-6) return;
  _q.setFromUnitVectors(_v1, _v2);
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(_q);
  bone.parent.getWorldQuaternion(_pw).invert();
  bone.quaternion.copy(_pw.multiply(_q2));
  bone.updateMatrixWorld(true);
}

const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _h = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _tgt = new THREE.Vector3();
/** Analytic two-bone IK: upper → fore → hand reaching `target`, bending toward `poleHint`. */
function solveArm(upper, fore, hand, target, poleHint) {
  upper.getWorldPosition(_s);
  fore.getWorldPosition(_e);
  hand.getWorldPosition(_h);
  const l1 = _s.distanceTo(_e);
  const l2 = _e.distanceTo(_h);
  _dir.subVectors(target, _s);
  const d = Math.min(Math.max(_dir.length(), 0.01), (l1 + l2) * 0.999);
  _dir.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  _pole.subVectors(poleHint, _s);
  _pole.addScaledVector(_dir, -_pole.dot(_dir)).normalize();
  _elbow.copy(_s).addScaledVector(_dir, a).addScaledVector(_pole, hh);
  swingTo(upper, _e, _elbow);
  hand.getWorldPosition(_h);
  fore.getWorldPosition(_e);
  _tgt.copy(_s).addScaledVector(_dir, d);
  swingTo(fore, _h, _tgt);
}

function buildRifle(kind, matDark, matPoly) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const long = kind === "sniper";
  add(new THREE.BoxGeometry(0.055, 0.09, 0.34), matDark, 0, 0.03, 0.12); // receiver
  add(new THREE.BoxGeometry(0.06, 0.07, 0.26), matPoly, 0, 0.03, long ? 0.42 : 0.38); // handguard
  add(new THREE.CylinderGeometry(0.011, 0.011, long ? 0.5 : 0.3, 8).rotateX(Math.PI / 2), matDark, 0, 0.04, long ? 0.78 : 0.62); // barrel
  add(new THREE.BoxGeometry(0.045, 0.16, 0.06), matPoly, 0, -0.07, 0.17, 0.25); // magazine
  add(new THREE.BoxGeometry(0.04, 0.1, 0.045), matPoly, 0, -0.05, 0.0, -0.3); // pistol grip
  add(new THREE.BoxGeometry(0.05, 0.08, 0.24), matPoly, 0, 0.01, -0.16); // stock
  if (long || kind === "officer") {
    add(new THREE.CylinderGeometry(0.022, 0.026, 0.26, 10).rotateX(Math.PI / 2), matDark, 0, 0.11, 0.14); // scope
  }
  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: getFlashTexture(), color: 0xffd28a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  );
  flash.position.set(0, 0.04, long ? 1.05 : 0.8);
  flash.scale.setScalar(0.45);
  flash.visible = false;
  g.add(flash);
  return { group: g, flash, muzzleZ: long ? 1.05 : 0.8 };
}

// Rifle-holding targets in soldier-local space (+z forward, -x = soldier's right)
const POSE = {
  aim: {
    grip: new THREE.Vector3(-0.13, 1.36, 0.26),
    fore: new THREE.Vector3(-0.07, 1.38, 0.55),
    rElbow: new THREE.Vector3(-0.45, 1.12, 0.05),
    lElbow: new THREE.Vector3(0.25, 1.05, 0.35),
  },
  low: {
    grip: new THREE.Vector3(-0.15, 1.08, 0.2),
    fore: new THREE.Vector3(0.02, 1.05, 0.46),
    rElbow: new THREE.Vector3(-0.4, 1.0, -0.1),
    lElbow: new THREE.Vector3(0.3, 0.95, 0.15),
  },
};

export class SoldierFactory {
  constructor(gltf, uniform) {
    this.gltf = gltf;
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name.toLowerCase()] = c;
    const jacket = new THREE.Color(...uniform.jacket);
    this.tints = {
      trooper: jacket.clone().multiplyScalar(1.75),
      heavy: jacket.clone().multiplyScalar(1.25),
      sniper: new THREE.Color(0.55, 0.62, 0.38).lerp(jacket.clone().multiplyScalar(2.2), 0.5),
      officer: new THREE.Color(0.38, 0.36, 0.4),
    };
    Object.values(this.tints).forEach((c) => {
      c.r = Math.min(1.15, c.r);
      c.g = Math.min(1.15, c.g);
      c.b = Math.min(1.15, c.b);
    });
    this.matDark = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.45, metalness: 0.7 });
    this.matPoly = new THREE.MeshStandardMaterial({ color: 0x2b2a26, roughness: 0.75, metalness: 0.1 });
    this.views = [];
  }

  spawn(enemy) {
    const root = new THREE.Group();
    const model = skeletonClone(this.gltf.scene);
    const tint = this.tints[enemy.kind] || this.tints.trooper;
    const materials = [];
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material.clone();
        if (!/visor/i.test(m.name)) m.color.copy(tint);
        else {
          m.color.setRGB(0.12, 0.13, 0.15);
          m.roughness = 0.15;
          m.metalness = 0.8;
        }
        m.emissive = new THREE.Color(0, 0, 0);
        o.material = m;
        materials.push(m);
      }
    });
    root.add(model);
    const scale = enemy.kind === "heavy" ? 1.07 : enemy.kind === "officer" ? 1.03 : 1;
    model.scale.multiplyScalar(scale);

    const rifle = buildRifle(enemy.kind, this.matDark, this.matPoly);
    root.add(rifle.group);

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const name of ["idle", "walk", "run"]) {
      const clip = this.clips[name];
      if (!clip) continue;
      const a = mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(name === "idle" ? 1 : 0);
      a.time = Math.random() * clip.duration;
      actions[name] = a;
    }

    const view = {
      enemy,
      root,
      model,
      rifle,
      mixer,
      actions,
      materials,
      bones: boneMap(model),
      lastX: enemy.x,
      lastZ: enemy.z,
      speed: 0,
      yaw: enemy.yaw || 0,
      weights: { idle: 1, walk: 0, run: 0 },
      aimBlend: 0,
      deathT: 0,
      frame: Math.floor(Math.random() * 3),
    };
    root.position.set(enemy.x, 0, enemy.z);
    this.views.push(view);
    return view;
  }

  /** Per-frame animation, IK and state sync. */
  update(view, dt, camPos) {
    const e = view.enemy;
    const dist = Math.hypot(e.x - camPos.x, e.z - camPos.z);
    // distant soldiers animate at a reduced rate
    view.frame++;
    const skip = dist > 70 ? 3 : dist > 40 ? 2 : 1;
    view._acc = (view._acc || 0) + dt;
    if (view.frame % skip !== 0) {
      view.root.position.set(e.x, 0, e.z);
      return;
    }
    const step = view._acc;
    view._acc = 0;

    const moved = Math.hypot(e.x - view.lastX, e.z - view.lastZ) / Math.max(step, 1e-3);
    view.lastX = e.x;
    view.lastZ = e.z;
    view.speed += (moved - view.speed) * Math.min(1, step * 8);
    view.root.position.set(e.x, 0, e.z);

    // smooth facing
    let dy = (e.yaw || 0) - view.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    view.yaw += dy * Math.min(1, step * 9);
    view.root.rotation.y = view.yaw;

    // hit flash
    const flash = e.hitFlash || 0;
    for (const m of view.materials) m.emissive.setRGB(flash * 0.6, 0, 0);

    if (!e.alive) {
      // Death: fade animation, fall backwards with a twist
      view.deathT = Math.min(1, view.deathT + step * 2.2);
      const t = 1 - Math.pow(1 - view.deathT, 3);
      view.mixer.timeScale = Math.max(0, 1 - view.deathT * 3);
      view.mixer.update(step);
      view.model.rotation.x = -t * (Math.PI / 2) * 0.98;
      view.model.rotation.z = t * 0.25;
      view.model.position.y = t * 0.12;
      view.rifle.group.visible = view.deathT < 0.35;
      view.rifle.flash.visible = false;
      return;
    }

    // Locomotion blend
    const sp = view.speed;
    const target = sp < 0.25 ? { idle: 1, walk: 0, run: 0 } : sp < 3.3 ? { idle: 0, walk: 1, run: 0 } : { idle: 0, walk: 0, run: 1 };
    for (const k of ["idle", "walk", "run"]) {
      view.weights[k] += (target[k] - view.weights[k]) * Math.min(1, step * 7);
      view.actions[k]?.setEffectiveWeight(view.weights[k]);
    }
    if (view.actions.walk) view.actions.walk.timeScale = Math.max(0.6, sp / 1.5);
    if (view.actions.run) view.actions.run.timeScale = Math.max(0.7, sp / 4.2);
    view.mixer.timeScale = 1;
    view.mixer.update(step);

    // Arms hold the rifle: shouldered in combat, low-ready otherwise
    const wantAim = e.state === "combat" && sp < 3.3 ? 1 : 0;
    view.aimBlend += (wantAim - view.aimBlend) * Math.min(1, step * 6);
    const ab = view.aimBlend;
    const grip = _tmpA.lerpVectors(POSE.low.grip, POSE.aim.grip, ab);
    const fore = _tmpB.lerpVectors(POSE.low.fore, POSE.aim.fore, ab);
    const rEl = _tmpC.lerpVectors(POSE.low.rElbow, POSE.aim.rElbow, ab);
    const lEl = _tmpD.lerpVectors(POSE.low.lElbow, POSE.aim.lElbow, ab);

    // rifle sits along grip → fore
    const rg = view.rifle.group;
    rg.position.copy(grip);
    _dir.subVectors(fore, grip).normalize();
    rg.quaternion.setFromUnitVectors(_fwd, _dir);
    rg.visible = true;
    view.rifle.flash.visible = (e.muzzleFlash || 0) > 0.35;
    if (view.rifle.flash.visible) view.rifle.flash.material.rotation = Math.random() * Math.PI;

    if (dist < 60) {
      view.root.updateMatrixWorld(true);
      const b = view.bones;
      if (b.RightArm && b.RightForeArm && b.RightHand && b.LeftArm && b.LeftForeArm && b.LeftHand) {
        const toWorld = (v, out) => out.copy(v).applyMatrix4(view.root.matrixWorld);
        solveArm(b.RightArm, b.RightForeArm, b.RightHand, toWorld(grip, _wA), toWorld(rEl, _wB));
        solveArm(b.LeftArm, b.LeftForeArm, b.LeftHand, toWorld(fore, _wC), toWorld(lEl, _wD));
      }
    }
  }

  /** World-space muzzle position for tracers. */
  muzzleWorld(view, out) {
    const r = view.rifle;
    return out.set(0, 0.04, r.muzzleZ).applyMatrix4(r.group.matrixWorld);
  }

  dispose() {
    for (const v of this.views) {
      v.mixer.stopAllAction();
      v.materials.forEach((m) => m.dispose());
      v.rifle.group.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
        if (o.isSprite) o.material.dispose();
      });
      v.root.removeFromParent();
    }
    this.views = [];
    this.matDark.dispose();
    this.matPoly.dispose();
  }
}

const _fwd = new THREE.Vector3(0, 0, 1);
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();
const _tmpD = new THREE.Vector3();
const _wA = new THREE.Vector3();
const _wB = new THREE.Vector3();
const _wC = new THREE.Vector3();
const _wD = new THREE.Vector3();
