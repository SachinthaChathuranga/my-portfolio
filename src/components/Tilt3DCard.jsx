import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

const canHover =
  typeof window !== "undefined" &&
  window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * Spring-physics 3D tilt container with a cursor-tracking color spotlight,
 * a glass glare sheen that slides across the surface, and a soft lift on hover.
 * Tilt is disabled on touch devices so scrolling stays smooth.
 */
export default function Tilt3DCard({
  children,
  className = "",
  maxTilt = 9,
  glowColor = "rgba(240, 18, 168, 0.28)",
  secondaryGlow = "rgba(0, 212, 255, 0.22)",
  onClick,
}) {
  const ref = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawLift = useMotionValue(1);
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);

  const spring = { stiffness: 180, damping: 20, mass: 0.6 };
  const rotateX = useSpring(rawX, spring);
  const rotateY = useSpring(rawY, spring);
  const scale = useSpring(rawLift, { stiffness: 260, damping: 24 });

  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${spotX}% ${spotY}%, ${glowColor}, ${secondaryGlow} 40%, transparent 70%)`;
  const glare = useMotionTemplate`linear-gradient(115deg, transparent calc(${spotX}% - 32%), rgba(255,255,255,0.13) ${spotX}%, transparent calc(${spotX}% + 32%))`;

  const handleMouseMove = (e) => {
    if (!canHover) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    rawX.set((0.5 - py) * maxTilt * 2);
    rawY.set((px - 0.5) * maxTilt * 2);
    spotX.set(px * 100);
    spotY.set(py * 100);
  };

  const handleMouseEnter = () => {
    if (canHover) rawLift.set(1.015);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    rawLift.set(1);
    spotX.set(50);
    spotY.set(50);
  };

  return (
    <div className="perspective-1200 h-full">
      <motion.div
        ref={ref}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d",
        }}
        className={`tilt-card group relative overflow-hidden rounded-3xl ${className}`}
      >
        {/* Cursor color spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: spotlight }}
        />
        {/* Glass glare sheen */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: glare }}
        />
        {children}
      </motion.div>
    </div>
  );
}
