export type LogContext = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeContexts(
  base?: LogContext,
  incoming?: LogContext,
): LogContext | undefined {
  if (!base && !incoming) return undefined;
  return {
    ...(base ?? {}),
    ...(incoming ?? {}),
  };
}

export function injectContext(value: unknown, context?: LogContext): unknown {
  if (!context) return value;

  if (isRecord(value)) {
    const existing = isRecord(value.context) ? value.context : undefined;
    return {
      ...value,
      context: {
        ...(existing ?? {}),
        ...context,
      },
    };
  }

  return {
    value,
    context,
  };
}
