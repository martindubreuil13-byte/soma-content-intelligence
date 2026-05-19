"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionPanel } from "@/components/action-panel";
import { ContentViewer } from "@/components/content-viewer";
import { IdeaInputPanel } from "@/components/idea-input-panel";
import { RunSidebar } from "@/components/run-sidebar";
import { TopBar } from "@/components/top-bar";
import { safeJsonFetch } from "@/lib/client/fetch-safe";
import { waitForJobCompletion } from "@/lib/client/job-polling";
import { cleanChannelContent } from "@/lib/content-formatting";
import type { TrainingSummary } from "@/lib/agent-training";
import type {
  ChannelFeedback,
  ChannelFeedbackGroup,
  ContentChannel,
  ContentRun,
  FeedbackStatus,
  FeedbackTarget
} from "@/lib/content-types";

type DashboardShellProps = {
  runs: ContentRun[];
  trainingSummary: TrainingSummary;
};

export function DashboardShell({ runs, trainingSummary }: DashboardShellProps) {
  const router = useRouter();
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id ?? "");
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<ContentChannel>("linkedin");
  const [copiedTarget, setCopiedTarget] = useState<"caption" | "visualPrompt" | "action" | null>(null);
  const [regeneratingCaptionKey, setRegeneratingCaptionKey] = useState<string | null>(null);
  const [generatingImageKey, setGeneratingImageKey] = useState<string | null>(null);
  const [reimaginingVisualKey, setReimaginingVisualKey] = useState<string | null>(null);
  const [generatedImageExists, setGeneratedImageExists] = useState<Record<string, boolean>>({});
  const [generatedImageUrls, setGeneratedImageUrls] = useState<Record<string, string>>({});
  const [generatedCaptions, setGeneratedCaptions] = useState<Record<string, string>>({});
  const [generatedVisualPrompts, setGeneratedVisualPrompts] = useState<Record<string, string>>({});
  const [visualTweaks, setVisualTweaks] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<string, ChannelFeedbackGroup>>({});
  const [savingFeedbackKey, setSavingFeedbackKey] = useState<string | null>(null);
  const [savedFeedbackKey, setSavedFeedbackKey] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? runs[0],
    [runs, selectedRunId]
  );
  const activeDisplayContent = useMemo(
    () => cleanChannelContent(selectedRun?.channels[activeChannel]?.caption ?? "", activeChannel),
    [activeChannel, selectedRun]
  );

  useEffect(() => {
    if (!runs.length) {
      setSelectedRunId("");
      return;
    }

    if (pendingRunId && runs.some((run) => run.id === pendingRunId)) {
      setPendingRunId(null);
      setSelectedRunId(pendingRunId);
      return;
    }

    if (selectedRunId && pendingRunId === selectedRunId) {
      return;
    }

    if (!runs.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(runs[0].id);
    }
  }, [pendingRunId, runs, selectedRunId]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      if (!isGenerating) {
        router.refresh();
      }
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [isGenerating, router]);

  async function handleGenerate() {
    const trimmedIdea = idea.trim();

    if (!trimmedIdea || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setStatusMessage("Writing raw idea and waking the Python engine...");

    try {
      const request = await safeJsonFetch<{ jobId?: string; status?: string; runId?: string | null }>("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idea: trimmedIdea })
      });

      if (!request.ok) {
        throw new Error(request.error.message);
      }

      if (request.data.jobId) {
        setStatusMessage("Generation queued. Starting worker...");
        void fetch(`/api/workers/jobs/${encodeURIComponent(request.data.jobId)}/run?dev=1`, { method: "POST" });
        const completed = await waitForJobCompletion(request.data.jobId, {
          timeoutMs: 240_000,
          onUpdate: (snapshot) => {
            if (snapshot.job.status === "running") setStatusMessage("Generation running...");
            if (snapshot.job.status === "queued") setStatusMessage("Generation queued...");
          },
        });

        if (!completed.ok) throw new Error(completed.error.message);
        if (completed.data.job.status === "failed") {
          throw new Error(completed.data.job.errorMessage ?? "Generation failed.");
        }

        const runId = typeof completed.data.job.result.runId === "string" ? completed.data.job.result.runId : null;
        if (runId) {
          setPendingRunId(runId);
          setSelectedRunId(runId);
        }
      }

      setStatusMessage("Generated. Refreshing the archive...");

      if (request.data.runId) {
        setPendingRunId(request.data.runId);
        setSelectedRunId(request.data.runId);
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Generation failed.");
      setStatusMessage("");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyText(text: string, target: "caption" | "visualPrompt" | "action") {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(null), 1400);
  }

  async function handleCopyCurrentTab() {
    await handleCopyText(activeDisplayContent, "action");
  }

  async function handleGenerateImage() {
    if (!selectedRun || generatingImageKey || reimaginingVisualKey) {
      return;
    }

    const imageKey = `${selectedRun.id}:${activeChannel}`;

    setGeneratingImageKey(imageKey);
    setImageErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[imageKey];
      return nextErrors;
    });
    setErrorMessage("");
    setStatusMessage(`Generating ${activeChannel} image from the internal visual brief...`);

    try {
      const request = await safeJsonFetch<{ imageUrl?: string }>(
        `/api/runs/${encodeURIComponent(selectedRun.id)}/${activeChannel}/image?executeNow=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ visualTweak: visualTweaks[imageKey] ?? "" })
        }
      );

      if (!request.ok || !request.data.imageUrl) {
        throw new Error(request.ok ? "Image generation failed." : request.error.message);
      }

      const imageUrl = request.data.imageUrl;

      setGeneratedImageUrls((currentUrls) => ({
        ...currentUrls,
        [imageKey]: imageUrl
      }));
      setGeneratedImageExists((currentExists) => ({
        ...currentExists,
        [imageKey]: true
      }));
      setStatusMessage("Image generated and saved locally.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed.";
      setImageErrors((currentErrors) => ({
        ...currentErrors,
        [imageKey]: message
      }));
      setErrorMessage(message);
      setStatusMessage("");
    } finally {
      setGeneratingImageKey(null);
    }
  }

  async function handleRegenerateCaption() {
    if (!selectedRun || regeneratingCaptionKey || generatingImageKey || reimaginingVisualKey) {
      return;
    }

    const channelKey = `${selectedRun.id}:${activeChannel}`;

    setRegeneratingCaptionKey(channelKey);
    setErrorMessage("");
    setStatusMessage(`Regenerating ${activeChannel} caption from your feedback...`);

    try {
      const request = await safeJsonFetch<{ caption?: string }>(`/api/runs/${encodeURIComponent(selectedRun.id)}/${activeChannel}/caption?executeNow=1`, {
        method: "POST"
      });

      if (!request.ok || !request.data.caption) {
        throw new Error(request.ok ? "Caption regeneration failed." : request.error.message);
      }

      setGeneratedCaptions((currentCaptions) => ({
        ...currentCaptions,
        [channelKey]: request.data.caption ?? ""
      }));
      setGeneratedImageExists((currentExists) => {
        const nextExists = { ...currentExists };
        delete nextExists[channelKey];
        return nextExists;
      });
      setGeneratedImageUrls((currentUrls) => {
        const nextUrls = { ...currentUrls };
        delete nextUrls[channelKey];
        return nextUrls;
      });
      setFeedbackOverrides((currentFeedback) => ({
        ...currentFeedback,
        [channelKey]: {
          ...(currentFeedback[channelKey] ?? getActiveFeedback()),
          caption: {
            status: "pending",
            notes: ""
          },
          image: {
            status: "pending",
            notes: ""
          }
        }
      }));
      setStatusMessage("Caption regenerated. Review it before generating a new image.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Caption regeneration failed.");
      setStatusMessage("");
    } finally {
      setRegeneratingCaptionKey(null);
    }
  }

  async function handleReimagineVisual() {
    if (!selectedRun || generatingImageKey || reimaginingVisualKey) {
      return;
    }

    const imageKey = `${selectedRun.id}:${activeChannel}`;

    setReimaginingVisualKey(imageKey);
    setImageErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[imageKey];
      return nextErrors;
    });
    setErrorMessage("");
    setStatusMessage(`Reimagining ${activeChannel} visual concept...`);

    try {
      const request = await safeJsonFetch<{ imageUrl?: string; visualPrompt?: string }>(
        `/api/runs/${encodeURIComponent(selectedRun.id)}/${activeChannel}/reimagine-visual?executeNow=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ visualTweak: visualTweaks[imageKey] ?? "" })
        }
      );

      if (!request.ok || !request.data.imageUrl || !request.data.visualPrompt) {
        throw new Error(request.ok ? "Reimagine visual failed." : request.error.message);
      }

      setGeneratedImageUrls((currentUrls) => ({
        ...currentUrls,
        [imageKey]: request.data.imageUrl ?? ""
      }));
      setGeneratedImageExists((currentExists) => ({
        ...currentExists,
        [imageKey]: true
      }));
      setGeneratedVisualPrompts((currentPrompts) => ({
        ...currentPrompts,
        [imageKey]: request.data.visualPrompt ?? ""
      }));
      setStatusMessage("Image direction reworked and saved locally.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reimagine visual failed.";
      setImageErrors((currentErrors) => ({
        ...currentErrors,
        [imageKey]: message
      }));
      setErrorMessage(message);
      setStatusMessage("");
    } finally {
      setReimaginingVisualKey(null);
    }
  }

  function handleUseIdeaAgain(originalIdea: string) {
    setIdea(originalIdea);
    setStatusMessage("Original idea copied into the input.");
    setErrorMessage("");
  }

  function handleVisualTweakChange(tweak: string) {
    if (!selectedRun) {
      return;
    }

    const imageKey = `${selectedRun.id}:${activeChannel}`;

    setVisualTweaks((currentTweaks) => ({
      ...currentTweaks,
      [imageKey]: tweak
    }));
  }

  function getActiveFeedbackKey() {
    return selectedRun ? `${selectedRun.id}:${activeChannel}` : "";
  }

  function getActiveFeedback(): ChannelFeedbackGroup {
    const feedbackKey = getActiveFeedbackKey();
    const savedFeedback = selectedRun?.channels[activeChannel]?.feedback ?? {
      caption: {
        status: "pending" as FeedbackStatus,
        notes: ""
      },
      visualPrompt: {
        status: "pending" as FeedbackStatus,
        notes: ""
      },
      image: {
        status: "pending" as FeedbackStatus,
        notes: ""
      }
    };

    return feedbackOverrides[feedbackKey] ?? savedFeedback;
  }

  function getActiveFeedbackNotes(target: FeedbackTarget, versionId?: string) {
    const feedbackKey = getActiveFeedbackKey();
    const draftKey = `${feedbackKey}:${target}:${versionId ?? "current"}`;
    const lineage = selectedRun?.channels[activeChannel]?.feedbackLineage;
    const versions =
      target === "caption"
        ? lineage?.captionVersions
        : target === "visualPrompt"
        ? lineage?.visualPromptVersions
        : lineage?.imageVersions;
    const versionNotes = versions?.find((version) => version.id === versionId)?.notes;

    return feedbackDrafts[draftKey] ?? versionNotes ?? getActiveFeedback()[target].notes;
  }

  function handleFeedbackNotesChange(target: FeedbackTarget, notes: string, versionId?: string) {
    if (!selectedRun) {
      return;
    }

    const feedbackKey = getActiveFeedbackKey();
    const draftKey = `${feedbackKey}:${target}:${versionId ?? "current"}`;

    setFeedbackDrafts((currentDrafts) => ({
      ...currentDrafts,
      [draftKey]: notes
    }));
  }

  async function handleSaveFeedback(target: FeedbackTarget, status: FeedbackStatus, requestedVersionId?: string) {
    if (!selectedRun || savingFeedbackKey) {
      return;
    }

    const feedbackKey = getActiveFeedbackKey();
    const versionId =
      requestedVersionId ??
      (target === "caption"
        ? selectedRun.channels[activeChannel].currentCaptionVersionId
        : target === "visualPrompt"
        ? selectedRun.channels[activeChannel].currentVisualPromptVersionId
        : selectedRun.channels[activeChannel].currentImageVersionId);
    const targetFeedbackKey = `${feedbackKey}:${target}:${versionId ?? "current"}`;
    const notes = getActiveFeedbackNotes(target, versionId);

    setSavingFeedbackKey(targetFeedbackKey);
    setSavedFeedbackKey(null);
    setErrorMessage("");

    try {
      const request = await safeJsonFetch<{ feedback?: ChannelFeedback }>(
        `/api/runs/${encodeURIComponent(selectedRun.id)}/${activeChannel}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ target, status, notes, versionId })
        }
      );

      if (!request.ok || !request.data.feedback) {
        throw new Error(request.ok ? "Feedback save failed." : request.error.message);
      }

      const currentVersionId =
        target === "caption"
          ? selectedRun.channels[activeChannel].currentCaptionVersionId
          : target === "visualPrompt"
          ? selectedRun.channels[activeChannel].currentVisualPromptVersionId
          : selectedRun.channels[activeChannel].currentImageVersionId;

      if (!versionId || versionId === currentVersionId) {
        setFeedbackOverrides((currentFeedback) => ({
          ...currentFeedback,
          [feedbackKey]: {
            ...getActiveFeedback(),
            [target]: request.data.feedback ?? { status, notes }
          }
        }));
      }
      setFeedbackDrafts((currentDrafts) => ({
        ...currentDrafts,
        [targetFeedbackKey]: request.data.feedback?.notes ?? notes
      }));
      setSavedFeedbackKey(targetFeedbackKey);
      setStatusMessage("Feedback saved locally.");
      window.setTimeout(() => {
        setSavedFeedbackKey((currentKey) => (currentKey === targetFeedbackKey ? null : currentKey));
      }, 1800);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Feedback save failed.");
      setStatusMessage("");
    } finally {
      setSavingFeedbackKey(null);
    }
  }

  async function handleDeleteSelectedRun() {
    if (!selectedRun || isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Delete run ${selectedRun.timestamp}? This removes its local output folder.`);

    if (!confirmed) {
      return;
    }

    const deletedRunId = selectedRun.id;
    const nextRun = runs.find((run) => run.id !== deletedRunId);

    setIsDeleting(true);
    setErrorMessage("");
    setStatusMessage("Deleting local run...");

    try {
      const request = await safeJsonFetch(`/api/runs/${encodeURIComponent(deletedRunId)}`, {
        method: "DELETE"
      });

      if (!request.ok) {
        throw new Error(request.error.message);
      }

      setSelectedRunId(nextRun?.id ?? "");
      setStatusMessage(nextRun ? "Run deleted. Archive refreshed." : "Run deleted. No runs left yet.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed.");
      setStatusMessage("");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] opacity-30" />
      <div className="relative mx-auto flex max-w-[1520px] flex-col gap-4">
        <TopBar />
        <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)_260px]">
          <RunSidebar selectedRunId={selectedRunId} onSelectRun={setSelectedRunId} runs={runs} />
          <div className="grid gap-4">
            <IdeaInputPanel
              error={errorMessage}
              idea={idea}
              isGenerating={isGenerating}
              message={statusMessage}
              onIdeaChange={setIdea}
            />
            <section className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-peach/60">SOMA Training Program</p>
                  <h2 className="mt-1 font-display text-2xl text-white">{trainingSummary.stage}</h2>
                  <p className="mt-1 text-sm text-white/55">
                    {trainingSummary.stageDescription} · {trainingSummary.evaluatedSamples} evaluated · {trainingSummary.approved} approved · {trainingSummary.rejected} rejected
                  </p>
                </div>
                <div className="min-w-[210px] text-right">
                  <p className="font-display text-3xl text-white">{trainingSummary.score}/100</p>
                  <p className="text-xs text-white/45">
                    Maturity cap {trainingSummary.maturityCap} · Next {trainingSummary.nextStage ?? "complete"}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-plasma via-peach to-ember transition-all duration-500"
                  style={{ width: `${trainingSummary.score}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-white/45">
                Training advances through evaluated captions and images. Repeated regeneration slows stage progression until the agent finds steadier alignment.
              </p>
            </section>
            <ContentViewer
              activeChannel={activeChannel}
              copiedTarget={copiedTarget}
              feedback={getActiveFeedback()}
              captionOverride={selectedRun ? generatedCaptions[`${selectedRun.id}:${activeChannel}`] : undefined}
              getFeedbackNotes={getActiveFeedbackNotes}
              imageError={selectedRun ? imageErrors[`${selectedRun.id}:${activeChannel}`] : undefined}
              imageExistsOverride={selectedRun ? generatedImageExists[`${selectedRun.id}:${activeChannel}`] : undefined}
              imageUrlOverride={selectedRun ? generatedImageUrls[`${selectedRun.id}:${activeChannel}`] : undefined}
              isGeneratingImage={generatingImageKey === `${selectedRun?.id}:${activeChannel}`}
              isReimaginingVisual={reimaginingVisualKey === `${selectedRun?.id}:${activeChannel}`}
              isRegeneratingCaption={regeneratingCaptionKey === `${selectedRun?.id}:${activeChannel}`}
              onActiveChannelChange={setActiveChannel}
              onFeedbackNotesChange={handleFeedbackNotesChange}
              onSaveFeedback={handleSaveFeedback}
              onCopyText={handleCopyText}
              onGenerateImage={handleGenerateImage}
              onRegenerateCaption={handleRegenerateCaption}
              onReimagineVisual={handleReimagineVisual}
              onUseIdeaAgain={handleUseIdeaAgain}
              onVisualTweakChange={handleVisualTweakChange}
              run={selectedRun}
              savedFeedbackKey={savedFeedbackKey?.startsWith(`${selectedRun?.id}:${activeChannel}:`) ? savedFeedbackKey.split(":").slice(2).join(":") : null}
              savingFeedbackKey={savingFeedbackKey?.startsWith(`${selectedRun?.id}:${activeChannel}:`) ? savingFeedbackKey.split(":").slice(2).join(":") : null}
              visualTweak={selectedRun ? visualTweaks[`${selectedRun.id}:${activeChannel}`] ?? "" : ""}
              visualPromptOverride={selectedRun ? generatedVisualPrompts[`${selectedRun.id}:${activeChannel}`] : undefined}
            />
          </div>
          <ActionPanel
            canGenerate={idea.trim().length > 0}
            canCopy={activeDisplayContent.length > 0}
            copied={copiedTarget === "action"}
            canDelete={Boolean(selectedRun)}
            isDeleting={isDeleting}
            isGenerating={isGenerating}
            onCopy={handleCopyCurrentTab}
            onDelete={handleDeleteSelectedRun}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
    </div>
  );
}
