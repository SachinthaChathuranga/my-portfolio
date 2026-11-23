import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDownRight, Sparkles, ArrowRight } from "lucide-react";
import Tilt3DCard from "./Tilt3DCard";
import { assetUrl } from "../utils/portfolioApi";

export default function HeroSection({ profile }) {
  const roles = profile?.roles?.length
    ? profile.roles
    : ["Full-Stack Developer", "UI/UX Designer", "Mobile App Developer"];

  const portraitGallery = [
    {
      src: assetUrl(profile?.portraits?.hero || "images/portraits/hero-corridor.png"),
      label: "01 — Corridor Edition",
    },
    {
      src: assetUrl(profile?.portraits?.contact || "images/portraits/scroll-portrait.png"),
      label: "02 — Ceremonial Scroll",
    },
    {
      src: assetUrl(profile?.portraits?.about || "images/portraits/vertical-portrait.png"),
      label: "03 — Neon Portrait",
    },
  ];

  const [roleIdx, setRoleIdx] = useState(0);
  const [activeShot, setActiveShot] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 70, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 70, damping: 20 });

  const bgShiftX = useTransform(smoothX, [-1, 1], [18, -18]);
  const bgShiftY = useTransform(smoothY, [-1, 1], [12, -12]);
  const ringShiftX = useTransform(smoothX, [-1, 1], [-24, 24]);
  const ringShiftY = useTransform(smoothY, [-1, 1], [-18, 18]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [roles.length]);

  const handlePointerMove = (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(nx);
    mouseY.set(ny);
  };

  return (
    <section
      id="top"
      onPointerMove={handlePointerMove}
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24"
    >
      {/* Full-bleed subtle parallax corridor atmosphere derived from hero portrait */}
      <motion.div
        style={{ x: bgShiftX, y: bgShiftY }}
        className="pointer-events-none absolute inset-[-4%] z-0 opacity-25"
      >
        <img
          src={portraitGallery[0].src}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center blur-[2px] saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06040D]/80 via-[#06040D]/75 to-[#06040D]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06040D] via-[#06040D]/65 to-[#06040D]/85" />
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Editorial Typography Stage */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3CC7] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF3CC7]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-secondary">
              {profile?.availability || "Available for creative engineering"}
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00D4FF]"
          >
            Portfolio • {new Date().getFullYear()} Edition
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-6xl xl:text-[4.4rem]"
          >
            <span className="block">{profile?.firstName || "Sachintha"}</span>
            <span className="block text-neon-gradient">
              {profile?.lastName || "Chathuranga"}
            </span>
          </motion.h1>

          {/* Animated Role Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-6 flex h-10 items-center gap-3"
          >
            <span className="h-[1px] w-10 bg-gradient-to-r from-[#F012A8] to-[#00D4FF]" />
            <div className="relative h-8 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={roles[roleIdx]}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -24, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="block font-heading text-lg font-semibold tracking-wide text-white sm:text-xl"
                >
                  {roles[roleIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg"
          >
            {profile?.headline ||
              "Crafting bold digital products, 3D-inspired interfaces & scalable software."}
          </motion.p>

          {/* Editorial CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <a
              href="#work"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 font-heading text-sm font-semibold tracking-wide text-white shadow-neon-magenta transition-transform duration-300 hover:scale-[1.03]"
              style={{
                background:
                  "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
              }}
            >
              <span>Explore Selected Work</span>
              <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </a>

            <a
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 font-heading text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-[#FF8A1F]/70 hover:bg-[#FF8A1F]/10 hover:text-[#FFC247]"
            >
              <span>Start a Conversation</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>

        {/* Right Interactive 3D Depth Portrait Sculpture */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:col-span-5"
        >
          {/* Floating 3D Neon Halo Rings behind portrait */}
          <motion.div
            style={{ x: ringShiftX, y: ringShiftY }}
            className="pointer-events-none absolute -inset-6 -z-10"
          >
            <div className="absolute -left-6 top-8 h-48 w-48 rounded-full bg-[#F012A8]/35 blur-[70px]" />
            <div className="absolute -right-6 bottom-10 h-52 w-52 rounded-full bg-[#00D4FF]/35 blur-[75px]" />
            <div className="absolute bottom-2 left-1/3 h-36 w-36 rounded-full bg-[#FF8A1F]/30 blur-[65px]" />
            <div className="absolute inset-4 rounded-[36px] border border-[#F012A8]/20 rotate-3" />
            <div className="absolute inset-4 rounded-[36px] border border-[#00D4FF]/20 -rotate-3" />
          </motion.div>

          <Tilt3DCard
            maxTilt={11}
            glowColor="rgba(240, 18, 168, 0.35)"
            secondaryGlow="rgba(0, 212, 255, 0.25)"
            className="neon-corridor-frame glass-panel p-2.5 shadow-glass-3d"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-void-900">
              <AnimatePresence mode="wait">
                <motion.img
                  key={portraitGallery[activeShot].src}
                  src={portraitGallery[activeShot].src}
                  alt={profile?.fullName || "Sachintha Chathuranga"}
                  initial={{ opacity: 0, scale: 1.07 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full object-cover object-top"
                />
              </AnimatePresence>

              {/* Soft photographic edge vignette */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D]/90 via-transparent to-[#06040D]/20" />

              {/* Floating Editorial Caption inside 3D plane */}
              <div
                className="absolute inset-x-4 bottom-4 z-20 flex items-end justify-between gap-3 rounded-2xl border border-white/10 bg-[#06040D]/70 px-4 py-3 backdrop-blur-md"
                style={{ transform: "translateZ(36px)" }}
              >
                <div>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#FFC247]">
                    <Sparkles className="h-3 w-3" />
                    <span>{portraitGallery[activeShot].label}</span>
                  </p>
                  <p className="mt-0.5 font-heading text-sm font-semibold text-white">
                    BSc (Hons) Computer Science
                  </p>
                </div>

                {/* Portrait switcher dots */}
                <div className="flex items-center gap-1.5">
                  {portraitGallery.map((shot, idx) => (
                    <button
                      key={shot.label}
                      type="button"
                      onClick={() => setActiveShot(idx)}
                      aria-label={`View portrait ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeShot === idx
                          ? "w-6 bg-gradient-to-r from-[#F012A8] to-[#00D4FF]"
                          : "w-2 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Tilt3DCard>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ink-muted transition-colors hover:text-white sm:flex"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          Scroll
        </span>
        <span className="h-9 w-[1px] bg-gradient-to-b from-[#F012A8] via-[#00D4FF] to-transparent" />
      </motion.a>
    </section>
  );
}
