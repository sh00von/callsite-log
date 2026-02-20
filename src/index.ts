import { injectContext, mergeContexts, type LogContext } from "./core/context";
import { formatLabeledValue, formatValue, type FormatOptions, type LogMode } from "./core/format";
import { type LogConsoleMethod, type LogLevel, levelToTag, resolveConsoleMethod } from "./core/level";
import { checkAndMarkOnce, clearOnce, clearTimers, endTimer, startTimer } from "./core/session";
import { getCallerFromStack, parseFrameLine } from "./core/stack";
import { transformValue } from "./core/transform";

export type { LogContext } from "./core/context";
export type { LogMode } from "./core/format";
export type { LogConsoleMethod, LogLevel } from "./core/level";

type LogLevelStyle = "compact";

export type FormatterInput = {
  location: string;
  label?: string;
  value: unknown;
  formattedValue: unknown;
  level?: LogLevel;
  levelTag?: string;
};

export type FormatterOutput = {
  locationLine: unknown;
  valueLine: unknown;
};

export type LogOptions = {
  enabled?: boolean;
  mode?: LogMode;
  includeLocation?: boolean;
  inspectDepth?: number;
  maxArrayLength?: number;
  redact?: string[];
  colors?: boolean;
  level?: LogLevel;
  showLevelTag?: boolean;
  levelTagStyle?: LogLevelStyle;
  consoleMethod?: LogConsoleMethod;
  context?: LogContext;
  clockNow?: () => number;
  warnThresholdMs?: number;
  errorThresholdMs?: number;
  includeDurationOnly?: boolean;
  formatter?: (input: FormatterInput) => FormatterOutput;
};

type ResolvedLogArgs = {
  label?: string;
  value: unknown;
  options?: LogOptions;
};

type RunContext = {
  forceLevel?: LogLevel;
  defaultShowLevelTag?: boolean;
  defaultContext?: LogContext;
};

type OnceArgs = {
  key: string;
  label?: string;
  value: unknown;
  options?: LogOptions;
};

type TimeEndArgs = {
  key: string;
  label?: string;
  value?: unknown;
  options?: LogOptions;
};

function isLogOptions(value: unknown): value is LogOptions {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    "colors" in record ||
    "formatter" in record ||
    "enabled" in record ||
    "mode" in record ||
    "includeLocation" in record ||
    "inspectDepth" in record ||
    "maxArrayLength" in record ||
    "redact" in record ||
    "level" in record ||
    "showLevelTag" in record ||
    "levelTagStyle" in record ||
    "consoleMethod" in record ||
    "context" in record ||
    "clockNow" in record ||
    "warnThresholdMs" in record ||
    "errorThresholdMs" in record ||
    "includeDurationOnly" in record
  );
}

function resolveLogArgs(
  arg1: string | unknown,
  arg2?: unknown | LogOptions,
  arg3?: LogOptions,
): ResolvedLogArgs {
  let label: string | undefined;
  let value: unknown;
  let options: LogOptions | undefined;

  if (typeof arg1 === "string" && arg2 !== undefined && !isLogOptions(arg2)) {
    label = arg1;
    value = arg2;
    options = arg3;
  } else {
    value = arg1;
    options = isLogOptions(arg2) ? arg2 : undefined;
  }

  return { label, value, options };
}

function resolveOnceArgs(
  key: string,
  arg2: string | unknown,
  arg3?: unknown | LogOptions,
  arg4?: LogOptions,
): OnceArgs {
  if (typeof arg2 === "string" && arg3 !== undefined && !isLogOptions(arg3)) {
    return {
      key,
      label: arg2,
      value: arg3,
      options: arg4,
    };
  }

  return {
    key,
    value: arg2,
    options: isLogOptions(arg3) ? arg3 : undefined,
  };
}

function resolveTimeEndArgs(
  key: string,
  arg2?: string | unknown | LogOptions,
  arg3?: unknown | LogOptions,
  arg4?: LogOptions,
): TimeEndArgs {
  if (arg2 === undefined) {
    return { key };
  }

  if (isLogOptions(arg2)) {
    return { key, options: arg2 };
  }

  if (typeof arg2 === "string" && arg3 !== undefined && !isLogOptions(arg3)) {
    return {
      key,
      label: arg2,
      value: arg3,
      options: arg4,
    };
  }

  return {
    key,
    value: arg2,
    options: isLogOptions(arg3) ? arg3 : undefined,
  };
}

function writeLine(method: LogConsoleMethod, line: unknown): void {
  const sink = console[method];
  if (typeof sink === "function") {
    sink(line);
    return;
  }
  console.log(line);
}

function runLog(args: ResolvedLogArgs, ctx?: RunContext): void {
  const { label, value, options } = args;
  if (options?.enabled === false) {
    return;
  }

  const level = options?.level ?? ctx?.forceLevel;
  const consoleMethod = resolveConsoleMethod(level, options?.consoleMethod);
  const showLevelTag = options?.showLevelTag ?? (ctx?.defaultShowLevelTag ?? false);
  const includeLocation = options?.includeLocation ?? true;
  const stack = includeLocation ? new Error().stack : undefined;
  const caller = includeLocation ? getCallerFromStack(stack) : { file: "disabled", line: 0 };
  const location = `${caller.file}:${caller.line}`;

  const mergedContext = mergeContexts(ctx?.defaultContext, options?.context);
  const contextualValue = injectContext(value, mergedContext);
  const transformedValue = transformValue(contextualValue, {
    redact: options?.redact,
    maxArrayLength: options?.maxArrayLength,
  });
  const formatOptions: FormatOptions = {
    colors: options?.colors,
    mode: options?.mode,
    inspectDepth: options?.inspectDepth,
  };
  const formattedValue = formatValue(transformedValue, formatOptions);
  const levelTag = level ? levelToTag(level) : undefined;

  if (options?.formatter) {
    const formatted = options.formatter({
      location,
      label,
      value: transformedValue,
      formattedValue,
      level,
      levelTag,
    });
    writeLine(consoleMethod, formatted.locationLine);
    writeLine(consoleMethod, formatted.valueLine);
    return;
  }

  if (includeLocation) {
    writeLine(consoleMethod, location);
  }

  const labeledValue = formatLabeledValue(label, formattedValue);
  const valueLine =
    showLevelTag && levelTag ? `${levelTag} ${String(labeledValue)}` : labeledValue;
  writeLine(consoleMethod, valueLine);
}

const DEV_PRESET: LogOptions = {
  mode: "pretty",
  includeLocation: true,
  colors: true,
};

const PROD_PRESET: LogOptions = {
  mode: "fast",
  includeLocation: false,
  colors: false,
};

function mergeOptions(base: LogOptions | undefined, incoming: LogOptions | undefined): LogOptions | undefined {
  if (!base && !incoming) return undefined;

  const merged: LogOptions = {
    ...(base ?? {}),
    ...(incoming ?? {}),
  };

  merged.context = mergeContexts(base?.context, incoming?.context);
  return merged;
}

function resolveTimingLevel(durationMs: number, options?: LogOptions): LogLevel {
  const errorThreshold = options?.errorThresholdMs;
  const warnThreshold = options?.warnThresholdMs;

  if (typeof errorThreshold === "number" && durationMs >= errorThreshold) return "error";
  if (typeof warnThreshold === "number" && durationMs >= warnThreshold) return "warn";
  return "info";
}

export function log(value: unknown, options?: LogOptions): void;
export function log(label: string, value: unknown, options?: LogOptions): void;
export function log(
  arg1: string | unknown,
  arg2?: unknown | LogOptions,
  arg3?: LogOptions,
): void {
  runLog(resolveLogArgs(arg1, arg2, arg3));
}

export function once(key: string, value: unknown, options?: LogOptions): void;
export function once(key: string, label: string, value: unknown, options?: LogOptions): void;
export function once(
  key: string,
  arg2: string | unknown,
  arg3?: unknown | LogOptions,
  arg4?: LogOptions,
): void {
  const resolved = resolveOnceArgs(key, arg2, arg3, arg4);
  if (resolved.options?.enabled === false) return;
  if (!checkAndMarkOnce(key)) return;
  runLog({ label: resolved.label, value: resolved.value, options: resolved.options });
}

export function resetOnce(keys?: string[]): void {
  clearOnce(keys);
}

export function time(key: string, options?: LogOptions): void {
  if (options?.enabled === false) return;
  const now = options?.clockNow?.() ?? Date.now();
  startTimer(key, now);
}

export function timeEnd(key: string, options?: LogOptions): void;
export function timeEnd(key: string, value: unknown, options?: LogOptions): void;
export function timeEnd(key: string, label: string, value: unknown, options?: LogOptions): void;
export function timeEnd(
  key: string,
  arg2?: string | unknown | LogOptions,
  arg3?: unknown | LogOptions,
  arg4?: LogOptions,
): void {
  const resolved = resolveTimeEndArgs(key, arg2, arg3, arg4);
  if (resolved.options?.enabled === false) return;

  const now = resolved.options?.clockNow?.() ?? Date.now();
  const durationMs = endTimer(key, now);

  if (durationMs == null) {
    runLog(
      {
        label: resolved.label ?? "timer",
        value: {
          key,
          error: "timer_not_started",
        },
        options: resolved.options,
      },
      {
        forceLevel: "warn",
        defaultShowLevelTag: true,
      },
    );
    return;
  }

  const timedPayload = resolved.options?.includeDurationOnly
    ? { durationMs }
    : {
      key,
      durationMs,
      ...(resolved.value !== undefined ? { value: resolved.value } : {}),
    };

  const timingLevel = resolveTimingLevel(durationMs, resolved.options);
  runLog(
    {
      label: resolved.label ?? "timer",
      value: timedPayload,
      options: resolved.options,
    },
    {
      forceLevel: timingLevel,
      defaultShowLevelTag: true,
    },
  );
}

export function resetTimers(keys?: string[]): void {
  clearTimers(keys);
}

export function logDev(value: unknown, options?: LogOptions): void;
export function logDev(label: string, value: unknown, options?: LogOptions): void;
export function logDev(
  arg1: string | unknown,
  arg2?: unknown | LogOptions,
  arg3?: LogOptions,
): void {
  const resolved = resolveLogArgs(arg1, arg2, arg3);
  runLog({
    ...resolved,
    options: mergeOptions(DEV_PRESET, resolved.options),
  });
}

export function logProd(value: unknown, options?: LogOptions): void;
export function logProd(label: string, value: unknown, options?: LogOptions): void;
export function logProd(
  arg1: string | unknown,
  arg2?: unknown | LogOptions,
  arg3?: LogOptions,
): void {
  const resolved = resolveLogArgs(arg1, arg2, arg3);
  runLog({
    ...resolved,
    options: mergeOptions(PROD_PRESET, resolved.options),
  });
}

export type LoggerMethod = {
  (value: unknown, options?: LogOptions): void;
  (label: string, value: unknown, options?: LogOptions): void;
};

export type OnceMethod = {
  (key: string, value: unknown, options?: LogOptions): void;
  (key: string, label: string, value: unknown, options?: LogOptions): void;
};

export type TimeMethod = {
  (key: string, options?: LogOptions): void;
};

export type TimeEndMethod = {
  (key: string, options?: LogOptions): void;
  (key: string, value: unknown, options?: LogOptions): void;
  (key: string, label: string, value: unknown, options?: LogOptions): void;
};

export interface LoggerFn extends LoggerMethod {
  info: LoggerMethod;
  success: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
  debug: LoggerMethod;
  once: OnceMethod;
  time: TimeMethod;
  timeEnd: TimeEndMethod;
  withContext: (context: LogContext) => LoggerFn;
  resetOnce: (keys?: string[]) => void;
  resetTimers: (keys?: string[]) => void;
}

function makeLevelMethod(level: LogLevel, presetOptions?: LogOptions, defaultContext?: LogContext): LoggerMethod {
  const method = (
    arg1: string | unknown,
    arg2?: unknown | LogOptions,
    arg3?: LogOptions,
  ) => {
    const resolved = resolveLogArgs(arg1, arg2, arg3);
    runLog(
      {
        ...resolved,
        options: mergeOptions(presetOptions, resolved.options),
      },
      {
        forceLevel: level,
        defaultShowLevelTag: true,
        defaultContext,
      },
    );
  };
  return method as LoggerMethod;
}

export function createLogger(presetOptions?: LogOptions): LoggerFn {
  const baseContext = presetOptions?.context;
  const fn = (
    arg1: string | unknown,
    arg2?: unknown | LogOptions,
    arg3?: LogOptions,
  ) => {
    const resolved = resolveLogArgs(arg1, arg2, arg3);
    runLog(
      {
        ...resolved,
        options: mergeOptions(presetOptions, resolved.options),
      },
      {
        defaultContext: baseContext,
      },
    );
  };

  const logger = fn as LoggerFn;
  logger.info = makeLevelMethod("info", presetOptions, baseContext);
  logger.success = makeLevelMethod("success", presetOptions, baseContext);
  logger.warn = makeLevelMethod("warn", presetOptions, baseContext);
  logger.error = makeLevelMethod("error", presetOptions, baseContext);
  logger.debug = makeLevelMethod("debug", presetOptions, baseContext);
  logger.once = ((key: string, arg2: string | unknown, arg3?: unknown | LogOptions, arg4?: LogOptions) => {
    const resolved = resolveOnceArgs(key, arg2, arg3, arg4);
    const merged = mergeOptions(presetOptions, resolved.options);
    if (merged?.enabled === false) return;
    if (!checkAndMarkOnce(key)) return;
    runLog(
      {
        label: resolved.label,
        value: resolved.value,
        options: merged,
      },
      {
        defaultContext: baseContext,
      },
    );
  }) as OnceMethod;
  logger.time = ((key: string, options?: LogOptions) => {
    const merged = mergeOptions(presetOptions, options);
    if (merged?.enabled === false) return;
    const now = merged?.clockNow?.() ?? Date.now();
    startTimer(key, now);
  }) as TimeMethod;
  logger.timeEnd = ((key: string, arg2?: string | unknown | LogOptions, arg3?: unknown | LogOptions, arg4?: LogOptions) => {
    const resolved = resolveTimeEndArgs(key, arg2, arg3, arg4);
    const merged = mergeOptions(presetOptions, resolved.options);
    if (merged?.enabled === false) return;
    const now = merged?.clockNow?.() ?? Date.now();
    const durationMs = endTimer(key, now);
    if (durationMs == null) {
      runLog(
        {
          label: resolved.label ?? "timer",
          value: { key, error: "timer_not_started" },
          options: merged,
        },
        {
          forceLevel: "warn",
          defaultShowLevelTag: true,
          defaultContext: baseContext,
        },
      );
      return;
    }
    const timedPayload = merged?.includeDurationOnly
      ? { durationMs }
      : {
        key,
        durationMs,
        ...(resolved.value !== undefined ? { value: resolved.value } : {}),
      };
    const level = resolveTimingLevel(durationMs, merged);
    runLog(
      {
        label: resolved.label ?? "timer",
        value: timedPayload,
        options: merged,
      },
      {
        forceLevel: level,
        defaultShowLevelTag: true,
        defaultContext: baseContext,
      },
    );
  }) as TimeEndMethod;
  logger.withContext = (context: LogContext) => {
    return createLogger(mergeOptions(presetOptions, { context }));
  };
  logger.resetOnce = (keys?: string[]) => clearOnce(keys);
  logger.resetTimers = (keys?: string[]) => clearTimers(keys);
  return logger;
}

export function withContext(context: LogContext, presetOptions?: LogOptions): LoggerFn {
  return createLogger(mergeOptions(presetOptions, { context }));
}

export const info = makeLevelMethod("info");
export const success = makeLevelMethod("success");
export const warn = makeLevelMethod("warn");
export const error = makeLevelMethod("error");
export const debug = makeLevelMethod("debug");

export const __internal = {
  getCallerFromStack,
  parseFrameLine,
  formatLabeledValue,
  isLogOptions,
  resolveLogArgs,
  mergeOptions,
  writeLine,
  resolveOnceArgs,
  resolveTimeEndArgs,
  resolveTimingLevel,
};
