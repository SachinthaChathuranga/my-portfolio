/**
 * Procedural Military Wall Texture Generator + Realistic Articulated Soldier & Weapon Renderers
 * Generates authentic 64x64 pixel military textures once on load so the 3D raycaster looks like
 * a true Project I.G.I. tactical compound rather than flat colored strips.
 */

export const TEX_SIZE = 64;

function seededRand(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Cross-browser rounded rect path helper */
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = TEX_SIZE;
  c.height = TEX_SIZE;
  return c;
}

function addSurfaceNoise(ctx, amount, seedOffset) {
  const img = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (seededRand(i * 0.25 + seedOffset) - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** Build cached 64x64 textures for wall types 1..7 */
export function createWallTextures() {
  const textures = {};

  // 1: Weathered Poured Concrete Bunker Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#6F747C";
    ctx.fillRect(0, 0, 64, 64);

    // Horizontal formwork concrete panel seams
    ctx.fillStyle = "#525760";
    ctx.fillRect(0, 20, 64, 2);
    ctx.fillRect(0, 42, 64, 2);
    ctx.fillRect(31, 0, 2, 20);
    ctx.fillRect(14, 22, 2, 20);
    ctx.fillRect(48, 22, 2, 20);
    ctx.fillRect(28, 44, 2, 20);

    // Concrete tie-rod bolt holes
    ctx.fillStyle = "#3A3E46";
    [
      [8, 10],
      [24, 10],
      [42, 10],
      [56, 10],
      [8, 32],
      [32, 32],
      [56, 32],
    ].forEach(([bx, by]) => ctx.fillRect(bx, by, 2, 2));

    // Bottom dirt/moisture grime weathering
    const grime = ctx.createLinearGradient(0, 48, 0, 64);
    grime.addColorStop(0, "rgba(25,28,24,0)");
    grime.addColorStop(1, "rgba(25,28,24,0.45)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, 48, 64, 16);

    addSurfaceNoise(ctx, 22, 11);
    textures[1] = c;
  }

  // 2: Corrugated Military Steel Hangar Bulkhead
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    for (let x = 0; x < 64; x += 4) {
      ctx.fillStyle = "#41525D";
      ctx.fillRect(x, 0, 2, 64);
      ctx.fillStyle = "#2C3942";
      ctx.fillRect(x + 2, 0, 2, 64);
    }
    // Horizontal riveted crossbars
    ctx.fillStyle = "#222D35";
    ctx.fillRect(0, 0, 64, 5);
    ctx.fillRect(0, 30, 64, 4);
    ctx.fillRect(0, 58, 64, 6);
    // Steel rivets
    ctx.fillStyle = "#798E9C";
    for (let rx = 4; rx < 64; rx += 8) {
      ctx.fillRect(rx, 2, 2, 2);
      ctx.fillRect(rx, 31, 2, 2);
      ctx.fillRect(rx, 60, 2, 2);
    }
    // Military olive stencil band
    ctx.fillStyle = "rgba(180, 198, 140, 0.25)";
    ctx.fillRect(10, 14, 44, 6);
    addSurfaceNoise(ctx, 14, 23);
    textures[2] = c;
  }

  // 3: Reinforced Hazard Military Blast Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#3E434C";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "#262A31";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 60, 44);

    // Diagonal black/amber industrial caution chevron along lower section
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 46, 64, 14);
    ctx.clip();
    ctx.fillStyle = "#EAB308";
    ctx.fillRect(0, 46, 64, 14);
    ctx.fillStyle = "#18181B";
    for (let s = -20; s < 84; s += 14) {
      ctx.beginPath();
      ctx.moveTo(s, 60);
      ctx.lineTo(s + 7, 60);
      ctx.lineTo(s + 17, 46);
      ctx.lineTo(s + 10, 46);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Small warning plate
    ctx.fillStyle = "#991B1B";
    ctx.fillRect(20, 16, 24, 14);
    ctx.fillStyle = "#FEF08A";
    ctx.fillRect(24, 20, 16, 2);
    ctx.fillRect(26, 25, 12, 2);
    addSurfaceNoise(ctx, 16, 37);
    textures[3] = c;
  }

  // 4: Military Mainframe Server Rack / Objective Terminal
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#151D29";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 58, 58);

    // Illuminated tactical CRT monitor screen
    ctx.fillStyle = "#042F2E";
    ctx.fillRect(10, 10, 44, 22);
    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, 44, 22);
    // Data waveform lines on screen
    ctx.fillStyle = "#34D399";
    ctx.fillRect(14, 15, 22, 2);
    ctx.fillRect(14, 20, 32, 2);
    ctx.fillStyle = "#00D4FF";
    ctx.fillRect(14, 25, 18, 2);

    // Server rack trays + blinking status LEDs
    for (let y = 37; y < 58; y += 6) {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(8, y, 48, 4);
      ctx.fillStyle = y % 12 === 1 ? "#22C55E" : "#38BDF8";
      ctx.fillRect(11, y + 1, 3, 2);
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(17, y + 1, 2, 2);
      ctx.fillStyle = "#334155";
      ctx.fillRect(26, y + 1, 26, 2);
    }
    textures[4] = c;
  }

  // 5: Perimeter Fortified Concrete + Upper Barbed Wire Grate
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#5B6068";
    ctx.fillRect(0, 0, 64, 64);

    // Upper dark security fence/barbed wire band
    ctx.fillStyle = "#1E2530";
    ctx.fillRect(0, 0, 64, 15);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1;
    for (let x = 0; x < 64; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6, 15);
      ctx.moveTo(x + 6, 0);
      ctx.lineTo(x, 15);
      ctx.stroke();
    }
    // Concrete lip
    ctx.fillStyle = "#3F454F";
    ctx.fillRect(0, 15, 64, 4);
    ctx.fillRect(0, 40, 64, 2);
    ctx.fillRect(30, 19, 2, 45);
    addSurfaceNoise(ctx, 22, 59);
    textures[5] = c;
  }

  // 6: Fuel / Munitions Depot Tank Bulkhead
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#5C4D42";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#8C2D2D";
    ctx.fillRect(0, 18, 64, 14);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 16, 64, 2);
    ctx.fillRect(0, 32, 64, 2);
    // Pressure valve / pipe detail
    ctx.fillStyle = "#2E2925";
    ctx.fillRect(28, 0, 8, 64);
    ctx.fillStyle = "#A3A3A3";
    ctx.fillRect(26, 22, 12, 6);
    ctx.fillRect(26, 46, 12, 4);
    addSurfaceNoise(ctx, 18, 71);
    textures[6] = c;
  }

  // 7: Frosted Arctic Concrete & Snow-Capped Bunker Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7D8B99";
    ctx.fillRect(0, 0, 64, 64);
    // Snow drift along top
    ctx.fillStyle = "#E2EBF3";
    ctx.fillRect(0, 0, 64, 9);
    for (let x = 0; x < 64; x += 7) {
      ctx.fillRect(x, 9, 4, 3 + (x % 4));
    }
    // Concrete block lines
    ctx.fillStyle = "#566370";
    ctx.fillRect(0, 30, 64, 2);
    ctx.fillRect(0, 50, 64, 2);
    ctx.fillRect(22, 12, 2, 18);
    ctx.fillRect(46, 32, 2, 18);
    // Steel ventilation louver
    ctx.fillStyle = "#2D3748";
    ctx.fillRect(36, 16, 18, 10);
    ctx.fillStyle = "#94A3B8";
    for (let vy = 18; vy < 26; vy += 3) {
      ctx.fillRect(38, vy, 14, 1);
    }
    // Frosted snow base
    const snowBase = ctx.createLinearGradient(0, 52, 0, 64);
    snowBase.addColorStop(0, "rgba(226,235,243,0)");
    snowBase.addColorStop(1, "rgba(226,235,243,0.65)");
    ctx.fillStyle = snowBase;
    ctx.fillRect(0, 52, 64, 12);
    addSurfaceNoise(ctx, 18, 89);
    textures[7] = c;
  }

  return textures;
}

/**
 * Draw an articulated, realistically shaded Project I.G.I. military soldier
 * Supports 3 classes: 'guard' (Trooper), 'heavy' (Armored Juggernaut), 'sniper' (Marksman), 'officer' (Warlord HVT)
 * Includes walking stride animation, aimed rifle + muzzle flash, tactical vest/pouches, helmet/beret, and death fall!
 */
export function drawRealisticSoldier(ctx, sp, screenX, halfH, size, uniform, fogAlpha, fogRgb) {
  const isHeavy = sp.kind === "heavy";
  const isOfficer = sp.kind === "officer";
  const isSniper = sp.kind === "sniper";

  // Smooth collapse animation on death (0 = standing, 1 = fallen on floor)
  const fall = sp.deathAnim || 0;
  const fallScaleY = Math.max(0.18, 1 - fall * 0.78);
  const footY = halfH + size * 0.48;
  const effH = size * fallScaleY;
  const topY = footY - effH;
  const bodyW = size * (isHeavy ? 0.44 : 0.34);

  const stride = sp.alive ? Math.sin(sp.walkCycle || 0) * (size * 0.055) : 0;
  const aiming = sp.alive && sp.state === "combat";
  const flash = sp.hitFlash > 0;

  ctx.save();
  if (!sp.alive) {
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, fall - 0.55) * 1.4);
  }

  // Contact shadow on ground
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
  ctx.beginPath();
  ctx.ellipse(screenX, footY + size * 0.015, bodyW * (0.68 + fall * 0.6), Math.max(2, size * 0.065), 0, 0, Math.PI * 2);
  ctx.fill();

  if (fall > 0.6) {
    // Fallen silhouette on floor
    ctx.fillStyle = uniform.jacketShade;
    roundRectPath(ctx, screenX - bodyW * 0.9, footY - size * 0.12, bodyW * 1.8, size * 0.11, 4);
    ctx.fill();
    ctx.fillStyle = "#181B22";
    ctx.beginPath();
    ctx.arc(screenX - bodyW * 0.85, footY - size * 0.07, size * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 1. Tactical Boots & Articulated Camo Legs (animated stride!)
  const legTop = topY + effH * 0.54;
  const legH = effH * 0.44;
  const legW = bodyW * 0.34;

  // Left & Right Trousers
  ctx.fillStyle = flash ? "#FFFFFF" : isHeavy ? "#1E222B" : uniform.pants;
  roundRectPath(ctx, screenX - bodyW * 0.38, legTop + stride * 0.5, legW, legH * 0.82, 3);
  ctx.fill();
  roundRectPath(ctx, screenX + bodyW * 0.04, legTop - stride * 0.5, legW, legH * 0.82, 3);
  ctx.fill();

  // Tactical Knee Pads
  ctx.fillStyle = "#181C24";
  ctx.fillRect(screenX - bodyW * 0.35, legTop + legH * 0.36 + stride * 0.4, legW * 0.8, legH * 0.18);
  ctx.fillRect(screenX + bodyW * 0.07, legTop + legH * 0.36 - stride * 0.4, legW * 0.8, legH * 0.18);

  // Heavy Combat Boots
  ctx.fillStyle = "#0F1218";
  ctx.fillRect(screenX - bodyW * 0.4, footY - legH * 0.22 + Math.min(0, stride * 0.4), legW * 1.12, legH * 0.22);
  ctx.fillRect(screenX + bodyW * 0.03, footY - legH * 0.22 + Math.min(0, -stride * 0.4), legW * 1.12, legH * 0.22);

  // 2. Sculpted Camo Torso, Sleeves & Kevlar Plate Carrier
  const torsoTop = topY + effH * 0.2;
  const torsoH = effH * 0.38;

  // Sleeves / Shoulders
  ctx.fillStyle = flash ? "#FFFFFF" : isOfficer ? "#5A1A22" : isHeavy ? "#2B3240" : uniform.jacket;
  roundRectPath(ctx, screenX - bodyW * 0.62, torsoTop + effH * 0.02, bodyW * 1.24, torsoH * 0.82, size * 0.045);
  ctx.fill();

  // Heavy Ballistic Shoulder Pauldrons (Heavy & Officer)
  if (isHeavy || isOfficer) {
    ctx.fillStyle = isOfficer ? "#7F1D1D" : "#1F2937";
    roundRectPath(ctx, screenX - bodyW * 0.68, torsoTop, bodyW * 0.32, torsoH * 0.42, 4);
    ctx.fill();
    roundRectPath(ctx, screenX + bodyW * 0.36, torsoTop, bodyW * 0.32, torsoH * 0.42, 4);
    ctx.fill();
  }

  // Kevlar Tactical Vest / Chest Plate
  ctx.fillStyle = flash ? "#FFFFFF" : isHeavy ? "#181D26" : uniform.vest;
  roundRectPath(ctx, screenX - bodyW * 0.44, torsoTop + effH * 0.03, bodyW * 0.88, torsoH * 0.9, 4);
  ctx.fill();

  // Tactical Vest Magazine Pouches + Belt Buckle
  if (size > 38 && !flash) {
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    for (let p = -1; p <= 1; p++) {
      ctx.fillRect(screenX + p * bodyW * 0.24 - bodyW * 0.09, torsoTop + torsoH * 0.45, bodyW * 0.18, torsoH * 0.3);
    }
    ctx.fillStyle = "#111318";
    ctx.fillRect(screenX - bodyW * 0.45, torsoTop + torsoH * 0.84, bodyW * 0.9, torsoH * 0.14);
  }

  // 3. Human Neck, Head, Face/Balaclava & Military Helmet / Officer Beret
  const headR = size * (isHeavy ? 0.105 : 0.095);
  const headY = topY + effH * 0.115;

  // Neck
  ctx.fillStyle = uniform.skin;
  ctx.fillRect(screenX - headR * 0.42, headY + headR * 0.65, headR * 0.84, effH * 0.055);

  // Face / Tactical Balaclava
  ctx.fillStyle = flash ? "#FFFFFF" : isHeavy ? "#1F2937" : uniform.skin;
  ctx.beginPath();
  ctx.arc(screenX, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Combat Helmet / Sniper Hood / Red Officer Beret
  if (isOfficer) {
    // Classic Red Military Commander Beret
    ctx.fillStyle = "#B91C1C";
    ctx.beginPath();
    ctx.ellipse(screenX - headR * 0.1, headY - headR * 0.55, headR * 1.15, headR * 0.58, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(screenX + headR * 0.2, headY - headR * 0.65, headR * 0.25, headR * 0.25);
  } else {
    // Kevlar PASGT Military Helmet
    ctx.fillStyle = flash ? "#FFFFFF" : isSniper ? "#3B4A38" : isHeavy ? "#111827" : uniform.helmet;
    ctx.beginPath();
    ctx.arc(screenX, headY - headR * 0.12, headR * 1.12, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    // Helmet brim ridge
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(screenX - headR * 1.12, headY - headR * 0.16, headR * 2.24, Math.max(1.5, headR * 0.2));
  }

  // Tactical Goggles / Visor Eyes
  ctx.fillStyle = isHeavy
    ? aiming
      ? "#FF2E63"
      : "#FF8A1F"
    : isSniper
    ? "#34D399"
    : "#111827";
  ctx.fillRect(screenX - headR * 0.68, headY - headR * 0.06, headR * 0.55, headR * 0.34);
  ctx.fillRect(screenX + headR * 0.13, headY - headR * 0.06, headR * 0.55, headR * 0.34);

  // 4. Held Military Assault Rifle / LMG / Sniper + Blazing Muzzle Flash!
  const gunY = torsoTop + torsoH * (aiming ? 0.34 : 0.52);
  ctx.fillStyle = "#11141B";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = Math.max(1, size * 0.008);
  if (aiming) {
    // Rifle aimed directly forward at player!
    ctx.fillRect(screenX + bodyW * 0.12, gunY, bodyW * 0.56, size * 0.048);
    ctx.fillStyle = "#090B10";
    ctx.beginPath();
    ctx.arc(screenX + bodyW * 0.28, gunY + size * 0.024, Math.max(2, size * 0.03), 0, Math.PI * 2);
    ctx.fill();

    // Sniper / Officer Laser Sight Warning Dot
    if ((isSniper || isOfficer) && size > 24) {
      ctx.fillStyle = "rgba(255, 30, 66, 0.85)";
      ctx.beginPath();
      ctx.arc(screenX + bodyW * 0.28, gunY + size * 0.024, Math.max(2.5, size * 0.036), 0, Math.PI * 2);
      ctx.fill();
    }

    // Muzzle flash when enemy fires!
    if ((sp.muzzleFlash || 0) > 0.1) {
      const mR = Math.max(6, size * 0.16 * sp.muzzleFlash);
      const mg = ctx.createRadialGradient(
        screenX + bodyW * 0.28,
        gunY + size * 0.024,
        1,
        screenX + bodyW * 0.28,
        gunY + size * 0.024,
        mR
      );
      mg.addColorStop(0, "#FFFFFF");
      mg.addColorStop(0.35, "#FBBF24");
      mg.addColorStop(0.75, "rgba(249, 115, 22, 0.65)");
      mg.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(screenX + bodyW * 0.28, gunY + size * 0.024, mR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Patrol rifle carried diagonally across chest
    ctx.save();
    ctx.translate(screenX, gunY);
    ctx.rotate(-0.35);
    ctx.fillRect(-bodyW * 0.45, -size * 0.022, bodyW * 0.95, size * 0.044);
    ctx.restore();
  }

  // Subtle atmospheric distance fog tint over distant soldiers so they blend naturally into the world
  if (fogAlpha > 0.08) {
    ctx.fillStyle = `rgba(${fogRgb[0]}, ${fogRgb[1]}, ${fogRgb[2]}, ${Math.min(0.65, fogAlpha * 0.72)})`;
    ctx.fillRect(screenX - bodyW * 0.7, topY, bodyW * 1.4, effH);
  }

  // 5. Tactical Overhead Markers (HVT Tag, Alert "!", Health Bar)
  if (sp.alive) {
    if (isOfficer) {
      ctx.fillStyle = "#FF2E63";
      ctx.font = `700 ${Math.max(9, Math.min(13, Math.floor(size * 0.08)))}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("★ WARLORD HVT", screenX, topY - 18);
    } else if (aiming && sp.alertPop > 0) {
      ctx.fillStyle = "#FF2E63";
      ctx.font = `800 ${Math.max(11, Math.min(18, Math.floor(size * 0.12)))}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("!", screenX, topY - 12);
    }

    if (sp.hp < sp.maxHp) {
      const bw = Math.max(26, bodyW * 1.15);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(screenX - bw / 2, topY - 10, bw, 5);
      ctx.fillStyle = isOfficer ? "#FFC247" : isHeavy ? "#FF8A1F" : "#FF2E63";
      ctx.fillRect(screenX - bw / 2, topY - 10, bw * Math.max(0, sp.hp / sp.maxHp), 5);
    }
  }

  ctx.restore();
}

/**
 * Draw sculpted realistic first-person tactical weapons with gloved hands, sights, rails & muzzle flash
 */
export function drawFirstPersonWeapon(ctx, s, weapon, w, h) {
  const bobX = Math.cos(s.walkBob) * 7.5;
  const bobY =
    Math.abs(Math.sin(s.walkBob)) * 7.5 +
    s.recoil * 24 +
    (s.reloading > 0 ? Math.sin(s.reloading * 5) * 14 + 54 : 0) +
    (s.crouched ? 12 : 0);

  const gx = w * 0.67 + bobX;
  const gy = h - 104 + bobY;

  ctx.save();

  if (s.weaponId === 0) {
    // [1] SOCOM MK23 Silenced Tactical Pistol + Gloved Hand
    // Tactical Black Glove gripping pistol frame
    ctx.fillStyle = "#181B22";
    roundRectPath(ctx, gx - 24, gy + 26, 46, 86, 12);
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Matte Gunmetal Pistol Slide
    const slideGrad = ctx.createLinearGradient(gx - 22, gy - 20, gx + 22, gy + 30);
    slideGrad.addColorStop(0, "#3A4252");
    slideGrad.addColorStop(0.5, "#1E2430");
    slideGrad.addColorStop(1, "#0F131A");
    ctx.fillStyle = slideGrad;
    roundRectPath(ctx, gx - 18, gy - 14, 34, 62, 5);
    ctx.fill();
    ctx.strokeStyle = "#64748B";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Cylindrical Tactical Suppressor
    const supGrad = ctx.createLinearGradient(gx - 11, gy - 82, gx + 11, gy - 82);
    supGrad.addColorStop(0, "#11161F");
    supGrad.addColorStop(0.45, "#3B4454");
    supGrad.addColorStop(1, "#0B0E14");
    ctx.fillStyle = supGrad;
    roundRectPath(ctx, gx - 10, gy - 78, 18, 68, 4);
    ctx.fill();

    // Glowing Green Tritium Night Sights
    ctx.fillStyle = "#34D399";
    ctx.fillRect(gx - 12, gy - 11, 4, 4);
    ctx.fillRect(gx + 6, gy - 11, 4, 4);
    ctx.fillStyle = "#00D4FF";
    ctx.fillRect(gx - 3, gy - 76, 4, 3);
  } else if (s.weaponId === 1) {
    // [2] M4A1 Tactical Carbine with EOTech Holographic Sight & Picatinny Rail
    // Gloved Support Arm & Grip
    ctx.fillStyle = "#191E26";
    roundRectPath(ctx, gx - 38, gy + 32, 74, 92, 14);
    ctx.fill();

    // Upper & Lower Receiver
    const bodyG = ctx.createLinearGradient(gx - 32, gy - 20, gx + 32, gy + 45);
    bodyG.addColorStop(0, "#353E4E");
    bodyG.addColorStop(0.5, "#1D232E");
    bodyG.addColorStop(1, "#0E1219");
    ctx.fillStyle = bodyG;
    roundRectPath(ctx, gx - 28, gy - 12, 54, 78, 6);
    ctx.fill();

    // Quad-Rail Handguard & Fluted Barrel
    ctx.fillStyle = "#161B24";
    ctx.fillRect(gx - 15, gy - 86, 28, 76);
    ctx.fillStyle = "#0B0F16";
    ctx.fillRect(gx - 6, gy - 112, 10, 30);
    // Picatinny rail notches
    ctx.fillStyle = "#475569";
    for (let ry = gy - 80; ry < gy - 16; ry += 8) {
      ctx.fillRect(gx - 13, ry, 24, 2);
    }

    // EOTech Holographic Red-Dot Optic Housing
    ctx.fillStyle = "#0F141D";
    ctx.strokeStyle = "#64748B";
    ctx.lineWidth = 2;
    roundRectPath(ctx, gx - 18, gy - 32, 34, 24, 4);
    ctx.fill();
    ctx.stroke();
    // Red-dot glass aperture
    ctx.fillStyle = "rgba(0, 212, 255, 0.14)";
    ctx.fillRect(gx - 13, gy - 28, 24, 16);
    ctx.fillStyle = "#FF2E63";
    ctx.beginPath();
    ctx.arc(gx - 1, gy - 20, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // [3] Dragunov SVD Sniper Rifle (unscoped hip view)
    ctx.fillStyle = "#2E1F16"; // Wood/polymer stock accent
    roundRectPath(ctx, gx - 28, gy + 24, 52, 95, 10);
    ctx.fill();

    const recG = ctx.createLinearGradient(gx - 22, gy - 20, gx + 22, gy + 30);
    recG.addColorStop(0, "#374151");
    recG.addColorStop(1, "#111827");
    ctx.fillStyle = recG;
    roundRectPath(ctx, gx - 22, gy - 18, 42, 66, 5);
    ctx.fill();

    // Long sniper barrel + flash hider
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(gx - 7, gy - 122, 12, 108);
    ctx.fillStyle = "#475569";
    ctx.fillRect(gx - 9, gy - 126, 16, 8);

    // Mounted PSO-1 Optical Scope Tube
    ctx.fillStyle = "#1E293B";
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, gx - 13, gy - 58, 24, 46, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 212, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(gx - 1, gy - 15, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Realistic Starburst Muzzle Flash
  if (s.muzzleFlash > 0.15) {
    const tipY = s.weaponId === 2 ? gy - 128 : s.weaponId === 1 ? gy - 114 : gy - 82;
    const tipX = gx - 1;
    const flashR = (s.weaponId === 0 ? 18 : s.weaponId === 1 ? 34 : 44) * s.muzzleFlash;
    const fg = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, flashR);
    fg.addColorStop(0, "#FFFFFF");
    fg.addColorStop(0.35, s.weaponId === 0 ? "rgba(125,211,252,0.85)" : "rgba(254,240,138,0.95)");
    fg.addColorStop(0.7, s.weaponId === 0 ? "rgba(0,212,255,0.35)" : "rgba(249,115,22,0.7)");
    fg.addColorStop(1, "rgba(249,115,22,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(tipX, tipY, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
