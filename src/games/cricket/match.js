/**
 * Pure match-state engine: scoring, extras, strike rotation, wickets,
 * milestones, overs, innings transitions and results for T20 / ODI / Test / custom.
 */
import { FORMATS, maxOversPerBowler } from "./data";

export function createMatch({ formatId, customOvers, testCap, teams, userTeam, batFirst, ground, difficulty }) {
  const base = FORMATS[formatId];
  const format = { ...base };
  if (formatId === "custom") {
    format.overs = customOvers;
    format.powerplay = Math.max(1, Math.round(customOvers * 0.3));
  }
  if (formatId === "test") format.overs = testCap || null;
  const m = {
    format,
    teams, // [teamA, teamB]
    userTeam, // 0 | 1
    ground,
    difficulty,
    innings: [],
    inningsIdx: -1,
    result: null,
    maxBowlerOvers: formatId === "test" ? Infinity : maxOversPerBowler(format.overs),
    log: [],
  };
  const order = [batFirst, 1 - batFirst];
  const totalInnings = format.innings * 2;
  m.inningsOrder = Array.from({ length: totalInnings }, (_, i) => order[i % 2]);
  startInnings(m);
  return m;
}

export function startInnings(m) {
  m.inningsIdx += 1;
  const battingIdx = m.inningsOrder[m.inningsIdx];
  const team = m.teams[battingIdx];
  const inn = {
    battingIdx,
    bowlingIdx: 1 - battingIdx,
    runs: 0,
    wkts: 0,
    balls: 0, // legal balls
    extras: { w: 0, nb: 0, b: 0, lb: 0 },
    batters: team.players.map((p, i) => ({
      idx: i,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: null,
      batted: i < 2,
      milestones: {},
    })),
    bowlers: {},
    striker: 0,
    nonStriker: 1,
    nextIn: 2,
    bowler: null,
    lastOverBowler: null,
    thisOver: [],
    overRuns: 0,
    freeHit: false,
    reviewsLeft: m.format.reviews,
    reviewsLeftBowling: m.format.reviews,
    fow: [],
    partnership: { runs: 0, balls: 0 },
    declared: false,
    complete: false,
    target: null,
    lastWicketBalls: [],
  };
  // target only on the final innings of limited-overs or 4th innings of a Test
  if (m.inningsIdx === m.inningsOrder.length - 1) {
    const tot = inningsTotals(m);
    inn.target = tot[1 - battingIdx] - tot[battingIdx] + 1;
  }
  m.innings.push(inn);
  return inn;
}

export function inningsTotals(m) {
  const t = [0, 0];
  for (const inn of m.innings) t[inn.battingIdx] += inn.runs;
  return t;
}

export const cur = (m) => m.innings[m.inningsIdx];

export function oversText(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function bowlerStats(inn, idx) {
  if (!inn.bowlers[idx]) inn.bowlers[idx] = { balls: 0, runs: 0, wkts: 0, maidens: 0, dots: 0, wides: 0, nbs: 0 };
  return inn.bowlers[idx];
}

export function eligibleBowlers(m) {
  const inn = cur(m);
  const team = m.teams[inn.bowlingIdx];
  return team.players
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.style && i !== inn.lastOverBowler && Math.floor(bowlerStats(inn, i).balls / 6) < m.maxBowlerOvers);
}

export function isPowerplay(m) {
  const inn = cur(m);
  return m.format.powerplay > 0 && inn.balls < m.format.powerplay * 6;
}

export function ballsRemaining(m) {
  const inn = cur(m);
  if (!m.format.overs) return Infinity;
  return m.format.overs * 6 - inn.balls;
}

export function requiredRate(m) {
  const inn = cur(m);
  if (!inn.target || !m.format.overs) return null;
  const need = inn.target - inn.runs;
  const b = ballsRemaining(m);
  return b > 0 ? (need * 6) / b : Infinity;
}

/**
 * Record one delivery.
 * outcome = {
 *   runs: runs off the bat (or byes/leg-byes count when extra.type is b/lb),
 *   extra: null | { type: "wd"|"nb"|"b"|"lb" },
 *   boundary: null | 4 | 6,
 *   wicket: null | { how, out: "striker"|"nonStriker", fielder, bowlerCredit },
 * }
 * returns list of events.
 */
export function recordBall(m, outcome) {
  const inn = cur(m);
  const events = [];
  const bowlerIdx = inn.bowler;
  const bs = bowlerStats(inn, bowlerIdx);
  const striker = inn.batters[inn.striker];
  const extra = outcome.extra;
  const legal = !extra || extra.type === "b" || extra.type === "lb";
  const wasFreeHit = inn.freeHit;
  let teamRuns = 0;
  let symbol = "";

  if (extra && extra.type === "wd") {
    teamRuns = 1 + (outcome.runs || 0);
    inn.extras.w += teamRuns;
    bs.runs += teamRuns;
    bs.wides += 1;
    symbol = teamRuns > 1 ? `${teamRuns}wd` : "wd";
  } else if (extra && extra.type === "nb") {
    teamRuns = 1 + (outcome.runs || 0);
    inn.extras.nb += 1;
    bs.runs += teamRuns;
    bs.nbs += 1;
    striker.runs += outcome.runs || 0;
    striker.balls += 1;
    if (outcome.boundary === 4) striker.fours++;
    if (outcome.boundary === 6) striker.sixes++;
    symbol = outcome.runs ? `${outcome.runs}nb` : "nb";
  } else if (extra && (extra.type === "b" || extra.type === "lb")) {
    teamRuns = outcome.runs || 0;
    inn.extras[extra.type] += teamRuns;
    striker.balls += 1;
    symbol = `${teamRuns}${extra.type}`;
  } else {
    teamRuns = outcome.runs || 0;
    striker.runs += teamRuns;
    striker.balls += 1;
    bs.runs += teamRuns;
    if (outcome.boundary === 4) striker.fours++;
    if (outcome.boundary === 6) striker.sixes++;
    symbol = teamRuns ? String(teamRuns) : "•";
  }

  inn.runs += teamRuns;
  inn.overRuns += extra && (extra.type === "b" || extra.type === "lb") ? 0 : teamRuns;
  inn.partnership.runs += teamRuns;
  if (legal) {
    inn.balls += 1;
    bs.balls += 1;
    inn.partnership.balls += 1;
    if (!teamRuns && !outcome.wicket) bs.dots += 1;
  }
  if (outcome.boundary === 4) events.push({ type: "four" });
  if (outcome.boundary === 6) events.push({ type: "six" });

  // Milestones
  for (const mark of [50, 100, 150, 200]) {
    if (striker.runs >= mark && !striker.milestones[mark]) {
      striker.milestones[mark] = true;
      events.push({ type: mark === 50 ? "fifty" : mark === 100 ? "century" : "milestone", runs: mark, batter: inn.striker });
    }
  }

  // Wicket (free hit: only run outs count)
  let wicket = outcome.wicket;
  if (wicket && wasFreeHit && wicket.how !== "run out") wicket = null;
  if (wicket) {
    const outPos = wicket.out === "nonStriker" ? inn.nonStriker : inn.striker;
    const b = inn.batters[outPos];
    b.out = { how: wicket.how, bowler: wicket.bowlerCredit ? bowlerIdx : null, fielder: wicket.fielder ?? null };
    inn.wkts += 1;
    inn.fow.push({ wkt: inn.wkts, runs: inn.runs, batter: outPos, over: oversText(inn.balls) });
    inn.partnership = { runs: 0, balls: 0 };
    if (wicket.bowlerCredit) {
      bs.wkts += 1;
      inn.lastWicketBalls.push(bs.balls + bs.wides * 1000 * 0); // marker for hat-trick tracking
      events.push({ type: "wicket", how: wicket.how, batter: outPos, bowler: bowlerIdx });
      if (bs.wkts === 5) events.push({ type: "fivefor", bowler: bowlerIdx });
      // hat-trick: three consecutive deliveries by the same bowler took wickets
      inn.hatTrickRun = inn.hatTrickBowler === bowlerIdx ? (inn.hatTrickRun || 0) + 1 : 1;
      inn.hatTrickBowler = bowlerIdx;
      if (inn.hatTrickRun === 3) events.push({ type: "hattrick", bowler: bowlerIdx });
    } else {
      events.push({ type: "wicket", how: wicket.how, batter: outPos, bowler: null });
    }
    symbol = "W";
    if (inn.wkts < 10 && inn.nextIn < 11) {
      const ni = inn.nextIn++;
      inn.batters[ni].batted = true;
      if (outPos === inn.striker) inn.striker = ni;
      else inn.nonStriker = ni;
    }
  } else if (legal && bowlerIdx === inn.hatTrickBowler) {
    inn.hatTrickRun = 0;
  }

  // Strike rotation on odd runs (completed runs; boundaries don't rotate)
  const ranRuns = outcome.boundary ? 0 : extra && extra.type === "wd" ? outcome.runs || 0 : outcome.runs || 0;
  if (ranRuns % 2 === 1) swapStrike(inn);

  inn.freeHit = Boolean(extra && extra.type === "nb" && m.format.freeHit);
  if (inn.freeHit) events.push({ type: "freehit" });

  inn.thisOver.push(symbol);
  m.log.push({ inn: m.inningsIdx, over: oversText(inn.balls), symbol });

  // End of over
  if (legal && inn.balls % 6 === 0) {
    if (inn.overRuns === 0) {
      bs.maidens += 1;
      events.push({ type: "maiden", bowler: bowlerIdx });
    }
    events.push({ type: "overEnd", over: inn.balls / 6, summary: inn.thisOver.slice() });
    inn.lastOverBowler = bowlerIdx;
    inn.bowler = null;
    inn.thisOver = [];
    inn.overRuns = 0;
    swapStrike(inn);
  }

  checkInningsEnd(m, events);
  return events;
}

export function swapStrike(inn) {
  const t = inn.striker;
  inn.striker = inn.nonStriker;
  inn.nonStriker = t;
}

export function declare(m) {
  const inn = cur(m);
  inn.declared = true;
  const events = [];
  checkInningsEnd(m, events, true);
  return events;
}

function checkInningsEnd(m, events, forced = false) {
  const inn = cur(m);
  const allOut = inn.wkts >= 10;
  const oversDone = m.format.overs && inn.balls >= m.format.overs * 6;
  const chased = inn.target && inn.runs >= inn.target;
  if (!(allOut || oversDone || chased || forced || inn.declared)) return;
  inn.complete = true;
  events.push({ type: "inningsEnd", allOut, chased: Boolean(chased), declared: inn.declared });

  // Test: innings defeat check after 3rd innings
  const totals = inningsTotals(m);
  const last = m.inningsIdx === m.inningsOrder.length - 1;
  if (m.format.innings === 2 && m.inningsIdx === 2) {
    const bat3 = inn.battingIdx;
    if (totals[bat3] < totals[1 - bat3] && (allOut || inn.declared)) {
      finish(m, 1 - bat3, `${m.teams[1 - bat3].name} won by an innings and ${totals[1 - bat3] - totals[bat3]} runs`);
      events.push({ type: "matchEnd" });
      return;
    }
  }
  if (last) {
    const bat = inn.battingIdx;
    const bowl = 1 - bat;
    if (chased) {
      finish(m, bat, `${m.teams[bat].name} won by ${10 - inn.wkts} wicket${10 - inn.wkts === 1 ? "" : "s"}`);
    } else if (totals[bat] === totals[bowl] && (allOut || oversDone)) {
      finish(m, -1, "Match tied");
    } else if (allOut || (oversDone && m.format.innings === 1)) {
      finish(m, bowl, `${m.teams[bowl].name} won by ${totals[bowl] - totals[bat]} runs`);
    } else {
      finish(m, -1, "Match drawn");
    }
    events.push({ type: "matchEnd" });
  }
}

function finish(m, winner, text) {
  m.result = { winner, text };
}

export function nextInnings(m) {
  if (m.result) return null;
  return startInnings(m);
}

export function strikeRate(b) {
  return b.balls ? ((b.runs * 100) / b.balls).toFixed(1) : "0.0";
}

export function economy(bs) {
  return bs.balls ? ((bs.runs * 6) / bs.balls).toFixed(2) : "0.00";
}

export function dismissalText(m, inn, b) {
  if (!b.out) return b.batted ? "not out" : "";
  const bowlTeam = m.teams[inn.bowlingIdx].players;
  const bw = b.out.bowler != null ? bowlTeam[b.out.bowler].name.split(" ").slice(-1)[0] : "";
  const fd = b.out.fielder != null ? bowlTeam[b.out.fielder].name.split(" ").slice(-1)[0] : "";
  switch (b.out.how) {
    case "bowled":
      return `b ${bw}`;
    case "lbw":
      return `lbw b ${bw}`;
    case "caught":
      return b.out.fielder === b.out.bowler ? `c & b ${bw}` : `c ${fd} b ${bw}`;
    case "caught behind":
      return `c †${fd} b ${bw}`;
    case "stumped":
      return `st †${fd} b ${bw}`;
    case "run out":
      return `run out (${fd || "direct hit"})`;
    default:
      return b.out.how;
  }
}

/** Fielding restriction: how many fielders allowed outside the 30-yard circle */
export function maxOutsideCircle(m) {
  if (m.format.id === "test") return 9;
  return isPowerplay(m) ? 2 : 5;
}
