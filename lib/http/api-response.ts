import { NextResponse, type NextResponse as NextResponseType } from "next/server";
import { normalizeError, type NormalizedError } from "@/lib/errors/error-normalization";

type ErrorInit = ResponseInit & {
  code?: string;
  details?: unknown;
};

export function successResponse<T>(data: T, init?: ResponseInit): NextResponseType<{ ok: true; data: T }> {
  return NextResponse.json({ ok: true, data }, init);
}

export function errorResponse(message: string, init: ErrorInit = {}) {
  const { code, details, ...responseInit } = init;
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        ...(code ? { code } : {}),
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status: responseInit.status ?? 500, ...responseInit }
  );
}

export function validationError(message: string) {
  return errorResponse(message, { status: 400, code: "validation_error" });
}

export function unauthorizedError() {
  return errorResponse("You need to sign in to continue.", { status: 401, code: "unauthorized" });
}

export function notFoundError(message = "Not found.") {
  return errorResponse(message, { status: 404, code: "not_found" });
}

export function internalServerError(error: unknown) {
  const normalized: NormalizedError = normalizeError(error, "Something went wrong.");
  console.error("[api]", normalized);
  return errorResponse(normalized.message, {
    status: 500,
    code: normalized.code ?? "internal_server_error",
  });
}
