import type { Metadata } from "next";
import { SomaLandingPage } from "@/components/soma/landing-page";

export const metadata: Metadata = {
  title: "SOMA by MINDRA — Adaptive Creative Intelligence",
  description:
    "SOMA conditions your brand's creative intelligence across every campaign. Content that learns. Identity that compounds.",
};

export default function HomePage() {
  return <SomaLandingPage />;
}
