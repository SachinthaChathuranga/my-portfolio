import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

/**
 * Spring-physics 3D tilt container with cursor-tracking neon corridor spotlight.
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
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);

  const rotateX = useSpring(rawX, { stiffness: 220, damping: 22, mass: 0.6 });
  const rotateY = useSpring(rawY, { stiffness: 220, damping: 22, mass: 0.6 });

  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${spotX}% ${spotY}%, ${glowColor}, ${secondaryGlow} 42%, transparent 72%)`;

  const handleMouseMove = (e) => {
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

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    spotX.set(50);
    spotY.set(50);
  };

  return (
    <div className="perspective-1200">
      <motion.div
        ref={ref}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`group relative overflow-hidden rounded-3xl transition-shadow duration-500 ${className}`}
      >
        {/* Dynamic cursor specular glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlight }}
        />
        {children}
      </motion.div>
    </div>
  );
}
