"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit2,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { Angle, CTAStyle, HookStyle, ICP, NegativeConstraint } from "@/lib/brand-intelligence";
import type { ExtractedTags } from "@/app/api/brand/generate-intelligence/route";
import type { ContentChannel } from "@/lib/content-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "icps" | "angles" | "hooks" | "ctas" | "constraints";
type ChipItem = { id: string; label: string; score?: number };

const allChannels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];
const constraintCategories = ["language", "tone", "structure", "visual"] as const;

const tabs: { id: Tab; label: string }[] = [
  { id: "icps", label: "ICPs" },
  { id: "angles", label: "Angles" },
  { id: "hooks", label: "Hook Styles" },
  { id: "ctas", label: "CTA Styles" },
  { id: "constraints", label: "Constraints" },
];

const VALID_PLATFORMS = new Set<string>(["linkedin", "facebook", "instagram", "tiktok"]);

// ─── Shared utilities ─────────────────────────────────────────────────────────

function parseList(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const inputClass =
  "rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2 text-sm text-white/78 outline-none placeholder:text-white/30 focus:border-plasma/45 focus:bg-white/[0.07] transition";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-white/55">
      {children}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={clsx(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        isActive
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-300"
          : "border-white/10 bg-white/[0.04] text-white/30"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function FormActions({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-2xl border border-emerald-300/35 bg-emerald-300/[0.12] px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.18] disabled:opacity-40"
      >
        <Check size={13} />
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/55 transition hover:text-white/80 disabled:opacity-40"
      >
        Cancel
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-peach/55">{label}</span>
      {children}
    </label>
  );
}

function PlatformCheckboxes({
  value,
  onChange,
}: {
  value: ContentChannel[];
  onChange: (v: ContentChannel[]) => void;
}) {
  function toggle(ch: ContentChannel) {
    onChange(value.includes(ch) ? value.filter((c) => c !== ch) : [...value, ch]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {allChannels.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => toggle(ch)}
          className={clsx(
            "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition",
            value.includes(ch)
              ? "border-peach/40 bg-peach/[0.12] text-peach"
              : "border-white/10 bg-white/[0.04] text-white/40 hover:border-white/20 hover:text-white/65"
          )}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

// ─── ChipTag ──────────────────────────────────────────────────────────────────

function ChipTag({
  label,
  onRemove,
  score,
  variant = "default",
}: {
  label: string;
  onRemove: () => void;
  score?: number;
  variant?: "default" | "staged";
}) {
  const base =
    variant === "staged"
      ? "border-peach/22 bg-peach/[0.09] text-peach/85"
      : "border-white/14 bg-white/[0.08] text-white/75 hover:border-white/22";

  return (
    <span
      className={clsx(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
        base
      )}
    >
      {score !== undefined && score > 30 && (
        <span className="text-[9px] font-bold text-emerald-400 leading-none">{score}%</span>
      )}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className={clsx(
          "ml-0.5 rounded-full p-0.5 transition",
          variant === "staged"
            ? "text-peach/35 hover:text-plasma"
            : "text-white/30 hover:text-plasma"
        )}
        title="Remove"
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ─── ChipSection (current intelligence) ──────────────────────────────────────

function ChipSection({
  title,
  chips,
  onRemove,
  onAdd,
  emptyNote,
}: {
  title: string;
  chips: ChipItem[];
  onRemove: (id: string) => void;
  onAdd: (label: string) => void;
  emptyNote?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commit() {
    if (input.trim()) onAdd(input.trim());
    setInput("");
    setAdding(false);
  }

  return (
    <div className="grid gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <ChipTag key={c.id} label={c.label} score={c.score} onRemove={() => onRemove(c.id)} />
        ))}
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setInput(""); setAdding(false); }
              }}
              onBlur={() => { if (!input.trim()) setAdding(false); }}
              placeholder="type & press enter"
              className="w-38 rounded-full border border-plasma/40 bg-plasma/[0.07] px-3 py-1 text-xs text-white/80 outline-none placeholder:text-white/30 focus:border-plasma/60"
            />
            <button
              type="button"
              onClick={commit}
              className="rounded-full p-1 text-peach/70 hover:text-peach transition"
            >
              <Check size={11} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-white/30 hover:border-plasma/35 hover:text-white/55 transition"
          >
            <Plus size={10} /> add
          </button>
        )}
        {chips.length === 0 && !adding && emptyNote && (
          <span className="text-xs italic text-white/22">{emptyNote}</span>
        )}
      </div>
    </div>
  );
}

// ─── StagedTagGroup (AI extraction preview) ───────────────────────────────────

function StagedTagGroup({
  title,
  tags,
  onRemove,
  onAdd,
}: {
  title: string;
  tags: string[];
  onRemove: (i: number) => void;
  onAdd: (label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commit() {
    if (input.trim()) onAdd(input.trim());
    setInput("");
    setAdding(false);
  }

  if (tags.length === 0 && !adding) return null;

  return (
    <div className="grid gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-peach/55">{title}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map((t, i) => (
          <ChipTag
            key={`${t}-${i}`}
            label={t}
            variant="staged"
            onRemove={() => onRemove(i)}
          />
        ))}
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { setInput(""); setAdding(false); }
              }}
              onBlur={() => { if (!input.trim()) setAdding(false); }}
              placeholder="add tag…"
              className="w-28 rounded-full border border-peach/30 bg-peach/[0.06] px-3 py-1 text-xs text-white/80 outline-none placeholder:text-white/30"
            />
            <button type="button" onClick={commit} className="rounded-full p-1 text-peach/70 hover:text-peach transition">
              <Check size={11} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-peach/22 px-3 py-1 text-xs text-peach/35 hover:border-peach/40 hover:text-peach/60 transition"
          >
            <Plus size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ICP Form ─────────────────────────────────────────────────────────────────

function ICPForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ICP>;
  onSave: (data: Omit<ICP, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [painPoints, setPainPoints] = useState(initial?.painPoints?.join(", ") ?? "");
  const [frustrations, setFrustrations] = useState(initial?.frustrations?.join(", ") ?? "");
  const [aspirations, setAspirations] = useState(initial?.aspirations?.join(", ") ?? "");
  const [emotionalTriggers, setEmotionalTriggers] = useState(initial?.emotionalTriggers?.join(", ") ?? "");
  const [platforms, setPlatforms] = useState<ContentChannel[]>(initial?.platforms ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        description: description.trim(),
        painPoints: parseList(painPoints),
        frustrations: parseList(frustrations),
        aspirations: parseList(aspirations),
        desiredOutcomes: initial?.desiredOutcomes ?? [],
        emotionalTriggers: parseList(emotionalTriggers),
        platforms,
        isActive,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-plasma/20 bg-white/[0.04] p-4">
      <div className="grid gap-3">
        <FormField label="Name *">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Boutique Agencies"
          />
        </FormField>
        <FormField label="Description">
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short positioning description"
          />
        </FormField>
        <FormField label="Pain points (comma-separated)">
          <input
            className={inputClass}
            value={painPoints}
            onChange={(e) => setPainPoints(e.target.value)}
            placeholder="manual prospecting, inconsistent content"
          />
        </FormField>
        <FormField label="Frustrations (comma-separated)">
          <input
            className={inputClass}
            value={frustrations}
            onChange={(e) => setFrustrations(e.target.value)}
            placeholder="chasing clients manually, generic positioning"
          />
        </FormField>
        <FormField label="Aspirations (comma-separated)">
          <input
            className={inputClass}
            value={aspirations}
            onChange={(e) => setAspirations(e.target.value)}
            placeholder="predictable revenue, premium positioning"
          />
        </FormField>
        <FormField label="Emotional triggers (comma-separated)">
          <input
            className={inputClass}
            value={emotionalTriggers}
            onChange={(e) => setEmotionalTriggers(e.target.value)}
            placeholder="autonomy, burnout, recognition"
          />
        </FormField>
        <FormField label="Platform affinity">
          <PlatformCheckboxes value={platforms} onChange={setPlatforms} />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-emerald-400"
          />
          <span className="text-xs font-semibold text-white/60">Active</span>
        </label>
      </div>
      <FormActions onSave={handleSave} onCancel={onCancel} saving={saving} />
    </div>
  );
}

// ─── ICP Card ─────────────────────────────────────────────────────────────────

function ICPCard({
  icp,
  isEditing,
  onEdit,
  onDelete,
  onToggle,
  onSaveEdit,
}: {
  icp: ICP;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onSaveEdit: (data: Omit<ICP, "id" | "createdAt">) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (isEditing) {
    return <ICPForm initial={icp} onSave={onSaveEdit} onCancel={onEdit} />;
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
        }}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">{icp.label}</p>
            <ActiveBadge isActive={icp.isActive} />
          </div>
          <p className="mt-0.5 text-xs text-white/45">{icp.description}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-peach"
            title="Toggle active"
          >
            <Zap size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-white/70"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-plasma"
          >
            <Trash2 size={14} />
          </button>
          {open ? (
            <ChevronDown size={16} className="text-white/40" />
          ) : (
            <ChevronRight size={16} className="text-white/40" />
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <div className="grid gap-3 text-sm">
            {icp.painPoints.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-peach/55">Pain points</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.painPoints.map((p) => <Tag key={p}>{p}</Tag>)}
                </div>
              </div>
            )}
            {icp.emotionalTriggers.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-peach/55">Emotional triggers</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.emotionalTriggers.map((t) => <Tag key={t}>{t}</Tag>)}
                </div>
              </div>
            )}
            {icp.aspirations.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-peach/55">Aspirations</p>
                <div className="flex flex-wrap gap-1.5">
                  {icp.aspirations.map((a) => <Tag key={a}>{a}</Tag>)}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {icp.platforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-ember/25 bg-ember/10 px-2 py-0.5 text-xs capitalize text-peach"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Angle Form ───────────────────────────────────────────────────────────────

function AngleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Angle>;
  onSave: (
    data: Omit<Angle, "id" | "createdAt" | "approvalRate" | "usageCount" | "performanceScore">
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [platformAffinity, setPlatformAffinity] = useState<ContentChannel[]>(
    initial?.platformAffinity ?? []
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        description: description.trim(),
        tags: parseList(tags),
        platformAffinity,
        isActive,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-plasma/20 bg-white/[0.04] p-4">
      <div className="grid gap-3">
        <FormField label="Name *">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Operational Frustration"
          />
        </FormField>
        <FormField label="Description">
          <textarea
            className={clsx(inputClass, "min-h-[60px] resize-none")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What emotional/narrative angle does this represent?"
          />
        </FormField>
        <FormField label="Tags (comma-separated)">
          <input
            className={inputClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="pain, operations, efficiency"
          />
        </FormField>
        <FormField label="Platform affinity">
          <PlatformCheckboxes value={platformAffinity} onChange={setPlatformAffinity} />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-emerald-400"
          />
          <span className="text-xs font-semibold text-white/60">Active</span>
        </label>
      </div>
      <FormActions onSave={handleSave} onCancel={onCancel} saving={saving} />
    </div>
  );
}

// ─── Library Form (shared for hooks / CTAs) ───────────────────────────────────

function LibraryForm({
  initial,
  onSave,
  onCancel,
  exampleLabel = "Example",
}: {
  initial?: { label?: string; description?: string; example?: string; isActive?: boolean };
  onSave: (data: {
    label: string;
    description: string;
    example: string;
    isActive: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  exampleLabel?: string;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [example, setExample] = useState(initial?.example ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        description: description.trim(),
        example: example.trim(),
        isActive,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-plasma/20 bg-white/[0.04] p-4">
      <div className="grid gap-3">
        <FormField label="Name *">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Contrarian"
          />
        </FormField>
        <FormField label="Description">
          <textarea
            className={clsx(inputClass, "min-h-[56px] resize-none")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What tone or approach does this represent?"
          />
        </FormField>
        <FormField label={exampleLabel}>
          <input
            className={inputClass}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Example phrase or opening line"
          />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-emerald-400"
          />
          <span className="text-xs font-semibold text-white/60">Active</span>
        </label>
      </div>
      <FormActions onSave={handleSave} onCancel={onCancel} saving={saving} />
    </div>
  );
}

// ─── Constraint Form ──────────────────────────────────────────────────────────

function ConstraintForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<NegativeConstraint>;
  onSave: (data: Omit<NegativeConstraint, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<NegativeConstraint["category"]>(
    initial?.category ?? "language"
  );
  const [examples, setExamples] = useState(initial?.examples?.join(", ") ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        description: description.trim(),
        category,
        examples: parseList(examples),
        isActive,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[20px] border border-plasma/20 bg-white/[0.04] p-4">
      <div className="grid gap-3">
        <FormField label="Label *">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Generic AI language"
          />
        </FormField>
        <FormField label="Category">
          <select
            className={clsx(inputClass, "cursor-pointer")}
            value={category}
            onChange={(e) => setCategory(e.target.value as NegativeConstraint["category"])}
          >
            {constraintCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Reason / description">
          <textarea
            className={clsx(inputClass, "min-h-[56px] resize-none")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why is this banned?"
          />
        </FormField>
        <FormField label="Examples (comma-separated)">
          <input
            className={inputClass}
            value={examples}
            onChange={(e) => setExamples(e.target.value)}
            placeholder="leverage, unlock, game-changer"
          />
        </FormField>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-emerald-400"
          />
          <span className="text-xs font-semibold text-white/60">Active</span>
        </label>
      </div>
      <FormActions onSave={handleSave} onCancel={onCancel} saving={saving} />
    </div>
  );
}

// ─── Library Card (Angle / Hook / CTA) ───────────────────────────────────────

type LibraryItem = {
  id: string;
  label: string;
  description: string;
  example?: string;
  performanceScore?: number;
  tags?: string[];
  isActive?: boolean;
};

function LibraryCard({
  item,
  isEditing,
  onEdit,
  onDelete,
  onToggle,
  editForm,
}: {
  item: LibraryItem;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle?: () => void;
  editForm: React.ReactNode;
}) {
  if (isEditing) return <>{editForm}</>;

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{item.label}</p>
            {item.isActive !== undefined && <ActiveBadge isActive={item.isActive} />}
            {item.performanceScore !== undefined && item.performanceScore > 0 && (
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                {item.performanceScore}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/52">{item.description}</p>
          {item.example && (
            <p className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs italic leading-5 text-white/45">
              &ldquo;{item.example}&rdquo;
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl p-1.5 text-white/25 transition hover:text-peach"
              title="Toggle active"
            >
              <Zap size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-white/70"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-plasma"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constraint Card ──────────────────────────────────────────────────────────

function ConstraintCard({
  item,
  isEditing,
  onEdit,
  onDelete,
  onToggle,
  editForm,
}: {
  item: NegativeConstraint;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  editForm: React.ReactNode;
}) {
  const categoryColors: Record<string, string> = {
    language: "border-plasma/25 bg-plasma/10 text-peach",
    tone: "border-ember/25 bg-ember/10 text-peach",
    structure: "border-peach/25 bg-peach/10 text-peach",
    visual: "border-white/20 bg-white/[0.06] text-white/65",
  };

  if (isEditing) return <>{editForm}</>;

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{item.label}</p>
            <span
              className={clsx(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                categoryColors[item.category] ?? "border-white/10 bg-white/[0.05] text-white/55"
              )}
            >
              {item.category}
            </span>
            <ActiveBadge isActive={item.isActive} />
          </div>
          <p className="mt-1 text-xs leading-5 text-white/50">{item.description}</p>
          {item.examples.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.examples.map((ex) => (
                <span
                  key={ex}
                  className="rounded-xl border border-plasma/15 bg-plasma/[0.06] px-2 py-0.5 text-xs text-plasma/80"
                >
                  ❌ {ex}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-peach"
            title="Toggle active"
          >
            <Zap size={13} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-white/70"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-1.5 text-white/25 transition hover:text-plasma"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [icps, setICPs] = useState<ICP[]>([]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [hooks, setHooks] = useState<HookStyle[]>([]);
  const [ctas, setCTAs] = useState<CTAStyle[]>([]);
  const [constraints, setConstraints] = useState<NegativeConstraint[]>([]);
  const [loading, setLoading] = useState(true);

  // ── AI extraction state ─────────────────────────────────────────────────────
  const [extractOpen, setExtractOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [ctaGoal, setCtaGoal] = useState("");
  const [generating, setGenerating] = useState(false);
  const [staged, setStaged] = useState<ExtractedTags | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // ── Advanced editors state ──────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("icps");
  const [editingIcpId, setEditingIcpId] = useState<string | null>(null);
  const [editingAngleId, setEditingAngleId] = useState<string | null>(null);
  const [editingHookId, setEditingHookId] = useState<string | null>(null);
  const [editingCtaId, setEditingCtaId] = useState<string | null>(null);
  const [editingConstraintId, setEditingConstraintId] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/brand/icps").then((r) => r.json()),
      fetch("/api/brand/angles").then((r) => r.json()),
      fetch("/api/brand/hooks").then((r) => r.json()),
      fetch("/api/brand/ctas").then((r) => r.json()),
      fetch("/api/brand/constraints").then((r) => r.json()),
    ])
      .then(
        ([icpData, angleData, hookData, ctaData, constraintData]: [
          { icps?: ICP[] },
          { angles?: Angle[] },
          { hooks?: HookStyle[] },
          { ctas?: CTAStyle[] },
          { constraints?: NegativeConstraint[] },
        ]) => {
          const loadedIcps = icpData.icps ?? [];
          const loadedAngles = angleData.angles ?? [];
          setICPs(loadedIcps);
          setAngles(loadedAngles);
          setHooks(hookData.hooks ?? []);
          setCTAs(ctaData.ctas ?? []);
          setConstraints(constraintData.constraints ?? []);
          if (loadedIcps.length === 0 && loadedAngles.length === 0) {
            setExtractOpen(true);
          }
        }
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── AI extraction ───────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!problem.trim() && !solution.trim()) return;
    setGenerating(true);
    setStaged(null);
    setApplyError(null);
    try {
      const res = await fetch("/api/brand/generate-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, solution, cta: ctaGoal }),
      });
      const json = (await res.json()) as { ok?: boolean; tags?: ExtractedTags; error?: string };
      if (json.tags) setStaged(json.tags);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  function patchStaged<K extends keyof ExtractedTags>(
    key: K,
    fn: (prev: string[]) => string[]
  ) {
    setStaged((s) => (s ? { ...s, [key]: fn(s[key]) } : s));
  }

  async function handleApply() {
    if (!staged) return;
    setApplying(true);
    setApplyError(null);
    try {
      const validPlatforms = staged.platforms.filter((p): p is ContentChannel =>
        VALID_PLATFORMS.has(p)
      );

      await Promise.all([
        ...staged.audiences.map((label) =>
          fetch("/api/brand/icps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label,
              description: "",
              painPoints: staged.painPoints,
              frustrations: [],
              aspirations: staged.aspirations,
              desiredOutcomes: [],
              emotionalTriggers: staged.emotionalTriggers,
              platforms: validPlatforms,
              isActive: true,
            }),
          })
        ),
        ...staged.angles.map((label) =>
          fetch("/api/brand/angles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label,
              description: "",
              tags: [],
              platformAffinity: validPlatforms,
              isActive: true,
            }),
          })
        ),
        ...staged.hookStyles.map((label) =>
          fetch("/api/brand/hooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label, description: "", example: "", isActive: true }),
          })
        ),
        ...staged.ctaStyles.map((label) =>
          fetch("/api/brand/ctas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label, description: "", example: "", isActive: true }),
          })
        ),
        ...staged.constraints.map((label) =>
          fetch("/api/brand/constraints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label,
              description: "",
              category: "language",
              examples: [],
              isActive: true,
            }),
          })
        ),
      ]);

      setStaged(null);
      setExtractOpen(false);
      fetchAll();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Failed to apply intelligence.");
    } finally {
      setApplying(false);
    }
  }

  // ── Chip actions (current intelligence) ─────────────────────────────────────

  async function deactivateICP(icp: ICP) {
    const res = await fetch(`/api/brand/icps/${icp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...icp, isActive: false }),
    });
    const json = (await res.json()) as { icp?: ICP };
    if (json.icp) setICPs((prev) => prev.map((i) => (i.id === icp.id ? json.icp! : i)));
  }

  async function addAudienceChip(label: string) {
    const res = await fetch("/api/brand/icps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        description: "",
        painPoints: [],
        frustrations: [],
        aspirations: [],
        desiredOutcomes: [],
        emotionalTriggers: [],
        platforms: [],
        isActive: true,
      }),
    });
    const json = (await res.json()) as { icp?: ICP };
    if (json.icp) setICPs((prev) => [...prev, json.icp!]);
  }

  async function deactivateAngle(angle: Angle) {
    const res = await fetch(`/api/brand/angles/${angle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...angle, isActive: false }),
    });
    const json = (await res.json()) as { angle?: Angle };
    if (json.angle) setAngles((prev) => prev.map((a) => (a.id === angle.id ? json.angle! : a)));
  }

  async function addAngleChip(label: string) {
    const res = await fetch("/api/brand/angles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description: "", tags: [], platformAffinity: [], isActive: true }),
    });
    const json = (await res.json()) as { angle?: Angle };
    if (json.angle) setAngles((prev) => [...prev, json.angle!]);
  }

  async function deactivateHook(hook: HookStyle) {
    const res = await fetch(`/api/brand/hooks/${hook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...hook, isActive: false }),
    });
    const json = (await res.json()) as { hook?: HookStyle };
    if (json.hook) setHooks((prev) => prev.map((h) => (h.id === hook.id ? json.hook! : h)));
  }

  async function addHookChip(label: string) {
    const res = await fetch("/api/brand/hooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description: "", example: "", isActive: true }),
    });
    const json = (await res.json()) as { hook?: HookStyle };
    if (json.hook) setHooks((prev) => [...prev, json.hook!]);
  }

  async function deactivateCTA(cta: CTAStyle) {
    const res = await fetch(`/api/brand/ctas/${cta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cta, isActive: false }),
    });
    const json = (await res.json()) as { cta?: CTAStyle };
    if (json.cta) setCTAs((prev) => prev.map((c) => (c.id === cta.id ? json.cta! : c)));
  }

  async function addCTAChip(label: string) {
    const res = await fetch("/api/brand/ctas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description: "", example: "", isActive: true }),
    });
    const json = (await res.json()) as { cta?: CTAStyle };
    if (json.cta) setCTAs((prev) => [...prev, json.cta!]);
  }

  async function deactivateConstraint(c: NegativeConstraint) {
    const res = await fetch(`/api/brand/constraints/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, isActive: false }),
    });
    const json = (await res.json()) as { constraint?: NegativeConstraint };
    if (json.constraint) setConstraints((prev) => prev.map((nc) => (nc.id === c.id ? json.constraint! : nc)));
  }

  async function addConstraintChip(label: string) {
    const res = await fetch("/api/brand/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, description: "", category: "language", examples: [], isActive: true }),
    });
    const json = (await res.json()) as { constraint?: NegativeConstraint };
    if (json.constraint) setConstraints((prev) => [...prev, json.constraint!]);
  }

  // ── Advanced CRUD handlers ───────────────────────────────────────────────────

  async function handleSaveICP(data: Omit<ICP, "id" | "createdAt">, id?: string) {
    const res = await fetch(id ? `/api/brand/icps/${id}` : "/api/brand/icps", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { icp?: ICP };
    if (json.icp) setICPs((prev) => id ? prev.map((i) => (i.id === id ? json.icp! : i)) : [...prev, json.icp!]);
    setEditingIcpId(null);
  }

  async function handleDeleteICP(id: string) {
    await fetch(`/api/brand/icps/${id}`, { method: "DELETE" });
    setICPs((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleICP(icp: ICP) {
    const res = await fetch(`/api/brand/icps/${icp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...icp, isActive: !icp.isActive }),
    });
    const json = (await res.json()) as { icp?: ICP };
    if (json.icp) setICPs((prev) => prev.map((i) => (i.id === icp.id ? json.icp! : i)));
  }

  async function handleSaveAngle(
    data: Omit<Angle, "id" | "createdAt" | "approvalRate" | "usageCount" | "performanceScore">,
    id?: string
  ) {
    const res = await fetch(id ? `/api/brand/angles/${id}` : "/api/brand/angles", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { angle?: Angle };
    if (json.angle) setAngles((prev) => id ? prev.map((a) => (a.id === id ? json.angle! : a)) : [...prev, json.angle!]);
    setEditingAngleId(null);
  }

  async function handleDeleteAngle(id: string) {
    await fetch(`/api/brand/angles/${id}`, { method: "DELETE" });
    setAngles((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleToggleAngle(angle: Angle) {
    const res = await fetch(`/api/brand/angles/${angle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...angle, isActive: !angle.isActive }),
    });
    const json = (await res.json()) as { angle?: Angle };
    if (json.angle) setAngles((prev) => prev.map((a) => (a.id === angle.id ? json.angle! : a)));
  }

  async function handleSaveHook(
    data: { label: string; description: string; example: string; isActive: boolean },
    id?: string
  ) {
    const res = await fetch(id ? `/api/brand/hooks/${id}` : "/api/brand/hooks", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { hook?: HookStyle };
    if (json.hook) setHooks((prev) => id ? prev.map((h) => (h.id === id ? json.hook! : h)) : [...prev, json.hook!]);
    setEditingHookId(null);
  }

  async function handleDeleteHook(id: string) {
    await fetch(`/api/brand/hooks/${id}`, { method: "DELETE" });
    setHooks((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleToggleHook(hook: HookStyle) {
    const res = await fetch(`/api/brand/hooks/${hook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...hook, isActive: !hook.isActive }),
    });
    const json = (await res.json()) as { hook?: HookStyle };
    if (json.hook) setHooks((prev) => prev.map((h) => (h.id === hook.id ? json.hook! : h)));
  }

  async function handleSaveCTA(
    data: { label: string; description: string; example: string; isActive: boolean },
    id?: string
  ) {
    const res = await fetch(id ? `/api/brand/ctas/${id}` : "/api/brand/ctas", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { cta?: CTAStyle };
    if (json.cta) setCTAs((prev) => id ? prev.map((c) => (c.id === id ? json.cta! : c)) : [...prev, json.cta!]);
    setEditingCtaId(null);
  }

  async function handleDeleteCTA(id: string) {
    await fetch(`/api/brand/ctas/${id}`, { method: "DELETE" });
    setCTAs((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggleCTA(cta: CTAStyle) {
    const res = await fetch(`/api/brand/ctas/${cta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cta, isActive: !cta.isActive }),
    });
    const json = (await res.json()) as { cta?: CTAStyle };
    if (json.cta) setCTAs((prev) => prev.map((c) => (c.id === cta.id ? json.cta! : c)));
  }

  async function handleSaveConstraint(
    data: Omit<NegativeConstraint, "id" | "createdAt">,
    id?: string
  ) {
    const res = await fetch(id ? `/api/brand/constraints/${id}` : "/api/brand/constraints", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { constraint?: NegativeConstraint };
    if (json.constraint) setConstraints((prev) => id ? prev.map((c) => (c.id === id ? json.constraint! : c)) : [...prev, json.constraint!]);
    setEditingConstraintId(null);
  }

  async function handleDeleteConstraint(id: string) {
    await fetch(`/api/brand/constraints/${id}`, { method: "DELETE" });
    setConstraints((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleToggleConstraint(c: NegativeConstraint) {
    const res = await fetch(`/api/brand/constraints/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, isActive: !c.isActive }),
    });
    const json = (await res.json()) as { constraint?: NegativeConstraint };
    if (json.constraint) setConstraints((prev) => prev.map((nc) => (nc.id === c.id ? json.constraint! : nc)));
  }

  // ── Derived chip data ────────────────────────────────────────────────────────

  const activeAudiences: ChipItem[] = icps
    .filter((i) => i.isActive)
    .map((i) => ({ id: i.id, label: i.label }));

  const activeAngles: ChipItem[] = angles
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.id,
      label: a.label,
      score: a.performanceScore > 0 ? a.performanceScore : undefined,
    }));

  const activeHooks: ChipItem[] = hooks
    .filter((h) => h.isActive)
    .map((h) => ({
      id: h.id,
      label: h.label,
      score: h.performanceScore > 0 ? h.performanceScore : undefined,
    }));

  const activeCTAs: ChipItem[] = ctas
    .filter((c) => c.isActive)
    .map((c) => ({
      id: c.id,
      label: c.label,
      score: c.performanceScore > 0 ? c.performanceScore : undefined,
    }));

  const activeConstraints: ChipItem[] = constraints
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, label: c.label }));

  const totalActive =
    activeAudiences.length +
    activeAngles.length +
    activeHooks.length +
    activeCTAs.length +
    activeConstraints.length;

  const hasIntelligence = totalActive > 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">
            Strategic Control Center
          </p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Brand Intelligence</h1>
          <p className="mt-2 text-sm text-white/45">
            Describe your business. ALPA extracts the strategy that drives every generated piece.
          </p>
        </div>

        {/* ── AI Extraction Panel ── */}
        <div className="mb-5 overflow-hidden rounded-[20px] border border-plasma/22 bg-plasma/[0.04]">
          <button
            type="button"
            onClick={() => setExtractOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={15} className="text-plasma/65" />
              <span className="text-sm font-semibold text-white/80">
                Generate intelligence from a business description
              </span>
            </div>
            {extractOpen ? (
              <ChevronUp size={15} className="shrink-0 text-white/30" />
            ) : (
              <ChevronDown size={15} className="shrink-0 text-white/30" />
            )}
          </button>

          {extractOpen && (
            <div className="border-t border-plasma/12 px-5 pb-5 pt-4">
              <div className="grid gap-3">
                <FormField label="What problem do you solve, and for whom?">
                  <input
                    className={inputClass}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="We help small businesses generate more leads online"
                  />
                </FormField>
                <FormField label="What solution or transformation do you provide?">
                  <input
                    className={inputClass}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="We build SEO-optimized websites and automate outreach"
                  />
                </FormField>
                <FormField label="What do you want people to do next? (optional)">
                  <input
                    className={inputClass}
                    value={ctaGoal}
                    onChange={(e) => setCtaGoal(e.target.value)}
                    placeholder="Book a discovery call"
                  />
                </FormField>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || (!problem.trim() && !solution.trim())}
                className="mt-4 flex items-center gap-2 rounded-2xl border border-plasma/35 bg-plasma/[0.12] px-5 py-2.5 text-sm font-semibold text-peach transition hover:bg-plasma/[0.20] disabled:opacity-40"
              >
                <Sparkles size={13} />
                {generating ? "Extracting intelligence…" : "Generate Intelligence"}
              </button>

              {/* Staged chip preview */}
              {staged && (
                <div className="mt-5 border-t border-white/8 pt-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                    Review & edit — then apply
                  </p>
                  <div className="grid gap-4">
                    <StagedTagGroup
                      title="Who is this for?"
                      tags={staged.audiences}
                      onRemove={(i) => patchStaged("audiences", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("audiences", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Pain points"
                      tags={staged.painPoints}
                      onRemove={(i) => patchStaged("painPoints", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("painPoints", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Desired outcomes"
                      tags={staged.aspirations}
                      onRemove={(i) => patchStaged("aspirations", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("aspirations", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Emotional triggers"
                      tags={staged.emotionalTriggers}
                      onRemove={(i) => patchStaged("emotionalTriggers", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("emotionalTriggers", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Content angles"
                      tags={staged.angles}
                      onRemove={(i) => patchStaged("angles", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("angles", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Hook styles"
                      tags={staged.hookStyles}
                      onRemove={(i) => patchStaged("hookStyles", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("hookStyles", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="CTA styles"
                      tags={staged.ctaStyles}
                      onRemove={(i) => patchStaged("ctaStyles", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("ctaStyles", (p) => [...p, l])}
                    />
                    <StagedTagGroup
                      title="Avoid"
                      tags={staged.constraints}
                      onRemove={(i) => patchStaged("constraints", (p) => p.filter((_, idx) => idx !== i))}
                      onAdd={(l) => patchStaged("constraints", (p) => [...p, l])}
                    />
                  </div>

                  {applyError && (
                    <p className="mt-3 text-xs text-plasma/80">{applyError}</p>
                  )}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={applying}
                      className="flex items-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-300/[0.12] px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/[0.18] disabled:opacity-40"
                    >
                      <Check size={13} />
                      {applying ? "Applying…" : "Apply to Intelligence"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaged(null)}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/40 transition hover:text-white/65"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Current Intelligence chip view ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/40">
            <span className="text-sm">Loading intelligence…</span>
          </div>
        ) : (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.025] px-5 py-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                Current Intelligence
              </p>
              {hasIntelligence && (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-semibold text-emerald-300/70">
                  {totalActive} active signals
                </span>
              )}
            </div>

            <div className="grid gap-5">
              <ChipSection
                title="Target audiences"
                chips={activeAudiences}
                onRemove={(id) => {
                  const icp = icps.find((i) => i.id === id);
                  if (icp) void deactivateICP(icp);
                }}
                onAdd={addAudienceChip}
                emptyNote="No audiences yet — generate intelligence above"
              />
              <ChipSection
                title="Content angles"
                chips={activeAngles}
                onRemove={(id) => {
                  const a = angles.find((x) => x.id === id);
                  if (a) void deactivateAngle(a);
                }}
                onAdd={addAngleChip}
                emptyNote="No angles configured"
              />
              <ChipSection
                title="Hook styles"
                chips={activeHooks}
                onRemove={(id) => {
                  const h = hooks.find((x) => x.id === id);
                  if (h) void deactivateHook(h);
                }}
                onAdd={addHookChip}
              />
              <ChipSection
                title="CTA styles"
                chips={activeCTAs}
                onRemove={(id) => {
                  const c = ctas.find((x) => x.id === id);
                  if (c) void deactivateCTA(c);
                }}
                onAdd={addCTAChip}
              />
              <ChipSection
                title="Avoid"
                chips={activeConstraints}
                onRemove={(id) => {
                  const c = constraints.find((x) => x.id === id);
                  if (c) void deactivateConstraint(c);
                }}
                onAdd={addConstraintChip}
              />
            </div>

            {!hasIntelligence && (
              <div className="mt-5 rounded-[16px] border border-dashed border-white/10 px-5 py-6 text-center">
                <p className="text-sm text-white/35">
                  No intelligence configured yet.{" "}
                  <button
                    type="button"
                    onClick={() => setExtractOpen(true)}
                    className="text-peach/70 underline underline-offset-2 hover:text-peach transition"
                  >
                    Generate from your business description
                  </button>{" "}
                  or use the seed defaults.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Advanced editors (collapsible) ── */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-white/[0.02] px-5 py-3.5 text-left transition hover:bg-white/[0.035]"
          >
            <div className="flex items-center gap-2">
              <Target size={13} className="text-white/30" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/32">
                Advanced editors
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp size={14} className="text-white/22" />
            ) : (
              <ChevronDown size={14} className="text-white/22" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3">
              {/* Tabs */}
              <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-charcoal/60 p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                    className={clsx(
                      "flex shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                      activeTab === tab.id
                        ? "bg-white text-charcoal"
                        : "text-white/52 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── ICPs ── */}
              {activeTab === "icps" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                      {icps.length} Ideal Customer Profiles
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingIcpId(editingIcpId === "new" ? null : "new")}
                      className="flex items-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-1.5 text-xs font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {editingIcpId === "new" && (
                      <ICPForm
                        onSave={(data) => handleSaveICP(data)}
                        onCancel={() => setEditingIcpId(null)}
                      />
                    )}
                    {icps.map((icp) => (
                      <ICPCard
                        key={icp.id}
                        icp={icp}
                        isEditing={editingIcpId === icp.id}
                        onEdit={() => setEditingIcpId(editingIcpId === icp.id ? null : icp.id)}
                        onDelete={() => handleDeleteICP(icp.id)}
                        onToggle={() => handleToggleICP(icp)}
                        onSaveEdit={(data) => handleSaveICP(data, icp.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Angles ── */}
              {activeTab === "angles" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                      {angles.length} Strategic Angles
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingAngleId(editingAngleId === "new" ? null : "new")}
                      className="flex items-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-1.5 text-xs font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {editingAngleId === "new" && (
                      <AngleForm
                        onSave={(data) => handleSaveAngle(data)}
                        onCancel={() => setEditingAngleId(null)}
                      />
                    )}
                    {angles.map((angle) => (
                      <LibraryCard
                        key={angle.id}
                        item={{
                          id: angle.id,
                          label: angle.label,
                          description: angle.description,
                          tags: angle.tags,
                          performanceScore: angle.performanceScore > 0 ? angle.performanceScore : undefined,
                          isActive: angle.isActive,
                        }}
                        isEditing={editingAngleId === angle.id}
                        onEdit={() => setEditingAngleId(editingAngleId === angle.id ? null : angle.id)}
                        onDelete={() => handleDeleteAngle(angle.id)}
                        onToggle={() => handleToggleAngle(angle)}
                        editForm={
                          <AngleForm
                            initial={angle}
                            onSave={(data) => handleSaveAngle(data, angle.id)}
                            onCancel={() => setEditingAngleId(null)}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Hooks ── */}
              {activeTab === "hooks" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                      {hooks.length} Hook Styles
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingHookId(editingHookId === "new" ? null : "new")}
                      className="flex items-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-1.5 text-xs font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {editingHookId === "new" && (
                      <LibraryForm
                        onSave={(data) => handleSaveHook(data)}
                        onCancel={() => setEditingHookId(null)}
                        exampleLabel="Example opening line"
                      />
                    )}
                    {hooks.map((hook) => (
                      <LibraryCard
                        key={hook.id}
                        item={{
                          id: hook.id,
                          label: hook.label,
                          description: hook.description,
                          example: hook.example,
                          isActive: hook.isActive,
                        }}
                        isEditing={editingHookId === hook.id}
                        onEdit={() => setEditingHookId(editingHookId === hook.id ? null : hook.id)}
                        onDelete={() => handleDeleteHook(hook.id)}
                        onToggle={() => handleToggleHook(hook)}
                        editForm={
                          <LibraryForm
                            initial={hook}
                            onSave={(data) => handleSaveHook(data, hook.id)}
                            onCancel={() => setEditingHookId(null)}
                            exampleLabel="Example opening line"
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── CTAs ── */}
              {activeTab === "ctas" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                      {ctas.length} CTA Styles
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingCtaId(editingCtaId === "new" ? null : "new")}
                      className="flex items-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-1.5 text-xs font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {editingCtaId === "new" && (
                      <LibraryForm
                        onSave={(data) => handleSaveCTA(data)}
                        onCancel={() => setEditingCtaId(null)}
                        exampleLabel="Example CTA phrase"
                      />
                    )}
                    {ctas.map((cta) => (
                      <LibraryCard
                        key={cta.id}
                        item={{
                          id: cta.id,
                          label: cta.label,
                          description: cta.description,
                          example: cta.example,
                          isActive: cta.isActive,
                        }}
                        isEditing={editingCtaId === cta.id}
                        onEdit={() => setEditingCtaId(editingCtaId === cta.id ? null : cta.id)}
                        onDelete={() => handleDeleteCTA(cta.id)}
                        onToggle={() => handleToggleCTA(cta)}
                        editForm={
                          <LibraryForm
                            initial={cta}
                            onSave={(data) => handleSaveCTA(data, cta.id)}
                            onCancel={() => setEditingCtaId(null)}
                            exampleLabel="Example CTA phrase"
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Constraints ── */}
              {activeTab === "constraints" && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/38">
                      {constraints.length} Negative Constraints
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingConstraintId(editingConstraintId === "new" ? null : "new")
                      }
                      className="flex items-center gap-1.5 rounded-2xl border border-plasma/25 bg-plasma/[0.08] px-3 py-1.5 text-xs font-semibold text-peach transition hover:border-plasma/45 hover:bg-plasma/[0.14]"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {editingConstraintId === "new" && (
                      <ConstraintForm
                        onSave={(data) => handleSaveConstraint(data)}
                        onCancel={() => setEditingConstraintId(null)}
                      />
                    )}
                    {constraints.map((c) => (
                      <ConstraintCard
                        key={c.id}
                        item={c}
                        isEditing={editingConstraintId === c.id}
                        onEdit={() =>
                          setEditingConstraintId(editingConstraintId === c.id ? null : c.id)
                        }
                        onDelete={() => handleDeleteConstraint(c.id)}
                        onToggle={() => handleToggleConstraint(c)}
                        editForm={
                          <ConstraintForm
                            initial={c}
                            onSave={(data) => handleSaveConstraint(data, c.id)}
                            onCancel={() => setEditingConstraintId(null)}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Architecture note */}
        <div className="mt-6 rounded-[20px] border border-white/8 bg-white/[0.02] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/28">How it works</p>
          <p className="mt-2 text-xs leading-5 text-white/32">
            Chips map to structured intelligence records in{" "}
            <code className="text-peach/50">memory/intelligence/</code>. Every approved or rejected
            generation updates the performance scores — higher-scoring combinations surface more often
            over time.
          </p>
        </div>
      </div>
    </div>
  );
}
