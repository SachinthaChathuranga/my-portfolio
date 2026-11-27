/**
 * High-Resolution (128x128) Procedural Military WebGL Texture Generator
 * Produces realistic weathered surfaces for Jungle, Desert, Arctic, Urban & Midnight Fortress theaters.
 */

const SIZE = 128;

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

function addGrain(ctx, strength, seed) {
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (hash(i * 0.13 + seed) - 0.5) * strength;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function uploadTexture(gl, canvas) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

export function createVanguardTextures(gl) {
  const bank = {};

  // 1. Concrete Bunker Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#7D838B";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#5B6068";
    ctx.fillRect(0, 40, SIZE, 3);
    ctx.fillRect(0, 84, SIZE, 3);
    ctx.fillRect(62, 0, 3, 40);
    ctx.fillRect(28, 43, 3, 41);
    ctx.fillRect(96, 43, 3, 41);
    ctx.fillRect(58, 87, 3, 41);
    ctx.fillStyle = "#41464E";
    for (let x = 14; x < SIZE; x += 28) {
      ctx.fillRect(x, 18, 4, 4);
      ctx.fillRect(x, 62, 4, 4);
    }
    const g = ctx.createLinearGradient(0, 96, 0, SIZE);
    g.addColorStop(0, "rgba(25,28,24,0)");
    g.addColorStop(1, "rgba(22,25,22,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 96, SIZE, 32);
    addGrain(ctx, 24, 1);
    bank.concrete = uploadTexture(gl, c);
  }

  // 2. Jungle Outpost Wood Planks
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    for (let y = 0; y < SIZE; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? "#6C4D35" : "#5E422D";
      ctx.fillRect(0, y, SIZE, 15);
      ctx.fillStyle = "#3B281A";
      ctx.fillRect(0, y + 15, SIZE, 1);
      ctx.fillStyle = "rgba(35,20,10,0.22)";
      ctx.fillRect(0, y + 4, SIZE, 2);
      ctx.fillRect(0, y + 10, SIZE, 1);
    }
    // Vertical timber frame beam
    ctx.fillStyle = "#4A3322";
    ctx.fillRect(0, 0, 10, SIZE);
    ctx.fillRect(SIZE - 10, 0, 10, SIZE);
    addGrain(ctx, 20, 7);
    bank.woodPlank = uploadTexture(gl, c);
  }

  // 3. Desert Weathered Sandstone / Plaster
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#C9A679";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(140, 98, 56, 0.25)";
    for (let y = 0; y < SIZE; y += 22) {
      ctx.fillRect(0, y, SIZE, 2);
      const off = (y / 22) % 2 === 0 ? 0 : 24;
      for (let x = off; x < SIZE; x += 48) {
        ctx.fillRect(x, y, 2, 22);
      }
    }
    const grime = ctx.createLinearGradient(0, 92, 0, SIZE);
    grime.addColorStop(0, "rgba(110,72,38,0)");
    grime.addColorStop(1, "rgba(92,58,28,0.45)");
    ctx.fillStyle = grime;
    ctx.fillRect(0, 92, SIZE, 36);
    addGrain(ctx, 26, 13);
    bank.sandstone = uploadTexture(gl, c);
  }

  // 4. European Red Brick (War-Torn City)
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#524B47"; // Mortar
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let row = 0; row < 8; row++) {
      const y = row * 16;
      const offset = row % 2 === 0 ? 0 : -16;
      for (let col = 0; col < 5; col++) {
        const x = col * 32 + offset;
        const shade = Math.floor(hash(row * 17 + col * 31) * 32);
        ctx.fillStyle = `rgb(${128 + shade}, ${58 + Math.floor(shade * 0.5)}, ${46 + Math.floor(shade * 0.4)})`;
        ctx.fillRect(x + 2, y + 2, 28, 12);
      }
    }
    addGrain(ctx, 24, 19);
    bank.brick = uploadTexture(gl, c);
  }

  // 5. Corrugated Military Steel Hangar / Container
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    for (let x = 0; x < SIZE; x += 8) {
      ctx.fillStyle = "#485B69";
      ctx.fillRect(x, 0, 4, SIZE);
      ctx.fillStyle = "#2E3D48";
      ctx.fillRect(x + 4, 0, 4, SIZE);
    }
    ctx.fillStyle = "#232F38";
    ctx.fillRect(0, 0, SIZE, 9);
    ctx.fillRect(0, 60, SIZE, 8);
    ctx.fillRect(0, SIZE - 10, SIZE, 10);
    ctx.fillStyle = "#8A9FAD";
    for (let x = 6; x < SIZE; x += 16) {
      ctx.fillRect(x, 3, 3, 3);
      ctx.fillRect(x, 62, 3, 3);
    }
    addGrain(ctx, 16, 29);
    bank.corrugated = uploadTexture(gl, c);
  }

  // 6. Frosted Arctic Concrete Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#8897A6";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#E6EFF7";
    ctx.fillRect(0, 0, SIZE, 18);
    for (let x = 0; x < SIZE; x += 12) {
      ctx.fillRect(x, 18, 7, 5 + (x % 7));
    }
    ctx.fillStyle = "#627180";
    ctx.fillRect(0, 62, SIZE, 3);
    ctx.fillRect(62, 20, 3, 42);
    const baseSnow = ctx.createLinearGradient(0, 96, 0, SIZE);
    baseSnow.addColorStop(0, "rgba(235,244,252,0)");
    baseSnow.addColorStop(1, "rgba(235,244,252,0.75)");
    ctx.fillStyle = baseSnow;
    ctx.fillRect(0, 96, SIZE, 32);
    addGrain(ctx, 18, 37);
    bank.arcticWall = uploadTexture(gl, c);
  }

  // 7. Jungle Perimeter Bamboo / Mossy Stone Wall
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#3E4B37";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let x = 0; x < SIZE; x += 10) {
      ctx.fillStyle = x % 20 === 0 ? "#4D5C3F" : "#35422E";
      ctx.fillRect(x, 0, 8, SIZE);
    }
    ctx.fillStyle = "#2A3324";
    ctx.fillRect(0, 28, SIZE, 6);
    ctx.fillRect(0, 92, SIZE, 6);
    addGrain(ctx, 26, 43);
    bank.jungleWall = uploadTexture(gl, c);
  }

  // 8. Ground Textures (Jungle / Desert / Snow / Asphalt)
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#384A2E";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#4C5E39" : i % 3 === 1 ? "#2E3A24" : "#4A3E2D";
      ctx.fillRect(hash(i * 3.1) * SIZE, hash(i * 7.7) * SIZE, 6, 4);
    }
    addGrain(ctx, 28, 51);
    bank.jungleGround = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#B99568";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(130,90,48,0.22)";
    for (let y = 0; y < SIZE; y += 14) {
      ctx.fillRect(0, y, SIZE, 3);
    }
    addGrain(ctx, 24, 57);
    bank.desertSand = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#D4E0EC";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "rgba(120,145,175,0.24)";
    for (let i = 0; i < 65; i++) {
      ctx.fillRect(hash(i * 5.2) * SIZE, hash(i * 9.3) * SIZE, 14, 5);
    }
    addGrain(ctx, 18, 63);
    bank.snowGround = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#353A44";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "rgba(18,20,24,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(38, 64);
    ctx.lineTo(22, SIZE);
    ctx.stroke();
    addGrain(ctx, 26, 69);
    bank.asphalt = uploadTexture(gl, c);
  }

  // 9. Indoor Floors (Tile & Wood Floor)
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#4B525C";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 32) {
      for (let x = 0; x < SIZE; x += 32) {
        ctx.fillStyle = ((x + y) / 32) % 2 === 0 ? "#69727E" : "#5A636E";
        ctx.fillRect(x + 1, y + 1, 30, 30);
      }
    }
    addGrain(ctx, 12, 73);
    bank.tile = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    for (let x = 0; x < SIZE; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? "#6B4E37" : "#5D422E";
      ctx.fillRect(x, 0, 15, SIZE);
      ctx.fillStyle = "#3B281B";
      ctx.fillRect(x + 15, 0, 1, SIZE);
    }
    addGrain(ctx, 16, 79);
    bank.woodFloor = uploadTexture(gl, c);
  }

  // 10. Military Crate, Sandbags, Steel Door & Explosive Barrel
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#4D5B3E";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "#29331F";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(SIZE - 8, SIZE - 8);
    ctx.moveTo(SIZE - 8, 8);
    ctx.lineTo(8, SIZE - 8);
    ctx.stroke();
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(42, 54, 44, 18);
    addGrain(ctx, 18, 83);
    bank.crate = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#8C7B60";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "#5B4E3B";
    ctx.lineWidth = 4;
    for (let y = 0; y < SIZE; y += 26) {
      const off = (y / 26) % 2 === 0 ? 0 : 24;
      for (let x = -24 + off; x < SIZE; x += 56) {
        ctx.fillStyle = "#9C8A6D";
        ctx.fillRect(x + 3, y + 3, 50, 20);
        ctx.strokeRect(x + 3, y + 3, 50, 20);
      }
    }
    addGrain(ctx, 22, 89);
    bank.sandbags = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#3A4452";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "#1E2530";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, SIZE - 8, SIZE - 8);
    ctx.fillStyle = "#262F3B";
    ctx.fillRect(16, 16, SIZE - 32, 42);
    ctx.fillRect(16, 68, SIZE - 32, 44);
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(SIZE - 26, 60, 12, 8);
    addGrain(ctx, 14, 97);
    bank.door = uploadTexture(gl, c);
  }
  {
    const c = makeCanvas();
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#B91C1C";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#FACC15";
    ctx.fillRect(0, 42, SIZE, 26);
    ctx.fillStyle = "#18181B";
    ctx.fillRect(0, 40, SIZE, 4);
    ctx.fillRect(0, 68, SIZE, 4);
    ctx.fillRect(0, 18, SIZE, 5);
    ctx.fillRect(0, 102, SIZE, 5);
    addGrain(ctx, 18, 103);
    bank.barrel = uploadTexture(gl, c);
  }

  return bank;
}
