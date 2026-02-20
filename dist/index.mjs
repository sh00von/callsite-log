// src/index.ts
import util from "util";
import path from "path";
function isNodeRuntime() {
  return typeof process !== "undefined" && !!process.versions?.node;
}
function safeToInt(input) {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? n : 0;
}
function normalizeFile(filePath) {
  const clean = filePath.replace(/^file:\/\//, "");
  return path.basename(clean);
}
function parseFrameLine(frame) {
  const cleaned = frame.trim();
  if (!cleaned) return null;
  const v8Match = cleaned.match(/(?:at\s+)?(?:.+\s+\()?(.+):(\d+):(\d+)\)?$/);
  if (v8Match) {
    return {
      file: normalizeFile(v8Match[1]),
      line: safeToInt(v8Match[2])
    };
  }
  const ffMatch = cleaned.match(/@(.+):(\d+):(\d+)$/);
  if (ffMatch) {
    return {
      file: normalizeFile(ffMatch[1]),
      line: safeToInt(ffMatch[2])
    };
  }
  return null;
}
function getCallerFromStack(stack) {
  if (!stack) return { file: "unknown", line: 0 };
  const frames = stack.split("\n").map((line) => line.trim()).filter(Boolean);
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
function isLogOptions(value) {
  if (!value || typeof value !== "object") return false;
  const record = value;
  return "colors" in record || "formatter" in record;
}
function formatValue(value, options) {
  if (!isNodeRuntime()) {
    return value;
  }
  return util.inspect(value, {
    depth: null,
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
  const stack = new Error().stack;
  const caller = getCallerFromStack(stack);
  const location = `${caller.file}:${caller.line}`;
  const formattedValue = formatValue(value, options);
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
  console.log(location);
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
