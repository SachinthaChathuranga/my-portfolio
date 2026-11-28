/**
 * Turns the hand-authored 58×58 m mission layouts into large ~130×130 m
 * theaters: building blocks are spread apart (interiors keep their exact
 * layout), and a seeded generator fills the new open ground with extra patrol
 * squads, cover, roads, forests, rocks and grass. Objectives become an ordered
 * TASK 1 → TASK 2 → TASK 3 chain.
 */

export const MAP_SCALE = 2.25;

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len2));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/** Door world position for a building side (used to route roads to entrances). */
function doorPoint(b, side) {
  const mid = side === "north" || side === "south" ? b.x + b.w / 2 : b.z + b.d / 2;
  if (side === "north") return { x: mid, z: b.z - 2.5 };
  if (side === "south") return { x: mid, z: b.z + b.d + 2.5 };
  if (side === "west") return { x: b.x - 2.5, z: mid };
  return { x: b.x + b.w + 2.5, z: mid };
}

export function expandMission(src) {
  const k = MAP_SCALE;
  const S = Math.round(src.size * k);
  const rng = mulberry32(hashString(src.id));
  const rand = (a, b) => a + rng() * (b - a);

  const inOldBuilding = (x, z) =>
    src.buildings.find((b) => x >= b.x && x <= b.x + b.w && z >= b.z && z <= b.z + b.d) || null;

  // Points inside a building keep their offset from the (moved) building corner
  const mapPt = (x, z) => {
    const b = inOldBuilding(x, z);
    if (b) return { x: b.x * k + (x - b.x), z: b.z * k + (z - b.z) };
    return { x: x * k, z: z * k };
  };

  const buildings = src.buildings.map((b) => ({
    ...b,
    x: b.x * k,
    z: b.z * k,
    interiorProps: (b.interiorProps || []).map((ip) => ({
      ...ip,
      x: b.x * k + (ip.x - b.x),
      z: b.z * k + (ip.z - b.z),
    })),
  }));

  const props = (src.props || [])
    .filter((p) => p.kind !== "tree")
    .map((p) => ({ ...p, ...mapPt(p.x, p.z) }));

  const objectives = src.objectives.map((o, i) => ({
    ...o,
    ...mapPt(o.x, o.z),
    order: i,
    taskLabel: `TASK ${i + 1}`,
  }));
  const enemies = src.enemies.map((e) => ({ ...e, ...mapPt(e.x, e.z) }));
  const pickups = src.pickups.map((p) => ({ ...p, ...mapPt(p.x, p.z) }));
  const start = mapPt(src.playerStart.x, src.playerStart.z);
  const extraction = { ...src.extraction, ...mapPt(src.extraction.x, src.extraction.z) };

  // ---------- Road network: spawn → each objective building door → extraction ----------
  const nodes = [{ x: start.x, z: start.z }];
  for (const o of objectives) {
    const b = buildings.find((bb) => o.x >= bb.x && o.x <= bb.x + bb.w && o.z >= bb.z && o.z <= bb.z + bb.d);
    if (b) {
      const side = (b.doors && b.doors[0] && b.doors[0].side) || "south";
      nodes.push(doorPoint(b, side));
    } else {
      nodes.push({ x: o.x, z: o.z });
    }
  }
  for (const b of buildings) {
    const side = (b.doors && b.doors[0] && b.doors[0].side) || "south";
    const p = doorPoint(b, side);
    if (!nodes.some((n) => Math.hypot(n.x - p.x, n.z - p.z) < 3)) nodes.push(p);
  }
  nodes.push({ x: extraction.x, z: extraction.z });

  // Greedy nearest-neighbour chain keeps roads short and natural-looking
  const roads = [];
  const remaining = nodes.slice(1);
  let cur = nodes[0];
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((n, i) => {
      const d = Math.hypot(n.x - cur.x, n.z - cur.z);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const nxt = remaining.splice(bi, 1)[0];
    // L-shaped dog-leg so roads run between buildings instead of through them
    const elbow = rng() > 0.5 ? { x: nxt.x, z: cur.z } : { x: cur.x, z: nxt.z };
    roads.push({ ax: cur.x, az: cur.z, bx: elbow.x, bz: elbow.z, w: 4.2 });
    roads.push({ ax: elbow.x, az: elbow.z, bx: nxt.x, bz: nxt.z, w: 4.2 });
    cur = nxt;
  }

  const nearRoad = (x, z, pad) => roads.some((r) => distToSegment(x, z, r.ax, r.az, r.bx, r.bz) < r.w / 2 + pad);

  // ---------- Occupancy test for procedural placement ----------
  const blockers = [];
  for (const b of buildings) blockers.push({ x0: b.x - 3, x1: b.x + b.w + 3, z0: b.z - 3, z1: b.z + b.d + 3 });
  for (const p of props) blockers.push({ x0: p.x - 3.2, x1: p.x + 3.2, z0: p.z - 3.2, z1: p.z + 3.2 });
  const keepOut = [
    { x: start.x, z: start.z, r: 7 },
    { x: extraction.x, z: extraction.z, r: 7 },
    ...objectives.map((o) => ({ x: o.x, z: o.z, r: 4 })),
    ...pickups.map((p) => ({ x: p.x, z: p.z, r: 2.5 })),
  ];

  const isFree = (x, z, r = 1.5, roadPad = 1.2) => {
    if (x < 4 || z < 4 || x > S - 4 || z > S - 4) return false;
    for (const bl of blockers) {
      if (x + r > bl.x0 && x - r < bl.x1 && z + r > bl.z0 && z - r < bl.z1) return false;
    }
    for (const ko of keepOut) if (Math.hypot(x - ko.x, z - ko.z) < ko.r + r) return false;
    if (roadPad >= 0 && nearRoad(x, z, roadPad + r)) return false;
    return true;
  };
  const occupy = (x, z, r) => blockers.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });

  // ---------- Extra cover along the approach lanes ----------
  const coverKinds = ["sandbags", "barrier", "crate", "sandbags", "barrel", "crate"];
  let placedCover = 0;
  for (let tries = 0; tries < 400 && placedCover < 18; tries++) {
    const x = rand(8, S - 8);
    const z = rand(8, S - 8);
    // prefer spots close to (but not on) roads, so firefights have cover
    if (!nearRoad(x, z, 9) || !isFree(x, z, 1.8, 0.8)) continue;
    const kind = coverKinds[Math.floor(rng() * coverKinds.length)];
    const horizontal = rng() > 0.5;
    if (kind === "sandbags" || kind === "barrier") {
      props.push({ kind, x, z, w: horizontal ? 4.2 : 0.9, d: horizontal ? 0.9 : 4.2 });
    } else {
      props.push({ kind, x, z });
    }
    occupy(x, z, 2.6);
    placedCover++;
  }

  // Abandoned vehicles parked off-road
  for (let tries = 0, placed = 0; tries < 200 && placed < 3; tries++) {
    const x = rand(10, S - 10);
    const z = rand(10, S - 10);
    if (!nearRoad(x, z, 8) || !isFree(x, z, 3.4, 0.6)) continue;
    props.push({ kind: "truck", x, z, rot: rng() > 0.5 ? 0 : 1.57 });
    occupy(x, z, 4);
    placed++;
  }

  // ---------- Extra patrol squads across the bigger battlefield ----------
  const baseHp = Math.round(
    src.enemies.filter((e) => e.kind === "trooper").reduce((a, e) => a + e.hp, 0) /
      Math.max(1, src.enemies.filter((e) => e.kind === "trooper").length)
  ) || 85;
  const baseSpeed = src.enemies.find((e) => e.kind === "trooper")?.speed || 2.8;
  const squadCount = 4 + Math.min(3, src.index);
  let eid = 0;
  for (let sq = 0, tries = 0; sq < squadCount && tries < 600; tries++) {
    const cx = rand(12, S - 12);
    const cz = rand(12, S - 12);
    if (Math.hypot(cx - start.x, cz - start.z) < 34) continue;
    if (!isFree(cx, cz, 2, -1)) continue;
    const size = 2 + (rng() > 0.55 ? 1 : 0);
    for (let m = 0; m < size; m++) {
      const ex = cx + (m - 1) * 2.2;
      const ez = cz + (rng() - 0.5) * 2.4;
      const roll = rng();
      const kind = roll > 0.86 ? "sniper" : roll > 0.7 ? "heavy" : "trooper";
      enemies.push({
        id: `${src.id}-px${eid++}`,
        kind,
        x: ex,
        z: ez,
        hp: kind === "heavy" ? Math.round(baseHp * 1.75) : kind === "sniper" ? baseHp - 8 : baseHp,
        speed: kind === "heavy" ? baseSpeed * 0.85 : baseSpeed,
        patrolRadius: 9,
      });
    }
    occupy(cx, cz, 3);
    sq++;
  }

  // Extra resupply on the larger map
  for (let tries = 0, placed = 0; tries < 200 && placed < 3; tries++) {
    const x = rand(10, S - 10);
    const z = rand(10, S - 10);
    if (!isFree(x, z, 1, 0.5)) continue;
    pickups.push({ id: `${src.id}-pk${placed}`, kind: placed % 2 ? "ammo" : "medkit", x, z });
    occupy(x, z, 1.5);
    placed++;
  }

  // ---------- Vegetation & terrain dressing ----------
  const style = src.env.treeStyle;
  const weather = src.env.weather;
  const treeKinds =
    style === "palm"
      ? weather === "dust"
        ? ["palm", "palm", "scrub"]
        : ["palm", "broadleaf", "broadleaf", "palm"]
      : style === "pine"
      ? ["pine"]
      : ["dead"];

  const trees = [];
  // Old authored trees keep their spot (scaled)
  for (const p of src.props || []) {
    if (p.kind !== "tree") continue;
    const q = mapPt(p.x, p.z);
    trees.push({ kind: treeKinds[0], x: q.x, z: q.z, s: rand(0.9, 1.25), r: rand(0, Math.PI * 2), collide: true });
  }
  // Clustered groves inside the play area
  const densityByStyle = { palm: weather === "dust" ? 26 : 85, pine: 80, dead: 28 };
  const innerTarget = densityByStyle[style] || 50;
  const groves = Array.from({ length: 9 }, () => ({ x: rand(6, S - 6), z: rand(6, S - 6) }));
  for (let tries = 0; tries < innerTarget * 12 && trees.length < innerTarget; tries++) {
    const g = groves[Math.floor(rng() * groves.length)];
    const ang = rng() * Math.PI * 2;
    const rad = Math.sqrt(rng()) * 16;
    const x = g.x + Math.cos(ang) * rad;
    const z = g.z + Math.sin(ang) * rad;
    if (!isFree(x, z, 1.2, 1.5)) continue;
    trees.push({
      kind: treeKinds[Math.floor(rng() * treeKinds.length)],
      x,
      z,
      s: rand(0.8, 1.35),
      r: rand(0, Math.PI * 2),
      collide: true,
    });
    occupy(x, z, 1.1);
  }
  // Dense forest belt outside the fence (decorative, no colliders)
  const outerCount = style === "dead" ? 70 : weather === "dust" ? 90 : 320;
  for (let i = 0; i < outerCount; i++) {
    const side = Math.floor(rng() * 4);
    const along = rand(-40, S + 40);
    const out = 3 + Math.pow(rng(), 0.7) * 55;
    const x = side === 0 ? along : side === 1 ? along : side === 2 ? -out : S + out;
    const z = side === 0 ? -out : side === 1 ? S + out : along;
    trees.push({
      kind: treeKinds[Math.floor(rng() * treeKinds.length)],
      x,
      z,
      s: rand(0.95, 1.6),
      r: rand(0, Math.PI * 2),
      collide: false,
    });
  }

  const rocks = [];
  for (let tries = 0; tries < 300 && rocks.length < 16; tries++) {
    const x = rand(6, S - 6);
    const z = rand(6, S - 6);
    const s = rand(0.7, 1.9);
    if (!isFree(x, z, s + 0.5, 1)) continue;
    rocks.push({ x, z, s, r: rand(0, 6.28), collide: true });
    occupy(x, z, s + 0.6);
  }
  for (let i = 0; i < 60; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = S * 0.72 + rand(4, 60);
    rocks.push({
      x: S / 2 + Math.cos(ang) * rad,
      z: S / 2 + Math.sin(ang) * rad,
      s: rand(1.5, 5),
      r: rand(0, 6.28),
      collide: false,
    });
  }

  const grassDensity = { rain: 9000, dust: 2600, snow: 0, embers: 1100, storm: 3500 }[weather] ?? 3000;
  const grass = [];
  for (let tries = 0; tries < grassDensity * 3 && grass.length < grassDensity; tries++) {
    const x = rand(1, S - 1);
    const z = rand(1, S - 1);
    if (!isFree(x, z, 0.2, 0.3)) {
      // allow grass right up to cover & trees, just never on roads/in buildings
      if (nearRoad(x, z, 0.3)) continue;
      if (buildings.some((b) => x > b.x - 0.4 && x < b.x + b.w + 0.4 && z > b.z - 0.4 && z < b.z + b.d + 0.4)) continue;
    }
    grass.push({ x, z, s: rand(0.7, 1.3), r: rand(0, 6.28) });
  }

  return {
    ...src,
    size: S,
    env: { ...src.env, fogDensity: src.env.fogDensity * 0.62 },
    playerStart: { ...src.playerStart, ...start },
    extraction,
    buildings,
    props,
    objectives,
    enemies,
    pickups,
    roads,
    trees,
    rocks,
    grass,
  };
}

const cache = new Map();
/** Memoised expansion so every consumer sees the same procedural layout. */
export function getExpandedMission(src) {
  if (!cache.has(src.id)) cache.set(src.id, expandMission(src));
  return cache.get(src.id);
}
