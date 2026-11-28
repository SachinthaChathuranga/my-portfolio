import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/** Hairline gradient reading-progress bar pinned to the top edge. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden="true"
      style={{
        scaleX,
        transformOrigin: "0% 50%",
        background: "linear-gradient(90deg, #F012A8 0%, #FF8A1F 50%, #00D4FF 100%)",
        boxShadow: "0 0 12px rgba(0, 212, 255, 0.6)",
      }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px]"
    />
  );
}
