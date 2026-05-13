import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOMA by MINDRA — Adaptive Creative Intelligence",
  description:
    "SOMA conditions your brand's creative intelligence across every campaign. Content that learns. Identity that compounds.",
};

export default function SomaLayout({ children }: { children: React.ReactNode }) {
  return (
    // Fixed full-viewport overlay — independent of ALPA shell
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
      {children}
    </div>
  );
}
