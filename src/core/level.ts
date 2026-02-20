export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

export type LogConsoleMethod = "log" | "info" | "warn" | "error" | "debug";

const LEVEL_METHOD_MAP: Record<LogLevel, LogConsoleMethod> = {
  info: "info",
  success: "log",
  warn: "warn",
  error: "error",
  debug: "debug",
};

export function levelToConsoleMethod(level: LogLevel): LogConsoleMethod {
  return LEVEL_METHOD_MAP[level];
}

export function levelToTag(level: LogLevel): string {
  return `[${level.toUpperCase()}]`;
}

export function resolveConsoleMethod(
  level: LogLevel | undefined,
  override: LogConsoleMethod | undefined,
): LogConsoleMethod {
  if (override) return override;
  if (!level) return "log";
  return levelToConsoleMethod(level);
}
