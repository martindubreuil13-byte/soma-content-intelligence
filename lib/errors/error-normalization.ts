export type NormalizedError = {
  message: string;
  code?: string;
  details?: unknown;
};

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
  details?: unknown;
  error?: unknown;
};

function asRecord(error: unknown): ErrorLike {
  return error && typeof error === "object" ? (error as ErrorLike) : {};
}

export function normalizeError(error: unknown, fallback = "Something went wrong."): NormalizedError {
  if (typeof error === "string") {
    return { message: error || fallback };
  }

  const record = asRecord(error);
  const rawMessage =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "string"
        ? record.error
        : fallback;
  const lower = rawMessage.toLowerCase();
  const code = typeof record.code === "string" ? record.code : undefined;
  const status = String(record.statusCode ?? record.status ?? "");

  if (lower.includes("unexpected end of json") || lower.includes("json")) {
    return { message: "The server returned an unreadable response.", code: "invalid_json" };
  }

  if (lower.includes("bucket") && (lower.includes("missing") || lower.includes("not found"))) {
    return { message: "Storage bucket is missing.", code: "storage_bucket_missing" };
  }

  if (lower.includes("row-level security") || lower.includes("permission") || status === "401" || status === "403") {
    return { message: "You do not have permission to perform this action.", code: "permission_denied" };
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return { message: "Generation timed out.", code: "timeout" };
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return { message: "Network request failed. Please try again.", code: "network_error" };
  }

  if (lower.includes("openai") || lower.includes("api key")) {
    return { message: "AI generation service is not ready.", code: "ai_service_error" };
  }

  if (lower.includes("workspace") || lower.includes("organization")) {
    return { message: "Workspace not found.", code: "workspace_not_found" };
  }

  return {
    message: rawMessage || fallback,
    ...(code ? { code } : {}),
    ...(record.details !== undefined ? { details: record.details } : {}),
  };
}

export function toErrorMessage(error: unknown, fallback = "Something went wrong.") {
  return normalizeError(error, fallback).message;
}
