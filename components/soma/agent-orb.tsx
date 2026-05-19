"use client";

import { clsx } from "clsx";

export type OrbState = "idle" | "listening" | "thinking" | "preparing" | "learning";

const sizeMap = {
  sm:  { wrap: "w-10 h-10",  mid: "w-8 h-8",   core: "w-5 h-5"  },
  md:  { wrap: "w-20 h-20",  mid: "w-16 h-16",  core: "w-9 h-9"  },
  lg:  { wrap: "w-32 h-32",  mid: "w-24 h-24",  core: "w-14 h-14" },
  xl:  { wrap: "w-48 h-48",  mid: "w-36 h-36",  core: "w-20 h-20" },
};

const stateGlow: Record<OrbState, string> = {
  idle:      "rgba(128, 112, 184, 0.18)",
  listening: "rgba(168, 113, 138, 0.22)",
  thinking:  "rgba(107,  94, 158, 0.25)",
  preparing: "rgba(200, 144, 122, 0.2)",
  learning:  "rgba(128, 112, 184, 0.22)",
};

const stateCore: Record<OrbState, string> = {
  idle:      "rgba(238,232,228,0.5) 0%, rgba(168,113,138,0.35) 35%, rgba(128,112,184,0.2) 65%, transparent 100%",
  listening: "rgba(238,232,228,0.6) 0%, rgba(200,144,122,0.45) 35%, rgba(168,113,138,0.25) 65%, transparent 100%",
  thinking:  "rgba(184,173,220,0.55) 0%, rgba(128,112,184,0.4) 35%, rgba(107,94,158,0.25) 65%, transparent 100%",
  preparing: "rgba(238,232,228,0.65) 0%, rgba(200,144,122,0.5) 35%, rgba(128,112,184,0.25) 65%, transparent 100%",
  learning:  "rgba(238,232,228,0.5) 0%, rgba(184,173,220,0.38) 35%, rgba(128,112,184,0.22) 65%, transparent 100%",
};

interface AgentOrbProps {
  state?: OrbState;
  size?: keyof typeof sizeMap;
  className?: string;
}

export function AgentOrb({ state = "idle", size = "md", className }: AgentOrbProps) {
  const dims = sizeMap[size];

  return (
    <div className={clsx("relative flex items-center justify-center shrink-0", dims.wrap, className)}>
      {/* Outer ambient aura */}
      <div
        className="absolute inset-[-60%] animate-orb-aura rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${stateGlow[state]} 0%, transparent 65%)`,
        }}
      />

      {/* Mid diffuse layer */}
      <div
        className="absolute inset-[-10%] animate-orb-breathe rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 40% 38%, rgba(212,191,160,0.12) 0%, rgba(168,113,138,0.08) 45%, transparent 70%)`,
          filter: "blur(6px)",
        }}
      />

      {/* Core morphing orb */}
      <div
        className={clsx("relative", dims.mid)}
        style={{
          background: `radial-gradient(ellipse at 38% 34%, ${stateCore[state]})`,
          boxShadow: `0 0 28px ${stateGlow[state]}, inset 0 0 16px rgba(212,191,160,0.06)`,
          animation: "orb-morph 9s ease-in-out infinite, orb-breathe 6s ease-in-out infinite",
        }}
      />

      {/* Inner bright highlight */}
      <div
        className={clsx("absolute animate-orb-pulse pointer-events-none", dims.core)}
        style={{
          background: `radial-gradient(ellipse at 38% 32%, rgba(238,232,228,0.65) 0%, rgba(212,191,160,0.35) 40%, transparent 70%)`,
          filter: "blur(4px)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
