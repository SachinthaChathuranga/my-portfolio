import React, { useState } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import { Send, Check, Copy, Mail, Phone, MapPin, Sparkles } from "lucide-react";
import {
  FaGithub,
  FaLinkedinIn,
  FaInstagram,
  FaFacebookF,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";
import { assetUrl } from "../utils/portfolioApi";
import { getActiveSocials } from "../utils/socials";

const CONTACT_SOCIAL_ICONS = {
  github: FaGithub,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  facebook: FaFacebookF,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

export default function ContactSection({ profile }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    desc: "",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [copied, setCopied] = useState(false);

  const portraitSrc = assetUrl(
    profile?.portraits?.contact || "images/portraits/scroll-portrait.png"
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const copyEmail = () => {
    const email = profile?.email || "smschathu1234@gmail.com";
    navigator.clipboard?.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus({ type: "", text: "" });

    const serviceId = profile?.emailjs?.serviceId || "service_ayccxmc";
    const templateId = profile?.emailjs?.templateId || "template_z8relid";
    const publicKey = profile?.emailjs?.publicKey || "ErooJ7sWSFqBZCdv3";

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.desc,
          phone: formData.phone,
        },
        publicKey
      );
      setStatus({
        type: "success",
        text: "Message sent! Thank you for reaching out — I'll respond shortly.",
      });
      setFormData({ name: "", email: "", phone: "", subject: "", desc: "" });
    } catch {
      setStatus({
        type: "error",
        text: "Could not deliver right now. Feel free to email me directly!",
      });
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-white placeholder-ink-muted/80 outline-none transition-all duration-300 focus:border-[#00D4FF]/70 focus:bg-white/[0.06] focus:shadow-[0_0_24px_rgba(0,212,255,0.18)]";

  return (
    <section id="contact" className="relative z-10 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="neon-corridor-frame glass-panel overflow-hidden rounded-[32px]">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Atmospheric Portrait + Direct Contact */}
            <div className="relative flex flex-col justify-between overflow-hidden p-8 sm:p-11 lg:col-span-5">
              <img
                src={portraitSrc}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06040D] via-[#06040D]/80 to-[#06040D]/60" />

              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.26em] text-[#FFC247]">
                  <Sparkles className="h-3.5 w-3.5" />
                  05 / Contact
                </p>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Let&apos;s build something{" "}
                  <span className="text-neon-gradient">memorable.</span>
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                  Have a web platform, mobile app, UI/UX redesign, or creative
                  direction in mind? Drop a message and let&apos;s bring it to life.
                </p>
              </div>

              <div className="relative z-10 mt-10 space-y-3.5">
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-black/45 px-4 py-3 text-left backdrop-blur-md transition hover:border-[#F012A8]/60"
                >
                  <span className="flex items-center gap-3 text-sm text-white">
                    <Mail className="h-4 w-4 text-[#FF3CC7]" />
                    <span className="truncate">
                      {profile?.email || "smschathu1234@gmail.com"}
                    </span>
                  </span>
                  {copied ? (
                    <Check className="h-4 w-4 shrink-0 text-[#00D4FF]" />
                  ) : (
                    <Copy className="h-4 w-4 shrink-0 text-ink-muted" />
                  )}
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-ink-secondary backdrop-blur-md">
                  <Phone className="h-4 w-4 text-[#00D4FF]" />
                  <span>{profile?.phone || "+94 76 686 2420"}</span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-ink-secondary backdrop-blur-md">
                  <MapPin className="h-4 w-4 text-[#FFC247]" />
                  <span>{profile?.location || "Madampe, Chilaw, Sri Lanka"}</span>
                </div>

                {/* Ordered Social Links */}
                {getActiveSocials(profile).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {getActiveSocials(profile).map((s) => {
                      const Icon = CONTACT_SOCIAL_ICONS[s.key] || FaGithub;
                      return (
                        <a
                          key={s.key}
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          title={s.label}
                          aria-label={s.label}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-xs font-medium text-ink-secondary backdrop-blur-md transition hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/15 hover:text-white"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{s.label}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Interactive Message Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65 }}
              onSubmit={handleSubmit}
              className="p-8 sm:p-11 lg:col-span-7"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your Name"
                  required
                  className={inputClass}
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  required
                  className={inputClass}
                />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  required
                  className={inputClass}
                />
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Project / Subject"
                  required
                  className={inputClass}
                />
              </div>

              <textarea
                name="desc"
                value={formData.desc}
                onChange={handleChange}
                placeholder="Tell me about your project, goals, or timeline..."
                rows={5}
                required
                className={`${inputClass} mt-4 resize-none`}
              />

              <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 font-heading text-sm font-semibold text-white shadow-neon-magenta transition-transform duration-300 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    background:
                      "linear-gradient(110deg, #F012A8 0%, #9E1EFF 48%, #0099FF 100%)",
                  }}
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? "Sending..." : "Send Message"}</span>
                </button>

                {status.text && (
                  <p
                    className={`text-xs font-medium ${
                      status.type === "success"
                        ? "text-[#00D4FF]"
                        : "text-[#FF6B8B]"
                    }`}
                  >
                    {status.text}
                  </p>
                )}
              </div>
            </motion.form>
          </div>
        </div>
      </div>
    </section>
  );
}
