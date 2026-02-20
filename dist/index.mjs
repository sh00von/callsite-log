// src/core/format.ts
import util from "util";
function isNodeRuntime() {
  return typeof process !== "undefined" && !!process.versions?.node;
}
function safeFastStringify(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  return JSON.stringify(value, (_k, v) => {
    if (typeof v === "object" && v !== null) {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
    }
    return v;
  });
}
function formatFastValue(value) {
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
function formatValue(value, options) {
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
    compact: false
  });
}
function formatLabeledValue(label, formattedValue) {
  if (!label) return formattedValue;
  if (typeof formattedValue === "string") {
    return `${label}: ${formattedValue}`;
  }
  return `${label}: ${String(formattedValue)}`;
}

// src/core/stack.ts
function safeToInt(input) {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? n : 0;
}
function basename(filePath) {
  const clean = filePath.replace(/^file:\/\//, "");
  const normalized = clean.replace(/\\/g, "/");
  const last = normalized.lastIndexOf("/");
  return last >= 0 ? normalized.slice(last + 1) : normalized;
}
function parseFrameLine(frame) {
  const cleaned = frame.trim();
  if (!cleaned) return null;
  const v8Match = cleaned.match(/(?:at\s+)?(?:.+\s+\()?(.+):(\d+):(\d+)\)?$/);
  if (v8Match) {
    return {
      file: basename(v8Match[1]),
      line: safeToInt(v8Match[2])
    };
  }
  const ffMatch = cleaned.match(/@(.+):(\d+):(\d+)$/);
  if (ffMatch) {
    return {
      file: basename(ffMatch[1]),
      line: safeToInt(ffMatch[2])
    };
  }
  return null;
}
function getCallerFromStack(stack) {
  if (!stack) return { file: "unknown", line: 0 };
  const frames = stack.split("\n");
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i].trim();
    if (!frame) continue;
    if (frame.includes("getCallerFromStack")) continue;
    if (frame.includes("at log")) continue;
    if (frame.includes("at Object.log")) continue;
    if (frame.includes("/src/index.ts")) continue;
    if (frame.includes("\\src\\index.ts")) continue;
    if (frame.includes("/src/core/")) continue;
    if (frame.includes("\\src\\core\\")) continue;
    const parsed = parseFrameLine(frame);
    if (parsed) return parsed;
  }
  return { file: "unknown", line: 0 };
}

// src/index.ts
function isLogOptions(value) {
  if (!value || typeof value !== "object") return false;
  const record = value;
  return "colors" in record || "formatter" in record || "mode" in record || "includeLocation" in record || "inspectDepth" in record;
}
function log(arg1, arg2, arg3) {
  let label;
  let value;
  let options;
  if (typeof arg1 === "string" && arg2 !== void 0 && !isLogOptions(arg2)) {
    label = arg1;
    value = arg2;
    options = arg3;
  } else {
    value = arg1;
    options = isLogOptions(arg2) ? arg2 : void 0;
  }
  const includeLocation = options?.includeLocation ?? true;
  const stack = includeLocation ? new Error().stack : void 0;
  const caller = includeLocation ? getCallerFromStack(stack) : { file: "disabled", line: 0 };
  const location = `${caller.file}:${caller.line}`;
  const formatOptions = {
    colors: options?.colors,
    mode: options?.mode,
    inspectDepth: options?.inspectDepth
  };
  const formattedValue = formatValue(value, formatOptions);
  if (options?.formatter) {
    const formatted = options.formatter({
      location,
      label,
      value,
      formattedValue
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
var __internal = {
  getCallerFromStack,
  parseFrameLine,
  formatLabeledValue,
  isLogOptions
};
export {
  __internal,
  log
};
