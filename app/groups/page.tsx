"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Check, Clipboard, ExternalLink, Loader2, Plus, Trash2, Users } from "lucide-react";
import type { GroupTarget } from "@/lib/autopilot-types";

type Platform = "facebook" | "linkedin";

const platformColors: Record<Platform, string> = {
  facebook: "border-blue-400/25 bg-blue-400/10 text-blue-300",
  linkedin: "border-sky-400/25 bg-sky-400/10 text-sky-300"
};

function GroupCard({ group, onDelete, onToggle }: {
  group: GroupTarget;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}) {
  return (
    <div className={clsx(
      "overflow-hidden rounded-[20px] border bg-white/[0.04] px-4 py-3.5 transition",
      group.isActive ? "border-white/10" : "border-white/[0.05] opacity-50"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">{group.name}</p>
            <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", platformColors[group.platform])}>
              {group.platform}
            </span>
            {!group.isActive && (
              <span className="text-[10px] text-white/35">Inactive</span>
            )}
          </div>
          {group.url && (
            <a
              href={group.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs text-peach/60 hover:text-peach transition"
            >
              <ExternalLink size={11} />
              {group.url.replace(/^https?:\/\//, "")}
            </a>
          )}
          {group.notes && (
            <p className="mt-1.5 text-xs text-white/42">{group.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(group.id, !group.isActive)}
            className="rounded-xl p-1.5 text-white/30 hover:text-peach transition"
            title={group.isActive ? "Deactivate" : "Activate"}
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(group.id)}
            className="rounded-xl p-1.5 text-white/25 hover:text-plasma transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddGroupForm({ onAdd }: { onAdd: (group: GroupTarget) => void }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), platform, url: url.trim() || undefined })
      });
      const result = (await response.json()) as { ok?: boolean; target?: GroupTarget };
      if (result.ok && result.target) {
        onAdd(result.target);
        setName("");
        setUrl("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Add group</p>
      <div className="grid gap-3">
        <div className="flex gap-2">
          {(["facebook", "linkedin"] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={clsx(
                "flex-1 rounded-2xl border py-2.5 text-sm font-semibold capitalize transition",
                platform === p
                  ? "border-white/20 bg-white/[0.1] text-white"
                  : "border-white/10 bg-white/[0.04] text-white/45 hover:border-white/15 hover:text-white/70"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/30 focus:border-plasma/40"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/30 focus:border-plasma/40"
          placeholder="Group URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="flex items-center justify-center gap-2 rounded-2xl border border-plasma/30 bg-plasma/[0.1] py-2.5 text-sm font-semibold text-peach transition hover:border-plasma/50 hover:bg-plasma/[0.16] hover:text-white disabled:opacity-40"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          Add Group
        </button>
      </div>
    </form>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: { targets?: GroupTarget[] }) => setGroups(data.targets ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleToggle(id: string, isActive: boolean) {
    const response = await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive })
    });
    const result = (await response.json()) as { ok?: boolean; target?: GroupTarget };
    if (result.ok && result.target) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isActive } : g)));
    }
  }

  const facebookGroups = groups.filter((g) => g.platform === "facebook");
  const linkedinGroups = groups.filter((g) => g.platform === "linkedin");

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Manual Distribution</p>
            <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Groups Assistant</h1>
            <p className="mt-2 text-sm text-white/45">
              Manage your target Facebook and LinkedIn groups for manual posting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-4 py-2.5 text-sm font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14] hover:text-white"
          >
            <Plus size={15} />
            Add Group
          </button>
        </div>

        {/* How it works */}
        <div className="mb-6 rounded-[20px] border border-peach/15 bg-peach/[0.05] px-5 py-4">
          <p className="text-sm leading-6 text-white/65">
            <span className="font-semibold text-peach">Manual distribution, assisted.</span> Official group auto-posting isn&apos;t reliable across platforms. This assistant helps you post faster — copy a caption, download an image, and mark groups as done. No browser automation. No stored credentials.
          </p>
        </div>

        {showForm && (
          <div className="mb-6">
            <AddGroupForm onAdd={(g) => { setGroups((prev) => [...prev, g]); setShowForm(false); }} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-16 text-white/40">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm">Loading groups…</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] p-10 text-center">
            <Users size={28} className="mb-4 text-peach/35" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/35">No groups yet</p>
            <h2 className="mt-3 font-display text-2xl text-white">Add your target groups</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/45">
              Add the Facebook and LinkedIn groups you post to regularly. The assistant will help you copy content and track what&apos;s been posted.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {facebookGroups.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400/60">
                  Facebook Groups ({facebookGroups.length})
                </p>
                <div className="grid gap-2">
                  {facebookGroups.map((g) => (
                    <GroupCard key={g.id} group={g} onDelete={handleDelete} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}
            {linkedinGroups.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/60">
                  LinkedIn Groups ({linkedinGroups.length})
                </p>
                <div className="grid gap-2">
                  {linkedinGroups.map((g) => (
                    <GroupCard key={g.id} group={g} onDelete={handleDelete} onToggle={handleToggle} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
