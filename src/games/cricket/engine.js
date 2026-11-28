import * as THREE from "three";
import { buildStadium } from "./stadium";
import { Cricketer } from "./players";
import { createCricketAudio } from "./audio";
import { DIFFICULTY } from "./data";
import {
  STUMPS_Z,
  POPPING_Z,
  BALL_R,
  simulateDelivery,
  atZ,
  atTime,
  stumpsCheck,
  evaluateContact,
  shotVelocity,
  simulateHit,
  resolveFielding,
  lbwAnalysis,
  drsVerdict,
  insideCircle,
} from "./physics";
import {
  buildDelivery,
  aiPlanDelivery,
  aiChooseShot,
  battingAggression,
  aiShouldRun,
  aiFieldPreset,
  presetSpots,
  umpireCall,
  aiWantsReview,
  quickSimBall,
  commentary,
  deliveryCatalogue,
} from "./ai";
import { cur, recordBall, eligibleBowlers, isPowerplay, maxOutsideCircle, oversText, nextInnings, declare } from "./match";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const SHOT_ZONES = [
  [-3.2, "Fine Leg"],
  [-2.2, "Square Leg"],
  [-1.3, "Mid-Wicket"],
  [-0.45, "Mid-On"],
  [0.45, "Straight"],
  [1.3, "Cover"],
  [2.2, "Point"],
  [3.2, "Third Man"],
];
export function zoneName(a) {
  for (const [lim, name] of SHOT_ZONES) if (a <= lim) return name;
  return "Third Man";
}

export class CricketEngine {
  constructor({ canvas, match, callbacks }) {
    this.canvas = canvas;
    this.match = match;
    this.cb = callbacks;
    this.diff = DIFFICULTY[match.difficulty] || DIFFICULTY.normal;
    this.audio = createCricketAudio();
    this.feed = [];
    this.camMode = "tv";
    this.autoRun = true;
    this.paused = false;
    this.clock = 0;
    this.prompt = null;
    this.records = [];
    this.replay = null;
    this.ballAge = 0;
    this.userAimBat = 0.4; // batter-frame aim angle
    this.userFoot = "auto";
    this.userDelivery = null;
    this.userTarget = { line: 0.15, len: 6 };
    this.overWicket = true;
    this.meter = null;
    this.fieldSpots = null;
    this.userFieldSet = false;
    this.cheer = 0;
    this.camPos = new THREE.Vector3(0, 6, -32);
    this.camLook = new THREE.Vector3(0, 1, 8);
    this.mouse = { x: 0.5, y: 0.5, has: false };

    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 3000);
    this.raycaster = new THREE.Raycaster();

    this.stadium = buildStadium({ ground: match.ground, format: match.format, renderer: r });
    this.scene.add(this.stadium.group);
    if (this.stadium.envMap) {
      this.scene.environment = this.stadium.envMap;
      this.scene.environmentIntensity = 0.6;
    }
    this.scene.fog = new THREE.Fog(this.stadium.fogColor, 220, 900);
    r.toneMappingExposure = this.stadium.night ? 0.95 : this.stadium.dusk ? 0.75 : 0.62;

    this.buildBall();
    this.buildMarkers();
    this.buildTeams();
    this.audio.start();
    this.newBallSetup();
    this._raf = 0;
    this._last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      try {
        this.update(dt);
        this.render();
      } catch (e) {
        console.error("[Cricket]", e);
      }
    };
    this._raf = requestAnimationFrame(loop);
  }

  // ======================================================== setup
  buildBall() {
    const col = this.match.format.ball === "red" ? 0x9c1414 : this.match.ground.time === "night" && this.match.format.id === "test" ? 0xff4fa0 : 0xf5f5f0;
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R * 1.6, 18, 14),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.08 })
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    this.ballShadow = sh;
    this.scene.add(sh);
    // trail for big hits
    this.trailPts = [];
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
  }

  buildMarkers() {
    // batting aim arrow
    const shape = new THREE.Shape();
    shape.moveTo(-0.25, 0);
    shape.lineTo(0.25, 0);
    shape.lineTo(0.25, 9);
    shape.lineTo(0.7, 9);
    shape.lineTo(0, 11);
    shape.lineTo(-0.7, 9);
    shape.lineTo(-0.25, 9);
    shape.closePath();
    const ag = new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2);
    this.aimArrow = new THREE.Mesh(ag, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    this.aimArrow.position.y = 0.03;
    this.scene.add(this.aimArrow);
    // bowling target & pitch marker
    const ring = (c, r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false }));
      m.position.y = 0.02;
      this.scene.add(m);
      return m;
    };
    this.bowlTarget = ring(0xffd34d, 0.12, 0.2);
    this.pitchMarker = ring(0xff3b5c, 0.1, 0.17);
    this.pitchMarker.visible = false;
    this.hawk = new THREE.Group();
    this.scene.add(this.hawk);
  }

  buildTeams() {
    const m = this.match;
    const kit = (team) => ({ jersey: team.primary, trim: team.secondary, pants: m.format.id === "test" ? "#eeebe2" : team.primary });
    const whites = m.format.id === "test";
    this.kits = m.teams.map(kit);
    this.actors = {};
    const make = (kind, teamIdx, skin, extra = {}) => {
      const c = new Cricketer({ kind, whites, ...this.kits[teamIdx], skinIdx: skin, helmetColor: m.teams[teamIdx].primary, ...extra });
      this.scene.add(c.root);
      c.st = { x: 0, z: 0, ry: 0, mode: "idle", p: 0, phase: 0, angle: 0, type: "", rise: 0, dir: 1 };
      return c;
    };
    this.makeActor = make;
    this.rebuildSides();
  }

  /** (Re)create the batting pair and fielding XI for the current innings */
  rebuildSides() {
    const inn = cur(this.match);
    for (const k of Object.keys(this.actors)) {
      const a = this.actors[k];
      if (Array.isArray(a)) a.forEach((x) => x.root.removeFromParent());
      else a.root.removeFromParent();
    }
    const bat = inn.battingIdx;
    const bowl = inn.bowlingIdx;
    this.actors = {
      striker: this.makeActor("batter", bat, 1),
      nonStriker: this.makeActor("batter", bat, 3),
      bowler: this.makeActor("bowler", bowl, 2),
      keeper: this.makeActor("keeper", bowl, 4, { helmet: true }),
      fielders: Array.from({ length: 9 }, (_, i) => this.makeActor("fielder", bowl, i)),
      umpire: this.makeActor("umpire", 0, 5),
      legUmpire: this.makeActor("umpire", 0, 2),
    };
    this.fieldSpots = null;
    this.userFieldSet = false;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    this.stadium.dispose();
    this.renderer.dispose();
  }

  setSize(w, h) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w;
    this.h = h;
  }

  get inn() {
    return cur(this.match);
  }
  get userBatting() {
    return this.match.userTeam === this.inn.battingIdx;
  }
  get batTeam() {
    return this.match.teams[this.inn.battingIdx];
  }
  get bowlTeam() {
    return this.match.teams[this.inn.bowlingIdx];
  }
  strikerPlayer() {
    return this.batTeam.players[this.inn.striker];
  }
  side() {
    return this.strikerPlayer().hand === "L" ? -1 : 1;
  }

  pushFeed(text, tone = "") {
    this.feed.unshift({ id: Math.random(), text, tone, over: oversText(this.inn.balls) });
    if (this.feed.length > 8) this.feed.pop();
  }

  // ======================================================== ball lifecycle
  newBallSetup() {
    const inn = this.inn;
    this.phase = "preBall";
    this.pt = 0;
    this.records = [];
    this.trailPts = [];
    this.hawk.clear();
    this.pitchMarker.visible = false;
    this.stadium.strikerWicket.reset();
    this.stadium.bowlerWicket.reset();
    this.bc = null;
    this.meter = null;

    // bowler for this over
    if (inn.bowler == null) {
      const options = eligibleBowlers(this.match);
      if (!this.userBatting) {
        this.phase = "chooseBowler";
        this.setPrompt({ type: "bowler", options: options.map(({ p, i }) => ({ idx: i, name: p.name, style: p.style, spinType: p.spinType, stats: inn.bowlers[i] || null })) });
      } else {
        // AI captain: rotate the best available bowlers
        const sorted = options.sort((a, b) => b.p.bowl - a.p.bowl + (Math.random() - 0.5) * 12);
        inn.bowler = sorted[0]?.i ?? options[0]?.i ?? 10;
        this.pushFeed(`${this.bowlTeam.players[inn.bowler].name} comes into the attack.`, "info");
      }
    }
    // fielding positions
    if (!this.fieldSpots || !this.userFieldSet) {
      this.applyAIField();
    }
    this.placeForDelivery();
    if (!this.userBatting && inn.bowler != null) {
      const b = this.bowlTeam.players[inn.bowler];
      const cat = deliveryCatalogue(b);
      if (!this.userDelivery || !cat.find((d) => d.id === this.userDelivery.id && d.label === this.userDelivery.label)) this.userDelivery = cat[0];
      this.userTarget = { line: 0.15, len: this.userDelivery.len };
    }
  }

  applyAIField() {
    const inn = this.inn;
    const b = inn.bowler != null ? this.bowlTeam.players[inn.bowler] : { style: "pace" };
    const tot = this.match.format.overs;
    const preset = aiFieldPreset({
      style: b.style,
      powerplay: isPowerplay(this.match),
      death: tot ? inn.balls >= tot * 6 * 0.8 : false,
      test: this.match.format.id === "test",
      newBatter: (inn.batters[inn.striker]?.balls || 0) < 8,
    });
    this.fieldSpots = presetSpots(preset, this.side(), maxOutsideCircle(this.match));
    this.fieldPreset = preset;
  }

  setUserField(spots, presetName = "custom") {
    this.fieldSpots = spots.map((s) => s.slice());
    this.userFieldSet = true;
    this.fieldPreset = presetName;
    this.placeForDelivery();
  }

  placeForDelivery() {
    const a = this.actors;
    const side = this.side();
    const bowler = this.inn.bowler != null ? this.bowlTeam.players[this.inn.bowler] : null;
    const spin = bowler?.style === "spin";
    // striker
    const s = a.striker;
    s.st = { ...s.st, x: -0.12 * side, z: 9.25, ry: side > 0 ? Math.PI / 2 : -Math.PI / 2, mode: "stance", p: 0 };
    s.root.scale.x = side;
    const ns = this.batTeam.players[this.inn.nonStriker];
    a.nonStriker.root.scale.x = ns.hand === "L" ? -1 : 1;
    a.nonStriker.st = { ...a.nonStriker.st, x: 1.1 * (this.overWicket ? 1 : -1), z: -9.4, ry: 0, mode: "idle", p: 0 };
    a.bowler.st = { ...a.bowler.st, x: this.overWicket ? -0.9 : 0.9, z: spin ? -15 : -26, ry: 0, mode: "idle", p: 0, phase: 0 };
    a.keeper.st = { ...a.keeper.st, x: 0.25 * side, z: spin ? 11.3 : 15.5, ry: Math.PI, mode: "keeper", p: 0, rise: 0 };
    a.umpire.st = { ...a.umpire.st, x: 0, z: -12.6, ry: 0, mode: "idle" };
    a.legUmpire.st = { ...a.legUmpire.st, x: -24 * side, z: 9, ry: side > 0 ? Math.PI / 2 : -Math.PI / 2, mode: "idle" };
    a.fielders.forEach((f, i) => {
      const sp = this.fieldSpots?.[i] || [10, 0];
      const ry = Math.atan2(0 - sp[0], 9 - sp[1]);
      f.st = { ...f.st, x: sp[0], z: sp[1], ry, mode: "ready", p: 0, home: [sp[0], sp[1]] };
    });
    this.ball.visible = false;
    this.ballShadow.visible = false;
  }

  setPrompt(p) {
    this.prompt = p;
    this.cb.onPrompt?.(p);
  }

  chooseBowler(idx) {
    this.inn.bowler = idx;
    this.prompt = null;
    this.cb.onPrompt?.(null);
    this.pushFeed(`${this.bowlTeam.players[idx].name} to bowl.`, "info");
    this.newBallSetup();
  }

  // ======================================================== user input
  setMouse(x, y) {
    this.mouse = { x, y, has: true };
  }
  nudgeAim(d) {
    this.userAimBat = clamp(this.userAimBat + d, -3.1, 3.1);
    this.mouse.has = false;
  }
  nudgeTarget(dl, dn) {
    this.userTarget.line = clamp(this.userTarget.line + dl, -1.4, 1.6);
    this.userTarget.len = clamp(this.userTarget.len + dn, 0.3, 14);
    this.mouse.has = false;
  }
  setDelivery(def) {
    this.userDelivery = def;
    this.userTarget.len = def.len;
  }
  toggleWicketSide() {
    this.overWicket = !this.overWicket;
    if (this.phase === "preBall") this.placeForDelivery();
  }

  /** Space while bowling: start run-up, then lock the meter */
  bowlAction() {
    if (this.userBatting) return;
    if (this.phase === "preBall" && this.inn.bowler != null) {
      this.startRunup();
    } else if (this.phase === "runup" && this.meter && this.meter.locked == null) {
      this.meter.locked = this.meter.v;
      this.audio.click();
    }
  }

  /** Batting shot keys */
  playShot(type) {
    if (!this.userBatting) return;
    const bc = this.bc;
    if (!bc || this.phase !== "delivery" || bc.shot) return;
    const tb = this.clock - bc.releaseClock;
    const foot = this.userFoot === "auto" ? (bc.traj.bounce && STUMPS_Z - bc.traj.bounce.z > 6.3 ? "back" : "front") : this.userFoot;
    bc.shot = { type, angle: this.userAimBat * this.side(), press: tb, foot };
    const ct = atZ(bc.traj, foot === "back" ? 9.35 : foot === "advance" ? 7.2 : 8.45)?.t;
    if (ct && ct > tb && !bc.contactDone) bc.contactT = ct;
    this.actors.striker.st.prep = false;
    this.actors.striker.st.mode = "shot";
    this.actors.striker.st.p = 0.3;
    this.actors.striker.st.angle = this.userAimBat;
    this.actors.striker.st.type = type;
  }

  setFoot(f) {
    this.userFoot = this.userFoot === f ? "auto" : f;
  }

  callRun() {
    const run = this.bc?.run;
    if (!run || !this.userBatting || this.phase !== "inPlay") return;
    if (!run.active) run.want = true;
  }
  stopRun() {
    const run = this.bc?.run;
    if (!run || !this.userBatting) return;
    run.want = false;
    run.stopCalled = true;
  }

  answerReview(yes) {
    const p = this.prompt;
    if (!p || p.type !== "review") return;
    this.prompt = null;
    this.cb.onPrompt?.(null);
    if (yes) this.startReview(p.reviewSide);
    else this.finalizeDecision(p.onField === "out");
  }

  // ======================================================== run-up & release
  startRunup() {
    const inn = this.inn;
    const bowler = this.bowlTeam.players[inn.bowler];
    const spin = bowler.style === "spin";
    this.phase = "runup";
    this.pt = 0;
    this.runupDur = spin ? 1.1 : 2.0;
    this.bc = { bowler, bowlerIdx: inn.bowler, batter: this.strikerPlayer(), side: this.side() };
    if (!this.userBatting) {
      this.meter = { v: 0, dir: 1, locked: null, speed: this.match.difficulty === "hard" ? 1.6 : this.match.difficulty === "easy" ? 0.9 : 1.2 };
    } else {
      this.meter = null;
    }
    this.pitchMarker.visible = false;
  }

  release() {
    const inn = this.inn;
    const bc = this.bc;
    const side = bc.side;
    const ground = this.match.ground;
    let plan;
    let overstep = false;
    if (this.userBatting) {
      plan = aiPlanDelivery({
        bowler: bc.bowler,
        batter: { ...bc.batter, runsNow: inn.batters[inn.striker].runs },
        situation: { death: this.match.format.overs && inn.balls > this.match.format.overs * 6 * 0.8, test: this.match.format.id === "test" },
        aiSkill: this.diff.aiSkill,
      });
      overstep = plan.overstep;
    } else {
      const v = this.meter?.locked ?? 0.5;
      const acc = v >= 0.62 && v <= 0.82 ? 1 : 1 - Math.min(1, Math.abs(v - 0.72) * 2.2);
      overstep = v > 0.94;
      plan = { def: this.userDelivery, aim: { ...this.userTarget }, accuracy: acc };
      bc.meterValue = v;
    }
    const delivery = buildDelivery({ bowler: bc.bowler, def: plan.def, aim: plan.aim, ground, side, overWicket: this.overWicket, accuracy: plan.accuracy, ballAge: inn.balls });
    bc.delivery = delivery;
    bc.traj = simulateDelivery(delivery);
    bc.overstep = overstep;
    bc.releaseClock = this.clock;
    bc.contactT = atZ(bc.traj, 8.45)?.t ?? 0.6;
    bc.kmh = Math.round(delivery.speed * 3.6);
    this.phase = "delivery";
    this.pt = 0;
    this.ball.visible = true;
    this.ballShadow.visible = true;
    this.ballAge += 1;
    // assisted pitch marker for the batter
    if (this.userBatting && this.diff.assist && bc.traj.bounce) {
      this.pitchMarker.position.set(bc.traj.bounce.x, 0.02, bc.traj.bounce.z);
      this.pitchMarker.visible = true;
      this.pitchMarker.material.opacity = 0;
    }
    // AI batter decides
    if (!this.userBatting) {
      const tot = this.match.format.overs;
      const agg = battingAggression({
        format: this.match.format.id,
        ballsLeft: tot ? tot * 6 - inn.balls : null,
        runsNeeded: inn.target ? inn.target - inn.runs : null,
        wktsDown: inn.wkts,
        oversDone: inn.balls / 6,
        totalOvers: tot,
        batterRuns: inn.batters[inn.striker].runs,
      });
      bc.aggression = agg;
      bc.aiShot = aiChooseShot({ traj: bc.traj, delivery, batter: bc.batter, side, aggression: agg, aiSkill: this.diff.aiSkill, timingWindow: 1 });
      const fz = bc.aiShot.foot === "back" ? 9.35 : bc.aiShot.foot === "advance" ? 7.2 : 8.45;
      bc.contactT = atZ(bc.traj, fz)?.t ?? bc.contactT;
    } else {
      const tot = this.match.format.overs;
      bc.aggression = battingAggression({
        format: this.match.format.id,
        ballsLeft: tot ? tot * 6 - inn.balls : null,
        runsNeeded: inn.target ? inn.target - inn.runs : null,
        wktsDown: inn.wkts,
        oversDone: inn.balls / 6,
        totalOvers: tot,
        batterRuns: 0,
      });
    }
    this.actors.striker.st.mode = "stance";
  }

  // ======================================================== main update
  update(dt) {
    if (this.paused) {
      this.stadium.update(0, this.clock, this.cheer);
      return;
    }
    this.clock += dt;
    this.pt += dt;
    this.cheer = Math.max(0, this.cheer - dt * 0.25);
    this.stadium.update(dt, this.clock, this.cheer);

    if (this.phase === "replay") {
      this.updateReplay(dt);
      return;
    }

    switch (this.phase) {
      case "preBall":
        this.updateAimMarkers();
        if (this.userBatting && this.pt > 1.6 && !this.prompt) this.startRunup();
        break;
      case "runup":
        this.updateRunup(dt);
        break;
      case "delivery":
        this.updateDelivery();
        break;
      case "inPlay":
        this.updateInPlay(dt);
        break;
      case "dead":
        if (this.prompt?.type === "review" && this.clock > this.prompt.expires) this.answerReview(false);
        if (this.pt > (this.bc?.deadHold ?? 1.6) && !this.prompt && !this.reviewing) this.finishBall();
        break;
      case "after":
        if (this.pt > (this.afterHold || 2.4)) this.nextBall();
        break;
      default:
        break;
    }
    if (this.reviewing) this.updateReview(dt);
    this.animateActors(dt);
    if (["runup", "delivery", "inPlay", "dead"].includes(this.phase) && this.records.length < 1400) this.recordFrame();
  }

  updateAimMarkers() {
    const side = this.side();
    if (this.userBatting) {
      if (this.mouse.has) this.userAimBat = clamp((0.5 - this.mouse.x) * 2 * 2.6 * side, -3.1, 3.1) * side * side;
      const aw = this.userAimBat * side;
      this.aimArrow.visible = true;
      this.aimArrow.position.set(-0.12 * side, 0.03, 9.0);
      this.aimArrow.rotation.y = Math.PI - aw;
      this.bowlTarget.visible = false;
    } else {
      this.aimArrow.visible = false;
      this.bowlTarget.visible = this.inn.bowler != null;
      if (this.mouse.has && this.w) {
        // raycast mouse onto the pitch plane
        this.raycaster.setFromCamera(new THREE.Vector2(this.mouse.x * 2 - 1, -(this.mouse.y * 2 - 1)), this.camera);
        const ray = this.raycaster.ray;
        if (ray.direction.y < -1e-3) {
          const t = -ray.origin.y / ray.direction.y;
          const px = ray.origin.x + ray.direction.x * t;
          const pz = ray.origin.z + ray.direction.z * t;
          this.userTarget.line = clamp(px * side, -1.4, 1.6);
          this.userTarget.len = clamp(STUMPS_Z - pz, 0.3, 14);
        }
      }
      this.bowlTarget.position.set(this.userTarget.line * side, 0.02, STUMPS_Z - this.userTarget.len);
    }
  }

  updateRunup(dt) {
    const bc = this.bc;
    const k = clamp(this.pt / this.runupDur, 0, 1);
    const b = this.actors.bowler;
    const spin = bc.bowler.style === "spin";
    const startZ = spin ? -15 : -26;
    b.st.z = lerp(startZ, -9.1, k);
    b.st.mode = "bowl";
    b.st.p = k * 0.82;
    b.st.phase += dt * (spin ? 9 : 12);
    this.actors.fielders.forEach((f) => {
      if (insideCircle(f.st.x, f.st.z)) {
        f.st.z += (f.st.z < 9 ? 1 : 0) * dt * 0.4; // walk in
      }
      f.st.mode = "ready";
    });
    if (this.meter && this.meter.locked == null) {
      this.meter.v += this.meter.dir * dt * this.meter.speed;
      if (this.meter.v > 1) {
        this.meter.v = 1;
        this.meter.dir = -1;
      }
      if (this.meter.v < 0) {
        this.meter.v = 0;
        this.meter.dir = 1;
      }
    }
    if (this.userBatting || !this.userBatting) this.updateAimMarkers();
    if (k >= 1) this.release();
  }

  ballAt(p) {
    this.ball.position.set(p.x, Math.max(BALL_R, p.y), p.z);
    this.ballShadow.position.set(p.x, 0.012, p.z);
    this.ballShadow.material.opacity = clamp(0.4 - p.y * 0.03, 0.05, 0.4);
  }

  updateDelivery() {
    const bc = this.bc;
    const tb = this.clock - bc.releaseClock;
    const p = atTime(bc.traj.pts, tb);
    if (!bc.padImpact) this.ballAt(p);
    const b = this.actors.bowler;
    b.st.mode = "bowl";
    b.st.p = clamp(0.82 + tb * 0.5, 0, 1);
    b.st.z = Math.min(-5.5, -9.1 + tb * 4);
    if (this.pitchMarker.visible) this.pitchMarker.material.opacity = clamp(tb * 5, 0, 0.85);
    if (bc.traj.bounce && !bc.bounceSound && tb >= bc.traj.bounce.t) {
      bc.bounceSound = true;
      this.audio.bounce();
    }

    // batter: backlift as the ball approaches
    const s = this.actors.striker;
    if (!bc.shot && s.st.mode === "stance") {
      s.st.mode = "shot";
      s.st.p = 0;
      s.st.type = "ground";
      s.st.angle = 0;
      s.st.prep = true;
    }
    if (s.st.prep && !bc.shot) s.st.p = clamp(tb / bc.contactT, 0, 1) * 0.3;

    // AI batter executes its shot
    if (!this.userBatting && !bc.shot && bc.aiShot && tb >= bc.aiShot.press) {
      const sh = bc.aiShot;
      if (sh.type === "leave") {
        bc.shot = { ...sh };
        s.st.mode = "stance";
      } else {
        bc.shot = { ...sh };
        s.st.prep = false;
        s.st.mode = "shot";
        s.st.p = 0.3;
        s.st.type = sh.type;
        s.st.angle = sh.angle * bc.side;
      }
    }

    // contact
    if (!bc.contactDone && tb >= bc.contactT) {
      bc.contactDone = true;
      const shot = bc.shot && bc.shot.type !== "leave" && bc.shot.press <= bc.contactT ? bc.shot : bc.shot?.type === "leave" ? bc.shot : { type: "none", angle: 0, press: 99, foot: "front" };
      if (!bc.shot) bc.shot = shot;
      const batter = { bat: bc.batter.bat, power: bc.batter.power, side: bc.side };
      const timingScale = this.userBatting ? this.diff.timing : 1;
      const contact = evaluateContact(bc.traj, shot, batter, timingScale, bc.delivery.difficulty);
      bc.contact = contact;
      if (this.userBatting) {
        const lbl =
          contact.kind === "hit"
            ? contact.label
            : contact.kind === "outsideEdge" || contact.kind === "insideEdge"
            ? "EDGED!"
            : contact.kind === "leave"
            ? "LEFT"
            : shot.type === "none"
            ? bc.shot?.press > bc.contactT
              ? "TOO LATE"
              : "NO SHOT"
            : contact.reason === "early"
            ? "TOO EARLY"
            : contact.reason === "late"
            ? "TOO LATE"
            : "MISSED";
        this.cb.onTiming?.(lbl);
      }
      if (contact.kind === "hit" || contact.kind === "outsideEdge" || contact.kind === "insideEdge") {
        const v = shotVelocity(contact, shot, batter, bc.delivery);
        if (contact.kind === "hit") this.audio.bat(contact.q);
        else this.audio.edge();
        if (v.insideEdge) {
          // inside edge: may deflect onto the stumps
          const st = stumpsCheck(bc.traj);
          if (st.hitting && Math.random() < 0.5) {
            bc.playedOn = true;
          }
        }
        this.launchHit(v.pos, v.vel, contact.kind !== "hit");
        return;
      }
    }

    // no bat on ball: wides, pads, stumps, keeper
    if (bc.contactDone && !bc.hitLaunched) {
      const lx = p.x * bc.side;
      if (!bc.wideChecked && p.z >= POPPING_Z) {
        bc.wideChecked = true;
        const test = this.match.format.id === "test";
        const shotPlayed = bc.shot && bc.shot.type !== "leave" && bc.shot.type !== "none";
        if ((lx > (test ? 1.05 : 0.9) && !shotPlayed) || lx < -(test ? 0.8 : 0.42) || p.y > 1.95) bc.wide = true;
      }
      const footZ = bc.contact?.footZ ?? 8.45;
      const padZ = footZ + 0.12;
      if (!bc.padImpact && !bc.wide && p.z >= padZ && p.z < STUMPS_Z - 0.2) {
        const bodyX = -0.12 * bc.side;
        if (Math.abs(p.x - bodyX) < 0.24 && p.y < 0.82) {
          bc.padImpact = { x: p.x, y: p.y, z: p.z, t: tb };
          this.audio.pad();
          this.padDeflect(p);
          return;
        }
      }
      if (!bc.stumpsDone && p.z >= STUMPS_Z - 0.02) {
        bc.stumpsDone = true;
        const st = stumpsCheck(bc.traj);
        if (st.hitting && !bc.padImpact) {
          this.stadium.strikerWicket.breakWith(p.x * 2, 8, 1.2);
          this.audio.stumps();
          bc.result = { wicket: { how: "bowled", out: "striker", bowlerCredit: true } };
          return this.toDead(2.2);
        }
      }
      const kz = this.actors.keeper.st.z - 0.4;
      if (p.z >= kz || tb > bc.contactT + 1.2) {
        // keeper gathers
        this.audio.glove();
        this.actors.keeper.st.mode = "catch";
        this.ball.visible = false;
        // close shaves: appeal for caught behind when the ball just passed the bat
        if (bc.contact?.kind === "miss" && bc.shot?.type !== "none" && bc.shot?.type !== "leave" && Math.random() < 0.12) {
          bc.appeal = { how: "caught behind", edge: false };
        }
        if (bc.shot?.foot === "advance" && this.actors.keeper.st.z < 12 && Math.random() < 0.7) {
          this.stadium.strikerWicket.breakWith(0, -2, 0.6);
          bc.result = { wicket: { how: "stumped", out: "striker", fielder: 6, bowlerCredit: true } };
        } else if (!bc.wide && Math.random() < (bc.bowler.style === "spin" ? 0.02 : 0.015)) {
          bc.result = { runs: 1 + Math.floor(Math.random() * 2), extra: { type: "b" } };
        } else {
          bc.result = { runs: 0 };
        }
        return this.toDead(1.3);
      }
    }
  }

  padDeflect(p) {
    const bc = this.bc;
    // ball dribbles off the pads
    const vel = { x: (Math.random() - 0.5) * 4 - bc.side * 1.5, y: 0.6, z: -1.5 - Math.random() * 2 };
    bc.padPath = simulateHit({ x: p.x, y: p.y, z: p.z }, vel, this.match.ground.boundary);
    bc.padClock = this.clock;
    const analysis = lbwAnalysis(bc.traj, bc.padImpact, bc.side, bc.shot && bc.shot.type !== "leave" && bc.shot.type !== "none");
    bc.lbw = analysis;
    bc.appeal = { how: "lbw" };
    this.audio.appeal();
    this.cb.onBanner?.({ kind: "appeal", title: "HOWZAT!", sub: "LBW appeal", color: "#facc15" });
    // leg-bye attempt if not out and ball rolled away
    bc.result = { runs: Math.random() < 0.25 ? 1 : 0, extra: { type: "lb" } };
    this.toDead(1.6);
  }

  launchHit(pos, vel, edged) {
    const bc = this.bc;
    bc.hitLaunched = true;
    bc.edged = edged;
    bc.hit = simulateHit(pos, vel, this.match.ground.boundary, this.match.ground.pitch.pace);
    bc.hitClock = this.clock;
    this.pitchMarker.visible = false;
    // fielder list for interception
    const fl = this.actors.fielders.map((f, i) => ({
      x: f.st.x,
      z: f.st.z,
      speed: 6.6,
      catching: this.bowlTeam.players[this.fielderPlayerIdx(i)].catching,
      reaction: 0.32,
      idx: i,
    }));
    fl.push({ x: this.actors.keeper.st.x, z: this.actors.keeper.st.z, speed: 4.2, catching: 0.9, reaction: 0.12, isKeeper: true, idx: "keeper" });
    fl.push({ x: this.actors.bowler.st.x, z: -6, speed: 4.5, catching: 0.82, reaction: 0.35, idx: "bowler" });
    bc.field = resolveFielding(bc.hit, fl);
    bc.run = { completed: 0, active: false, progress: 0, want: false, runTime: 20.12 / ((bc.batter.speed + 6.6) / 2) + 0.55, startAt: this.clock + 0.35 };
    if (bc.field.kind !== "none") {
      const f = bc.field;
      bc.pickupClock = bc.hitClock + f.t + (f.kind === "drop" ? 0.9 : f.kind === "stop" ? 0.25 : 0);
      const pos = f.point;
      const toStriker = Math.hypot(pos.x, pos.z - STUMPS_Z);
      const toBowler = Math.hypot(pos.x, pos.z + STUMPS_Z);
      bc.throwEnd = toStriker < toBowler ? "striker" : "bowler";
      bc.throwDur = 0.35 + Math.min(toStriker, toBowler) / 27 + (Math.random() < 0.2 ? 0.5 : 0);
      bc.throwArrive = bc.pickupClock + bc.throwDur;
    }
    if (bc.hit.crossed && (!bc.field || bc.field.kind === "none")) {
      bc.boundaryClock = bc.hitClock + bc.hit.crossed.t;
    }
    this.phase = "inPlay";
    this.pt = 0;
    // big shot: follow cam
    const sp = Math.hypot(vel.x, vel.y, vel.z);
    if (sp > 14 && !edged) this.followCam = true;
  }

  fielderPlayerIdx(i) {
    // fielders are the 9 non-keeper, non-bowler players
    const list = [];
    for (let k = 0; k < 11; k++) if (k !== 6 && k !== this.inn.bowler) list.push(k);
    return list[i] ?? 0;
  }

  updateInPlay(dt) {
    const bc = this.bc;
    const th = this.clock - bc.hitClock;
    const f = bc.field;
    const run = bc.run;
    const caughtNow = f && f.kind === "catch" && th >= f.t;

    // ball position
    if (bc.thrown) {
      const k = clamp((this.clock - bc.pickupClock) / bc.throwDur, 0, 1);
      const from = bc.throwFrom;
      const to = { x: 0, y: 0.6, z: bc.throwEnd === "striker" ? STUMPS_Z + 0.2 : -STUMPS_Z - 0.2 };
      this.ballAt({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) + Math.sin(k * Math.PI) * Math.min(6, bc.throwDur * 3), z: lerp(from.z, to.z, k) });
    } else if (f && f.kind !== "none" && th >= f.t) {
      const holder = this.fielderActor(f.fielder.idx);
      this.ballAt({ x: holder.st.x, y: 1.1, z: holder.st.z });
    } else {
      const p = atTime(bc.hit.pts, th);
      this.ballAt(p);
      if (bc.followTrail !== false) {
        this.trailPts.push(p.x, p.y, p.z);
        if (this.trailPts.length > 180) this.trailPts.splice(0, 3);
      }
    }

    // fielders converge
    const target = f && f.kind !== "none" ? f.point : bc.hit.end;
    this.actors.fielders.forEach((fa, i) => {
      const chasing = f && f.fielder?.idx === i;
      const tx = chasing ? target.x : fa.st.home[0] + (target.x - fa.st.home[0]) * 0.15;
      const tz = chasing ? target.z : fa.st.home[1] + (target.z - fa.st.home[1]) * 0.15;
      this.moveActor(fa, tx, tz, chasing ? 6.6 : 2.2, dt, th > 0.32);
    });
    if (f?.fielder?.idx === "keeper") this.moveActor(this.actors.keeper, target.x, target.z, 4.2, dt, true);
    if (f?.fielder?.idx === "bowler") this.moveActor(this.actors.bowler, target.x, target.z, 4.5, dt, true);

    // catch / drop
    if (f && th >= f.t && !bc.fieldDone) {
      bc.fieldDone = true;
      const fa = this.fielderActor(f.fielder.idx);
      if (f.kind === "catch") {
        fa.st.mode = "catch";
        fa.st.high = f.point.y > 1.4;
        if (f.runDist > 0.5) {
          fa.st.mode = "dive";
          fa.st.p = 0;
          fa.st.dir = Math.sign(f.point.x - fa.st.x) || 1;
        }
        this.audio.glove();
        const isKeeper = f.fielder.idx === "keeper";
        const fielderPI = isKeeper ? 6 : f.fielder.idx === "bowler" ? this.inn.bowler : this.fielderPlayerIdx(f.fielder.idx);
        bc.result = {
          runs: 0,
          wicket: { how: isKeeper || (bc.edged && f.point.z > 12) ? "caught behind" : "caught", out: "striker", fielder: fielderPI, bowlerCredit: true },
        };
        if (bc.edged && isKeeper) bc.appeal = { how: "caught behind", edge: true, thin: Math.random() < 0.4 };
        if (bc.playedOn) bc.playedOn = false;
        return this.toDead(2.0);
      }
      if (f.kind === "drop") {
        fa.st.mode = "dive";
        fa.st.p = 0;
        fa.st.dir = Math.sign(f.point.x - fa.st.x) || 1;
        this.cb.onBanner?.({ kind: "drop", title: "DROPPED!", sub: "Put down a chance", color: "#fb923c" });
        this.audio.groan();
      } else {
        fa.st.mode = "catch";
        fa.st.high = false;
      }
    }
    if (caughtNow) return;

    // played on (inside edge onto stumps)
    if (bc.playedOn && th > 0.12) {
      this.stadium.strikerWicket.breakWith(0, 6, 1);
      this.audio.stumps();
      bc.result = { wicket: { how: "bowled", out: "striker", bowlerCredit: true } };
      return this.toDead(2.2);
    }

    // boundary
    if (bc.hit.crossed && (!f || f.kind === "none" || f.t > bc.hit.crossed.t) && th >= bc.hit.crossed.t) {
      const six = bc.hit.crossed.onFull;
      bc.result = { runs: six ? 6 : 4, boundary: six ? 6 : 4 };
      return this.toDead(six ? 2.6 : 2.0);
    }

    // pickup → throw
    if (f && f.kind !== "none" && f.kind !== "catch" && !bc.thrown && this.clock >= bc.pickupClock) {
      const fa = this.fielderActor(f.fielder.idx);
      fa.st.mode = "throw";
      fa.st.p = 0;
      bc.thrown = true;
      bc.throwFrom = { x: fa.st.x, y: 1.8, z: fa.st.z };
    }

    // running between wickets
    if (this.clock >= run.startAt) {
      const now = this.clock;
      if (!run.active && !bc.thrownArrived) {
        let go = run.want;
        const ta = bc.throwArrive ?? (bc.hit.crossed ? Infinity : now + 99);
        if (!this.userBatting || this.autoRun) {
          if (!run.stopCalled || !this.userBatting) {
            const aggr = bc.aggression ?? 0.4;
            go = go || aiShouldRun({ throwArrival: ta, now, runTime: run.runTime, aggression: aggr });
          }
          if (this.userBatting && !this.autoRun) go = run.want;
        }
        if (bc.hit.crossed && (!f || f.kind === "none")) go = run.completed < 1 || go; // jog while it races away
        if (go && run.completed < 4) {
          run.active = true;
          run.progress = 0;
          run.want = false;
          if (this.userBatting) this.cb.onTiming?.(run.completed === 0 ? "RUN!" : "ANOTHER!");
        }
      }
      if (run.active) {
        run.progress += dt / run.runTime;
        if (run.progress >= 1) {
          run.active = false;
          run.completed += 1;
          run.progress = 0;
          run.stopCalled = false;
        }
      }
    }
    this.animateRunners(run);

    // throw arrives
    if (bc.thrown && !bc.thrownArrived && this.clock >= bc.throwArrive) {
      bc.thrownArrived = true;
      if (run.active) {
        // who is heading to the target end?
        const k = run.completed + 1;
        const toBowlerEnd = bc.throwEnd === "bowler";
        const outIsStriker = toBowlerEnd ? k % 2 === 1 : k % 2 === 0;
        const remaining = (1 - run.progress) * run.runTime;
        this.stadium[bc.throwEnd === "striker" ? "strikerWicket" : "bowlerWicket"].breakWith(0, toBowlerEnd ? -3 : 3, 0.7);
        this.audio.stumps();
        const fielderPI = typeof f.fielder.idx === "number" ? this.fielderPlayerIdx(f.fielder.idx) : f.fielder.idx === "keeper" ? 6 : this.inn.bowler;
        bc.result = { runs: run.completed, wicket: { how: "run out", out: outIsStriker ? "striker" : "nonStriker", fielder: fielderPI, bowlerCredit: false } };
        if (remaining < 0.35) {
          bc.runOutReferral = { margin: remaining };
        }
        run.active = false;
        return this.toDead(2.0);
      }
      bc.result = { runs: run.completed };
      return this.toDead(1.2);
    }
    // ball stopped and no fielder (shouldn't happen) – settle
    if (!f || f.kind === "none") {
      if (!bc.hit.crossed && th > bc.hit.end.t + 0.5) {
        bc.result = { runs: run.completed + (run.active ? 1 : 0) };
        return this.toDead(1.2);
      }
    }
  }

  animateRunners(run) {
    const a = this.actors;
    const bc = this.bc;
    const side = bc.side;
    // striker (A) and non-striker (B) positions along the pitch
    const lane = (sgn) => 1.2 * sgn;
    const k = run.completed + (run.active ? run.progress : 0);
    const posFor = (startEnd) => {
      // startEnd: +1 striker end, −1 bowler end; every run flips the end
      const whole = Math.floor(k);
      const frac = k - whole;
      const from = whole % 2 === 0 ? startEnd : -startEnd;
      const to = -from;
      return lerp(from * 8.95, to * 8.95, frac);
    };
    const moving = run.active;
    const sA = a.striker;
    const sB = a.nonStriker;
    if (moving || run.completed > 0) {
      sA.st.z = posFor(1);
      sB.st.z = posFor(-1);
      sA.st.x = lane(-side);
      sB.st.x = lane(side);
      if (moving) {
        sA.st.mode = "run";
        sB.st.mode = "run";
        const dirA = Math.floor(k) % 2 === 0 ? -1 : 1;
        sA.st.ry = dirA < 0 ? Math.PI : 0;
        sB.st.ry = dirA < 0 ? 0 : Math.PI;
        sA.st.phase += 0.25;
        sB.st.phase += 0.25;
      } else {
        sA.st.mode = "idle";
        sB.st.mode = "idle";
      }
    }
  }

  fielderActor(idx) {
    if (idx === "keeper") return this.actors.keeper;
    if (idx === "bowler") return this.actors.bowler;
    return this.actors.fielders[idx];
  }

  moveActor(a, tx, tz, speed, dt, go) {
    if (!go) return;
    const dx = tx - a.st.x;
    const dz = tz - a.st.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.3) {
      const s = Math.min(d, speed * dt);
      a.st.x += (dx / d) * s;
      a.st.z += (dz / d) * s;
      a.st.ry = Math.atan2(dx, dz);
      if (a.st.mode !== "catch" && a.st.mode !== "dive" && a.st.mode !== "throw") {
        a.st.mode = "run";
        a.st.phase += dt * speed * 2.2;
      }
    } else if (a.st.mode === "run") a.st.mode = "ready";
  }

  toDead(hold) {
    this.phase = "dead";
    this.pt = 0;
    this.bc.deadHold = hold;
    this.followCam = false;
    const bc = this.bc;
    // extras override
    if (bc.overstep) bc.noBall = true;
    if (!bc.hitLaunched && bc.contact && bc.contact.contactPoint && !bc.traj.bounce && bc.contact.contactPoint.y > 1.05) bc.noBall = true; // beamer
    if (bc.appeal) this.handleAppeal();
    else if (bc.runOutReferral) this.handleRunOutReferral();
  }

  // ======================================================== appeals & DRS
  handleAppeal() {
    const bc = this.bc;
    const ap = bc.appeal;
    let truthOut;
    let marginal = false;
    if (ap.how === "lbw") {
      truthOut = bc.lbw.out;
      marginal = bc.lbw.marginal;
    } else {
      truthOut = ap.edge;
      marginal = Boolean(ap.thin);
    }
    let onField = umpireCall(truthOut, marginal) ? "out" : "not out";
    if (bc.noBall) onField = "not out";
    bc.onField = onField;
    this.cb.onBanner?.({
      kind: "decision",
      title: onField === "out" ? "OUT!" : "NOT OUT",
      sub: ap.how === "lbw" ? "Leg before wicket" : "Caught behind appeal",
      color: onField === "out" ? "#ef4444" : "#22c55e",
    });
    if (onField === "out") this.actors.umpire.st.mode = "signal:out";
    // who may review?
    const inn = this.inn;
    const battingReview = onField === "out";
    const reviewsLeft = battingReview ? inn.reviewsLeft : inn.reviewsLeftBowling;
    const userSide = battingReview ? this.userBatting : !this.userBatting;
    if (reviewsLeft > 0) {
      if (userSide) {
        this.setPrompt({ type: "review", reviewSide: battingReview ? "batting" : "bowling", onField, reviewsLeft, how: ap.how, expires: this.clock + 10 });
        return;
      }
      const ai = aiWantsReview({ analysisOut: truthOut, marginal, reviewsLeft, battingSide: battingReview, aiSkill: this.diff.aiSkill });
      if (ai) {
        this.cb.onBanner?.({ kind: "review", title: "REVIEW!", sub: `${(battingReview ? this.batTeam : this.bowlTeam).short} take it upstairs`, color: "#38bdf8" });
        this.reviewDelay = this.clock + 1.6;
        this.pendingAIReview = battingReview ? "batting" : "bowling";
        this.reviewing = true; // waits in updateReview
        return;
      }
    }
    this.finalizeDecision(onField === "out");
  }

  handleRunOutReferral() {
    this.cb.onBanner?.({ kind: "review", title: "THIRD UMPIRE", sub: "Run out referral — checking replays", color: "#38bdf8" });
    this.reviewing = true;
    this.review = { kind: "runout", t: 0, margin: this.bc.runOutReferral.margin };
    this.startReplayInternal(0.5, "side");
  }

  startReview(reviewSide) {
    const inn = this.inn;
    const bc = this.bc;
    this.reviewing = true;
    this.pendingAIReview = null;
    this.audio.drsBeep();
    this.review = { kind: bc.appeal.how === "lbw" ? "lbw" : "edge", side: reviewSide, t: 0 };
    this.cb.onBanner?.({ kind: "review", title: "DRS REVIEW", sub: "Third umpire is checking…", color: "#38bdf8" });
    if (this.review.kind === "lbw") {
      const a = bc.lbw;
      const v = drsVerdict(bc.onField, a);
      this.review.analysis = a;
      this.review.verdict = v;
      this.buildHawkEye(bc.traj, bc.padImpact);
    } else {
      const edge = bc.appeal.edge;
      const final = edge ? "out" : "not out";
      this.review.verdict = { final, overturned: final !== bc.onField, umpiresCall: false };
      this.review.edge = edge;
      this.startReplayInternal(0.35, "stump");
    }
    this.cb.onReview?.({ ...this.review, stage: "start" });
    if (!this.review.verdict.overturned && !this.review.verdict.umpiresCall) {
      if (reviewSide === "batting") inn.reviewsLeft -= 1;
      else inn.reviewsLeftBowling -= 1;
    }
  }

  updateReview(dt = 1 / 60) {
    if (this.pendingAIReview) {
      if (this.clock >= this.reviewDelay) {
        const s = this.pendingAIReview;
        this.pendingAIReview = null;
        this.startReview(s);
      }
      return;
    }
    const rv = this.review;
    if (!rv) return;
    rv.t += dt;
    if (rv.kind === "lbw") {
      this.hawkProgress = clamp(rv.t / 3.5, 0, 1);
      this.updateHawkEye();
    }
    if (rv.t > (rv.kind === "runout" ? 4.5 : 6.5) && !rv.done) {
      rv.done = true;
      if (rv.kind === "runout") {
        const out = rv.margin > 0.02 || Math.random() < 0.5;
        this.cb.onReview?.({ ...rv, stage: "end", verdict: { final: out ? "out" : "not out" } });
        this.cb.onBanner?.({ kind: "decision", title: out ? "OUT!" : "NOT OUT", sub: out ? "Short of the crease" : "Just made it!", color: out ? "#ef4444" : "#22c55e" });
        if (!out) this.bc.result = { runs: this.bc.run.completed + 1 };
        this.endReview();
        return;
      }
      const v = rv.verdict;
      this.cb.onReview?.({ ...rv, stage: "end" });
      this.cb.onBanner?.({
        kind: "decision",
        title: v.final === "out" ? "OUT!" : "NOT OUT",
        sub: v.overturned ? "Decision overturned" : v.umpiresCall ? "Umpire's call — review retained" : "On-field decision stands",
        color: v.final === "out" ? "#ef4444" : "#22c55e",
      });
      this.endReview();
      this.finalizeDecision(v.final === "out");
    }
  }

  endReview() {
    this.reviewing = false;
    this.review = null;
    this.hawk.clear();
    if (this.phase === "replay") this.stopReplay(true);
    this.pt = 0;
  }

  finalizeDecision(out) {
    const bc = this.bc;
    this.reviewing = false;
    if (bc.appeal?.how === "lbw") {
      if (out && !bc.noBall) bc.result = { runs: 0, wicket: { how: "lbw", out: "striker", bowlerCredit: true } };
      else if (bc.result?.extra?.type === "lb") {
        /* keep leg bye */
      }
    } else if (bc.appeal?.how === "caught behind") {
      if (out && !bc.noBall) bc.result = { runs: 0, wicket: { how: "caught behind", out: "striker", fielder: 6, bowlerCredit: true } };
      else bc.result = { runs: 0 };
    }
    bc.appeal = null;
    this.pt = Math.max(this.pt, (bc.deadHold || 1.5) - 0.6);
  }

  buildHawkEye(traj, impact) {
    this.hawk.clear();
    const pts = traj.pts;
    const iImpact = pts.findIndex((p) => p.z >= impact.z);
    const solid = pts.slice(0, Math.max(2, iImpact)).map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const proj = pts.slice(Math.max(0, iImpact - 1)).filter((p) => p.z <= STUMPS_Z + 0.3).map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const mk = (arr, color, opacity) => {
      if (arr.length < 2) return null;
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr), Math.min(240, arr.length), 0.036, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      this.hawk.add(m);
      return m;
    };
    this.hawkSolid = mk(solid, 0xe11d48, 0.95);
    this.hawkProj = mk(proj, 0x60a5fa, 0.55);
    // pitching zone strip (between the stumps lines)
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(0.2286, 20.12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.28, depthWrite: false }));
    zone.position.y = 0.012;
    this.hawk.add(zone);
    if (traj.bounce) {
      const a = this.bc.lbw;
      const pm = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: a.pitching === "outside leg" ? 0xef4444 : 0x22c55e }));
      pm.position.set(traj.bounce.x, 0.02, traj.bounce.z);
      this.hawk.add(pm);
    }
    const imp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    imp.position.set(impact.x, impact.y, impact.z);
    this.hawk.add(imp);
    // virtual wicket frame
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.2286, 0.711), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    frame.position.set(0, 0.3555, STUMPS_Z);
    this.hawk.add(frame);
    this.hawkProgress = 0;
    this.updateHawkEye();
  }

  updateHawkEye() {
    const p = this.hawkProgress ?? 1;
    if (this.hawkSolid) this.hawkSolid.geometry.setDrawRange(0, Math.floor(this.hawkSolid.geometry.index.count * clamp(p / 0.6, 0, 1)));
    if (this.hawkProj) this.hawkProj.geometry.setDrawRange(0, Math.floor(this.hawkProj.geometry.index.count * clamp((p - 0.6) / 0.4, 0, 1)));
  }

  // ======================================================== finishing a ball
  finishBall() {
    const bc = this.bc;
    const inn = this.inn;
    let out = bc.result || { runs: 0 };
    if (bc.wide && !(out.wicket && (out.wicket.how === "stumped" || out.wicket.how === "run out"))) {
      out = { runs: out.extra?.type === "b" ? out.runs : 0, extra: { type: "wd" }, wicket: out.wicket?.how === "stumped" ? out.wicket : null };
    } else if (bc.noBall) {
      const w = out.wicket && out.wicket.how === "run out" ? out.wicket : null;
      out = { runs: out.extra ? 0 : out.runs || 0, boundary: out.boundary, extra: { type: "nb" }, wicket: w };
    }
    if (out.extra?.type === "lb" && !out.runs) out = { runs: 0 };

    const batterName = this.strikerPlayer().name;
    const bowlerName = this.bowlTeam.players[bc.bowlerIdx].name;
    const len = bc.traj?.bounce ? STUMPS_Z - bc.traj.bounce.z : 0;
    const shotLabel = bc.shot ? zoneName((bc.shot.angle || 0) * bc.side).toLowerCase() + (bc.shot.type === "loft" ? " loft" : " shot") : "";
    const strikerBefore = inn.striker;
    const freeHit = inn.freeHit;
    const events = recordBall(this.match, out);
    this.pushFeed(`${bc.kmh} km/h • ${commentary({ outcome: out, batterName, bowlerName, len, shotLabel })}`, out.wicket && !(freeHit && out.wicket.how !== "run out") ? "wicket" : out.boundary ? "boundary" : "");
    this.lastOutcome = out;
    this.handleEvents(events, strikerBefore);
    this.phase = "after";
    this.pt = 0;
    this.cb.onScore?.();
  }

  handleEvents(events, strikerBefore) {
    const inn = this.inn;
    let hold = 1.8;
    let autoReplay = false;
    const um = this.actors.umpire;
    const bc = this.bc;
    if (bc?.wide && !events.some((e) => e.type === "wicket")) {
      um.st.mode = "signal:wide";
      this.cb.onBanner?.({ kind: "wide", title: "WIDE", sub: "+1 extra", color: "#a78bfa" });
    }
    if (bc?.noBall) {
      um.st.mode = "signal:noball";
      this.cb.onBanner?.({ kind: "noball", title: "NO BALL", sub: this.match.format.freeHit ? "FREE HIT next ball!" : "+1 extra", color: "#f97316" });
    }
    for (const e of events) {
      switch (e.type) {
        case "four":
          um.st.mode = "signal:four";
          this.cheer = 0.8;
          this.audio.cheer(0.7);
          this.cb.onBanner?.({ kind: "four", title: "FOUR!", sub: "Races to the rope", color: "#38bdf8" });
          this.stadium.drawScreen({ title: "FOUR", flash: true });
          this.actors.striker.st.mode = "celebrate:fist";
          hold = 2.6;
          break;
        case "six":
          um.st.mode = "signal:six";
          this.cheer = 1;
          this.audio.cheer(1);
          this.stadium.fireworks(5);
          this.cb.onBanner?.({ kind: "six", title: "SIX!", sub: `${Math.round(Math.hypot(bc.hit.crossed.x, bc.hit.crossed.z) + 6)} m into the stands`, color: "#f472b6" });
          this.stadium.drawScreen({ title: "SIX!", flash: true });
          this.actors.striker.st.mode = "celebrate:fist";
          hold = 3.2;
          autoReplay = true;
          break;
        case "wicket": {
          const batter = this.batTeam.players[inn.batters.findIndex((b, i) => i === e.batter)] || this.batTeam.players[e.batter];
          um.st.mode = e.how === "run out" ? um.st.mode : "signal:out";
          this.cheer = 1;
          this.audio.cheer(0.9);
          this.cb.onBanner?.({
            kind: "wicket",
            title: e.how === "bowled" ? "BOWLED!" : e.how === "lbw" ? "LBW!" : e.how === "run out" ? "RUN OUT!" : e.how === "stumped" ? "STUMPED!" : "CAUGHT!",
            sub: `${batter?.name || "Batter"} ${inn.batters[e.batter]?.runs ?? 0} (${inn.batters[e.batter]?.balls ?? 0})`,
            color: "#ef4444",
          });
          this.stadium.drawScreen({ title: "WICKET", flash: true });
          this.actors.bowler.st.mode = "celebrate:airplane";
          this.actors.fielders.forEach((f) => (f.st.mode = "celebrate:armsUp"));
          this.actors.keeper.st.mode = "celebrate:armsUp";
          this.huddle = this.clock + 3.5;
          hold = 3.4;
          autoReplay = true;
          break;
        }
        case "fifty":
        case "century":
        case "milestone": {
          const p = this.batTeam.players[e.batter];
          const b = inn.batters[e.batter];
          this.cb.onBanner?.({
            kind: e.type,
            title: e.type === "century" ? "CENTURY! 💯" : e.type === "fifty" ? "FIFTY! 🏏" : `${e.runs} UP!`,
            sub: `${p.name} • ${b.runs} off ${b.balls} (${b.fours}×4, ${b.sixes}×6)`,
            color: e.type === "century" ? "#facc15" : "#34d399",
            big: true,
          });
          this.celebrant = { actor: e.batter === strikerBefore ? "striker" : "nonStriker", kind: e.type === "century" ? "century" : "batRaise", until: this.clock + 4 };
          this.cheer = 1;
          this.audio.cheer(1);
          if (e.type !== "fifty") this.stadium.fireworks(10);
          this.stadium.drawScreen({ title: e.type === "century" ? "CENTURY" : "FIFTY", line1: `${b.runs}*`, line2: p.name });
          hold = Math.max(hold, 4.2);
          break;
        }
        case "fivefor":
          this.cb.onBanner?.({ kind: "fivefor", title: "FIVE-WICKET HAUL! 🖐️", sub: this.bowlTeam.players[e.bowler].name, color: "#facc15", big: true });
          this.stadium.fireworks(6);
          hold = Math.max(hold, 4);
          break;
        case "hattrick":
          this.cb.onBanner?.({ kind: "hattrick", title: "HAT-TRICK! 🎩", sub: this.bowlTeam.players[e.bowler].name, color: "#facc15", big: true });
          this.stadium.fireworks(12);
          hold = Math.max(hold, 4.2);
          break;
        case "freehit":
          um.st.mode = "signal:freehit";
          break;
        case "maiden":
          this.pushFeed(`Maiden over from ${this.bowlTeam.players[e.bowler].name}.`, "info");
          break;
        case "overEnd":
          this.pushFeed(`End of over ${e.over}: ${e.summary.join(" ")}`, "info");
          this.cb.onOverEnd?.(e);
          break;
        case "inningsEnd":
          this.inningsOver = true;
          hold = Math.max(hold, 3);
          break;
        case "matchEnd":
          this.matchOver = true;
          this.stadium.fireworks(14);
          this.audio.cheer(1);
          break;
        default:
          break;
      }
    }
    if (!events.some((e) => e.type === "wicket" || e.type === "four" || e.type === "six") && !bc?.wide && !bc?.noBall) um.st.mode = "idle";
    this.afterHold = hold;
    this.autoReplayPending = autoReplay && this.records.length > 30;
  }

  nextBall() {
    if (this.autoReplayPending) {
      this.autoReplayPending = false;
      this.startReplayInternal(0.45, this.lastOutcome?.boundary === 6 ? "high" : "side", true);
      return;
    }
    if (this.matchOver) {
      this.phase = "matchEnd";
      this.cb.onMatchEnd?.();
      this.matchCelebrate = true;
      return;
    }
    if (this.inningsOver) {
      this.inningsOver = false;
      this.phase = "inningsBreak";
      this.cb.onInningsEnd?.();
      return;
    }
    this.celebrant = null;
    this.newBallSetup();
  }

  startNextInnings() {
    nextInnings(this.match);
    this.rebuildSides();
    this.feed = [];
    this.ballAge = 0;
    this.pushFeed(`${this.batTeam.name} begin their innings${this.inn.target ? ` — target ${this.inn.target}` : ""}.`, "info");
    this.newBallSetup();
    this.cb.onScore?.();
  }

  declareInnings() {
    if (!this.userBatting || this.match.format.id !== "test") return;
    const ev = declare(this.match);
    this.pushFeed(`${this.batTeam.name} declare at ${this.inn.runs}/${this.inn.wkts}.`, "info");
    this.handleEvents(ev, this.inn.striker);
    this.phase = "after";
    this.pt = 0;
    this.cb.onScore?.();
  }

  /** Fast-forward with statistical outcomes */
  quickSim(maxBalls) {
    if (!["preBall", "chooseBowler"].includes(this.phase)) return;
    this.prompt = null;
    this.cb.onPrompt?.(null);
    const inn = this.inn;
    let n = 0;
    while (n < maxBalls && !inn.complete) {
      if (inn.bowler == null) {
        const opts = eligibleBowlers(this.match).sort((a, b) => b.p.bowl - a.p.bowl + (Math.random() - 0.5) * 15);
        inn.bowler = opts[0]?.i ?? 10;
      }
      const tot = this.match.format.overs;
      const agg = battingAggression({ format: this.match.format.id, ballsLeft: tot ? tot * 6 - inn.balls : null, runsNeeded: inn.target ? inn.target - inn.runs : null, wktsDown: inn.wkts, oversDone: inn.balls / 6, totalOvers: tot, batterRuns: inn.batters[inn.striker].runs });
      const outcome = quickSimBall({ batter: this.strikerPlayer(), bowler: this.bowlTeam.players[inn.bowler], aggression: agg, freeHit: inn.freeHit, fielders: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10].filter((i) => i !== inn.bowler) });
      const name = this.strikerPlayer().name;
      const bname = this.bowlTeam.players[inn.bowler].name;
      const evs = recordBall(this.match, outcome);
      n += 1;
      for (const e of evs) {
        if (e.type === "wicket") this.pushFeed(`[SIM] WICKET — ${commentary({ outcome, batterName: name, bowlerName: bname })}`, "wicket");
        if (e.type === "fifty" || e.type === "century") this.pushFeed(`[SIM] ${this.batTeam.players[e.batter].name} reaches ${e.type === "fifty" ? 50 : 100}!`, "boundary");
        if (e.type === "overEnd" && maxBalls <= 6) n = maxBalls;
        if (e.type === "inningsEnd") this.inningsOver = true;
        if (e.type === "matchEnd") this.matchOver = true;
      }
      if (this.matchOver || this.inningsOver) break;
    }
    this.cb.onScore?.();
    if (this.matchOver || this.inningsOver) {
      this.phase = "after";
      this.afterHold = 0.5;
      this.pt = 0;
      return;
    }
    this.newBallSetup();
  }

  // ======================================================== replays
  recordFrame() {
    const a = this.actors;
    const snap = (x) => ({ ...x.st });
    this.records.push({
      ball: { x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z, v: this.ball.visible },
      s: snap(a.striker),
      n: snap(a.nonStriker),
      b: snap(a.bowler),
      k: snap(a.keeper),
      f: a.fielders.map(snap),
      sw: this.stadium.strikerWicket.broken,
    });
  }

  startReplay() {
    if (this.records.length < 10 || !["after", "preBall", "inningsBreak", "matchEnd"].includes(this.phase)) return;
    this.startReplayInternal(0.5, "side", false);
  }

  startReplayInternal(speed, angle, auto) {
    if (this.records.length < 5) return;
    this.replay = { i: 0, speed, angle, auto, prevPhase: this.phase, f: 0, savedState: this.saveLiveState() };
    this.phase = "replay";
    this.stadium.strikerWicket.reset();
    this.cb.onReplay?.(true);
  }

  saveLiveState() {
    const a = this.actors;
    return {
      s: { ...a.striker.st },
      n: { ...a.nonStriker.st },
      b: { ...a.bowler.st },
      k: { ...a.keeper.st },
      f: a.fielders.map((x) => ({ ...x.st })),
      ball: this.ball.position.clone(),
      bv: this.ball.visible,
    };
  }

  updateReplay(dt) {
    const rp = this.replay;
    rp.f += dt * 60 * rp.speed;
    const i = Math.min(this.records.length - 1, Math.floor(rp.f));
    const r = this.records[i];
    const a = this.actors;
    Object.assign(a.striker.st, r.s);
    Object.assign(a.nonStriker.st, r.n);
    Object.assign(a.bowler.st, r.b);
    Object.assign(a.keeper.st, r.k);
    a.fielders.forEach((f, k) => Object.assign(f.st, r.f[k]));
    this.ball.position.set(r.ball.x, r.ball.y, r.ball.z);
    this.ball.visible = r.ball.v;
    this.ballShadow.position.set(r.ball.x, 0.012, r.ball.z);
    if (r.sw && !this.stadium.strikerWicket.broken) this.stadium.strikerWicket.breakWith(r.ball.x * 2, 8, 1.1);
    this.animateActors(dt);
    if (this.reviewing) this.updateReview(dt);
    if (i >= this.records.length - 1 && !this.reviewing) this.stopReplay(false);
  }

  stopReplay(fromReview) {
    const rp = this.replay;
    if (!rp) return;
    const s = rp.savedState;
    const a = this.actors;
    Object.assign(a.striker.st, s.s);
    Object.assign(a.nonStriker.st, s.n);
    Object.assign(a.bowler.st, s.b);
    Object.assign(a.keeper.st, s.k);
    a.fielders.forEach((f, k) => Object.assign(f.st, s.f[k]));
    this.ball.position.copy(s.ball);
    this.ball.visible = s.bv;
    this.phase = rp.prevPhase === "replay" ? "after" : rp.prevPhase;
    if (rp.auto) {
      this.phase = "after";
      this.afterHold = 0.2;
    }
    this.pt = fromReview ? Math.max(0, (this.bc?.deadHold || 1) - 0.8) : this.pt;
    this.replay = null;
    this.cb.onReplay?.(false);
  }

  skip() {
    if (this.phase === "replay" && !this.reviewing) this.stopReplay(false);
    else if (this.phase === "after") this.pt = 99;
  }

  // ======================================================== animation & camera
  animateActors(dt) {
    const t = this.clock;
    const a = this.actors;
    const all = [a.striker, a.nonStriker, a.bowler, a.keeper, a.umpire, a.legUmpire, ...a.fielders];
    const bc = this.bc;
    if (this.huddle && t < this.huddle && this.phase !== "replay") {
      // fielders converge on the bowler to celebrate
      const bx = a.bowler.st.x;
      const bz = a.bowler.st.z;
      a.fielders.forEach((f, i) => {
        const ang = (i / 9) * Math.PI * 2;
        this.moveActor(f, bx + Math.sin(ang) * 1.6, bz + Math.cos(ang) * 1.6, 6, dt, true);
        if (Math.hypot(f.st.x - bx, f.st.z - bz) < 2.2) f.st.mode = "celebrate:huddle";
      });
    }
    for (const c of all) {
      const s = c.st;
      c.root.position.set(s.x, 0, s.z);
      c.root.rotation.y = s.ry;
      const mode = s.mode || "idle";
      if (mode === "shot" && !s.prep && this.phase !== "replay") s.p = Math.min(1, (s.p || 0) + dt / 0.42);
      if (this.celebrant && this.celebrant.until > t && c === a[this.celebrant.actor] && this.phase !== "replay") {
        c.celebrate(this.celebrant.kind, t);
        continue;
      }
      if (this.matchCelebrate && c.kind !== "umpire") {
        const winners = this.match.result?.winner;
        const isBat = c === a.striker || c === a.nonStriker;
        const won = winners === (isBat ? this.inn.battingIdx : this.inn.bowlingIdx);
        if (won) {
          c.celebrate("armsUp", t + c.root.position.x);
          continue;
        }
      }
      if (mode === "stance") c.stance(t);
      else if (mode === "shot") c.shot(s.p, s.angle || 0, s.type);
      else if (mode === "bowl") c.bowl(s.p, s.phase, bc?.bowler?.style === "spin");
      else if (mode === "run") c.run(s.phase, 1);
      else if (mode === "ready") c.ready(t);
      else if (mode === "keeper") c.keeperCrouch(t, s.rise);
      else if (mode === "catch") c.catchPose(s.high);
      else if (mode === "dive") {
        s.p = Math.min(1, (s.p || 0) + dt * 3);
        c.dive(s.dir || 1, s.p);
      } else if (mode === "throw") {
        s.p = Math.min(1, (s.p || 0) + dt * 3.5);
        c.throwPose(s.p);
      } else if (mode.startsWith("celebrate:")) c.celebrate(mode.slice(10), t);
      else if (mode.startsWith("signal:")) c.signal(mode.slice(7), t);
      else c.idle(t);
    }
    // keep the striker facing correctly while stancing
    if (a.striker.st.mode === "stance" || a.striker.st.mode === "shot") {
      const side = this.side();
      a.striker.root.scale.x = side;
    } else {
      a.striker.root.scale.x = 1;
    }
  }

  render() {
    this.updateCamera();
    if (this.trailPts.length > 6 && this.phase === "inPlay") {
      this.trail.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.trailPts, 3));
      this.trail.visible = true;
    } else this.trail.visible = false;
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera() {
    const c = this.camera;
    let pos;
    let look;
    let fov = 38;
    const ball = this.ball.position;
    if (this.phase === "replay") {
      const ang = this.replay.angle;
      if (ang === "stump") {
        pos = new THREE.Vector3(0, 0.45, 13.4);
        look = new THREE.Vector3(0, 0.6, -6);
        fov = 32;
      } else if (ang === "high") {
        pos = new THREE.Vector3(ball.x * 0.3 + 18, 24, ball.z * 0.3 - 10);
        look = ball.clone();
        fov = 45;
      } else {
        pos = new THREE.Vector3(24, 3.2, 4);
        look = new THREE.Vector3(ball.x * 0.4, 0.8, clamp(ball.z, -10, 12));
        fov = 30;
      }
    } else if (this.reviewing && this.review?.kind === "lbw") {
      pos = new THREE.Vector3(3.2, 2.2, 17.5);
      look = new THREE.Vector3(0, 0.4, 4);
      fov = 32;
    } else if (this.phase === "inPlay" && this.followCam) {
      look = ball.clone();
      pos = new THREE.Vector3(ball.x * 0.45, 16 + ball.y * 0.4, ball.z * 0.45 - 36);
      fov = 42;
    } else if (this.celebrant && this.celebrant.until > this.clock) {
      const a = this.actors[this.celebrant.actor];
      look = new THREE.Vector3(a.st.x, 1.3, a.st.z);
      pos = new THREE.Vector3(a.st.x + 2.5, 1.9, a.st.z - 5.5);
      fov = 36;
    } else if (this.matchCelebrate) {
      const t = this.clock * 0.15;
      pos = new THREE.Vector3(Math.sin(t) * 40, 14, Math.cos(t) * 40);
      look = new THREE.Vector3(0, 1, 0);
      fov = 45;
    } else if (this.camMode === "batcam" && this.userBatting) {
      const side = this.side();
      pos = new THREE.Vector3(0.6 * side, 1.75, 13.2);
      look = new THREE.Vector3(0, 1.0, -10);
      fov = 48;
    } else if (!this.userBatting && (this.phase === "preBall" || this.phase === "runup" || this.phase === "chooseBowler")) {
      pos = new THREE.Vector3(-2.4, 5.2, -29);
      look = new THREE.Vector3(0, 0.2, 8.5);
      fov = 27;
    } else {
      pos = new THREE.Vector3(0, 11, -48);
      look = new THREE.Vector3(0, 0.6, 8.2);
      fov = 21;
      if (this.phase === "inPlay" && !this.followCam) {
        look.lerp(ball, 0.35);
      }
    }
    const k = this.phase === "replay" || this.reviewing ? 0.25 : this.phase === "inPlay" ? 0.08 : 0.06;
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k * 1.6);
    c.position.copy(this.camPos);
    c.lookAt(this.camLook);
    if (Math.abs(c.fov - fov) > 0.05) {
      c.fov += (fov - c.fov) * 0.1;
      c.updateProjectionMatrix();
    }
  }

  // ======================================================== HUD snapshot
  hud() {
    const m = this.match;
    const inn = this.inn;
    const bat = this.batTeam;
    const bowl = this.bowlTeam;
    const s = inn.batters[inn.striker];
    const n = inn.batters[inn.nonStriker];
    const bw = inn.bowler != null ? inn.bowlers[inn.bowler] : null;
    const tot = m.format.overs;
    return {
      phase: this.phase,
      userBatting: this.userBatting,
      batTeam: bat,
      bowlTeam: bowl,
      runs: inn.runs,
      wkts: inn.wkts,
      overs: oversText(inn.balls),
      oversLimit: tot,
      crr: inn.balls ? ((inn.runs * 6) / inn.balls).toFixed(2) : "0.00",
      target: inn.target,
      need: inn.target ? inn.target - inn.runs : null,
      ballsLeft: tot ? tot * 6 - inn.balls : null,
      rrr: inn.target && tot && tot * 6 - inn.balls > 0 ? (((inn.target - inn.runs) * 6) / (tot * 6 - inn.balls)).toFixed(2) : null,
      striker: { name: bat.players[inn.striker].name, hand: bat.players[inn.striker].hand, runs: s.runs, balls: s.balls },
      nonStriker: { name: bat.players[inn.nonStriker].name, runs: n.runs, balls: n.balls },
      bowler: inn.bowler != null ? { name: bowl.players[inn.bowler].name, style: bowl.players[inn.bowler].style, spinType: bowl.players[inn.bowler].spinType, ...bw } : null,
      thisOver: inn.thisOver.slice(),
      partnership: { ...inn.partnership },
      freeHit: inn.freeHit,
      powerplay: isPowerplay(m),
      reviewsBat: inn.reviewsLeft,
      reviewsBowl: inn.reviewsLeftBowling,
      inningsNo: m.inningsIdx + 1,
      totalInnings: m.inningsOrder.length,
      meter: this.meter ? { v: this.meter.v, locked: this.meter.locked } : null,
      aimZone: zoneName(this.userAimBat),
      foot: this.userFoot,
      delivery: this.userDelivery,
      targetLen: this.userTarget.len,
      targetLine: this.userTarget.line,
      overWicket: this.overWicket,
      autoRun: this.autoRun,
      camMode: this.camMode,
      speed: this.bc?.kmh || null,
      feed: this.feed.slice(0, 5),
      fieldPreset: this.fieldPreset,
      canReplay: this.records.length > 10 && ["after", "preBall"].includes(this.phase),
      runState: this.bc?.run ? { completed: this.bc.run.completed, active: this.bc.run.active } : null,
      result: m.result,
      test: m.format.id === "test",
    };
  }
}
