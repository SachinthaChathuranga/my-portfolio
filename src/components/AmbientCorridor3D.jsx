import React, { useEffect, useRef } from "react";

/**
 * Lightweight 60fps 3D perspective neon corridor & drifting bokeh canvas
 * tuned directly to the 3 graduation corridor portraits:
 * Left magenta wall (#F012A8), right electric cyan rim (#00D4FF), warm amber glow (#FF8A1F).
 */
export default function AmbientCorridor3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const palette = [
      { r: 240, g: 18, b: 168 }, // Neon Magenta
      { r: 0, g: 212, b: 255 },  // Electric Cyan
      { r: 255, g: 138, b: 31 }, // Corridor Amber
      { r: 160, g: 90, b: 255 }, // Velvet Violet
    ];

    const PARTICLE_COUNT = Math.min(72, Math.floor((width * height) / 22000));
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1000,
      z: Math.random() * 1200 + 80,
      size: Math.random() * 2.2 + 0.8,
      speed: Math.random() * 0.65 + 0.25,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const onPointerMove = (e) => {
      pointer.tx = (e.clientX / width - 0.5) * 2;
      pointer.ty = (e.clientY / height - 0.5) * 2;
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.008;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5 + pointer.x * 46;
      const cy = height * 0.48 + pointer.y * 30;

      // Subtle architectural 3D perspective corridor lines
      ctx.save();
      ctx.lineWidth = 1;
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + time * 0.06;
        const ex = cx + Math.cos(angle) * Math.max(width, height) * 0.9;
        const ey = cy + Math.sin(angle) * Math.max(width, height) * 0.9;
        const grad = ctx.createLinearGradient(cx, cy, ex, ey);
        const isLeft = Math.cos(angle) < 0;
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(
          0.45,
          isLeft ? "rgba(240, 18, 168, 0.055)" : "rgba(0, 212, 255, 0.055)"
        );
        grad.addColorStop(1, "rgba(255, 138, 31, 0.02)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // 3D depth frames drifting smoothly
      for (let f = 0; f < 4; f++) {
        const phase = ((time * 0.22 + f * 0.25) % 1);
        const scale = 0.08 + phase * phase * 1.35;
        const rw = width * 0.72 * scale;
        const rh = height * 0.62 * scale;
        const alpha = Math.sin(phase * Math.PI) * 0.085;

        const frameGrad = ctx.createLinearGradient(cx - rw / 2, cy, cx + rw / 2, cy);
        frameGrad.addColorStop(0, `rgba(240, 18, 168, ${alpha})`);
        frameGrad.addColorStop(0.5, `rgba(255, 138, 31, ${alpha * 0.65})`);
        frameGrad.addColorStop(1, `rgba(0, 212, 255, ${alpha})`);
        ctx.strokeStyle = frameGrad;
        ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
      }
      ctx.restore();

      // 3D starfield / corridor motes
      const fov = 420;
      for (const p of particles) {
        p.z -= p.speed;
        if (p.z <= 12) {
          p.z = 1200;
          p.x = (Math.random() - 0.5) * 1600;
          p.y = (Math.random() - 0.5) * 1000;
        }
        const scale = fov / p.z;
        const sx = cx + p.x * scale;
        const sy = cy + p.y * scale;
        if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) continue;

        const radius = Math.max(0.5, p.size * scale * 1.45);
        const opacity = Math.min(0.85, (1 - p.z / 1200) * 0.9);
        const { r, g, b } = p.color;

        ctx.beginPath();
        ctx.arc(sx, sy, radius * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.16})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Ambient Neon Corridor Lighting Pools */}
      <div
        className="absolute -left-[18%] top-[-10%] h-[68vh] w-[52vw] rounded-full opacity-30 blur-[140px] animate-pulse-glow"
        style={{ background: "radial-gradient(circle, #F012A8 0%, transparent 70%)" }}
      />
      <div
        className="absolute -right-[16%] top-[12%] h-[64vh] w-[48vw] rounded-full opacity-25 blur-[140px] animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, #00A3FF 0%, transparent 70%)",
          animationDelay: "1.4s",
        }}
      />
      <div
        className="absolute bottom-[-18%] left-[28%] h-[48vh] w-[44vw] rounded-full opacity-20 blur-[140px]"
        style={{ background: "radial-gradient(circle, #FF8A1F 0%, transparent 72%)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="noise-overlay absolute inset-0 opacity-25" />
    </div>
  );
}
