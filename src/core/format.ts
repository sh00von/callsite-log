import util from "node:util";

export type LogMode = "pretty" | "fast";

export type FormatOptions = {
  colors?: boolean;
  mode?: LogMode;
  inspectDepth?: number;
};

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && !!process.versions?.node;
}

function safeFastStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_k, v) => {
    if (typeof v === "object" && v !== null) {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
    }
    return v;
  });
}

function formatFastValue(value: unknown): unknown {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return "undefined";
  if (value === null) return "null";
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  try {
    return safeFastStringify(value);
  } catch {
    return "[Unserializable]";
  }
}

export function formatValue(value: unknown, options?: FormatOptions): unknown {
  const mode = options?.mode ?? "pretty";
  if (mode === "fast") {
    return formatFastValue(value);
  }

  if (!isNodeRuntime()) {
    return value;
  }

  return util.inspect(value, {
    depth: options?.inspectDepth ?? null,
    colors: options?.colors ?? true,
    compact: false,
  });
}

export function formatLabeledValue(label: string | undefined, formattedValue: unknown): unknown {
  if (!label) return formattedValue;

  if (typeof formattedValue === "string") {
    return `${label}: ${formattedValue}`;
  }

  return `${label}: ${String(formattedValue)}`;
}
