import { NextResponse } from "next/server";
import { deleteTrainingInjection, updateTrainingInjection } from "@/lib/training-injections";
import type { InjectionAppliesTo, InjectionType } from "@/lib/training-injections";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (typeof body.notes === "string") patch.notes = body.notes.trim();
  if (typeof body.sourceText === "string") patch.sourceText = body.sourceText.trim();
  if (typeof body.type === "string") patch.type = body.type as InjectionType;
  if (typeof body.appliesTo === "string") patch.appliesTo = body.appliesTo as InjectionAppliesTo;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.referenceUrl === "string") patch.referenceUrl = body.referenceUrl.trim() || undefined;
  if (Array.isArray(body.extractedTags)) patch.extractedTags = body.extractedTags;
  if (Array.isArray(body.extractedPreferences)) patch.extractedPreferences = body.extractedPreferences;
  if (Array.isArray(body.extractedConstraints)) patch.extractedConstraints = body.extractedConstraints;
  if (Array.isArray(body.extractedVisualTags)) patch.extractedVisualTags = body.extractedVisualTags;
  if (Array.isArray(body.extractedToneTags)) patch.extractedToneTags = body.extractedToneTags;
  if (Array.isArray(body.extractedCompositionTags)) patch.extractedCompositionTags = body.extractedCompositionTags;
  if (Array.isArray(body.extractedAudienceSignals)) patch.extractedAudienceSignals = body.extractedAudienceSignals;
  if (Array.isArray(body.extractedStrategicSignals)) patch.extractedStrategicSignals = body.extractedStrategicSignals;

  try {
    const updated = await updateTrainingInjection(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, injection: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    console.error("[training/injections PUT]", id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const deleted = await deleteTrainingInjection(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    console.error("[training/injections DELETE]", id, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
