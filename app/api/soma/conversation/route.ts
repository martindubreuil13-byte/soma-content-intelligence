import { createServerSupabase } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/workspace/workspace-context";
import { successResponse, validationError, internalServerError } from "@/lib/http/api-response";
import { extractConversationIntelligence } from "@/lib/intelligence/conversation-extraction";
import { createSomaResponse } from "@/lib/intelligence/soma-response";

export const dynamic = "force-dynamic";

type RequestBody = {
  text?: unknown;
  reference?: unknown;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "signal";
}

async function persistUnderstanding({
  text,
  reference,
  extraction,
}: {
  text: string;
  reference?: string;
  extraction: ReturnType<typeof extractConversationIntelligence>;
}) {
  const context = await requireWorkspaceContext();
  const supabase = await createServerSupabase();
  const now = new Date().toISOString();
  const memoryRows = extraction.extractedSignals.map((signal) => ({
    organization_id: context.organization.id,
    category: "conversation_signal",
    key: `${signal.kind}:${slug(signal.value)}`,
    value: {
      label: signal.label,
      value: signal.value,
      confidence: signal.confidence,
      source: "today_conversation",
      last_text_excerpt: text.slice(0, 300),
      reference_excerpt: reference?.slice(0, 300) ?? null,
    },
    weight: signal.confidence,
    metadata: {
      detected_intent: extraction.detectedIntent,
      updated_at: now,
    },
  }));

  if (memoryRows.length) {
    const { error } = await supabase.from("preference_memories").upsert(memoryRows, {
      onConflict: "organization_id,category,key",
    });
    if (error) throw error;
  }

  const { error: eventError } = await supabase.from("learning_events").insert({
    organization_id: context.organization.id,
    event_type: "conversation_intelligence_extracted",
    target_type: "conversation",
    tags: extraction.extractedSignals.map((signal) => signal.kind),
    notes: extraction.conversationalSummary,
    metadata: {
      text_excerpt: text.slice(0, 600),
      reference_excerpt: reference?.slice(0, 600) ?? null,
      extraction,
    },
  });
  if (eventError) throw eventError;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const reference = typeof body.reference === "string" ? body.reference.trim() : undefined;

    if (!text) return validationError("Tell SOMA something first.");

    const extraction = extractConversationIntelligence(text, reference);
    const response = createSomaResponse(extraction);

    await persistUnderstanding({ text, reference, extraction }).catch((error) => {
      console.error("[soma/conversation] memory persistence failed", error instanceof Error ? error.message : error);
    });

    return successResponse({
      extraction,
      response,
      remembered: true,
    });
  } catch (error) {
    return internalServerError(error);
  }
}
