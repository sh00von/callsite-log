type LogContext = Record<string, unknown>;

type LogMode = "pretty" | "fast";
declare function formatLabeledValue(label: string | undefined, formattedValue: unknown): unknown;

type LogLevel = "info" | "success" | "warn" | "error" | "debug";
type LogConsoleMethod = "log" | "info" | "warn" | "error" | "debug";

type ParsedFrame = {
    file: string;
    line: number;
};
declare function parseFrameLine(frame: string): ParsedFrame | null;
declare function getCallerFromStack(stack?: string): ParsedFrame;

type LogLevelStyle = "compact";
type FormatterInput = {
    location: string;
    label?: string;
    value: unknown;
    formattedValue: unknown;
    level?: LogLevel;
    levelTag?: string;
};
type FormatterOutput = {
    locationLine: unknown;
    valueLine: unknown;
};
type LogOptions = {
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
declare function isLogOptions(value: unknown): value is LogOptions;
declare function resolveLogArgs(arg1: string | unknown, arg2?: unknown | LogOptions, arg3?: LogOptions): ResolvedLogArgs;
declare function resolveOnceArgs(key: string, arg2: string | unknown, arg3?: unknown | LogOptions, arg4?: LogOptions): OnceArgs;
declare function resolveTimeEndArgs(key: string, arg2?: string | unknown | LogOptions, arg3?: unknown | LogOptions, arg4?: LogOptions): TimeEndArgs;
declare function writeLine(method: LogConsoleMethod, line: unknown): void;
declare function mergeOptions(base: LogOptions | undefined, incoming: LogOptions | undefined): LogOptions | undefined;
declare function resolveTimingLevel(durationMs: number, options?: LogOptions): LogLevel;
declare function log(value: unknown, options?: LogOptions): void;
declare function log(label: string, value: unknown, options?: LogOptions): void;
declare function once(key: string, value: unknown, options?: LogOptions): void;
declare function once(key: string, label: string, value: unknown, options?: LogOptions): void;
declare function resetOnce(keys?: string[]): void;
declare function time(key: string, options?: LogOptions): void;
declare function timeEnd(key: string, options?: LogOptions): void;
declare function timeEnd(key: string, value: unknown, options?: LogOptions): void;
declare function timeEnd(key: string, label: string, value: unknown, options?: LogOptions): void;
declare function resetTimers(keys?: string[]): void;
declare function logDev(value: unknown, options?: LogOptions): void;
declare function logDev(label: string, value: unknown, options?: LogOptions): void;
declare function logProd(value: unknown, options?: LogOptions): void;
declare function logProd(label: string, value: unknown, options?: LogOptions): void;
type LoggerMethod = {
    (value: unknown, options?: LogOptions): void;
    (label: string, value: unknown, options?: LogOptions): void;
};
type OnceMethod = {
    (key: string, value: unknown, options?: LogOptions): void;
    (key: string, label: string, value: unknown, options?: LogOptions): void;
};
type TimeMethod = {
    (key: string, options?: LogOptions): void;
};
type TimeEndMethod = {
    (key: string, options?: LogOptions): void;
    (key: string, value: unknown, options?: LogOptions): void;
    (key: string, label: string, value: unknown, options?: LogOptions): void;
};
interface LoggerFn extends LoggerMethod {
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
declare function createLogger(presetOptions?: LogOptions): LoggerFn;
declare function withContext(context: LogContext, presetOptions?: LogOptions): LoggerFn;
declare const info: LoggerMethod;
declare const success: LoggerMethod;
declare const warn: LoggerMethod;
declare const error: LoggerMethod;
declare const debug: LoggerMethod;
declare const __internal: {
    getCallerFromStack: typeof getCallerFromStack;
    parseFrameLine: typeof parseFrameLine;
    formatLabeledValue: typeof formatLabeledValue;
    isLogOptions: typeof isLogOptions;
    resolveLogArgs: typeof resolveLogArgs;
    mergeOptions: typeof mergeOptions;
    writeLine: typeof writeLine;
    resolveOnceArgs: typeof resolveOnceArgs;
    resolveTimeEndArgs: typeof resolveTimeEndArgs;
    resolveTimingLevel: typeof resolveTimingLevel;
};

export { type FormatterInput, type FormatterOutput, type LogConsoleMethod, type LogContext, type LogLevel, type LogMode, type LogOptions, type LoggerFn, type LoggerMethod, type OnceMethod, type TimeEndMethod, type TimeMethod, __internal, createLogger, debug, error, info, log, logDev, logProd, once, resetOnce, resetTimers, success, time, timeEnd, warn, withContext };
