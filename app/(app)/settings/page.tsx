import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PremiumPanel } from "@/components/soma/premium-panel";

const SETTING_GROUPS = [
  {
    label: "Content generation",
    items: [
      { title: "Schedule",      description: "Configure when SOMA generates content",   href: "/schedule" },
      { title: "Channels",      description: "Manage publishing channels and formats",   href: "/channels", badge: "soon" },
    ],
  },
  {
    label: "Audience & targeting",
    items: [
      { title: "Groups",        description: "Manage audience segments",                 href: "/groups" },
      { title: "Calendar",      description: "Content calendar overview",                href: "/calendar" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { title: "Organization",  description: "Workspace name and billing",               href: "#",  badge: "soon" },
      { title: "Integrations",  description: "Connect publishing platforms",             href: "#",  badge: "soon" },
      { title: "Team",          description: "Invite collaborators",                     href: "#",  badge: "soon" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-2xl space-y-7">

        {/* Header */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">Settings</p>
          <h1 className="mt-1.5 font-display text-2xl text-white">Workspace configuration</h1>
          <p className="mt-2 text-sm text-white/40">Manage channels, schedules, and workspace preferences.</p>
        </div>

        {SETTING_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 rounded-[16px] p-4 transition duration-200"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(26, 20, 36, 0.45)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/65 group-hover:text-white/85 transition">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/28">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-white/30">{item.description}</p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-white/20 group-hover:text-white/45 transition" />
                </Link>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
