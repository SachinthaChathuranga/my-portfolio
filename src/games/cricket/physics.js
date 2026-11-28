/**
 * Cricket ball physics & decision geometry.
 * Frame: pitch centred at origin, ball travels from the bowler (−z) to the
 * striker (+z). Striker's stumps at z = +10.06. For a right-handed batter the
 * off side is +x (left-handers are mirrored by the caller via `side`).
 */

export const G = 9.81;
export const STUMPS_Z = 10.06;
export const BOWL_STUMPS_Z = -10.06;
export const POPPING_Z = STUMPS_Z - 1.22;
export const BALL_R = 0.036;
export const STUMP_HALF = 0.1143; // 9 in wide wicket
export const STUMP_H = 0.711;
export const DT = 1 / 240;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Build a delivery trajectory.
 * d = { speed (m/s), release: {x,y,z}, target: {x,z}, swing (m/s² lateral),
 *       seam (m/s lateral after bounce), turn (m/s lateral after bounce),
 *       bounce (restitution), pace (horizontal retention) }
 */
export function simulateDelivery(d) {
  const r = d.release;
  const dz = d.target.z - r.z;
  // horizontal component dominates; slight loss of pace through the air
  const vz = d.speed * 0.985;
  const T = dz / vz;
  const vy = (BALL_R - r.y + 0.5 * G * T * T) / T;
  const vx = (d.target.x - r.x - 0.5 * d.swing * T * T) / T;

  const pts = [];
  let x = r.x;
  let y = r.y;
  let z = r.z;
  let px = vx;
  let py = vy;
  let pz = vz;
  let t = 0;
  let bounced = false;
  let bounce = null;
  let ax = d.swing;
  while (z < STUMPS_Z + 3.5 && t < 4) {
    pts.push({ t, x, y, z });
    px += ax * DT;
    py -= G * DT;
    x += px * DT;
    y += py * DT;
    z += pz * DT;
    t += DT;
    if (!bounced && y <= BALL_R) {
      bounced = true;
      y = BALL_R;
      bounce = { t, x, y, z };
      py = -py * d.bounce;
      pz *= d.pace;
      px = px * 0.85 + (d.seam || 0) + (d.turn || 0);
      ax *= 0.25; // little swing after pitching
    } else if (bounced && y <= BALL_R) {
      y = BALL_R;
      py = -py * 0.4;
      pz *= 0.9;
    }
  }
  return { pts, bounce, speed: d.speed, flight: T };
}

/** Interpolated ball state when the delivery reaches plane z. */
export function atZ(traj, zPlane) {
  const p = traj.pts;
  for (let i = 1; i < p.length; i++) {
    if (p[i].z >= zPlane) {
      const a = p[i - 1];
      const b = p[i];
      const k = (zPlane - a.z) / (b.z - a.z || 1);
      return { t: a.t + (b.t - a.t) * k, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: zPlane };
    }
  }
  return null;
}

export function atTime(pts, t) {
  if (!pts.length) return null;
  if (t <= pts[0].t) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].t >= t) {
      const a = pts[i - 1];
      const b = pts[i];
      const k = (t - a.t) / (b.t - a.t || 1);
      return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };
    }
  }
  return pts[pts.length - 1];
}

/** Does the delivery (ignoring the batter) hit the stumps? margin > 0 = hitting */
export function stumpsCheck(traj) {
  const s = atZ(traj, STUMPS_Z);
  if (!s) return { hitting: false, margin: -1, point: null };
  const mx = STUMP_HALF + BALL_R - Math.abs(s.x);
  const my = STUMP_H + BALL_R - s.y;
  return { hitting: mx > 0 && my > 0 && s.y > -0.05, margin: Math.min(mx, my), point: s };
}

/**
 * Evaluate the bat meeting the ball.
 * shot = { type: "ground"|"loft"|"defend"|"leave"|"none", angle, press (time, s from release), foot }
 * batter = { bat (0-100), power, side (+1 RH / −1 LH) }
 * timingScale = difficulty multiplier of the timing window
 */
export function evaluateContact(traj, shot, batter, timingScale = 1, deliveryDifficulty = 0) {
  const side = batter.side;
  const footZ = shot.foot === "advance" ? 7.2 : shot.foot === "back" ? 9.35 : 8.45;
  const c = atZ(traj, footZ);
  if (!c) return { kind: "miss" };
  const result = { contactPoint: c, contactT: c.t, footZ };
  if (shot.type === "leave" || shot.type === "none") return { ...result, kind: "leave" };

  // relative line in the batter's frame (+ = off side)
  const lx = c.x * side;
  const reachOff = 1.35;
  const reachLeg = 0.95;
  const height = c.y;
  const swingLead = shot.type === "defend" ? 0.06 : 0.14;
  const err = shot.press + swingLead - c.t; // + late, − early
  const W = (0.075 + 0.07 * (batter.bat / 100)) * timingScale * (shot.type === "defend" ? 1.7 : 1);
  result.timingError = err;

  const inReach = lx < reachOff && lx > -reachLeg - 0.25;
  const pull = shot.angle * side < -0.7; // leg-side cross-bat shot
  const tooHigh = height > (pull ? 2.1 : 1.55);
  if (!inReach || tooHigh) return { ...result, kind: "miss", reason: !inReach ? "reach" : "height" };

  // natural angle for the line: balls outside off go square on the off side, leg-side balls to leg
  const natural = clamp(lx * 1.6, -1.4, 1.6) * side;
  const mismatch = Math.min(1, Math.abs(shot.angle - natural) / 2.6);
  const mismatchPenalty = shot.type === "defend" ? 0 : mismatch * (shot.type === "loft" ? 0.35 : 0.45);
  const timingQ = 1 - Math.abs(err) / W;
  let q = timingQ * (1 - mismatchPenalty) * (1 - deliveryDifficulty * 0.35);

  if (Math.abs(err) > W * 1.7) return { ...result, kind: "miss", reason: err > 0 ? "late" : "early" };
  if (q < 0.18) {
    // edges: late → outside edge, early/mismatched → inside edge
    const outside = err > 0 || lx > 0.15;
    return { ...result, kind: outside ? "outsideEdge" : "insideEdge", q: Math.max(0, q), thickness: Math.random() };
  }
  q = clamp(q, 0, 1);
  return { ...result, kind: "hit", q, label: q > 0.82 ? "PERFECT" : q > 0.6 ? "GOOD" : err > 0 ? "LATE" : "EARLY" };
}

/**
 * Initial velocity for the ball after bat contact.
 * returns {pos, vel}
 */
export function shotVelocity(contact, shot, batter, delivery) {
  const side = batter.side;
  const c = contact.contactPoint;
  const pos = { x: c.x, y: Math.max(0.15, c.y), z: c.z };
  const powerSkill = 0.6 + (batter.power / 100) * 0.5;
  const incoming = delivery.speed;
  if (contact.kind === "outsideEdge") {
    const thick = contact.thickness;
    const ang = Math.PI - (0.12 + thick * 0.55) * side; // behind, toward off side
    const sp = incoming * (0.45 + thick * 0.25);
    const up = 0.04 + Math.random() * 0.16;
    return { pos, vel: { x: Math.sin(ang) * sp, y: sp * up, z: -Math.cos(ang) * sp } };
  }
  if (contact.kind === "insideEdge") {
    const ang = Math.PI + (0.2 + Math.random() * 0.6) * side;
    const sp = incoming * 0.3;
    return { pos, vel: { x: Math.sin(ang) * sp, y: -0.5, z: -Math.cos(ang) * sp }, insideEdge: true };
  }
  const q = contact.q;
  // timing pushes the ball: late → finer on off side, early → toward leg
  const err = contact.timingError || 0;
  const ang = shot.angle + err * 3.2 * side + (Math.random() - 0.5) * (1 - q) * 0.9;
  let speed;
  let elev;
  if (shot.type === "defend") {
    speed = 3 + Math.random() * 4;
    elev = -0.05;
  } else if (shot.type === "loft") {
    speed = (19 + 24 * q * powerSkill) * (0.8 + Math.random() * 0.25);
    elev = (q > 0.5 ? 0.42 + Math.random() * 0.22 : 0.75 + Math.random() * 0.4); // mistimed lofts get skied
  } else {
    speed = (13 + 24 * q * powerSkill) * (0.85 + Math.random() * 0.2) + incoming * 0.08;
    elev = (c.y > 1.0 ? 0.12 : 0.03) + Math.random() * 0.08 - (q < 0.5 ? 0 : 0.02);
  }
  const h = Math.cos(elev) * speed;
  return {
    pos,
    vel: { x: Math.sin(ang) * h, y: Math.sin(elev) * speed, z: -Math.cos(ang) * h },
  };
}

/** Ellipse boundary helper */
export function boundaryRatio(x, z, b) {
  return Math.sqrt((x / b.x) ** 2 + (z / b.z) ** 2);
}

/**
 * Integrate the struck ball until it stops (or leaves the ground).
 * Returns samples and boundary info.
 */
export function simulateHit(pos, vel, boundary, outfieldSpeed = 1) {
  const pts = [];
  let { x, y, z } = pos;
  let vx = vel.x;
  let vy = vel.y;
  let vz = vel.z;
  let t = 0;
  let bounces = 0;
  let firstBounce = null;
  let crossed = null;
  const k = 0.0045; // air drag
  const dt = 1 / 120;
  while (t < 12) {
    pts.push({ t, x, y, z, b: bounces });
    const sp = Math.hypot(vx, vy, vz);
    vx -= k * sp * vx * dt;
    vy -= (G + k * sp * vy) * dt;
    vz -= k * sp * vz * dt;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    t += dt;
    if (y <= BALL_R) {
      y = BALL_R;
      if (Math.abs(vy) > 1.2) {
        bounces += 1;
        if (!firstBounce) firstBounce = { t, x, z };
        vy = -vy * 0.38;
        vx *= 0.72;
        vz *= 0.72;
      } else {
        vy = 0;
        // rolling friction on the outfield
        const hs = Math.hypot(vx, vz);
        const dec = Math.min(hs, 2.2 / outfieldSpeed * dt * 1.0 + 0.004 * hs);
        if (hs > 0) {
          vx -= (vx / hs) * dec;
          vz -= (vz / hs) * dec;
        }
      }
    }
    if (!crossed && boundaryRatio(x, z, boundary) >= 1) {
      crossed = { t, x, z, y, onFull: bounces === 0, six: bounces === 0 && y > 0.2 };
    }
    if (crossed && t > crossed.t + 1.2) break;
    if (!crossed && Math.hypot(vx, vy, vz) < 0.25 && y <= BALL_R + 0.001) break;
  }
  pts.push({ t, x, y, z, b: bounces });
  return { pts, crossed, firstBounce, end: { x, y, z, t } };
}

/**
 * Find which fielder gets to the ball first.
 * fielders: [{x, z, speed, catching, reaction, isKeeper, idx}]
 * returns { fielder, t, point, kind: "catch"|"drop"|"stop"|"none", catchable }
 */
export function resolveFielding(hit, fielders) {
  const limit = hit.crossed ? hit.crossed.t : Infinity;
  let best = null;
  for (const p of hit.pts) {
    if (p.t > limit) break;
    const airborne = p.b === 0 && p.y > 0.12;
    const reachableHeight = airborne ? p.y < 3.1 : p.y < 0.9;
    if (!reachableHeight) continue;
    for (const f of fielders) {
      const reach = airborne ? (f.isKeeper ? 1.6 : 2.2) : 1.1;
      const runT = Math.max(0, p.t - f.reaction);
      const dist = Math.hypot(p.x - f.x, p.z - f.z) - reach;
      if (dist <= runT * f.speed) {
        if (!best || p.t < best.t) best = { fielder: f, t: p.t, point: p, airborne, runDist: Math.max(0, dist) };
        break;
      }
    }
    if (best) break;
  }
  if (!best) return { kind: "none" };
  if (best.airborne) {
    const sp = speedAt(hit.pts, best.t);
    const dive = best.runDist > 0.3 ? 0.12 : 0;
    const highOrLow = best.point.y > 2.4 || best.point.y < 0.35 ? 0.08 : 0;
    const pCatch = Math.max(0.08, best.fielder.catching - sp * 0.006 - dive - highOrLow);
    return { ...best, kind: Math.random() < pCatch ? "catch" : "drop", pCatch };
  }
  return { ...best, kind: "stop" };
}

function speedAt(pts, t) {
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].t >= t) {
      const a = pts[i - 1];
      const b = pts[i];
      const dt = b.t - a.t || 1e-3;
      return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt;
    }
  }
  return 0;
}

/**
 * Hawk-Eye LBW analysis.
 * side: +1 RH / −1 LH. impact: point where the ball struck the pad.
 */
export function lbwAnalysis(traj, impact, side, shotOffered) {
  const zone = STUMP_HALF + BALL_R;
  const b = traj.bounce;
  // Pitching
  let pitching = "in line";
  if (b) {
    const bx = b.x * side;
    if (bx < -zone) pitching = "outside leg";
    else if (bx > zone) pitching = "outside off";
  }
  // Impact
  const ix = impact.x * side;
  let impactRes;
  if (Math.abs(ix) <= STUMP_HALF) impactRes = "in line";
  else if (Math.abs(ix) <= zone) impactRes = "umpire's call";
  else impactRes = ix > 0 ? "outside off" : "outside leg";
  // Wickets (projected path continues as if the pad was not there)
  const s = stumpsCheck(traj);
  let wickets;
  if (!s.point) wickets = "missing";
  else {
    const centreIn = Math.abs(s.point.x) <= STUMP_HALF - BALL_R * 0.0 && s.point.y <= STUMP_H;
    if (centreIn && s.margin > BALL_R) wickets = "hitting";
    else if (s.hitting) wickets = "umpire's call";
    else wickets = "missing";
  }
  let out = true;
  if (pitching === "outside leg") out = false;
  if (impactRes === "outside leg") out = false;
  if (impactRes === "outside off" && shotOffered) out = false;
  if (wickets === "missing") out = false;
  const marginal = impactRes === "umpire's call" || wickets === "umpire's call";
  return { pitching, impact: impactRes, wickets, out, marginal, stumpsPoint: s.point, shotOffered, impactPoint: impact };
}

/** DRS: final decision given the on-field call and Hawk-Eye analysis */
export function drsVerdict(onField, a) {
  const clearlyNotOut =
    a.pitching === "outside leg" ||
    a.impact === "outside leg" ||
    (a.impact === "outside off" && a.shotOffered) ||
    a.wickets === "missing";
  if (onField === "out") {
    if (clearlyNotOut) return { final: "not out", overturned: true, umpiresCall: false };
    if (a.marginal) return { final: "out", overturned: false, umpiresCall: true };
    return { final: "out", overturned: false, umpiresCall: false };
  }
  if (clearlyNotOut) return { final: "not out", overturned: false, umpiresCall: false };
  if (a.marginal) return { final: "not out", overturned: false, umpiresCall: true };
  return { final: "out", overturned: true, umpiresCall: false };
}

/** Ellipse test for the 30-yard (27.4 m) inner circle around the pitch */
export function insideCircle(x, z) {
  return (x / 27.4) ** 2 + (z / 37.4) ** 2 <= 1;
}
