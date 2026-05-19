import { normalizeError } from "@/lib/errors/error-normalization";

export type SafeJsonFetchResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: { message: string; code?: string; details?: unknown }; response?: Response };

export function parseApiError(payload: unknown, fallback = "Request failed.") {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.error && typeof record.error === "object") {
      const error = record.error as Record<string, unknown>;
      return {
        message: typeof error.message === "string" ? error.message : fallback,
        code: typeof error.code === "string" ? error.code : undefined,
        details: error.details,
      };
    }
    if (typeof record.error === "string") {
      return { message: record.error };
    }
  }

  return normalizeError(payload, fallback);
}

export async function safeJsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<SafeJsonFetchResult<T>> {
  try {
    const response = await fetch(input, init);
    const text = await response.text();
    let payload: unknown = null;

    if (text.trim()) {
      try {
        payload = JSON.parse(text);
      } catch {
        return {
          ok: false,
          error: { message: "The server returned an unreadable response.", code: "invalid_json" },
          response,
        };
      }
    }

    if (!response.ok) {
      return { ok: false, error: parseApiError(payload, response.statusText || "Request failed."), response };
    }

    if (payload && typeof payload === "object" && "ok" in payload) {
      const record = payload as Record<string, unknown>;
      if (record.ok === false) {
        return { ok: false, error: parseApiError(payload), response };
      }
      if ("data" in record) {
        return { ok: true, data: record.data as T, response };
      }
    }

    return { ok: true, data: payload as T, response };
  } catch (error) {
    const normalized = normalizeError(error, "Network request failed.");
    return { ok: false, error: normalized };
  }
}
