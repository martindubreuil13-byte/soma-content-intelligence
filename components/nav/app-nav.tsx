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
  Share2,
  Users,
  Zap
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
};

const navItems: NavItem[] = [
  { href: "/app", label: "Today", icon: LayoutDashboard },
  { href: "/queue", label: "Queue", icon: CheckSquare },
  { href: "/training", label: "Training", icon: Zap },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/channels", label: "Channels", icon: Share2, badge: "soon" },
  { href: "/schedule", label: "Schedule", icon: Clock }
];

// Mobile bottom bar shows only the 5 most important items
const mobileItems = navItems.slice(0, 5);

function DesktopNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition duration-200",
        isActive
          ? "bg-white/[0.1] text-white"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/85"
      )}
    >
      <item.icon
        size={17}
        className={clsx("shrink-0", isActive ? "text-peach" : "text-white/38")}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/30">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition duration-200",
        isActive ? "text-white" : "text-white/40 hover:text-white/70"
      )}
    >
      <item.icon
        size={20}
        className={clsx("shrink-0", isActive ? "text-peach" : "text-white/38")}
      />
      <span className="leading-tight">{item.label}</span>
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    localStorage.removeItem("soma-auth");
    router.push("/");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/[0.07] bg-charcoal/95 backdrop-blur-xl lg:flex">
        <div className="flex h-14 items-center justify-between border-b border-white/[0.07] px-4">
          <Image
            src="/logos/soma-logo-white.png"
            alt="SOMA by MINDRA"
            width={1536}
            height={1024}
            priority
            className="h-10 w-auto transition-opacity duration-300 hover:opacity-90"
          />
          <span className="rounded-full border border-plasma/30 bg-plasma/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-peach">
            Autopilot
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="grid gap-0.5">
            {navItems.map((item) => (
              <DesktopNavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>
        </nav>
        <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-3">
          <p className="text-[10px] text-white/22">Content Autopilot</p>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center justify-center rounded-xl p-1.5 text-white/25 transition hover:bg-white/[0.06] hover:text-white/60"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.07] bg-charcoal/95 px-4 backdrop-blur-xl lg:hidden">
        <Image
          src="/logos/soma-logo-white.png"
          alt="SOMA by MINDRA"
          width={1536}
          height={1024}
          priority
          className="h-8 w-auto transition-opacity duration-300 hover:opacity-90"
        />
        <span className="rounded-full border border-plasma/30 bg-plasma/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-peach">
          Autopilot
        </span>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.07] bg-charcoal/95 backdrop-blur-xl lg:hidden">
        {mobileItems.map((item) => (
          <MobileNavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold text-white/30 transition hover:text-white/60"
        >
          <LogOut size={20} className="shrink-0 text-white/25" />
          <span className="leading-tight">Sign out</span>
        </button>
      </nav>
    </>
  );
}
