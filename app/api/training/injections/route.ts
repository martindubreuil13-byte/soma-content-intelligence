import { NextResponse } from "next/server";
import { createTrainingInjection, readTrainingInjections } from "@/lib/training-injections";
import type { InjectionAppliesTo, InjectionSourceType, InjectionType } from "@/lib/training-injections";

export const dynamic = "force-dynamic";

export async function GET() {
  const injections = await readTrainingInjections();
  return NextResponse.json({ injections });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  const type = (body.type as InjectionType) ?? "content_idea";
  const appliesTo = (body.appliesTo as InjectionAppliesTo) ?? "all";
  const sourceType = (body.sourceType as InjectionSourceType) ?? "text";
  const referenceUrl = typeof body.referenceUrl === "string" ? body.referenceUrl.trim() || undefined : undefined;

  const arr = (key: string): string[] => {
    const val = body[key];
    return Array.isArray(val) ? (val as string[]).filter((s) => typeof s === "string") : [];
  };

  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  try {
    const injection = await createTrainingInjection({
      type,
      label,
      notes,
      sourceText,
      sourceType,
      referenceUrl,
      extractedTags: arr("extractedTags"),
      extractedPreferences: arr("extractedPreferences"),
      extractedConstraints: arr("extractedConstraints"),
      extractedVisualTags: arr("extractedVisualTags"),
      extractedToneTags: arr("extractedToneTags"),
      extractedCompositionTags: arr("extractedCompositionTags"),
      extractedAudienceSignals: arr("extractedAudienceSignals"),
      extractedStrategicSignals: arr("extractedStrategicSignals"),
      appliesTo,
      active: true,
    });
    return NextResponse.json({ ok: true, injection });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save injection.";
    console.error("[training/injections POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
