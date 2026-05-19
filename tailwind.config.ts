import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#111113",
        ink: "#181619",
        ember: "#ff8a3d",
        peach: "#ffc097",
        plasma: "#ff3d9a",
        acid: "#e8ff6d",
        // SOMA — deep aubergine agent experience palette
        soma: {
          void: "#0B0A0E",
          deep: "#0F0C17",
          base: "#130E1A",
          card: "#1A1424",
          surface: "#211929",
          rose: "#C8907A",
          pearl: "#D4BFA0",
          mist: "#89808F",
          fog: "#5A5060",
          parchment: "#EEE8E4",
        },
        aubergine: "#3D1F4E",
        plum: "#251630",
        "mist-rose": "#A8718A",
        violet: {
          soft: "#8070B8",
          muted: "#6B5E9E",
          deep: "#4A3880",
          pale: "#B8ADDC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(255, 61, 154, 0.22)",
        ember: "0 20px 80px rgba(255, 138, 61, 0.16)",
        orb: "0 0 60px rgba(128, 112, 184, 0.25), 0 0 120px rgba(128, 112, 184, 0.1)",
        "orb-active": "0 0 80px rgba(168, 113, 138, 0.4), 0 0 160px rgba(128, 112, 184, 0.2)",
        panel: "0 32px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
      animation: {
        "orb-breathe": "orb-breathe 6s ease-in-out infinite",
        "orb-aura": "orb-aura 8s ease-in-out infinite",
        "orb-pulse": "orb-pulse 4s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
      keyframes: {
        "orb-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.07)", opacity: "0.95" },
        },
        "orb-morph": {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%": { borderRadius: "50% 60% 30% 70% / 40% 50% 70% 60%" },
          "75%": { borderRadius: "60% 30% 50% 40% / 30% 60% 40% 70%" },
        },
        "orb-aura": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.25" },
          "50%": { transform: "scale(1.18)", opacity: "0.08" },
        },
        "orb-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    }
  },
  plugins: []
};

export default config;
