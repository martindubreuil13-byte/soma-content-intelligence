import { readScheduleConfig, updateScheduleConfig } from "@/lib/schedule-config";
import { internalServerError, successResponse } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await readScheduleConfig();
    return successResponse({ config });
  } catch (error) {
    return internalServerError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (typeof body.isEnabled === "boolean") updates.isEnabled = body.isEnabled;
    if (typeof body.runTime === "string" && /^\d{2}:\d{2}$/.test(body.runTime)) updates.runTime = body.runTime;
    if (typeof body.timezone === "string") updates.timezone = body.timezone.slice(0, 100);
    if (Array.isArray(body.channels)) updates.channels = body.channels;
    if (body.ideaSource === "manual" || body.ideaSource === "auto") updates.ideaSource = body.ideaSource;

    const config = await updateScheduleConfig(updates);
    return successResponse({ config });
  } catch (error) {
    return internalServerError(error);
  }
}
