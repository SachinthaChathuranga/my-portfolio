import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, GraduationCap, CheckCircle2, Mail, Phone } from "lucide-react";

export default function JourneySection({
  experience = [],
  education = [],
  references = [],
  showReferences = true,
}) {
  const [tab, setTab] = useState("experience");
  const visibleReferences = showReferences
    ? (references || []).filter((r) => r.isPublic !== false)
    : [];

  return (
    <section id="journey" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#FF3CC7]">
            04 / Career & Education
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-5xl">
            Experience & <span className="text-magenta-cyan">Milestones</span>
          </h2>

          {/* Editorial Switcher */}
          <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
            {[
              { id: "experience", label: "Work & Volunteering", icon: Briefcase },
              { id: "education", label: "Education", icon: GraduationCap },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition sm:text-sm ${
                    active ? "text-white" : "text-ink-muted hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="journey-tab-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{
                        background:
                          "linear-gradient(110deg, rgba(240,18,168,0.65), rgba(0,153,255,0.65))",
                      }}
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Vertical Neon Corridor Spine */}
        <div className="relative mt-16">
          <div
            className="absolute left-5 top-0 bottom-0 w-[2px] sm:left-1/2 sm:-translate-x-1/2"
            style={{
              background:
                "linear-gradient(180deg, #F012A8 0%, #00D4FF 52%, #FF8A1F 100%)",
              boxShadow: "0 0 18px rgba(0, 212, 255, 0.45)",
            }}
          />

          <AnimatePresence mode="wait">
            {tab === "experience" ? (
              <motion.div
                key="exp-list"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                className="space-y-12"
              >
                {experience.map((exp, idx) => {
                  const isLeft = idx % 2 === 0;
                  return (
                    <div
                      key={exp.id || exp.role}
                      className={`relative flex flex-col sm:flex-row ${
                        isLeft ? "sm:justify-start" : "sm:justify-end"
                      }`}
                    >
                      <div className="absolute left-5 top-6 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/25 bg-[#0B0716] shadow-neon-magenta sm:left-1/2">
                        <Briefcase className="h-4 w-4 text-[#FF3CC7]" />
                      </div>

                      <div
                        className={`ml-14 sm:ml-0 sm:w-[46%] ${
                          isLeft ? "sm:pr-6" : "sm:pl-6"
                        }`}
                      >
                        <div className="neon-corridor-frame glass-panel rounded-3xl p-6 sm:p-7">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC247]">
                              {exp.period}
                            </span>
                            {exp.type && (
                              <span className="rounded-full border border-[#00D4FF]/35 bg-[#00D4FF]/12 px-2.5 py-0.5 font-mono text-[10px] text-[#7EE8FF]">
                                {exp.type}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 font-display text-xl font-bold text-white">
                            {exp.role}
                          </h3>
                          <p className="mt-1 font-heading text-sm font-medium text-[#00D4FF]">
                            {exp.company}
                          </p>
                          {exp.highlights?.length > 0 && (
                            <ul className="mt-4 space-y-2">
                              {exp.highlights.map((line) => (
                                <li
                                  key={line}
                                  className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary sm:text-sm"
                                >
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF3CC7]" />
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="edu-list"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
                className="space-y-12"
              >
                {education.map((edu, idx) => {
                  const isLeft = idx % 2 === 0;
                  return (
                    <div
                      key={edu.id || edu.degree}
                      className={`relative flex flex-col sm:flex-row ${
                        isLeft ? "sm:justify-start" : "sm:justify-end"
                      }`}
                    >
                      <div className="absolute left-5 top-6 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/25 bg-[#0B0716] shadow-neon-cyan sm:left-1/2">
                        <GraduationCap className="h-4 w-4 text-[#00D4FF]" />
                      </div>

                      <div
                        className={`ml-14 sm:ml-0 sm:w-[46%] ${
                          isLeft ? "sm:pr-6" : "sm:pl-6"
                        }`}
                      >
                        <div className="neon-corridor-frame glass-panel rounded-3xl p-6 sm:p-7">
                          <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC247]">
                            {edu.period}
                          </span>
                          <h3 className="mt-2 font-display text-xl font-bold text-white">
                            {edu.degree}
                          </h3>
                          <p className="mt-1 font-heading text-sm font-medium text-[#00D4FF]">
                            {edu.institution}
                          </p>
                          {edu.highlight && (
                            <p className="mt-3 inline-block rounded-full border border-[#F012A8]/35 bg-[#F012A8]/12 px-3 py-1 font-mono text-xs text-[#FF8DE0]">
                              {edu.highlight}
                            </p>
                          )}
                          {edu.details && (
                            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                              {edu.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle Editorial Referees Row */}
        {visibleReferences.length > 0 && (
          <div className="mt-20 border-t border-white/10 pt-10">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.26em] text-ink-muted">
              Academic & Industry References
            </p>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {visibleReferences.map((ref) => (
                <div
                  key={ref.id || ref.name}
                  className="glass-panel rounded-2xl p-5"
                >
                  <h4 className="font-heading text-base font-bold text-white">
                    {ref.name}
                  </h4>
                  <p className="mt-0.5 text-xs font-medium text-[#00D4FF]">
                    {ref.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ref.organization}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] text-ink-secondary">
                    {ref.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-[#FF3CC7]" />
                        {ref.email}
                      </span>
                    )}
                    {ref.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-[#FFC247]" />
                        {ref.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
