/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: {
          950: "#06040D",
          900: "#0B0716",
          800: "#120D24",
          700: "#1B1433",
        },
        neon: {
          magenta: "#F012A8",
          pink: "#FF3CC7",
          cyan: "#00D4FF",
          cobalt: "#007BFF",
          amber: "#FF8A1F",
          gold: "#FFC247",
          crimson: "#D61F48",
        },
        ink: {
          primary: "#F8F6FF",
          secondary: "#C4BFE0",
          muted: "#8B84AB",
        },
      },
      fontFamily: {
        display: ["Syne", "Space Grotesk", "sans-serif"],
        heading: ["Space Grotesk", "Plus Jakarta Sans", "sans-serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        serif: ["Instrument Serif", "Times New Roman", "serif"],
      },
      boxShadow: {
        "neon-magenta": "0 0 40px -8px rgba(240, 18, 168, 0.55)",
        "neon-cyan": "0 0 40px -8px rgba(0, 212, 255, 0.5)",
        "neon-amber": "0 0 40px -8px rgba(255, 138, 31, 0.45)",
        "glass-3d": "0 24px 60px -15px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      animation: {
        "float-slow": "floatSlow 7s ease-in-out infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        "marquee": "marquee 32s linear infinite",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.95" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".scrollbar-hide::-webkit-scrollbar": {
          display: "none",
        },
        ".perspective-1200": {
          perspective: "1200px",
        },
        ".preserve-3d": {
          "transform-style": "preserve-3d",
        },
      });
    },
  ],
};
