"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { AlertCircle, Clock, Loader2, Play, Terminal } from "lucide-react";
import type { ScheduleConfig } from "@/lib/autopilot-types";
import type { ContentChannel } from "@/lib/content-types";
import { channelLabels } from "@/lib/content-types";

const allChannels: ContentChannel[] = ["linkedin", "facebook", "instagram", "tiktok"];

export default function SchedulePage() {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runIdea, setRunIdea] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [ticking, setTicking] = useState(false);
  const [tickLog, setTickLog] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data: { config?: ScheduleConfig }) => setConfig(data.config ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const response = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const result = (await response.json()) as { ok?: boolean; config?: ScheduleConfig };
      if (result.ok && result.config) setConfig(result.config);
      setStatusMessage("Schedule config saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualRun() {
    if (running) return;
    setRunning(true);
    setStatusMessage("Waking the generation engine…");
    setLastRunId(null);

    try {
      const response = await fetch("/api/schedule/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: runIdea.trim() || undefined })
      });
      const result = (await response.json()) as { ok?: boolean; runId?: string | null; error?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Generation failed.");
      }

      setLastRunId(result.runId ?? null);
      setStatusMessage(
        result.runId
          ? `Generation complete. Run ID: ${result.runId}`
          : "Generation complete. Refresh the Today screen to see the new run."
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleSchedulerTick() {
    if (ticking) return;
    setTicking(true);
    setTickLog(null);
    try {
      const res = await fetch("/api/cron/scheduler?dev=1");
      const json = (await res.json()) as { log?: string[]; skipped?: boolean; reason?: string; runId?: string | null; ok?: boolean; error?: string };
      setTickLog(json.log ?? [JSON.stringify(json)]);
      if (json.runId) setLastRunId(json.runId);
      // Refresh config to show updated lastRunAt
      const confRes = await fetch("/api/schedule");
      const confJson = (await confRes.json()) as { config?: ScheduleConfig };
      if (confJson.config) setConfig(confJson.config);
    } catch (err) {
      setTickLog([`Error: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setTicking(false);
    }
  }

  function toggleChannel(ch: ContentChannel) {
    if (!config) return;
    const current = config.channels;
    const next = current.includes(ch) ? current.filter((c) => c !== ch) : [...current, ch];
    setConfig({ ...config, channels: next });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={24} />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-peach/55">Content Autopilot</p>
          <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Schedule</h1>
          <p className="mt-2 text-sm text-white/45">
            Configure when the agent generates content. For now, use the manual trigger below.
          </p>
        </div>

        {/* Manual run — most prominent */}
        <section className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="warm-line absolute left-0 right-0 top-0 h-px" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-peach/55">Manual trigger</p>
          <h2 className="mt-2 font-display text-2xl text-white">Run Morning Generation Now</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Triggers the Python agent immediately. Optionally provide a content idea — or leave it blank to use the last saved idea.
          </p>
          <div className="mt-5 grid gap-3">
            <textarea
              className="min-h-[70px] w-full resize-none rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm leading-6 text-white/80 outline-none placeholder:text-white/32 focus:border-plasma/40"
              disabled={running}
              onChange={(e) => setRunIdea(e.target.value)}
              placeholder="Content idea for this generation run (optional)…"
              value={runIdea}
            />
            <button
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-plasma/35 bg-plasma/[0.12] py-3.5 text-sm font-semibold text-peach transition hover:border-plasma/55 hover:bg-plasma/[0.18] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={running}
              onClick={handleManualRun}
              type="button"
            >
              {running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              {running ? "Generating… this takes a few minutes" : "Run Morning Generation Now"}
            </button>
            {statusMessage ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
                {statusMessage}
                {lastRunId ? (
                  <a
                    href={`/review/${encodeURIComponent(lastRunId)}`}
                    className="ml-2 text-peach underline decoration-plasma/50 underline-offset-2"
                  >
                    View run →
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        </section>

        {/* Schedule config */}
        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Automatic Schedule</p>
          <p className="mb-5 text-sm text-white/42">
            Automatic scheduling requires a cron job or task runner. For local development, use the manual trigger above.
          </p>

          {/* Enable toggle */}
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-white">Scheduled generation</p>
              <p className="text-xs text-white/40">Auto-generate content at the configured time</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
              className={clsx(
                "relative h-7 w-12 rounded-full border transition duration-300",
                config.isEnabled
                  ? "border-plasma/40 bg-plasma/20"
                  : "border-white/15 bg-white/[0.07]"
              )}
            >
              <div
                className={clsx(
                  "absolute top-1 h-5 w-5 rounded-full transition-all duration-300",
                  config.isEnabled ? "left-6 bg-peach" : "left-1 bg-white/40"
                )}
              />
            </button>
          </div>

          {/* Time */}
          <div className="mb-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Generation time</span>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-white/40" />
                <input
                  className="rounded-2xl border border-white/10 bg-charcoal/45 px-3.5 py-2.5 text-sm text-white/80 outline-none focus:border-plasma/40"
                  disabled={!config.isEnabled}
                  type="time"
                  value={config.runTime}
                  onChange={(e) => setConfig({ ...config, runTime: e.target.value })}
                />
              </div>
            </label>
          </div>

          {/* Channels */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/38">Channels to generate</p>
            <div className="flex flex-wrap gap-2">
              {allChannels.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  disabled={!config.isEnabled}
                  onClick={() => toggleChannel(ch)}
                  className={clsx(
                    "rounded-2xl border px-3.5 py-2 text-sm font-semibold transition",
                    config.channels.includes(ch)
                      ? "border-white/20 bg-white/[0.1] text-white"
                      : "border-white/8 bg-white/[0.04] text-white/38 hover:border-white/14 hover:text-white/55",
                    !config.isEnabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  {channelLabels[ch]}
                </button>
              ))}
            </div>
          </div>

          <button
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
            disabled={saving}
            onClick={handleSave}
            type="button"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : null}
            Save configuration
          </button>
        </section>

        {/* Scheduler diagnostics */}
        <section className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={14} className="text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/38">Scheduler diagnostics</p>
          </div>
          <p className="mb-4 text-sm text-white/42">
            Simulate a scheduler tick locally — runs the same logic Vercel cron uses, bypassing the time check so you can test immediately.
          </p>
          {config.lastRunAt ? (
            <p className="mb-3 text-xs text-white/35">
              Last run: <span className="text-white/55">{new Date(config.lastRunAt).toLocaleString()}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSchedulerTick}
            disabled={ticking}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            {ticking ? <Loader2 className="animate-spin" size={14} /> : <Terminal size={14} />}
            {ticking ? "Running scheduler tick…" : "Simulate scheduler tick"}
          </button>
          {tickLog && (
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-charcoal/60 px-4 py-3 text-[11px] leading-5 text-white/50 whitespace-pre-wrap">
              {tickLog.join("\n")}
            </pre>
          )}
        </section>

        {/* Architecture note */}
        <div className="rounded-[20px] border border-white/8 bg-white/[0.025] px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-peach/50" />
            <p className="text-xs leading-5 text-white/35">
              <span className="font-semibold text-white/50">Production:</span> Vercel cron calls <code className="text-peach/50">GET /api/cron/scheduler</code> every minute. The route checks whether the configured time has passed in the target timezone and whether a run already happened today — then fires generation if both conditions are met. Requires Vercel Pro for per-minute cron frequency. Set <code className="text-peach/50">CRON_SECRET</code> env var to protect the endpoint in production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
