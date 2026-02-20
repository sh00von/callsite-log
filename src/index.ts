import util from "node:util";
import path from "node:path";

type ParsedFrame = {
  file: string;
  line: number;
};

export type FormatterInput = {
  location: string;
  label?: string;
  value: unknown;
  formattedValue: unknown;
};

export type FormatterOutput = {
  locationLine: unknown;
  valueLine: unknown;
};

export type LogOptions = {
  colors?: boolean;
  formatter?: (input: FormatterInput) => FormatterOutput;
};

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && !!process.versions?.node;
}

function safeToInt(input: string): number {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? n : 0;
}

function normalizeFile(filePath: string): string {
  const clean = filePath.replace(/^file:\/\//, "");
  return path.basename(clean);
}

function parseFrameLine(frame: string): ParsedFrame | null {
  const cleaned = frame.trim();
  if (!cleaned) return null;

  // Chrome/Node V8 style:
  // at fn (path/to/file.ts:12:34)
  // at path/to/file.ts:12:34
  const v8Match = cleaned.match(/(?:at\s+)?(?:.+\s+\()?(.+):(\d+):(\d+)\)?$/);
  if (v8Match) {
    return {
      file: normalizeFile(v8Match[1]),
      line: safeToInt(v8Match[2]),
    };
  }

  // Firefox-like style:
  // fn@http://localhost:3000/src/file.tsx:44:12
  const ffMatch = cleaned.match(/@(.+):(\d+):(\d+)$/);
  if (ffMatch) {
    return {
      file: normalizeFile(ffMatch[1]),
      line: safeToInt(ffMatch[2]),
    };
  }

  return null;
}

function getCallerFromStack(stack?: string): ParsedFrame {
  if (!stack) return { file: "unknown", line: 0 };

  const frames = stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const frame of frames) {
    if (frame.includes("getCallerFromStack")) continue;
    if (frame.includes("at log")) continue;
    if (frame.includes("at Object.log")) continue;
    if (frame.includes("/src/index.ts")) continue;
    if (frame.includes("\\src\\index.ts")) continue;

    const parsed = parseFrameLine(frame);
    if (parsed) return parsed;
  }

  return { file: "unknown", line: 0 };
}

function isLogOptions(value: unknown): value is LogOptions {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return "colors" in record || "formatter" in record;
}

function formatValue(value: unknown, options?: LogOptions): unknown {
  if (!isNodeRuntime()) {
    return value;
  }

  return util.inspect(value, {
    depth: null,
    colors: options?.colors ?? true,
    compact: false,
  });
}

function formatLabeledValue(label: string | undefined, formattedValue: unknown): unknown {
  if (!label) return formattedValue;

  if (typeof formattedValue === "string") {
    return `${label}: ${formattedValue}`;
  }

  return `${label}: ${String(formattedValue)}`;
}

export function log(value: unknown, options?: LogOptions): void;
export function log(label: string, value: unknown, options?: LogOptions): void;
export function log(
  arg1: string | unknown,
  arg2?: unknown | LogOptions,
  arg3?: LogOptions,
): void {
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

  const stack = new Error().stack;
  const caller = getCallerFromStack(stack);
  const location = `${caller.file}:${caller.line}`;
  const formattedValue = formatValue(value, options);

  if (options?.formatter) {
    const formatted = options.formatter({
      location,
      label,
      value,
      formattedValue,
    });
    console.log(formatted.locationLine);
    console.log(formatted.valueLine);
    return;
  }

  console.log(location);
  console.log(formatLabeledValue(label, formattedValue));
}

export const __internal = {
  getCallerFromStack,
  parseFrameLine,
  formatLabeledValue,
  isLogOptions,
};
