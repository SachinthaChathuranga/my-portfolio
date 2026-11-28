import { DELIVERIES, FIELD_PRESETS } from "./data";
import { STUMPS_Z, atZ, insideCircle } from "./physics";

const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function deliveryCatalogue(bowler) {
  return DELIVERIES[bowler.style === "spin" ? "spin" : bowler.style === "medium" ? "medium" : "pace"];
}

/**
 * Turn a bowling plan into physics parameters.
 * aim: { line (m, + = off side of the batter), len (m from batter's stumps) }
 */
export function buildDelivery({ bowler, def, aim, ground, side, overWicket = true, accuracy = 1, ballAge = 0 }) {
  const style = bowler.style || "medium";
  const skill = bowler.bowl / 100;
  const baseSpeed = style === "pace" ? 36.5 + skill * 5 : style === "medium" ? 32 + skill * 3.5 : 21.5 + skill * 3;
  const speed = baseSpeed * def.speed * (0.98 + Math.random() * 0.04);
  const err = (1 - clamp(accuracy, 0, 1)) * 1.3 + (1 - skill) * 0.18;
  const line = aim.line + gauss() * err * 0.35;
  const len = Math.max(0.4, aim.len + gauss() * err * 1.1);
  const bowlArmSide = overWicket ? -1 : 1;
  const release = { x: 0.85 * bowlArmSide, y: style === "spin" ? 2.0 : 2.2, z: -9.0 };
  const swingFactor = ground.pitch.swing * (1 - Math.min(0.6, ballAge / 180));
  const swing = (def.swing || 0) * swingFactor * (0.6 + skill * 0.6) * side;
  let turn = 0;
  if (style === "spin") {
    const dir = bowler.spinType === "leg" ? 1 : -1; // leg-break turns away from a RH batter
    turn = dir * (def.turn || 0) * 1.05 * ground.pitch.turn * (0.7 + skill * 0.5) * side * (0.85 + Math.random() * 0.3);
  }
  const seam = (def.seam || 0) * (Math.random() < 0.5 ? -1 : 1) * 0.55 * ground.pitch.pace * (style === "spin" ? 0 : 1);
  const bounce = clamp((style === "spin" ? 0.5 : 0.56) * ground.pitch.bounce * (def.bounceBoost || 1), 0.4, 0.72);
  const pace = clamp(style === "spin" ? 0.8 : 0.86 * (0.9 + ground.pitch.pace * 0.1), 0.7, 0.93);
  return {
    speed,
    release,
    target: { x: line * side, z: STUMPS_Z - len },
    swing,
    seam,
    turn,
    bounce,
    pace,
    def,
    style,
    planned: { line, len },
    difficulty: clamp(Math.abs(swing) / 3 + Math.abs(turn) / 2.2 + Math.abs(seam) / 2 + Math.max(0, speed - 30) / 30, 0, 1) * 0.6,
  };
}

/** AI bowling plan */
export function aiPlanDelivery({ bowler, batter, situation, aiSkill = 1 }) {
  const cat = deliveryCatalogue(bowler);
  const death = situation.death;
  const weights = cat.map((d) => {
    let w = 1;
    if (d.id === "stock") w = 3;
    if (death && (d.id === "yorker" || d.id === "slower")) w = 3;
    if (!death && d.id === "yorker") w = 0.5;
    if (d.id === "bouncer") w = situation.test ? 1 : 0.6;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let def = cat[0];
  for (let i = 0; i < cat.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      def = cat[i];
      break;
    }
  }
  const line = bowler.style === "spin" ? rnd(-0.05, 0.25) : rnd(0.0, 0.35);
  const len = def.len + rnd(-0.8, 0.8);
  // AI bowlers are less accurate against well-set, high-skill batters
  const accuracy = clamp((0.72 + bowler.bowl / 400) * aiSkill - (batter.runsNow > 40 ? 0.05 : 0), 0.4, 1);
  return { def, aim: { line, len }, accuracy, overstep: Math.random() < 0.012 };
}

/** AI batting decision for a delivery trajectory */
export function aiChooseShot({ traj, delivery, batter, side, aggression, aiSkill = 1, timingWindow = 1 }) {
  const b = traj.bounce;
  const len = b ? STUMPS_Z - b.z : 0; // 0 = full toss
  const fullToss = !b || b.z > STUMPS_Z - 1.3;
  const foot = len > 8.2 ? "back" : len < 2.5 && !fullToss ? "front" : len > 6 ? "back" : "front";
  const footZ = foot === "back" ? 9.35 : 8.45;
  const c = atZ(traj, footZ);
  if (!c) return { type: "leave", angle: 0, press: 99, foot };
  const lx = c.x * side;
  const st = atZ(traj, STUMPS_Z);
  const onStumps = st && Math.abs(st.x) < 0.16 && st.y < 0.75;

  const skill = (batter.bat / 100) * aiSkill;
  const bad = fullToss || (len > 9 && Math.abs(lx) > 0.25) || len < 2.2 || lx > 0.65 || lx < -0.35;
  const hittable = bad || (len < 5 && lx > -0.2 && lx < 0.6);

  // Leave good balls outside off when not chasing
  if (!onStumps && lx > 0.45 && aggression < 0.55 && Math.random() < 0.6) {
    return { type: "leave", angle: 0, press: 99, foot };
  }

  let type = "ground";
  let angle;
  if (len > 9 && c.y > 0.9) {
    // short: pull/hook or cut
    angle = lx > 0.3 ? 1.55 : -1.35;
    type = aggression > 0.55 && Math.random() < aggression ? "loft" : "ground";
  } else if (fullToss || len < 3) {
    angle = clamp(lx * 1.2, -1.0, 1.0) + rnd(-0.25, 0.25);
    type = aggression > 0.45 && Math.random() < aggression + 0.1 ? "loft" : "ground";
  } else if (len < 5.5) {
    angle = clamp(lx * 1.5, -0.9, 1.1) + rnd(-0.3, 0.3);
    type = Math.random() < aggression * 0.55 ? "loft" : "ground";
  } else {
    angle = clamp(lx * 1.4, -1.2, 1.4) + rnd(-0.4, 0.4);
    type = hittable && Math.random() < aggression ? "ground" : Math.random() < 0.55 - aggression * 0.3 ? "defend" : "ground";
    if (delivery.style === "spin" && aggression > 0.6 && Math.random() < 0.3) {
      // sweep / slog-sweep
      angle = -1.5;
      type = Math.random() < 0.5 ? "loft" : "ground";
    }
  }
  if (!hittable && type === "loft" && Math.random() > aggression) type = "ground";
  const swingLead = type === "defend" ? 0.06 : 0.14;
  const sigma = (0.035 + (1 - skill) * 0.07) * (1 + delivery.difficulty) / Math.max(0.5, timingWindow);
  const press = c.t - swingLead + gauss() * sigma;
  return { type, angle: angle * side, press, foot };
}

/** Aggression 0..1 from match context */
export function battingAggression({ format, ballsLeft, runsNeeded, wktsDown, oversDone, totalOvers, batterRuns }) {
  if (format === "test") return clamp(0.22 + (batterRuns > 30 ? 0.08 : 0) - wktsDown * 0.01, 0.1, 0.45);
  let a = 0.38;
  if (totalOvers) {
    const prog = oversDone / totalOvers;
    a += prog > 0.8 ? 0.35 : prog < 0.3 ? 0.12 : 0.05;
  }
  if (runsNeeded != null && ballsLeft > 0) {
    const rr = (runsNeeded * 6) / ballsLeft;
    a += clamp((rr - 7) * 0.06, -0.15, 0.4);
  }
  a -= Math.max(0, wktsDown - 5) * 0.05;
  return clamp(a, 0.12, 0.95);
}

/** Decide whether to set off for the next run */
export function aiShouldRun({ throwArrival, now, runTime, aggression }) {
  const margin = 0.75 - aggression * 0.45;
  return throwArrival - (now + runTime) > margin;
}

/** Field for an AI captain */
export function aiFieldPreset({ style, powerplay, death, test, newBatter }) {
  if (test) return style === "spin" ? "spin" : newBatter ? "attacking" : "balanced";
  if (death) return "death";
  if (style === "spin") return powerplay ? "balanced" : "spin";
  if (powerplay) return newBatter ? "attacking" : "balanced";
  return "balanced";
}

export function presetSpots(name, side, maxOutside) {
  const spots = FIELD_PRESETS[name].spots.map(([x, z]) => [x * side, z]);
  return enforceRestriction(spots, maxOutside);
}

/** Pull fielders inside the 30-yard circle until the restriction is satisfied */
export function enforceRestriction(spots, maxOutside) {
  const out = spots.map((s, i) => ({ i, s, outside: !insideCircle(s[0], s[1]), d: Math.hypot(s[0], s[1]) }));
  let count = out.filter((o) => o.outside).length;
  const sorted = out.filter((o) => o.outside).sort((a, b) => a.d - b.d);
  const res = spots.map((s) => s.slice());
  for (const o of sorted) {
    if (count <= maxOutside) break;
    const ang = Math.atan2(o.s[0], o.s[1]);
    res[o.i] = [Math.sin(ang) * 22, Math.cos(ang) * 30];
    count--;
  }
  return res;
}

/** On-field umpire call (can be wrong, especially for marginal decisions) */
export function umpireCall(truthOut, marginal) {
  const correct = Math.random() < (marginal ? 0.6 : 0.9);
  return correct ? truthOut : !truthOut;
}

export function aiWantsReview({ analysisOut, marginal, reviewsLeft, battingSide, aiSkill = 1 }) {
  if (reviewsLeft <= 0) return false;
  if (battingSide) {
    // given out: review when Hawk-Eye would say not out
    if (!analysisOut) return Math.random() < 0.7 * aiSkill;
    return Math.random() < (marginal ? 0.25 : 0.05);
  }
  // fielding side, given not out
  if (analysisOut && !marginal) return Math.random() < 0.75 * aiSkill;
  return Math.random() < (marginal ? 0.3 : 0.04);
}

/** Statistical ball outcome used by quick-sim */
export function quickSimBall({ batter, bowler, aggression, freeHit, fielders }) {
  const d = (batter.bat - bowler.bowl) / 100;
  const a = aggression;
  const p = {
    wd: 0.025,
    nb: 0.006,
    dot: 0.42 - a * 0.14 - d * 0.1,
    1: 0.3 + d * 0.03,
    2: 0.07 + a * 0.02,
    3: 0.008,
    4: 0.08 + a * 0.06 + d * 0.06,
    6: 0.015 + a * 0.07 + d * 0.04,
    W: freeHit ? 0.002 : 0.035 + a * 0.03 - d * 0.04,
  };
  const keys = Object.keys(p);
  const total = keys.reduce((s, k) => s + Math.max(0.001, p[k]), 0);
  let r = Math.random() * total;
  let pick = "dot";
  for (const k of keys) {
    r -= Math.max(0.001, p[k]);
    if (r <= 0) {
      pick = k;
      break;
    }
  }
  const fielder = fielders[Math.floor(Math.random() * fielders.length)];
  if (pick === "wd") return { runs: 0, extra: { type: "wd" } };
  if (pick === "nb") return { runs: Math.random() < 0.3 ? 1 : 0, extra: { type: "nb" } };
  if (pick === "dot") return { runs: 0 };
  if (pick === "W") {
    const r2 = Math.random();
    const how = r2 < 0.5 ? "caught" : r2 < 0.68 ? "bowled" : r2 < 0.83 ? "lbw" : r2 < 0.9 ? "caught behind" : r2 < 0.94 && bowler.style === "spin" ? "stumped" : "run out";
    return {
      runs: 0,
      wicket: { how, out: "striker", fielder: how === "caught behind" || how === "stumped" ? 6 : fielder, bowlerCredit: how !== "run out" },
    };
  }
  const runs = Number(pick);
  return { runs, boundary: runs === 4 || runs === 6 ? runs : null };
}

const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function commentary({ outcome, batterName, bowlerName, len, shotLabel }) {
  const b = batterName.split(" ").slice(-1)[0];
  const w = bowlerName.split(" ").slice(-1)[0];
  if (outcome.wicket) {
    const how = outcome.wicket.how;
    if (how === "bowled") return pickLine([`Timber! ${w} knocks over ${b}!`, `Bowled him! Through the gate and ${b} has to go.`, `Castled! The stumps are cartwheeling — ${w} strikes.`]);
    if (how === "lbw") return pickLine([`Plumb in front — ${b} is trapped LBW by ${w}.`, `Up goes the finger! ${b} lbw.`]);
    if (how === "caught behind") return `Nicked and taken behind! ${b} feathers one off ${w}.`;
    if (how === "stumped") return `Stumped! ${b} danced down and the keeper whips the bails off.`;
    if (how === "run out") return pickLine([`Run out! Terrible mix-up and ${b} is short of the crease.`, `Direct hit! ${b} is gone.`]);
    return pickLine([`Caught! ${b} picks out the fielder off ${w}.`, `In the air… and taken! ${b} has to walk.`]);
  }
  if (outcome.extra?.type === "wd") return pickLine([`Wide, called by the umpire.`, `Strays down the leg side — wide.`]);
  if (outcome.extra?.type === "nb") return `No ball! Overstepped — free hit coming up.`;
  if (outcome.boundary === 6) return pickLine([`MASSIVE! ${b} launches that into the stands for SIX!`, `That's huge — clean as a whistle, six more!`, `Out of the ground! ${b} goes big.`]);
  if (outcome.boundary === 4) return pickLine([`Beautiful ${shotLabel || "shot"} — races away for FOUR.`, `Pierces the gap, no stopping that. Four!`, `Cracking stroke from ${b}, that's four.`]);
  if (outcome.extra?.type === "lb") return `Off the pads, they scamper ${outcome.runs} leg bye${outcome.runs > 1 ? "s" : ""}.`;
  if (outcome.extra?.type === "b") return `Beats everyone — ${outcome.runs} bye${outcome.runs > 1 ? "s" : ""}.`;
  if (outcome.runs === 0) return len > 9 ? `Short one, ${b} lets it go through.` : pickLine([`Solid defence from ${b}.`, `Dot ball — good tight line from ${w}.`, `Beaten! Just past the edge.`]);
  return pickLine([`Worked away for ${outcome.runs}.`, `Good running, ${outcome.runs} taken.`, `Pushed into the gap — ${outcome.runs} run${outcome.runs > 1 ? "s" : ""}.`]);
}
