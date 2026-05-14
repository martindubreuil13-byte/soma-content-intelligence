"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./soma.css";

// ── Scroll-reveal hook ───────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const container = document.querySelector(".soma-scroll") as HTMLElement | null;
    const items = document.querySelectorAll<Element>(".soma-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { root: container, threshold: 0.1 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Login modal ──────────────────────────────────────────────────────────────

function LoginModal({ onAuth, onClose }: { onAuth: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, loading]);

  async function handleAuth() {
    setLoading(true);
    await new Promise<void>((r) => setTimeout(r, 800));
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
        {/* Close */}
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
              style={{ height: 48, width: "auto" }}
            />
          </div>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 28, color: "#EEE8E4", margin: 0 }}>
            Sign in
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
                Entering…
              </>
            ) : "Enter SOMA"}
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 6 }}>
            No access yet?{" "}
            <button
              disabled={loading}
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
              Request access
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
    const container = document.querySelector(".soma-scroll") as HTMLElement | null;
    if (!container) return;
    const onScroll = () => setScrolled(container.scrollTop > 48);
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
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
          className="transition-opacity duration-300 hover:opacity-90"
          style={{ height: 42, width: "auto" }}
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

// ── Intelligence card (hero mock) ────────────────────────────────────────────

const HERO_SIGNALS: { label: string; type: "visual" | "tone" | "strategy" }[] = [
  { label: "cinematic restraint", type: "visual" },
  { label: "documentary framing", type: "visual" },
  { label: "peer-level voice", type: "tone" },
  { label: "tension first", type: "strategy" },
  { label: "muted earthy palette", type: "visual" },
  { label: "late-night operator", type: "tone" },
  { label: "soft diffused light", type: "visual" },
  { label: "social proof light", type: "strategy" },
];

function SignalChip({ label, type }: { label: string; type: "visual" | "tone" | "strategy" }) {
  const colors = {
    visual: { border: "rgba(200,144,122,0.2)", bg: "rgba(200,144,122,0.07)", color: "rgba(200,144,122,0.75)" },
    tone: { border: "rgba(255,255,255,0.1)", bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" },
    strategy: { border: "rgba(212,191,160,0.15)", bg: "rgba(212,191,160,0.05)", color: "rgba(212,191,160,0.55)" },
  };
  const c = colors[type];
  return (
    <span style={{
      display: "inline-flex",
      borderRadius: 999,
      border: `1px solid ${c.border}`,
      background: c.bg,
      color: c.color,
      fontSize: 10,
      fontWeight: 500,
      padding: "4px 10px",
    }}>
      {label}
    </span>
  );
}

function IntelligenceCard() {
  return (
    <div
      className="soma-card-anim soma-float"
      style={{
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "1.75rem",
        background: "linear-gradient(145deg,rgba(27,24,32,0.97) 0%,rgba(20,18,24,0.99) 100%)",
        boxShadow: "0 48px 120px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(200,144,122,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#89808F", marginBottom: 4 }}>
            Brand Intelligence
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#EEE8E4" }}>Creative Memory</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="soma-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8907A" }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C8907A" }}>
            Live
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.25rem" }}>
        {[
          { n: "12", label: "Active signals" },
          { n: "3", label: "References" },
          { n: "94%", label: "Consistency" },
        ].map(({ n, label }) => (
          <div key={label} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", padding: "12px", background: "rgba(255,255,255,0.02)" }}>
            <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 22, color: "#D4BFA0", margin: 0, lineHeight: 1 }}>{n}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Signal chips */}
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 10 }}>
          Active training signals
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {HERO_SIGNALS.map((s) => (
            <SignalChip key={s.label} label={s.label} type={s.type} />
          ))}
        </div>
      </div>

      {/* Recent generation */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 8 }}>
          Recent generation
        </p>
        {[
          { text: "LinkedIn — Series B announcement", t: "2m ago" },
          { text: "Twitter thread — product philosophy", t: "18m ago" },
        ].map(({ text, t }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p style={{ fontSize: 11, color: "rgba(238,232,228,0.45)", margin: 0 }}>{text}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", margin: 0, marginLeft: 12, whiteSpace: "nowrap" }}>{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Differentiators ──────────────────────────────────────────────────────────

const DIFFERENTIATOR_CARDS = [
  {
    glyph: "◎",
    title: "Adaptive Learning",
    body: "Every reference injected becomes operational intelligence. Visual signals, tone patterns, strategic frameworks — extracted and routed into every generation cycle.",
  },
  {
    glyph: "◈",
    title: "Strategic Memory",
    body: "Constraints and preferences persist across campaigns. SOMA doesn't repeat mistakes. It compounds learned restraint into an identity that deepens over time.",
  },
  {
    glyph: "◇",
    title: "Creative Consistency",
    body: "The same brand voice across every channel and format — without a style guide nobody reads. Consistency trained into the system, not enforced manually.",
  },
];

function DifferentiatorsSection() {
  return (
    <section id="how-it-works" className="soma-section-padding" style={{ padding: "7rem 1.5rem", position: "relative" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <div className="soma-reveal" style={{ maxWidth: 480, marginBottom: "4rem" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#89808F", marginBottom: 12 }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2rem, 4vw, 2.75rem)", color: "#EEE8E4", lineHeight: 1.2, margin: 0 }}>
            Intelligence that compounds.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {DIFFERENTIATOR_CARDS.map((card, i) => (
            <div
              key={card.title}
              className="soma-reveal"
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "1.75rem",
                background: "linear-gradient(145deg,rgba(27,24,32,0.65) 0%,rgba(20,18,24,0.8) 100%)",
                transitionDelay: `${i * 90}ms`,
              }}
            >
              <p style={{ fontSize: 24, color: "#C8907A", marginBottom: "1.25rem" }}>{card.glyph}</p>
              <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 20, color: "#EEE8E4", marginBottom: "0.75rem" }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "#89808F", margin: 0 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Visual intelligence section ───────────────────────────────────────────────

type ChipColor = { border: string; bg: string; color: string };

function ChipRow({ label, chips, chipColor }: { label: string; chips: string[]; chipColor: ChipColor }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map((c) => (
          <span
            key={c}
            style={{
              borderRadius: 999,
              border: `1px solid ${chipColor.border}`,
              background: chipColor.bg,
              color: chipColor.color,
              fontSize: 10,
              padding: "3px 9px",
            }}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function VisualIntelligenceSection() {
  const roseChip: ChipColor = { border: "rgba(200,144,122,0.2)", bg: "rgba(200,144,122,0.07)", color: "rgba(200,144,122,0.75)" };
  const neutralChip: ChipColor = { border: "rgba(255,255,255,0.1)", bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" };
  const dimChip: ChipColor = { border: "rgba(255,255,255,0.08)", bg: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.42)" };
  const avoidChip: ChipColor = { border: "rgba(248,113,113,0.15)", bg: "rgba(248,113,113,0.05)", color: "rgba(248,113,113,0.6)" };

  return (
    <section className="soma-section-padding" style={{ position: "relative", padding: "7rem 1.5rem", overflow: "hidden" }}>
      {/* ambient glow */}
      <div
        className="soma-orb-3"
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          right: -120,
          top: "50%",
          transform: "translateY(-50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,144,122,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: 1152, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4rem", alignItems: "center" }}>
          {/* Copy */}
          <div className="soma-reveal">
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#89808F", marginBottom: 12 }}>
              Visual intelligence
            </p>
            <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(1.9rem, 3.5vw, 2.6rem)", color: "#EEE8E4", lineHeight: 1.25, marginBottom: "1.25rem" }}>
              References trained.<br />
              Signals extracted.<br />
              Identity preserved.
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.85, color: "#5A5060", maxWidth: 400 }}>
              Upload an image, paste a caption, drop a PDF. SOMA reads it, extracts the creative intelligence, and routes it precisely — visual signals to image prompts, tone signals to copy, constraints to every output.
            </p>
          </div>

          {/* Intelligence panel */}
          <div className="soma-reveal" style={{ transitionDelay: "120ms" }}>
            <div style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "1.5rem",
              background: "linear-gradient(145deg,rgba(27,24,32,0.97) 0%,rgba(20,18,24,0.99) 100%)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(200,144,122,0.04)",
            }}>
              {/* Panel header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#89808F", marginBottom: 4 }}>
                    Extracted intelligence
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#EEE8E4" }}>Campaign visual reference</p>
                </div>
                <span style={{ borderRadius: 999, border: "1px solid rgba(200,144,122,0.22)", background: "rgba(200,144,122,0.08)", color: "#C8907A", fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", padding: "4px 10px" }}>
                  Visual
                </span>
              </div>

              {/* Signal groups */}
              <div style={{ display: "grid", gap: "1rem" }}>
                <ChipRow label="Visual signals" chips={["soft diffused light", "muted earthy palette", "grainy film texture", "wide environmental frame"]} chipColor={roseChip} />
                <ChipRow label="Tone register" chips={["restrained authority", "peer-level directness", "quiet fatigue"]} chipColor={neutralChip} />
                <ChipRow label="Strategic pattern" chips={["tension before resolution", "problem-first", "social proof light"]} chipColor={dimChip} />
                <ChipRow label="Audience signal" chips={["senior operators", "time-pressured founders"]} chipColor={dimChip} />
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                  <ChipRow label="Avoid" chips={["no studio lighting", "avoid polished perfection", "no motivational energy"]} chipColor={avoidChip} />
                </div>
              </div>

              {/* Routing indicator */}
              <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: 8, borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)", padding: "10px 14px", background: "rgba(255,255,255,0.02)" }}>
                <div className="soma-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#C8907A", flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", margin: 0 }}>
                  Routing visual → image prompt · tone → caption · constraints → all
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────────────

function CtaSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="soma-section-padding" style={{ position: "relative", padding: "8rem 1.5rem", overflow: "hidden", textAlign: "center" }}>
      {/* ambient glow */}
      <div
        className="soma-orb-1"
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,144,122,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div className="soma-reveal" style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#89808F", marginBottom: 16 }}>
          Get started
        </p>
        <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(2.4rem, 5vw, 3.75rem)", color: "#EEE8E4", lineHeight: 1.15, marginBottom: "1.25rem" }}>
          Train your marketing system.
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#5A5060", marginBottom: "2.5rem" }}>
          SOMA conditions your brand&apos;s creative intelligence. Content that learns. Identity that compounds.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <button
            onClick={onLogin}
            style={{
              borderRadius: 999,
              padding: "14px 32px",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
              color: "#0B0A0E",
              transition: "opacity 0.15s",
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
              padding: "13px 32px",
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
            Login
          </button>
        </div>
      </div>
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
          style={{ height: 28, width: "auto", opacity: 0.35 }}
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
  useScrollReveal();

  function openLogin() { setModalOpen(true); }
  function closeLogin() { setModalOpen(false); }

  function handleAuth() {
    localStorage.setItem("soma-auth", "true");
    setModalOpen(false);
    router.push("/app");
  }

  function scrollToSystem() {
    const container = document.querySelector(".soma-scroll") as HTMLElement | null;
    const target = document.getElementById("how-it-works");
    if (!container || !target) return;
    container.scrollTo({ top: target.offsetTop - 80, behavior: "smooth" });
  }

  return (
    <div
      className="soma-scroll"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        overflowY: "auto",
        overflowX: "hidden",
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
          .soma-hero-inner {
            padding-top: 5.25rem !important;
            padding-bottom: 2.5rem !important;
            gap: 2rem !important;
          }
          .soma-hero-card {
            max-height: 310px;
            overflow: hidden;
            -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
            mask-image: linear-gradient(to bottom, #000 55%, transparent 100%);
          }
          .soma-section-padding {
            padding-top: 4.5rem !important;
            padding-bottom: 4.5rem !important;
          }
        }
      `}</style>
      {modalOpen && <LoginModal onAuth={handleAuth} onClose={closeLogin} />}
      <SomaNav onLogin={openLogin} />

      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "0 1.5rem",
        }}
      >
        {/* Ambient orbs */}
        <div
          className="soma-orb-1"
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            left: "50%",
            top: "40%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,144,122,0.065) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          className="soma-orb-2"
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            right: -80,
            top: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,191,160,0.045) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="soma-hero-inner"
          style={{
            position: "relative",
            maxWidth: 1152,
            margin: "0 auto",
            width: "100%",
            flex: 1,
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "4rem",
            paddingTop: "7rem",
            paddingBottom: "5rem",
          }}
        >
          {/* Left: copy */}
          <div style={{ flex: "1 1 320px", maxWidth: 520 }}>
            {/* Tag */}
            <div
              className="soma-tag"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(27,24,32,0.75)",
                padding: "6px 16px",
                marginBottom: "2rem",
              }}
            >
              <div className="soma-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#C8907A" }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#89808F" }}>
                SOMA by MINDRA
              </span>
            </div>

            {/* Headline */}
            <h1
              className="soma-headline"
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontSize: "clamp(3rem, 6vw, 4.75rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "#EEE8E4",
                margin: 0,
              }}
            >
              Your brand<br />
              develops{" "}
              <span className="soma-shimmer-text">memory.</span>
            </h1>

            {/* Sub */}
            <p
              className="soma-sub"
              style={{
                marginTop: "1.75rem",
                fontSize: "clamp(14px, 1.5vw, 16px)",
                lineHeight: 1.85,
                color: "#5A5060",
                maxWidth: 400,
              }}
            >
              SOMA conditions your creative intelligence across every campaign. References in. Signals extracted. Identity that compounds.
            </p>

            {/* CTAs */}
            <div className="soma-ctas" style={{ marginTop: "2.5rem", display: "flex", flexWrap: "wrap", gap: 14 }}>
              <button
                onClick={openLogin}
                style={{
                  borderRadius: 999,
                  padding: "14px 28px",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #C8907A 0%, #D4BFA0 100%)",
                  color: "#0B0A0E",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Try SOMA
              </button>
              <button
                onClick={scrollToSystem}
                style={{
                  borderRadius: 999,
                  padding: "13px 28px",
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
                Explore the system
              </button>
            </div>
          </div>

          {/* Right: intelligence card */}
          <div className="soma-hero-card" style={{ flex: "1 1 320px", maxWidth: 480, width: "100%" }}>
            <IntelligenceCard />
          </div>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            opacity: 0.3,
            animation: "soma-fade-in 1s ease-out 1.5s both",
          }}
        >
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, #C8907A)" }} />
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#C8907A" }}>scroll</span>
        </div>
      </section>

      <DifferentiatorsSection />
      <VisualIntelligenceSection />
      <CtaSection onLogin={openLogin} />
      <SomaFooter />
    </div>
  );
}
