import type { Metadata } from "next";
import { Space_Grotesk, Fraunces } from "next/font/google";
import { AppNav } from "@/components/nav/app-nav";
import "./globals.css";

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "ALPA Content Autopilot",
  description: "Mobile-first human-in-the-loop content operating system"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable}`}>
        <AppNav />
        {/* desktop: offset for sidebar; mobile: offset for bottom nav */}
        <div className="min-h-screen pb-20 lg:pb-0 lg:pl-56">
          {children}
        </div>
      </body>
    </html>
  );
}
