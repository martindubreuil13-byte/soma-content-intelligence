"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Brain,
  Eye,
  Layers,
  LogOut,
  SlidersHorizontal,
  Sparkles,
  Target,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppWorkspaceContext } from "@/lib/workspace/workspace-context";
import { AgentOrb } from "@/components/soma/agent-orb";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  catches?: string[];
};

const navItems: NavItem[] = [
  { href: "/app",       label: "Today",    icon: Sparkles },
  { href: "/missions",  label: "Missions", icon: Target },
  { href: "/review",    label: "Review",   icon: Eye },
  {
    href: "/memory",
    label: "Memory",
    icon: Brain,
    catches: ["/intelligence", "/training"],
  },
  { href: "/assets",   label: "Assets",   icon: Layers },
  { href: "/queue",    label: "Queue",    icon: Clock },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

function isActivePath(pathname: string, item: NavItem) {
  if (item.href === "/app") return pathname === "/app";
  if (item.catches?.some((c) => pathname.startsWith(c))) return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function scoreToMaturityLevel(score: number): number {
  if (score >= 85) return 4;
  if (score >= 65) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

interface AppSidebarProps {
  context: AppWorkspaceContext;
  agentScore?: number;
}

export function AppSidebar({ context, agentScore = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const maturityLevel = scoreToMaturityLevel(agentScore);
  const initial = (context.user.email ?? "S").slice(0, 1).toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center lg:flex"
      style={{
        background: "linear-gradient(175deg, #100D1A 0%, #0C0910 50%, #0F0B15 100%)",
        borderRight: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* SOMA orb — links to Today */}
      <div
        className="flex w-full shrink-0 items-center justify-center py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.045)" }}
      >
        <Link href="/app" className="group relative flex items-center justify-center">
          <AgentOrb state="idle" size="sm" maturityLevel={maturityLevel} />
          {/* Tooltip */}
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[10px] border border-white/[0.07] bg-[#1A1424]/95 px-3 py-1.5 text-[11px] font-semibold text-white/62 opacity-0 shadow-panel backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
            SOMA Today
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-0.5 py-3 px-2 w-full">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <div key={item.href} className="group relative w-full flex justify-center">
              <Link
                href={item.href}
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-[13px] transition duration-200",
                  active
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.05]"
                )}
              >
                <item.icon
                  size={17}
                  className={clsx(
                    "shrink-0 transition",
                    active
                      ? "text-violet-pale"
                      : "text-white/28 group-hover:text-white/55"
                  )}
                />
                {active && (
                  <span className="absolute right-1.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-violet-soft/70" />
                )}
              </Link>
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-[10px] border border-white/[0.07] bg-[#1A1424]/95 px-3 py-1.5 text-[11px] font-semibold text-white/62 opacity-0 shadow-panel backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="flex w-full shrink-0 flex-col items-center gap-2 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
      >
        {/* User initial */}
        <div
          title={context.user.email ?? "Signed in"}
          className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-soma-pearl"
        >
          {initial}
        </div>
        {/* Logout */}
        <button
          onClick={() => { void handleLogout(); }}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.06] bg-transparent text-white/25 transition hover:bg-white/[0.06] hover:text-white/55"
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}
