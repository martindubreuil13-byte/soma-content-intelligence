"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Brain,
  CalendarDays,
  CheckSquare,
  Clock,
  LayoutDashboard,
  LogOut,
  Package,
  Share2,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppWorkspaceContext } from "@/lib/workspace/workspace-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

const navItems: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/training", label: "Training", icon: Zap },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/queue", label: "Queue", icon: CheckSquare },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/channels", label: "Channels", icon: Share2, badge: "soon" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ context }: { context: AppWorkspaceContext }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.07] bg-charcoal/90 backdrop-blur-2xl lg:flex lg:flex-col">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <Link href="/app" className="block">
          <Image
            src="/logos/soma-logo-white.png"
            alt="SOMA by MINDRA"
            width={1536}
            height={1024}
            priority
            className="h-auto w-[124px] opacity-95"
          />
        </Link>
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-2xl shadow-black/20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-peach/55">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {context.organization.name}
          </p>
          <p className="mt-1 text-xs capitalize text-white/38">{context.role}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-1">
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition duration-200",
                  isActive
                    ? "border border-white/[0.08] bg-white/[0.1] text-white shadow-lg shadow-black/10"
                    : "text-white/48 hover:bg-white/[0.06] hover:text-white/85"
                )}
              >
                <item.icon
                  size={17}
                  className={clsx(
                    "shrink-0",
                    isActive ? "text-peach" : "text-white/34 group-hover:text-white/55"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full border border-plasma/20 bg-plasma/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-peach/70">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-peach">
            {(context.user.email ?? "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white/72">
              {context.user.email ?? "Signed in"}
            </p>
            <p className="text-[10px] text-white/30">SOMA operator</p>
          </div>
        </div>
        <button
          onClick={() => {
            void handleLogout();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white/50 transition hover:bg-white/[0.07] hover:text-white"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
