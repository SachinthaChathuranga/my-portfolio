import React from "react";
import { motion } from "framer-motion";
import Tilt3DCard from "./Tilt3DCard";

const ACCENTS = {
  magenta: {
    border: "border-[#F012A8]/35",
    badge: "text-[#FF3CC7]",
    glow: "rgba(240, 18, 168, 0.3)",
    secondary: "rgba(160, 90, 255, 0.2)",
    chipHover: "hover:border-[#F012A8]/70 hover:bg-[#F012A8]/15",
  },
  cyan: {
    border: "border-[#00D4FF]/35",
    badge: "text-[#00D4FF]",
    glow: "rgba(0, 212, 255, 0.3)",
    secondary: "rgba(0, 123, 255, 0.2)",
    chipHover: "hover:border-[#00D4FF]/70 hover:bg-[#00D4FF]/15",
  },
  amber: {
    border: "border-[#FF8A1F]/35",
    badge: "text-[#FFC247]",
    glow: "rgba(255, 138, 31, 0.3)",
    secondary: "rgba(240, 18, 168, 0.2)",
    chipHover: "hover:border-[#FF8A1F]/70 hover:bg-[#FF8A1F]/15",
  },
};

export default function CapabilitiesSection({ skills = [] }) {
  const allItems = skills.flatMap((group) => group.items || []);
  const marqueeList = allItems.length ? [...allItems, ...allItems] : [];

  return (
    <section id="skills" className="relative z-10 overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#FFC247]">
            03 / Capabilities
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
            Tools & craft behind{" "}
            <span className="text-neon-gradient">every release.</span>
          </h2>
        </motion.div>

        {/* Three Sculptural 3D Discipline Bands */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {skills.map((group, idx) => {
            const palette =
              ACCENTS[group.accent] ||
              Object.values(ACCENTS)[idx % Object.values(ACCENTS).length];
            return (
              <motion.div
                key={group.id || group.category}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, delay: idx * 0.1 }}
              >
                <Tilt3DCard
                  maxTilt={8}
                  glowColor={palette.glow}
                  secondaryGlow={palette.secondary}
                  className={`glass-panel h-full border ${palette.border} p-7`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xs font-semibold ${palette.badge}`}>
                      0{idx + 1}
                    </span>
                    <span className="h-[1px] w-14 bg-white/15" />
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-bold text-white">
                    {group.category}
                  </h3>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {(group.items || []).map((skill) => (
                      <span
                        key={skill}
                        className={`rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 font-sans text-xs font-medium text-ink-primary transition-all duration-300 ${palette.chipHover}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Tilt3DCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Infinite Kinetic Typography Ribbon */}
      {marqueeList.length > 0 && (
        <div className="relative mt-20 border-y border-white/10 bg-white/[0.015] py-5">
          <div className="flex w-max animate-marquee items-center gap-10">
            {marqueeList.map((item, i) => (
              <div key={`${item}-${i}`} className="flex items-center gap-10">
                <span className="font-display text-2xl font-bold tracking-wide text-white/25 transition-colors hover:text-white sm:text-3xl">
                  {item}
                </span>
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#F012A8] to-[#00D4FF]" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
