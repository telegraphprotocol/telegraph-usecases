function serializeUnknown(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
}

/** Chains `Error.cause` (common with `fetch` / undici) for clearer diagnostics. */
export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const parts: string[] = [error.message];
  const top = error as Error & { code?: string; errno?: number; syscall?: string };
  if (top.code || top.syscall !== undefined) {
    parts.push(
      `meta: ${[top.syscall, top.code, top.errno !== undefined ? String(top.errno) : ""]
        .filter(Boolean)
        .join(" ")}`
    );
  }

  let depth = 0;
  let cause: unknown = error.cause;
  while (cause != null && depth < 8) {
    if (cause instanceof Error) {
      const c = cause as Error & { code?: string };
      parts.push(`cause: ${cause.message}${c.code ? ` [${c.code}]` : ""}`);
      cause = cause.cause;
    } else {
      parts.push(`cause: ${serializeUnknown(cause)}`);
      break;
    }
    depth += 1;
  }

  if (error instanceof AggregateError && error.errors?.length) {
    parts.push(
      `aggregate: ${error.errors
        .map((e) => (e instanceof Error ? e.message : String(e)))
        .join("; ")}`
    );
  }

  return parts.join(" | ");
}

export class UpstreamError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "UpstreamError";
    this.code = code;
    this.status = status;
  }
}
