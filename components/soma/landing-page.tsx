"use client";

import type { AuthChangeEvent, Session, Subscription } from "@supabase/supabase-js";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AgentOrb } from "@/components/soma/agent-orb";
import type { OrbState } from "@/components/soma/agent-orb";
import "./soma.css";

type BrowserSupabaseClient = ReturnType<typeof createClient>;

function waitForBrowserSession(supabase: BrowserSupabaseClient, timeoutMs = 5000) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let subscription: Subscription | undefined;
    let timeoutId: number | undefined;

    const finish = (hasSession: boolean) => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
      resolve(hasSession);
    };

    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        finish(true);
        return;
      }
      if (event === "SIGNED_OUT") {
        finish(false);
      }
    });
    subscription = data.subscription;

    void supabase.auth.getSession().then(({ data: sessionData }: { data: { session: Session | null } }) => {
      const { session } = sessionData;
      finish(Boolean(session));
    });

    timeoutId = window.setTimeout(() => finish(false), timeoutMs);
  });
}

// ── Login modal ──────────────────────────────────────────────────────────────

function LoginModal({ onAuth, onClose }: { onAuth: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, loading]);

  async function handleAuth() {
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { data, error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      console.error("BROWSER AUTH ERROR", error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setErrorMsg("Check your email to confirm your account before signing in.");
      setLoading(false);
      return;
    }

    const hasSession = await waitForBrowserSession(supabase);
    if (!hasSession) {
      setErrorMsg("Signed in, but the browser session was not ready. Please try again.");
      setLoading(false);
      return;
    }

    onAuth();
  }

  const baseInputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    color: "rgba(238,232,228,0.8)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
    fontFamily: "var(--font-body), system-ui",
    opacity: loading ? 0.55 : 1,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      className="soma-modal-outer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(28px) saturate(120%)",
        background: "rgba(11,10,14,0.8)",
      }}
    >
      <div
        className="soma-modal-card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "2.5rem",
          margin: "0 1.25rem",
          background: "linear-gradient(145deg,rgba(27,24,32,0.98) 0%,rgba(20,18,24,0.99) 100%)",
          boxShadow: "0 48px 120px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(200,144,122,0.08)",
          animation: "soma-fade-up 0.32s ease-out both",
          transition: "opacity 0.2s",
          opacity: loading ? 0.92 : 1,
        }}
      >
        {!loading && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.22)",
              fontSize: 22,
              lineHeight: 1,
              transition: "color 0.15s",
              padding: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
          >
            ×
          </button>
        )}

        <div style={{ marginBottom: "2rem" }}>
          <div style={{ marginBottom: 20 }}>
            <Image
              src="/logos/soma-logo-white.png"
              alt="SOMA by MINDRA"
              width={1536}
              height={1024}
              style={{ width: 160, height: "auto" }}
            />
          </div>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 28, color: "#EEE8E4", margin: 0 }}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
        </div>

        <div style={{ display: "grid", gap: "1.1rem" }}>
          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={loading}
              style={baseInputStyle}
              onFocus={(e) => { if (!loading) e.currentTarget.style.borderColor = "rgba(200,144,122,0.4)"; }}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
            />
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={baseInputStyle}
              onFocus={(e) => { if (!loading) e.currentTarget.style.borderColor = "rgba(200,144,122,0.4)"; }}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
            />
          </label>

          <button
            onClick={() => { void handleAuth(); }}
            disabled={loading}
            style={{
              marginTop: 6,
              borderRadius: 14,
              padding: "15px 0",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "default" : "pointer",
              background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
              color: "#0B0A0E",
              transition: "opacity 0.2s",
              opacity: loading ? 0.65 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = loading ? "0.65" : "1"; }}
          >
            {loading ? (
              <>
                <span style={{
                  display: "inline-block",
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  border: "2px solid rgba(11,10,14,0.2)",
                  borderTopColor: "#0B0A0E",
                  animation: "soma-spin 0.65s linear infinite",
                  flexShrink: 0,
                }} />
                {mode === "signin" ? "Entering…" : "Creating…"}
              </>
            ) : (mode === "signin" ? "Enter SOMA" : "Create account")}
          </button>

          {errorMsg && (
            <p style={{ fontSize: 12, color: "rgba(248,113,113,0.85)", textAlign: "center", margin: 0 }}>
              {errorMsg}
            </p>
          )}

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 6 }}>
            {mode === "signin" ? "No access yet?" : "Already have access?"}{" "}
            <button
              disabled={loading}
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrorMsg(""); }}
              style={{
                background: "none",
                border: "none",
                cursor: loading ? "default" : "pointer",
                color: "#C8907A",
                fontSize: 11,
                textDecoration: "underline",
                textDecorationColor: "rgba(200,144,122,0.3)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.65"; }}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {mode === "signin" ? "Request access" : "Sign in instead"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function SomaNav({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={scrolled ? "soma-nav-blur" : ""}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 250,
        background: scrolled ? "rgba(11,10,14,0.7)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Image
          src="/logos/soma-logo-white.png"
          alt="SOMA by MINDRA"
          width={1536}
          height={1024}
          className="flex-shrink-0 transition-opacity duration-300 hover:opacity-90"
          style={{ width: 140, height: "auto" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onLogin}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >
            Sign in
          </button>
          <button
            onClick={onLogin}
            style={{
              background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
              border: "none",
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 700,
              color: "#0B0A0E",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Try SOMA
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Shared animation variants ─────────────────────────────────────────────────

type CubicBezier = [number, number, number, number];
const spring: CubicBezier = [0.16, 1, 0.3, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: spring } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
};

const vp = { once: true, margin: "-60px" };

// ── SECTION 1: Hero ───────────────────────────────────────────────────────────

function HeroSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "0 1.5rem",
      }}
    >
      {/* Depth layers */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 65% at 50% 48%, rgba(80,28,110,0.28) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 45% at 22% 18%, rgba(168,113,138,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 40% 40% at 80% 80%, rgba(35,18,50,0.35) 0%, transparent 65%)", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0" }}>

        {/* Orb entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: spring }}
        >
          <AgentOrb state="idle" size="2xl" maturityLevel={2} />
        </motion.div>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          style={{ marginTop: "2.5rem", fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "#89808F" }}
        >
          SOMA · Adaptive Creative Intelligence
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 1.1, ease: spring }}
          style={{
            marginTop: "1.5rem",
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "clamp(2.6rem, 5.5vw, 4.25rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.028em",
            color: "#EEE8E4",
            maxWidth: 580,
          }}
        >
          Your brand develops<br />a creative memory.
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 1 }}
          style={{ marginTop: "1.5rem", fontSize: 15, lineHeight: 1.85, color: "#5A5060", maxWidth: 380 }}
        >
          Every reference you feed it. Every piece of feedback you give. SOMA conditions itself to your brand — and gets better the longer you work together.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.9, ease: spring }}
          style={{ marginTop: "2.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14 }}
        >
          <button
            onClick={onLogin}
            style={{
              borderRadius: 999,
              padding: "15px 36px",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
              color: "#0B0A0E",
              transition: "opacity 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Enter SOMA
          </button>
          <button
            onClick={onLogin}
            style={{
              borderRadius: 999,
              padding: "14px 28px",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "none",
              cursor: "pointer",
              color: "#89808F",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#89808F"; }}
          >
            Sign in
          </button>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2.2, duration: 1 }}
        style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
      >
        <div style={{ width: 1, height: 44, background: "linear-gradient(to bottom, transparent, #C8907A)" }} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#C8907A" }}>scroll</span>
      </motion.div>
    </section>
  );
}

// ── SECTION 2: The Relationship ───────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "You feed references.",
    body: "Campaigns you admire. Content you've created. Brand guidelines, tone samples, competitive examples. SOMA reads everything.",
  },
  {
    n: "02",
    title: "SOMA extracts intelligence.",
    body: "Visual signals. Tone register. Strategic patterns. Constraints to avoid. Everything classified, routed, and stored as operational memory.",
  },
  {
    n: "03",
    title: "Your identity compounds.",
    body: "Each generation carries your voice. Each piece of feedback sharpens the signal. Over time, SOMA becomes an extension of how you think.",
  },
];

function RelationshipSection() {
  return (
    <section style={{ position: "relative", padding: "9rem 1.5rem", overflow: "hidden" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Heading */}
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp} style={{ marginBottom: "5rem", maxWidth: 580 }}>
          <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
            The relationship
          </motion.p>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.022em", color: "#EEE8E4", margin: 0 }}>
            You don&apos;t schedule content.<br />You train a mind.
          </motion.h2>
          <motion.p variants={fadeUp} style={{ marginTop: "1.5rem", fontSize: 14, lineHeight: 1.9, color: "#5A5060", maxWidth: 460 }}>
            SOMA is not a content generator. It conditions itself to your brand — learning your aesthetic, your voice, your strategic instincts — and compounds that understanding with every session.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}
        >
          {STEPS.map((step) => (
            <motion.div
              key={step.n}
              variants={fadeUp}
              style={{
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.055)",
                padding: "2rem",
                background: "linear-gradient(145deg, rgba(27,24,32,0.55) 0%, rgba(20,18,24,0.7) 100%)",
              }}
            >
              <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 11, color: "rgba(200,144,122,0.5)", letterSpacing: "0.12em", marginBottom: "1.25rem" }}>{step.n}</p>
              <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 19, color: "#D4BFA0", lineHeight: 1.25, marginBottom: "0.85rem" }}>{step.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: "#5A5060", margin: 0 }}>{step.body}</p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}

// ── SECTION 3: Evolution System ───────────────────────────────────────────────

const STAGES: { level: number; name: string; desc: string; state: OrbState }[] = [
  { level: 0, name: "Observer",    desc: "Learning patterns. No assumptions yet.",                  state: "learning" },
  { level: 1, name: "Apprentice",  desc: "First signals identified. Consistency forming.",           state: "learning" },
  { level: 2, name: "Junior",      desc: "Voice recognizable. Patterns reliable.",                   state: "idle" },
  { level: 3, name: "Senior",      desc: "Anticipates your direction. Rare course-corrections.",     state: "preparing" },
  { level: 4, name: "Autonomous",  desc: "Creates independently. Your identity preserved.",          state: "idle" },
];

function EvolutionSection() {
  return (
    <section style={{ position: "relative", padding: "9rem 1.5rem", overflow: "hidden" }}>
      {/* Ambient left glow */}
      <div style={{ position: "absolute", width: 600, height: 600, left: -200, top: "50%", transform: "translateY(-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(128,112,184,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp} style={{ marginBottom: "5rem", textAlign: "center" }}>
          <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
            The maturity model
          </motion.p>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.022em", color: "#EEE8E4", margin: 0 }}>
            From observer<br />to autonomous system.
          </motion.h2>
          <motion.p variants={fadeUp} style={{ marginTop: "1.25rem", fontSize: 14, lineHeight: 1.85, color: "#5A5060", maxWidth: 400, margin: "1.25rem auto 0" }}>
            SOMA doesn&apos;t arrive trained. It evolves through every reference, every approval, every correction you give it.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "2px" }}
        >
          {STAGES.map((stage, i) => (
            <motion.div
              key={stage.name}
              variants={fadeUp}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "2.5rem 1.25rem",
                borderRadius: i === 0 ? "18px 0 0 18px" : i === STAGES.length - 1 ? "0 18px 18px 0" : 0,
                border: "1px solid rgba(255,255,255,0.045)",
                background: `rgba(27,24,32,${0.3 + i * 0.1})`,
                position: "relative",
              }}
            >
              <AgentOrb state={stage.state} size="sm" maturityLevel={stage.level} />
              <p style={{ marginTop: "1.25rem", fontSize: 12, fontWeight: 700, color: "#D4BFA0", letterSpacing: "0.04em" }}>{stage.name}</p>
              <p style={{ marginTop: "0.5rem", fontSize: 11, lineHeight: 1.65, color: "#5A5060" }}>{stage.desc}</p>
              <div style={{ marginTop: "1rem", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: i === 4 ? "rgba(200,144,122,0.55)" : "rgba(255,255,255,0.14)", textTransform: "uppercase" }}>
                Level {i}
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}

// ── SECTION 4: Daily Ritual ───────────────────────────────────────────────────

function DailyRitualSection() {
  return (
    <section style={{ position: "relative", padding: "9rem 1.5rem", overflow: "hidden" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>

          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp}>
            <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
              The daily ritual
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(1.9rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.022em", color: "#EEE8E4", margin: 0 }}>
              Every morning,<br />SOMA has already<br />been thinking.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ marginTop: "1.5rem", fontSize: 14, lineHeight: 1.9, color: "#5A5060", maxWidth: 400 }}>
              You open the workspace and SOMA is already there — with drafts prepared, directions suggested, waiting to respond to your input. Not a blank page. A briefing.
            </motion.p>
            <motion.div variants={fadeUp} style={{ marginTop: "2rem", display: "grid", gap: "0.85rem" }}>
              {[
                "Drafts prepared overnight based on your mission queue",
                "SOMA tells you what it prepared and why",
                "Your feedback sharpens the next cycle",
              ].map((line) => (
                <div key={line} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#C8907A", marginTop: 7, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "#5A5060", margin: 0 }}>{line}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Interface mockup */}
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={vp}>
            <div style={{
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.065)",
              background: "linear-gradient(145deg, rgba(27,24,32,0.96) 0%, rgba(16,14,22,0.98) 100%)",
              boxShadow: "0 48px 120px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(128,112,184,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}>
              {/* Mock window chrome */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 6 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: `rgba(255,255,255,${0.07 + i * 0.02})` }} />)}
                <div style={{ flex: 1, marginLeft: 8, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.04)", maxWidth: 160 }} />
              </div>

              {/* Mock today page content */}
              <div style={{ padding: "2.5rem 2rem 2rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.25rem" }}>
                  <AgentOrb state="preparing" size="md" maturityLevel={3} />
                  <div>
                    <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 22, color: "#EEE8E4", marginBottom: 6 }}>I prepared a few directions.</p>
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: "#5A5060", maxWidth: 260, margin: "0 auto" }}>Based on what I&apos;ve learned from your feedback so far. Your reaction is how I keep improving.</p>
                  </div>
                  <button style={{ borderRadius: 14, border: "1px solid rgba(128,112,184,0.28)", background: "rgba(74,56,128,0.12)", padding: "10px 20px", fontSize: 12, fontWeight: 600, color: "#B8ADDC", cursor: "default" }}>
                    Talk to SOMA →
                  </button>
                </div>

                {/* Mock disclosure rows */}
                <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {["What SOMA remembers", "What SOMA prepared — 3"].map((label) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>{label}</span>
                      <div style={{ width: 10, height: 10, borderRadius: 2, border: "1px solid rgba(255,255,255,0.12)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── SECTION 5: Memory ─────────────────────────────────────────────────────────

const MEMORY_SIGNALS: { label: string; category: "visual" | "tone" | "strategy" | "avoid" }[] = [
  { label: "soft diffused light", category: "visual" },
  { label: "muted earthy palette", category: "visual" },
  { label: "grainy film texture", category: "visual" },
  { label: "peer-level directness", category: "tone" },
  { label: "restrained authority", category: "tone" },
  { label: "tension before resolution", category: "strategy" },
  { label: "senior operators", category: "strategy" },
  { label: "no motivational energy", category: "avoid" },
  { label: "avoid polished perfection", category: "avoid" },
];

const chipColors = {
  visual:   { border: "rgba(200,144,122,0.22)", bg: "rgba(200,144,122,0.07)", color: "rgba(200,144,122,0.75)" },
  tone:     { border: "rgba(255,255,255,0.1)",  bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" },
  strategy: { border: "rgba(212,191,160,0.15)", bg: "rgba(212,191,160,0.05)", color: "rgba(212,191,160,0.55)" },
  avoid:    { border: "rgba(248,113,113,0.15)", bg: "rgba(248,113,113,0.05)", color: "rgba(248,113,113,0.6)" },
};

function MemorySection() {
  return (
    <section style={{ position: "relative", padding: "9rem 1.5rem", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 700, height: 700, right: -250, top: "50%", transform: "translateY(-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,144,122,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>

          {/* Intelligence panel */}
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={vp}>
            <div style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "1.75rem",
              background: "linear-gradient(145deg, rgba(27,24,32,0.97) 0%, rgba(20,18,24,0.99) 100%)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#89808F", marginBottom: 4 }}>Brand Intelligence</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#EEE8E4" }}>Creative Memory</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="soma-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8907A" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C8907A" }}>Active</span>
                </div>
              </div>

              {/* Signal chips by category */}
              {(["visual", "tone", "strategy", "avoid"] as const).map((cat) => {
                const signals = MEMORY_SIGNALS.filter(s => s.category === cat);
                const label = cat === "avoid" ? "Trained constraints" : cat === "visual" ? "Visual signals" : cat === "tone" ? "Tone register" : "Strategic pattern";
                return (
                  <div key={cat} style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>{label}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {signals.map(s => (
                        <span key={s.label} style={{
                          borderRadius: 999,
                          border: `1px solid ${chipColors[cat].border}`,
                          background: chipColors[cat].bg,
                          color: chipColors[cat].color,
                          fontSize: 10,
                          padding: "3px 9px",
                        }}>{s.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Routing line */}
              <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", padding: "9px 13px", background: "rgba(255,255,255,0.02)" }}>
                <div className="soma-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#C8907A", flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", margin: 0 }}>Routing visual → image prompts · tone → captions · constraints → all outputs</p>
              </div>
            </div>
          </motion.div>

          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp}>
            <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
              Persistent intelligence
            </motion.p>
            <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(1.9rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.022em", color: "#EEE8E4", margin: 0 }}>
              SOMA remembers<br />everything you&apos;ve taught it.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ marginTop: "1.5rem", fontSize: 14, lineHeight: 1.9, color: "#5A5060", maxWidth: 400 }}>
              Not a prompt. Not a style guide that everyone ignores. A trained system where your aesthetic decisions — visual, tonal, strategic — are extracted from every reference and encoded into every generation cycle.
            </motion.p>
            <motion.div variants={fadeUp} style={{ marginTop: "2rem", display: "grid", gap: "0.85rem" }}>
              {[
                "References extracted into classified signal types",
                "Feedback routed back as reinforcement signals",
                "Constraints trained in — not enforced manually",
              ].map((line) => (
                <div key={line} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#C8907A", marginTop: 7, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "#5A5060", margin: 0 }}>{line}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── SECTION 6: Autonomy ───────────────────────────────────────────────────────

const AUTONOMY_STAGES = [
  {
    phase: "Before",
    label: "The old model",
    items: ["Brief a designer, wait for drafts", "Write the copy yourself, post manually", "Repeat next week. Nothing compounds."],
    dim: true,
  },
  {
    phase: "Training period",
    label: "Building the relationship",
    items: ["Feed references, give feedback", "SOMA extracts and stores your intelligence", "Each session makes the next one faster."],
    dim: false,
  },
  {
    phase: "Autonomous",
    label: "The outcome",
    items: ["SOMA prepares directions every morning", "You review, react, approve — or redirect", "Your brand compounds. You stop starting from zero."],
    dim: false,
    accent: true,
  },
];

function AutonomySection() {
  return (
    <section style={{ position: "relative", padding: "9rem 1.5rem", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, left: "50%", top: "50%", transform: "translate(-50%, -50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(80,28,110,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp} style={{ marginBottom: "5rem", textAlign: "center" }}>
          <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
            The outcome
          </motion.p>
          <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.022em", color: "#EEE8E4", margin: 0 }}>
            Content creation was<br />never the bottleneck.
          </motion.h2>
          <motion.p variants={fadeUp} style={{ marginTop: "1.25rem", fontSize: 14, lineHeight: 1.85, color: "#5A5060", maxWidth: 400, margin: "1.25rem auto 0" }}>
            The bottleneck was building a system that holds your brand identity and acts on it without you starting from scratch every time.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}
        >
          {AUTONOMY_STAGES.map((stage) => (
            <motion.div
              key={stage.phase}
              variants={fadeUp}
              style={{
                borderRadius: 22,
                border: stage.accent
                  ? "1px solid rgba(200,144,122,0.2)"
                  : "1px solid rgba(255,255,255,0.05)",
                padding: "2rem",
                background: stage.accent
                  ? "linear-gradient(145deg, rgba(40,28,36,0.7) 0%, rgba(27,20,28,0.85) 100%)"
                  : "linear-gradient(145deg, rgba(22,19,28,0.5) 0%, rgba(16,14,22,0.65) 100%)",
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: stage.accent ? "#C8907A" : "rgba(255,255,255,0.2)", marginBottom: 8 }}>
                {stage.phase}
              </p>
              <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 17, color: stage.dim ? "rgba(238,232,228,0.3)" : stage.accent ? "#EEE8E4" : "#D4BFA0", marginBottom: "1.5rem" }}>
                {stage.label}
              </p>
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {stage.items.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: stage.accent ? "#C8907A" : stage.dim ? "rgba(255,255,255,0.15)" : "rgba(212,191,160,0.4)", marginTop: 6, flexShrink: 0 }} />
                    <p style={{ fontSize: 12, lineHeight: 1.7, color: stage.dim ? "#3A3540" : stage.accent ? "#89808F" : "#5A5060", margin: 0 }}>{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}

// ── SECTION 7: Final CTA ──────────────────────────────────────────────────────

function FinalCtaSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section style={{ position: "relative", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "9rem 1.5rem", overflow: "hidden", textAlign: "center" }}>
      {/* Deep glow */}
      <div style={{ position: "absolute", width: 900, height: 900, left: "50%", top: "50%", transform: "translate(-50%, -50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,144,122,0.07) 0%, rgba(80,28,110,0.08) 40%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(80,28,110,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={vp}
        style={{ position: "relative", maxWidth: 560 }}
      >
        <motion.div variants={fadeUp} style={{ display: "flex", justifyContent: "center", marginBottom: "2.5rem" }}>
          <AgentOrb state="idle" size="lg" maturityLevel={4} />
        </motion.div>

        <motion.p variants={fadeUp} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "#89808F", marginBottom: 20 }}>
          Get started
        </motion.p>

        <motion.h2 variants={fadeUp} style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2.5rem, 5.5vw, 4rem)", lineHeight: 1.08, letterSpacing: "-0.025em", color: "#EEE8E4", margin: 0 }}>
          Begin training<br />SOMA.
        </motion.h2>

        <motion.p variants={fadeUp} style={{ marginTop: "1.5rem", fontSize: 15, lineHeight: 1.85, color: "#5A5060" }}>
          The earlier you start, the more it knows. Every session builds the intelligence your brand runs on.
        </motion.p>

        <motion.div variants={fadeUp} style={{ marginTop: "2.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <button
            onClick={onLogin}
            style={{
              borderRadius: 999,
              padding: "16px 40px",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
              color: "#0B0A0E",
              transition: "opacity 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Try SOMA
          </button>
          <button
            onClick={onLogin}
            style={{
              borderRadius: 999,
              padding: "15px 32px",
              fontSize: 15,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "none",
              cursor: "pointer",
              color: "#89808F",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#89808F"; }}
          >
            Login
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function SomaFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "2.5rem 1.5rem" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Image
          src="/logos/soma-logo-white.png"
          alt="SOMA by MINDRA"
          width={1536}
          height={1024}
          style={{ width: 110, height: "auto", opacity: 0.35 }}
        />
        <p style={{ fontSize: 11, color: "#5A5060", margin: 0 }}>© 2026 MINDRA — Adaptive Creative Intelligence</p>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SomaLandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  function openLogin() { setModalOpen(true); }
  function closeLogin() { setModalOpen(false); }

  function handleAuth() {
    setModalOpen(false);
    router.push("/app");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0A0E",
        color: "#EEE8E4",
        fontFamily: "var(--font-body), system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes soma-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes soma-slide-up {
          from { transform: translateY(56px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @media (max-width: 600px) {
          .soma-modal-outer {
            align-items: flex-end !important;
          }
          .soma-modal-card {
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 24px 24px 0 0 !important;
            padding-bottom: calc(2.5rem + env(safe-area-inset-bottom, 16px)) !important;
            animation: soma-slide-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both !important;
          }
        }
      `}</style>

      {modalOpen && <LoginModal onAuth={handleAuth} onClose={closeLogin} />}
      <SomaNav onLogin={openLogin} />

      <HeroSection onLogin={openLogin} />
      <RelationshipSection />
      <EvolutionSection />
      <DailyRitualSection />
      <MemorySection />
      <AutonomySection />
      <FinalCtaSection onLogin={openLogin} />
      <SomaFooter />
    </div>
  );
}
