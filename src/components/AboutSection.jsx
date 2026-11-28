import React from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Languages,
} from "lucide-react";
import {
  FaGithub,
  FaLinkedinIn,
  FaInstagram,
  FaFacebookF,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";
import Tilt3DCard from "./Tilt3DCard";
import { assetUrl } from "../utils/portfolioApi";
import { getActiveSocials } from "../utils/socials";

const SOCIAL_ICONS = {
  github: FaGithub,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  facebook: FaFacebookF,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

export default function AboutSection({ profile }) {
  const portraitSrc = assetUrl(
    profile?.portraits?.about || "images/portraits/vertical-portrait.png"
  );

  const facts = [
    {
      icon: GraduationCap,
      label: "Identity",
      value: profile?.fullName || "S.M. Sachintha Chathuranga",
    },
    {
      icon: Briefcase,
      label: "Current Role",
      value: profile?.availability || "Associate Software Engineer @ INTTEQ",
    },
    {
      icon: MapPin,
      label: "Based In",
      value: profile?.location || "Madampe, Chilaw, Sri Lanka",
    },
    {
      icon: Mail,
      label: "Email",
      value: profile?.email || "smschathu1234@gmail.com",
    },
    {
      icon: Phone,
      label: "Phone",
      value: profile?.phone || "+94 76 686 2420",
    },
    {
      icon: Languages,
      label: "Languages",
      value: (profile?.languages || ["Sinhala", "English"]).join(" • "),
    },
  ];

  const socials = getActiveSocials(profile).map((s) => ({
    ...s,
    icon: SOCIAL_ICONS[s.key] || FaGithub,
  }));

  return (
    <section id="about" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Sculptural Vertical Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5"
          >
            <Tilt3DCard
              maxTilt={8}
              glowColor="rgba(255, 138, 31, 0.3)"
              secondaryGlow="rgba(240, 18, 168, 0.25)"
              className="neon-corridor-frame glass-panel p-2.5"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-void-900">
                <img
                  src={portraitSrc}
                  alt={profile?.fullName || "S.M. Sachintha Chathuranga"}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D]/80 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF3CC7]">
                    BSc (Hons) CS • UOJ
                  </span>
                  <span className="rounded-full border border-white/15 bg-black/50 px-3 py-1 font-mono text-[10px] text-ink-secondary backdrop-blur-md">
                    SL • GMT+5:30
                  </span>
                </div>
              </div>
            </Tilt3DCard>
          </motion.div>

          {/* Editorial Bio & Personal Facts */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#FF3CC7]">
              01 / About Me
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              Where software engineering meets{" "}
              <span className="text-magenta-cyan">cinematic design.</span>
            </h2>

            <p className="mt-6 text-base leading-relaxed text-ink-secondary sm:text-lg">
              {profile?.bio}
            </p>

            {/* Clean Typographic Detail Rows */}
            <div className="mt-9 divide-y divide-white/10 border-y border-white/10">
              {facts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div
                    key={fact.label}
                    className="flex flex-col justify-between gap-1 py-3.5 sm:flex-row sm:items-center"
                  >
                    <span className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
                      <Icon className="h-3.5 w-3.5 text-[#00D4FF]" />
                      {fact.label}
                    </span>
                    <span className="font-sans text-sm font-medium text-white sm:text-base">
                      {fact.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Social Presence */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {socials.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-ink-secondary transition-all duration-300 hover:border-[#F012A8]/60 hover:bg-[#F012A8]/15 hover:text-white hover:shadow-neon-magenta"
                  >
                    <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
