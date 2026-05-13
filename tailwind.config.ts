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
        // SOMA by MINDRA — rose-gold adaptive intelligence
        soma: {
          void: "#0B0A0E",
          deep: "#141218",
          card: "#1B1820",
          rose: "#C8907A",
          pearl: "#D4BFA0",
          mist: "#89808F",
          fog: "#5A5060",
          parchment: "#EEE8E4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(255, 61, 154, 0.22)",
        ember: "0 20px 80px rgba(255, 138, 61, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
