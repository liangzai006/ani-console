export interface ApiErrorBody {
  code?: string;
  message?: string;
  request_id?: string;
  details?: Record<string, unknown>;
}

export function parseApiError(error: unknown): ApiErrorBody {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") {
      return {
        code: typeof e.code === "string" ? e.code : undefined,
        message: e.message,
        request_id: typeof e.request_id === "string" ? e.request_id : undefined,
        details:
          typeof e.details === "object" && e.details
            ? (e.details as Record<string, unknown>)
            : undefined,
      };
    }
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return {};
}

export function getErrorMessage(error: unknown, fallback = "请求失败"): string {
  const parsed = parseApiError(error);
  return parsed.message || fallback;
}
