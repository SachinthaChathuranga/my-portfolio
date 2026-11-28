/** Synthesised stadium audio: crowd bed, roars, bat crack, pads, stumps. */
export function createCricketAudio() {
  let ctx = null;
  let crowdGain = null;
  let master = null;
  let muted = false;

  const ensure = () => {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  };

  const noiseBuffer = (c, secs) => {
    const len = Math.floor(c.sampleRate * secs);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; // brown-ish noise
      d[i] = last * 6;
    }
    return b;
  };

  const startCrowd = () => {
    const c = ensure();
    if (!c || crowdGain) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 4);
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700;
    bp.Q.value = 0.5;
    crowdGain = c.createGain();
    crowdGain.gain.value = 0.05;
    src.connect(bp).connect(crowdGain).connect(master);
    src.start();
  };

  const burst = (dur, f0, f1, vol, type = "bandpass") => {
    const c = ensure();
    if (!c || muted) return;
    const now = c.currentTime;
    const len = Math.max(128, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, now);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    s.connect(f).connect(g).connect(master);
    s.start(now);
  };

  const tone = (f, dur, vol, type = "sine", f2 = null) => {
    const c = ensure();
    if (!c || muted) return;
    const now = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + dur + 0.02);
  };

  const swell = (peak, secs) => {
    const c = ensure();
    if (!c || !crowdGain) return;
    const now = c.currentTime;
    crowdGain.gain.cancelScheduledValues(now);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, now);
    crowdGain.gain.linearRampToValueAtTime(muted ? 0 : peak, now + 0.25);
    crowdGain.gain.linearRampToValueAtTime(muted ? 0 : 0.05, now + secs);
  };

  return {
    start: startCrowd,
    setMuted(m) {
      muted = m;
      if (crowdGain && ctx) crowdGain.gain.setValueAtTime(m ? 0 : 0.05, ctx.currentTime);
    },
    bat(quality = 1) {
      // sharp "crack" of willow on leather
      burst(0.05, 3200, 1800, 0.35 * (0.5 + quality * 0.5), "highpass");
      tone(900 + quality * 500, 0.06, 0.12, "triangle", 300);
    },
    edge() {
      burst(0.03, 4200, 2600, 0.18, "highpass");
    },
    pad() {
      tone(140, 0.12, 0.25, "sine", 70);
      burst(0.08, 600, 200, 0.12, "lowpass");
    },
    stumps() {
      tone(420, 0.12, 0.2, "square", 200);
      burst(0.25, 2600, 600, 0.22);
    },
    bounce() {
      burst(0.03, 900, 400, 0.06, "lowpass");
    },
    glove() {
      tone(220, 0.07, 0.18, "sine", 120);
    },
    cheer(level = 1) {
      swell(0.22 + level * 0.25, 2.5 + level * 1.5);
      burst(1.6 + level, 1400, 500, 0.08 * level, "bandpass");
    },
    groan() {
      swell(0.14, 1.8);
      tone(240, 0.8, 0.03, "sawtooth", 160);
    },
    appeal() {
      swell(0.3, 1.6);
      tone(330, 0.35, 0.05, "sawtooth", 520);
    },
    click() {
      tone(1400, 0.03, 0.05, "square");
    },
    drsBeep() {
      tone(880, 0.12, 0.08, "square");
      setTimeout(() => tone(1320, 0.16, 0.08, "square"), 140);
    },
  };
}
