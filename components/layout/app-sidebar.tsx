"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Brain,
  CheckSquare,
  Eye,
  Layers,
  LogOut,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppWorkspaceContext } from "@/lib/workspace/workspace-context";
import { MaturityIndicator } from "@/components/soma/maturity-indicator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
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

interface AppSidebarProps {
  context: AppWorkspaceContext;
  agentScore?: number;
}

export function AppSidebar({ context, agentScore = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col lg:flex"
      style={{
        background: "linear-gradient(175deg, #100D1A 0%, #0C0910 50%, #0F0B15 100%)",
        borderRight: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
        <Link href="/app" className="block">
          <Image
            src="/logos/soma-logo-white.png"
            alt="SOMA"
            width={1536}
            height={1024}
            priority
            className="h-auto w-[108px] opacity-90"
          />
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-soft opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-violet-pale" />
          </div>
          <p className="truncate text-[11px] font-semibold text-white/40">
            {context.organization.name}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-0.5">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition duration-200",
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-white/42 hover:bg-white/[0.05] hover:text-white/72"
                )}
              >
                <item.icon
                  size={16}
                  className={clsx(
                    "shrink-0 transition",
                    active
                      ? "text-violet-pale"
                      : "text-white/28 group-hover:text-white/50"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/30">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-violet-soft" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Maturity strip */}
      <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div className="pt-4">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
            Agent maturity
          </p>
          <MaturityIndicator score={agentScore} compact />
        </div>
      </div>

      {/* User footer */}
      <div className="px-4 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div className="flex items-center gap-2.5 pt-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-soma-pearl">
            {(context.user.email ?? "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-white/60">
              {context.user.email ?? "Signed in"}
            </p>
            <p className="text-[9px] text-white/25">SOMA operator</p>
          </div>
          <button
            onClick={() => { void handleLogout(); }}
            className="flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
