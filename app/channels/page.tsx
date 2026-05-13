import { CheckCircle2, Clock } from "lucide-react";

type ChannelStatus = "manual" | "coming_soon" | "planned";

const channels: {
  id: string;
  name: string;
  status: ChannelStatus;
  description: string;
  note?: string;
}[] = [
  {
    id: "linkedin_profile",
    name: "LinkedIn Profile",
    status: "manual",
    description: "Post to your personal LinkedIn profile.",
    note: "Copy caption and image from the Publishing Queue, then paste directly into LinkedIn."
  },
  {
    id: "linkedin_page",
    name: "LinkedIn Page",
    status: "coming_soon",
    description: "Auto-publish to a LinkedIn Company Page via API."
  },
  {
    id: "facebook_page",
    name: "Facebook Page",
    status: "coming_soon",
    description: "Auto-publish to a Facebook Business Page."
  },
  {
    id: "facebook_groups",
    name: "Facebook Groups",
    status: "manual",
    description: "Manual group posting with the Groups Assistant.",
    note: "Use the Groups Assistant to copy captions and track what's been posted per group."
  },
  {
    id: "instagram",
    name: "Instagram Business",
    status: "coming_soon",
    description: "Publish images and captions to an Instagram Business account."
  },
  {
    id: "tiktok",
    name: "TikTok",
    status: "planned",
    description: "Content adapted for TikTok format."
  }
];

const statusConfig: Record<ChannelStatus, { label: string; color: string }> = {
  manual: { label: "Manual assisted", color: "ember" },
  coming_soon: { label: "Coming soon", color: "white" },
  planned: { label: "Planned", color: "white" }
};

export default function ChannelsPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Distribution</p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Channels</h1>
          <p className="mt-2 text-sm text-white/45">
            Platform connections and distribution paths. Direct publishing is coming in future phases.
          </p>
        </div>

        <div className="mb-6 rounded-[20px] border border-peach/15 bg-peach/[0.05] px-5 py-4">
          <p className="text-sm leading-6 text-white/65">
            <span className="font-semibold text-peach">Current approach:</span> Use the Publishing Queue to copy captions and download images. Post manually to each platform. The Groups Assistant helps with group-specific distribution. Direct API publishing will be activated per channel as connectors are built.
          </p>
        </div>

        <div className="grid gap-3">
          {channels.map((channel) => {
            const config = statusConfig[channel.status];
            return (
              <div
                key={channel.id}
                className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{channel.name}</p>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          config.color === "ember"
                            ? "border-ember/25 bg-ember/10 text-peach"
                            : "border-white/10 bg-white/[0.05] text-white/45"
                        }`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/50">{channel.description}</p>
                    {channel.note ? (
                      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-white/38">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400/60" />
                        {channel.note}
                      </p>
                    ) : (
                      <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-white/30">
                        <Clock size={12} className="mt-0.5 shrink-0 text-white/25" />
                        Not yet active in this version.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
