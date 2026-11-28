import * as THREE from "three";

/**
 * Procedural, jointed cricketers with code-driven animation.
 * Local frame: feet on y = 0, the figure faces +z.
 */

const SKINS = [0xc58c64, 0x8d5a3b, 0xe0b18f, 0x6b4128, 0xb57a55, 0xf1c9a5];
const geoCache = {};
const G = (k, f) => (geoCache[k] ||= f());

function cap(r, len) {
  return G(`cap${r}${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10));
}

const matCache = new Map();
function mat(color, rough = 0.75, extra = {}) {
  const key = `${color}|${rough}|${JSON.stringify(extra)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
  return matCache.get(key);
}

function mesh(geo, m, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = false;
  parent.add(o);
  return o;
}

function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Simple sinusoidal lerp helper */
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

export class Cricketer {
  /**
   * opts: { jersey, trim, pants, kind: "batter"|"fielder"|"keeper"|"bowler"|"umpire", whites, skinIdx, number }
   */
  constructor(opts) {
    this.opts = opts;
    this.kind = opts.kind;
    this.root = new THREE.Group();
    this.body = joint(this.root, 0, 0, 0); // for dives / falls
    const whites = opts.whites;
    const jersey = opts.kind === "umpire" ? 0xf2f2f2 : whites ? 0xf4f1e8 : new THREE.Color(opts.jersey).getHex();
    const trim = opts.kind === "umpire" ? 0x161616 : new THREE.Color(opts.trim || opts.jersey).getHex();
    const pants = opts.kind === "umpire" ? 0x1c1c22 : whites ? 0xeeebe2 : new THREE.Color(opts.pants || opts.jersey).multiplyScalar(0.55).getHex();
    const skin = SKINS[(opts.skinIdx ?? 0) % SKINS.length];
    const mJersey = mat(jersey, 0.85);
    const mTrim = mat(trim, 0.7);
    const mPants = mat(pants, 0.85);
    const mSkin = mat(skin, 0.6);
    const mShoe = mat(0xf5f5f5, 0.6);
    const mPad = mat(0xf7f7f2, 0.55);
    const mGlove = mat(opts.kind === "keeper" ? 0xeeeeee : 0xf2f2f2, 0.6);

    // hips & legs
    this.hips = joint(this.body, 0, 0.95, 0);
    mesh(G("pelvis", () => new THREE.BoxGeometry(0.32, 0.18, 0.2)), mPants, this.hips, 0, 0, 0);
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = joint(this.hips, 0.1 * s, -0.05, 0);
      mesh(cap(0.075, 0.32), mPants, hip, 0, -0.22, 0);
      const knee = joint(hip, 0, -0.44, 0);
      mesh(cap(0.06, 0.32), mPants, knee, 0, -0.21, 0);
      if (opts.kind === "batter" || opts.kind === "keeper") {
        mesh(G("pad", () => new THREE.BoxGeometry(0.16, 0.5, 0.12)), mPad, knee, 0, -0.2, 0.05);
      }
      const foot = mesh(G("shoe", () => new THREE.BoxGeometry(0.1, 0.07, 0.26)), mShoe, knee, 0, -0.46, 0.05);
      this.legs.push({ hip, knee, foot });
    }

    // torso
    this.spine = joint(this.hips, 0, 0.08, 0);
    const torso = mesh(cap(0.17, 0.3), mJersey, this.spine, 0, 0.27, 0);
    torso.scale.set(1.05, 1, 0.68);
    mesh(G("collar", () => new THREE.TorusGeometry(0.075, 0.018, 6, 14).rotateX(Math.PI / 2)), mTrim, this.spine, 0, 0.53, 0);
    // trim stripe
    const stripe = mesh(G("stripe", () => new THREE.BoxGeometry(0.36, 0.05, 0.25)), mTrim, this.spine, 0, 0.32, 0);
    stripe.scale.set(1, 1, 0.98);
    if (opts.kind === "umpire") {
      mesh(G("coat", () => new THREE.BoxGeometry(0.4, 0.42, 0.26)), mat(0x1d1f26, 0.8), this.spine, 0, 0.26, 0);
    }

    // head
    this.neck = joint(this.spine, 0, 0.58, 0);
    this.head = mesh(G("head", () => new THREE.SphereGeometry(0.105, 14, 12)), mSkin, this.neck, 0, 0.11, 0.01);
    if (opts.kind === "batter" || (opts.kind === "keeper" && opts.helmet)) {
      const mHelm = mat(new THREE.Color(opts.helmetColor || opts.jersey).multiplyScalar(0.7).getHex(), 0.35, { metalness: 0.2 });
      this.helmet = new THREE.Group();
      this.neck.add(this.helmet);
      mesh(G("helmet", () => new THREE.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6)), mHelm, this.helmet, 0, 0.12, 0);
      mesh(G("peak", () => new THREE.BoxGeometry(0.2, 0.015, 0.08)), mHelm, this.helmet, 0, 0.16, 0.12);
      const grill = mat(0x9aa0a6, 0.3, { metalness: 0.8 });
      for (const y of [0.06, 0.1]) mesh(G("bar", () => new THREE.TorusGeometry(0.115, 0.006, 4, 16, Math.PI)), grill, this.helmet, 0, y, 0.01).rotation.set(Math.PI / 2, 0, 0);
    } else if (opts.kind === "umpire") {
      const hat = mat(0xf2f2f2, 0.8);
      mesh(G("umphat", () => new THREE.CylinderGeometry(0.11, 0.12, 0.1, 16)), hat, this.neck, 0, 0.21, 0);
      mesh(G("brim", () => new THREE.CylinderGeometry(0.2, 0.2, 0.015, 20)), hat, this.neck, 0, 0.16, 0);
    } else {
      const capMat = mat(whites ? 0x1b2a4a : new THREE.Color(opts.jersey).getHex(), 0.7);
      mesh(G("cap", () => new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)), capMat, this.neck, 0, 0.12, 0.01);
      mesh(G("capbrim", () => new THREE.BoxGeometry(0.16, 0.012, 0.1)), capMat, this.neck, 0, 0.14, 0.12);
    }

    // arms (shoulder pivots live in armsRig so batters can swing as one unit)
    this.armsRig = joint(this.spine, 0, 0.47, 0);
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = joint(this.armsRig, 0.2 * s, 0, 0);
      mesh(cap(0.052, 0.2), mJersey, sh, 0, -0.14, 0);
      const el = joint(sh, 0, -0.29, 0);
      mesh(cap(0.044, 0.19), whites && opts.kind !== "umpire" ? mJersey : mSkin, el, 0, -0.13, 0);
      const hand = joint(el, 0, -0.27, 0);
      if (opts.kind === "batter" || opts.kind === "keeper") {
        mesh(G(opts.kind === "keeper" ? "kglove" : "glove", () => (opts.kind === "keeper" ? new THREE.BoxGeometry(0.13, 0.15, 0.1) : new THREE.BoxGeometry(0.09, 0.11, 0.08))), mGlove, hand, 0, 0, 0);
      } else {
        mesh(G("hand", () => new THREE.SphereGeometry(0.045, 10, 8)), mSkin, hand, 0, 0, 0);
      }
      this.arms.push({ sh, el, hand });
    }

    if (opts.kind === "batter") {
      // bat held in the top hand; blade hangs below the hands
      this.bat = new THREE.Group();
      const wood = mat(0xd9b98a, 0.55);
      const grip = mat(new THREE.Color(opts.trim || "#222").getHex(), 0.8);
      mesh(G("handle", () => new THREE.CylinderGeometry(0.016, 0.016, 0.26, 8)), grip, this.bat, 0, -0.08, 0);
      mesh(G("blade", () => new THREE.BoxGeometry(0.108, 0.56, 0.045)), wood, this.bat, 0, -0.48, 0.008);
      mesh(G("sticker", () => new THREE.BoxGeometry(0.11, 0.12, 0.047)), mat(new THREE.Color(opts.jersey).getHex(), 0.5), this.bat, 0, -0.38, 0.009);
      this.armsRig.add(this.bat);
      this.bat.position.set(0.0, -0.5, 0.26);
    }

    this.root.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.reset();
  }

  reset() {
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.hips.position.y = 0.95;
    this.hips.rotation.set(0, 0, 0);
    this.spine.rotation.set(0, 0, 0);
    this.neck.rotation.set(0, 0, 0);
    this.armsRig.rotation.set(0, 0, 0);
    for (const a of this.arms) {
      a.sh.rotation.set(0, 0, 0);
      a.el.rotation.set(0, 0, 0);
    }
    for (const l of this.legs) {
      l.hip.rotation.set(0, 0, 0);
      l.knee.rotation.set(0, 0, 0);
    }
    if (this.helmet) this.helmet.visible = true;
  }

  // ---------------------------------------------------------------- poses
  idle(t) {
    this.reset();
    const b = Math.sin(t * 1.8) * 0.02;
    this.spine.rotation.x = 0.04 + b;
    this.arms[0].sh.rotation.z = -0.12;
    this.arms[1].sh.rotation.z = 0.12;
    this.arms[0].el.rotation.x = -0.2;
    this.arms[1].el.rotation.x = -0.2;
  }

  ready(t) {
    // fielder walking in / crouched ready
    this.reset();
    this.hips.position.y = 0.84;
    for (const l of this.legs) {
      l.hip.rotation.x = -0.35;
      l.knee.rotation.x = 0.6;
    }
    this.legs[0].hip.rotation.z = 0.15;
    this.legs[1].hip.rotation.z = -0.15;
    this.spine.rotation.x = 0.35 + Math.sin(t * 3) * 0.02;
    this.neck.rotation.x = -0.3;
    for (const [i, a] of this.arms.entries()) {
      a.sh.rotation.x = -0.6;
      a.sh.rotation.z = i ? -0.15 : 0.15;
      a.el.rotation.x = -0.5;
    }
  }

  run(phase, intensity = 1) {
    this.reset();
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    this.hips.position.y = 0.92 + Math.abs(c) * 0.05 * intensity;
    this.spine.rotation.x = 0.18 * intensity;
    this.legs[0].hip.rotation.x = s * 0.85 * intensity;
    this.legs[1].hip.rotation.x = -s * 0.85 * intensity;
    this.legs[0].knee.rotation.x = Math.max(0, -s) * 1.3 * intensity + 0.15;
    this.legs[1].knee.rotation.x = Math.max(0, s) * 1.3 * intensity + 0.15;
    this.arms[0].sh.rotation.x = -s * 0.9 * intensity;
    this.arms[1].sh.rotation.x = s * 0.9 * intensity;
    this.arms[0].el.rotation.x = -1.1;
    this.arms[1].el.rotation.x = -1.1;
  }

  /** Batter in stance. Root is turned side-on by the caller. */
  stance(t) {
    this.reset();
    this.hips.position.y = 0.9;
    for (const l of this.legs) {
      l.hip.rotation.x = -0.15;
      l.knee.rotation.x = 0.3;
    }
    this.legs[0].hip.rotation.z = 0.18;
    this.legs[1].hip.rotation.z = -0.18;
    this.spine.rotation.x = 0.32;
    this.spine.rotation.y = -0.25;
    this.neck.rotation.y = 1.15; // look down the pitch toward the bowler
    this.neck.rotation.x = -0.2;
    this.armsRig.rotation.set(0.1, 0, 0);
    this.gripArms();
    if (this.bat) {
      this.bat.rotation.set(0.25 + Math.sin(t * 2.2) * 0.04, 0, 0);
    }
  }

  gripArms() {
    // both hands meet in front of the body holding the bat handle
    this.arms[0].sh.rotation.set(-0.75, 0, 0.55);
    this.arms[1].sh.rotation.set(-0.7, 0, -0.5);
    this.arms[0].el.rotation.set(-0.35, 0, 0);
    this.arms[1].el.rotation.set(-0.4, 0, 0);
  }

  /**
   * Shot animation. p: 0..1; dirAngle: swing direction in the batter's frame
   * (0 = straight drive, + = off side), loft lifts the follow-through.
   */
  shot(p, dirAngle, type) {
    this.stance(0);
    this.neck.rotation.y = 1.0;
    const back = ease(clamp01(p / 0.3));
    const down = ease(clamp01((p - 0.3) / 0.25));
    const follow = ease(clamp01((p - 0.55) / 0.45));
    if (type === "defend") {
      this.spine.rotation.x = 0.45;
      this.legs[0].hip.rotation.x = -0.6 * back;
      this.legs[0].knee.rotation.x = 0.6 * back;
      this.armsRig.rotation.set(0.15 + back * 0.3, -0.9, 0);
      if (this.bat) this.bat.rotation.set(0.05, 0, 0);
      return;
    }
    // backlift raises the bat behind the head, then swings through the line
    const swingPlane = -0.9 + dirAngle * 0.55;
    const lift = back * 1.9 - down * 2.6 - follow * (type === "loft" ? 1.6 : 1.0);
    this.armsRig.rotation.set(lift * 0.35, swingPlane * (0.3 + down * 0.7), 0);
    if (this.bat) this.bat.rotation.set(0.25 + lift, 0, 0);
    this.spine.rotation.y = -0.25 + down * 0.6 + follow * 0.4;
    // front foot stride
    this.legs[0].hip.rotation.x = -0.55 * down;
    this.legs[0].knee.rotation.x = 0.3 + 0.35 * down;
    this.legs[1].knee.rotation.x = 0.3 + 0.25 * follow;
  }

  /** Bowling action: p 0..1 (run-up → delivery stride → follow-through) */
  bowl(p, runPhase, spin) {
    if (p < 0.62) {
      this.run(runPhase, spin ? 0.6 : 1);
      return;
    }
    this.reset();
    const k = clamp01((p - 0.62) / 0.2);
    const f = clamp01((p - 0.82) / 0.18);
    // gather: front arm high, bowling arm cocked behind
    this.spine.rotation.x = -0.25 + k * 0.9;
    this.spine.rotation.y = 0.6 - k * 1.0;
    this.arms[0].sh.rotation.x = lerp(-2.8, 0.6, k); // front (left) arm pulls down
    this.arms[1].sh.rotation.x = lerp(1.2, -3.6, ease(k)) + f * 1.0; // bowling arm windmills over the top
    this.arms[1].el.rotation.x = 0;
    this.legs[0].hip.rotation.x = lerp(-0.9, -0.4, k);
    this.legs[0].knee.rotation.x = 0.1;
    this.legs[1].hip.rotation.x = lerp(0.3, 0.9, k) + f * 0.4;
    this.legs[1].knee.rotation.x = 0.4 + f * 0.6;
    this.hips.position.y = 0.92 - f * 0.08;
  }

  keeperCrouch(t, rise = 0) {
    this.reset();
    const r = clamp01(rise);
    this.hips.position.y = lerp(0.48, 0.9, r);
    for (const l of this.legs) {
      l.hip.rotation.x = lerp(-1.4, -0.3, r);
      l.knee.rotation.x = lerp(2.1, 0.5, r);
    }
    this.legs[0].hip.rotation.z = 0.35;
    this.legs[1].hip.rotation.z = -0.35;
    this.spine.rotation.x = lerp(0.55, 0.3, r);
    for (const [i, a] of this.arms.entries()) {
      a.sh.rotation.x = -1.2 - r * 0.3;
      a.sh.rotation.z = i ? -0.25 : 0.25;
      a.el.rotation.x = -0.2;
    }
    this.neck.rotation.x = -0.4 + Math.sin(t * 2) * 0.02;
  }

  catchPose(high = true) {
    this.reset();
    for (const [i, a] of this.arms.entries()) {
      a.sh.rotation.x = high ? -2.9 : -1.4;
      a.sh.rotation.z = i ? -0.15 : 0.15;
      a.el.rotation.x = -0.2;
    }
    this.neck.rotation.x = high ? 0.4 : -0.2;
  }

  dive(dir, k) {
    this.catchPose(false);
    this.body.rotation.z = dir * ease(clamp01(k)) * 1.3;
    this.body.position.x = dir * ease(clamp01(k)) * 0.9;
    this.body.position.y = -ease(clamp01(k)) * 0.35;
  }

  throwPose(p) {
    this.reset();
    const k = ease(clamp01(p));
    this.arms[1].sh.rotation.x = lerp(1.6, -2.6, k);
    this.arms[0].sh.rotation.x = lerp(-1.4, 0.4, k);
    this.spine.rotation.y = lerp(0.6, -0.4, k);
    this.legs[0].hip.rotation.x = -0.5;
  }

  /** Celebrations: "armsUp" | "batRaise" | "century" | "airplane" | "fist" | "huddle" */
  celebrate(kind, t) {
    this.reset();
    const bob = Math.abs(Math.sin(t * 6));
    if (kind === "batRaise" || kind === "century") {
      this.armsRig.rotation.set(-2.6, 0, 0);
      this.arms[0].sh.rotation.set(-0.3, 0, 0.6);
      this.arms[1].sh.rotation.set(-0.2, 0, -0.4);
      if (this.bat) this.bat.rotation.set(-0.1, 0, 0);
      this.neck.rotation.x = 0.35;
      if (kind === "century") {
        this.body.position.y = bob * 0.35;
        if (this.helmet) this.helmet.visible = t < 0.8;
        this.arms[0].sh.rotation.set(-0.2, 0, -1.2 - Math.sin(t * 5) * 0.2);
      }
      return;
    }
    if (kind === "airplane") {
      this.run(t * 10, 0.9);
      this.arms[0].sh.rotation.set(0, 0, -1.5);
      this.arms[1].sh.rotation.set(0, 0, 1.5);
      this.arms[0].el.rotation.set(0, 0, 0);
      this.arms[1].el.rotation.set(0, 0, 0);
      this.body.rotation.z = Math.sin(t * 3) * 0.25;
      return;
    }
    if (kind === "fist") {
      this.arms[1].sh.rotation.set(-2.2 + Math.sin(t * 10) * 0.25, 0, -0.2);
      this.arms[1].el.rotation.set(-0.6, 0, 0);
      this.spine.rotation.x = -0.15;
      this.neck.rotation.x = 0.3;
      return;
    }
    if (kind === "huddle") {
      this.spine.rotation.x = 0.5;
      this.arms[0].sh.rotation.set(-1.2, 0, 1.2);
      this.arms[1].sh.rotation.set(-1.2, 0, -1.2);
      this.body.position.y = bob * 0.12;
      return;
    }
    // armsUp + jump
    this.body.position.y = bob * 0.28;
    this.arms[0].sh.rotation.set(-3.0, 0, 0.35);
    this.arms[1].sh.rotation.set(-3.0, 0, -0.35);
    this.neck.rotation.x = 0.4;
  }

  /** Umpire signals: "out" | "four" | "six" | "wide" | "noball" | "freehit" | "bye" | "legbye" */
  signal(kind, t) {
    this.reset();
    const R = this.arms[1];
    const L = this.arms[0];
    switch (kind) {
      case "out":
        R.sh.rotation.set(-3.05, 0, 0);
        break;
      case "six":
        R.sh.rotation.set(-3.05, 0, -0.15);
        L.sh.rotation.set(-3.05, 0, 0.15);
        break;
      case "four":
        R.sh.rotation.set(-1.4, 0, -0.2 + Math.sin(t * 7) * 0.9);
        break;
      case "wide":
        R.sh.rotation.set(0, 0, 1.55);
        L.sh.rotation.set(0, 0, -1.55);
        break;
      case "noball":
        R.sh.rotation.set(0, 0, 1.55);
        break;
      case "freehit":
        R.sh.rotation.set(-3.0, 0, 0);
        R.el.rotation.set(Math.sin(t * 8) * 0.5, 0, 0);
        break;
      case "bye":
        R.sh.rotation.set(-3.0, 0, -0.2);
        break;
      case "legbye":
        this.legs[1].hip.rotation.x = -1.0;
        this.legs[1].knee.rotation.x = 1.2;
        R.sh.rotation.set(-0.3, 0, -0.4);
        break;
      default:
        this.idle(t);
    }
  }
}

/** Physical stumps + bails that can be knocked over */
export class Wicket {
  constructor(z) {
    this.group = new THREE.Group();
    this.group.position.z = z;
    const wood = new THREE.MeshStandardMaterial({ color: 0xf1e7d0, roughness: 0.5 });
    const band = new THREE.MeshStandardMaterial({ color: 0x1b4fa0, roughness: 0.5 });
    const sg = new THREE.CylinderGeometry(0.018, 0.018, 0.711, 10).translate(0, 0.3555, 0);
    const bandG = new THREE.CylinderGeometry(0.0185, 0.0185, 0.12, 10).translate(0, 0.55, 0);
    this.stumps = [-0.1143 + 0.018, 0, 0.1143 - 0.018].map((x) => {
      const s = new THREE.Group();
      const m = new THREE.Mesh(sg, wood);
      m.castShadow = true;
      s.add(m);
      s.add(new THREE.Mesh(bandG, band));
      s.position.x = x;
      this.group.add(s);
      return { g: s, vx: 0, vz: 0, rx: 0, rz: 0 };
    });
    const bg = new THREE.CylinderGeometry(0.008, 0.008, 0.11, 6).rotateZ(Math.PI / 2);
    this.bails = [-0.055, 0.055].map((x) => {
      const b = new THREE.Mesh(bg, wood);
      b.position.set(x, 0.722, 0);
      b.castShadow = true;
      this.group.add(b);
      return { m: b, v: new THREE.Vector3(), w: new THREE.Vector3(), live: false };
    });
    this.broken = false;
  }

  reset() {
    this.broken = false;
    this.stumps.forEach((s, i) => {
      s.g.rotation.set(0, 0, 0);
      s.g.position.set([-0.0963, 0, 0.0963][i], 0, 0);
      s.rx = 0;
      s.rz = 0;
    });
    this.bails.forEach((b, i) => {
      b.m.position.set([-0.055, 0.055][i], 0.722, 0);
      b.m.rotation.set(0, 0, 0);
      b.live = false;
    });
  }

  /** Knock the wicket over: dir = ball velocity direction (x, z) */
  breakWith(vx, vz, strength = 1) {
    if (this.broken) return;
    this.broken = true;
    this.stumps.forEach((s) => {
      s.rx = (vz * 0.12 + (Math.random() - 0.5) * 0.4) * strength;
      s.rz = (-vx * 0.25 + (Math.random() - 0.5) * 0.5) * strength;
    });
    this.bails.forEach((b) => {
      b.live = true;
      b.v.set(vx * 0.25 + (Math.random() - 0.5) * 2, 2.5 + Math.random() * 2.5, vz * 0.25 + Math.random() * 2);
      b.w.set(Math.random() * 20, Math.random() * 20, Math.random() * 20);
    });
  }

  update(dt) {
    if (!this.broken) return;
    for (const s of this.stumps) {
      s.g.rotation.x += (Math.sign(s.rx) * Math.min(1.35, Math.abs(s.rx) * 6) - s.g.rotation.x) * Math.min(1, dt * 7);
      s.g.rotation.z += (Math.sign(s.rz) * Math.min(1.1, Math.abs(s.rz) * 5) - s.g.rotation.z) * Math.min(1, dt * 7);
    }
    for (const b of this.bails) {
      if (!b.live) continue;
      b.v.y -= 9.81 * dt;
      b.m.position.addScaledVector(b.v, dt);
      b.m.rotation.x += b.w.x * dt;
      b.m.rotation.y += b.w.y * dt;
      if (b.m.position.y < 0.01) {
        b.m.position.y = 0.01;
        b.v.multiplyScalar(0.3);
        b.v.y = Math.abs(b.v.y) * 0.3;
        b.w.multiplyScalar(0.5);
        if (b.v.length() < 0.2) b.live = false;
      }
    }
  }
}
