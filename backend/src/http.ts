import type { RouteResponse } from "./router.js";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): RouteResponse {
  return {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function errorResponse(err: unknown): RouteResponse {
  if (err instanceof HttpError) {
    return jsonResponse(err.status, { error: err.message });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  // Log full error server-side; surface a safe message to the client.
  console.error("[trustlayer] unhandled error:", err);
  return jsonResponse(500, { error: "Internal server error", detail: message });
}
