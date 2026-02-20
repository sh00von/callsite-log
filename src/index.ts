import { formatLabeledValue, formatValue, type FormatOptions, type LogMode } from "./core/format";
import { getCallerFromStack, parseFrameLine } from "./core/stack";
export type { LogMode } from "./core/format";

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
  mode?: LogMode;
  includeLocation?: boolean;
  inspectDepth?: number;
  colors?: boolean;
  formatter?: (input: FormatterInput) => FormatterOutput;
};

function isLogOptions(value: unknown): value is LogOptions {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    "colors" in record ||
    "formatter" in record ||
    "mode" in record ||
    "includeLocation" in record ||
    "inspectDepth" in record
  );
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

  const includeLocation = options?.includeLocation ?? true;
  const stack = includeLocation ? new Error().stack : undefined;
  const caller = includeLocation ? getCallerFromStack(stack) : { file: "disabled", line: 0 };
  const location = `${caller.file}:${caller.line}`;
  const formatOptions: FormatOptions = {
    colors: options?.colors,
    mode: options?.mode,
    inspectDepth: options?.inspectDepth,
  };
  const formattedValue = formatValue(value, formatOptions);

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

  if (includeLocation) {
    console.log(location);
  }
  console.log(formatLabeledValue(label, formattedValue));
}

export const __internal = {
  getCallerFromStack,
  parseFrameLine,
  formatLabeledValue,
  isLogOptions,
};
