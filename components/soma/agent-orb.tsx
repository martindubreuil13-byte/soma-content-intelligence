"use client";

import { clsx } from "clsx";

export type OrbState = "idle" | "listening" | "thinking" | "preparing" | "learning";

const sizeMap = {
  sm:   { wrap: "w-10 h-10",  mid: "w-8 h-8",   core: "w-5 h-5"  },
  md:   { wrap: "w-20 h-20",  mid: "w-16 h-16",  core: "w-9 h-9"  },
  lg:   { wrap: "w-32 h-32",  mid: "w-24 h-24",  core: "w-14 h-14" },
  xl:   { wrap: "w-48 h-48",  mid: "w-36 h-36",  core: "w-20 h-20" },
  "2xl": { wrap: "w-72 h-72",  mid: "w-56 h-56",  core: "w-28 h-28" },
};

const stateGlow: Record<OrbState, string> = {
  idle:      "rgba(128, 112, 184, 0.18)",
  listening: "rgba(168, 113, 138, 0.22)",
  thinking:  "rgba(107,  94, 158, 0.25)",
  preparing: "rgba(200, 144, 122, 0.20)",
  learning:  "rgba(128, 112, 184, 0.22)",
};

const stateCore: Record<OrbState, string> = {
  idle:      "rgba(238,232,228,0.5) 0%, rgba(168,113,138,0.35) 35%, rgba(128,112,184,0.2) 65%, transparent 100%",
  listening: "rgba(238,232,228,0.6) 0%, rgba(200,144,122,0.45) 35%, rgba(168,113,138,0.25) 65%, transparent 100%",
  thinking:  "rgba(184,173,220,0.55) 0%, rgba(128,112,184,0.4) 35%, rgba(107,94,158,0.25) 65%, transparent 100%",
  preparing: "rgba(238,232,228,0.65) 0%, rgba(200,144,122,0.5) 35%, rgba(128,112,184,0.25) 65%, transparent 100%",
  learning:  "rgba(238,232,228,0.5) 0%, rgba(184,173,220,0.38) 35%, rgba(128,112,184,0.22) 65%, transparent 100%",
};

// Maturity (0–4) subtly shapes the orb's presence.
// Observer: slow, quiet nucleus. Autonomous: composed, layered, steady.
function maturityMods(level: number) {
  const l = Math.max(0, Math.min(4, Math.round(level)));
  return {
    breathe:     `${8.2 - l * 0.82}s`,   // 8.2s → 4.9s
    morph:       `${10  - l * 0.5}s`,     // 10s  → 8s
    aura:        `${9.5 - l * 0.45}s`,    // 9.5s → 7.7s
    coreOp:      0.42 + l * 0.115,        // 0.42 → 0.88
    auradOp:     0.16 + l * 0.04,         // 0.16 → 0.32
    glowSpread:  Math.round(24 + l * 5),  // 24px → 44px
  };
}

interface AgentOrbProps {
  state?: OrbState;
  size?: keyof typeof sizeMap | "2xl";
  maturityLevel?: number;
  className?: string;
}

export function AgentOrb({ state = "idle", size = "md", maturityLevel = 0, className }: AgentOrbProps) {
  const dims = sizeMap[size];
  const mods = maturityMods(maturityLevel);
  const glow = stateGlow[state];

  return (
    <div className={clsx("relative flex items-center justify-center shrink-0", dims.wrap, className)}>
      {/* Outer ambient aura */}
      <div
        className="absolute inset-[-60%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${glow} 0%, transparent 65%)`,
          animation: `orb-aura ${mods.aura} ease-in-out infinite`,
          opacity: mods.auradOp,
        }}
      />

      {/* Mid diffuse warmth layer */}
      <div
        className="absolute inset-[-10%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 40% 38%, rgba(212,191,160,0.1) 0%, rgba(168,113,138,0.07) 45%, transparent 70%)`,
          filter: "blur(6px)",
          animation: `orb-breathe ${mods.breathe} ease-in-out infinite`,
          opacity: mods.coreOp * 0.7,
        }}
      />

      {/* Core morphing orb */}
      <div
        className={clsx("relative", dims.mid)}
        style={{
          background: `radial-gradient(ellipse at 38% 34%, ${stateCore[state]})`,
          boxShadow: `0 0 ${mods.glowSpread}px ${glow}, inset 0 0 14px rgba(212,191,160,0.05)`,
          animation: `orb-morph ${mods.morph} ease-in-out infinite, orb-breathe ${mods.breathe} ease-in-out infinite`,
          opacity: mods.coreOp,
        }}
      />

      {/* Inner bright highlight — presence indicator */}
      <div
        className={clsx("absolute pointer-events-none", dims.core)}
        style={{
          background: `radial-gradient(ellipse at 38% 32%, rgba(238,232,228,0.6) 0%, rgba(212,191,160,0.3) 40%, transparent 70%)`,
          filter: "blur(4px)",
          borderRadius: "50%",
          animation: `orb-pulse 4s ease-in-out infinite`,
          opacity: mods.coreOp,
        }}
      />
    </div>
  );
}
