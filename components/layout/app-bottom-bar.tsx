"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Brain, Eye, Sparkles, Target, Clock } from "lucide-react";

const items = [
  { href: "/app",      icon: Sparkles, label: "Today" },
  { href: "/missions", icon: Target,   label: "Missions" },
  { href: "/review",   icon: Eye,      label: "Review" },
  { href: "/memory",   icon: Brain,    label: "Memory" },
  { href: "/queue",    icon: Clock,    label: "Queue" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppBottomBar() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around lg:hidden"
      style={{
        height: 56,
        background: "rgba(12,9,16,0.92)",
        borderTop: "1px solid rgba(255,255,255,0.055)",
        backdropFilter: "blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map(({ href, icon: Icon, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 transition",
              active ? "text-violet-pale" : "text-white/28"
            )}
          >
            <Icon size={19} />
            <span className={clsx("text-[9px] font-semibold", active ? "opacity-80" : "opacity-0")}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
