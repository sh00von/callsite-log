"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  __internal: () => __internal,
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_node_util = __toESM(require("util"), 1);
var import_node_path = __toESM(require("path"), 1);
function isNodeRuntime() {
  return typeof process !== "undefined" && !!process.versions?.node;
}
function safeToInt(input) {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? n : 0;
}
function normalizeFile(filePath) {
  const clean = filePath.replace(/^file:\/\//, "");
  return import_node_path.default.basename(clean);
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
  return import_node_util.default.inspect(value, {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  __internal,
  log
});
