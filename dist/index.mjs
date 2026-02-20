// src/core/context.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function mergeContexts(base, incoming) {
  if (!base && !incoming) return void 0;
  return {
    ...base ?? {},
    ...incoming ?? {}
  };
}
function injectContext(value, context) {
  if (!context) return value;
  if (isRecord(value)) {
    const existing = isRecord(value.context) ? value.context : void 0;
    return {
      ...value,
      context: {
        ...existing ?? {},
        ...context
      }
    };
  }
  return {
    value,
    context
  };
}

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

// src/core/level.ts
var LEVEL_METHOD_MAP = {
  info: "info",
  success: "log",
  warn: "warn",
  error: "error",
  debug: "debug"
};
function levelToConsoleMethod(level) {
  return LEVEL_METHOD_MAP[level];
}
function levelToTag(level) {
  return `[${level.toUpperCase()}]`;
}
function resolveConsoleMethod(level, override) {
  if (override) return override;
  if (!level) return "log";
  return levelToConsoleMethod(level);
}

// src/core/session.ts
var onceKeys = /* @__PURE__ */ new Set();
var timers = /* @__PURE__ */ new Map();
function checkAndMarkOnce(key) {
  if (onceKeys.has(key)) return false;
  onceKeys.add(key);
  return true;
}
function clearOnce(keys) {
  if (!keys || keys.length === 0) {
    onceKeys.clear();
    return;
  }
  for (const key of keys) {
    onceKeys.delete(key);
  }
}
function startTimer(key, now) {
  timers.set(key, { startedAt: now });
}
function endTimer(key, now) {
  const entry = timers.get(key);
  if (!entry) return null;
  timers.delete(key);
  return Math.max(0, now - entry.startedAt);
}
function clearTimers(keys) {
  if (!keys || keys.length === 0) {
    timers.clear();
    return;
  }
  for (const key of keys) {
    timers.delete(key);
  }
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

// src/core/transform.ts
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
function cloneDeep(value, seen = /* @__PURE__ */ new WeakMap()) {
  if (!isObjectLike(value)) return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const arr = [];
    seen.set(value, arr);
    for (let i = 0; i < value.length; i += 1) {
      arr.push(cloneDeep(value[i], seen));
    }
    return arr;
  }
  const obj = {};
  seen.set(value, obj);
  for (const [k, v] of Object.entries(value)) {
    obj[k] = cloneDeep(v, seen);
  }
  return obj;
}
function redactPath(target, path) {
  if (!isObjectLike(target) || path.length === 0) return;
  const [head, ...rest] = path;
  if (Array.isArray(target)) {
    const idx = Number.parseInt(head, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= target.length) return;
    if (rest.length === 0) {
      target[idx] = "[REDACTED]";
      return;
    }
    redactPath(target[idx], rest);
    return;
  }
  if (!(head in target)) return;
  if (rest.length === 0) {
    target[head] = "[REDACTED]";
    return;
  }
  redactPath(target[head], rest);
}
function truncateArrays(target, maxArrayLength) {
  if (!isObjectLike(target)) return target;
  if (Array.isArray(target)) {
    const sliced = target.slice(0, maxArrayLength).map((item) => truncateArrays(item, maxArrayLength));
    if (target.length > maxArrayLength) {
      sliced.push(`[... ${target.length - maxArrayLength} more items]`);
    }
    return sliced;
  }
  const out = {};
  for (const [k, v] of Object.entries(target)) {
    out[k] = truncateArrays(v, maxArrayLength);
  }
  return out;
}
function transformValue(value, options) {
  if (!options?.redact?.length && options?.maxArrayLength == null) {
    return value;
  }
  const cloned = cloneDeep(value);
  if (options.redact?.length) {
    for (const rawPath of options.redact) {
      const path = rawPath.split(".").map((part) => part.trim()).filter(Boolean);
      if (path.length === 0) continue;
      redactPath(cloned, path);
    }
  }
  if (typeof options.maxArrayLength === "number" && options.maxArrayLength >= 0) {
    return truncateArrays(cloned, options.maxArrayLength);
  }
  return cloned;
}

// src/index.ts
function isLogOptions(value) {
  if (!value || typeof value !== "object") return false;
  const record = value;
  return "colors" in record || "formatter" in record || "enabled" in record || "mode" in record || "includeLocation" in record || "inspectDepth" in record || "maxArrayLength" in record || "redact" in record || "level" in record || "showLevelTag" in record || "levelTagStyle" in record || "consoleMethod" in record || "context" in record || "clockNow" in record || "warnThresholdMs" in record || "errorThresholdMs" in record || "includeDurationOnly" in record;
}
function resolveLogArgs(arg1, arg2, arg3) {
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
  return { label, value, options };
}
function resolveOnceArgs(key, arg2, arg3, arg4) {
  if (typeof arg2 === "string" && arg3 !== void 0 && !isLogOptions(arg3)) {
    return {
      key,
      label: arg2,
      value: arg3,
      options: arg4
    };
  }
  return {
    key,
    value: arg2,
    options: isLogOptions(arg3) ? arg3 : void 0
  };
}
function resolveTimeEndArgs(key, arg2, arg3, arg4) {
  if (arg2 === void 0) {
    return { key };
  }
  if (isLogOptions(arg2)) {
    return { key, options: arg2 };
  }
  if (typeof arg2 === "string" && arg3 !== void 0 && !isLogOptions(arg3)) {
    return {
      key,
      label: arg2,
      value: arg3,
      options: arg4
    };
  }
  return {
    key,
    value: arg2,
    options: isLogOptions(arg3) ? arg3 : void 0
  };
}
function writeLine(method, line) {
  const sink = console[method];
  if (typeof sink === "function") {
    sink(line);
    return;
  }
  console.log(line);
}
function runLog(args, ctx) {
  const { label, value, options } = args;
  if (options?.enabled === false) {
    return;
  }
  const level = options?.level ?? ctx?.forceLevel;
  const consoleMethod = resolveConsoleMethod(level, options?.consoleMethod);
  const showLevelTag = options?.showLevelTag ?? (ctx?.defaultShowLevelTag ?? false);
  const includeLocation = options?.includeLocation ?? true;
  const stack = includeLocation ? new Error().stack : void 0;
  const caller = includeLocation ? getCallerFromStack(stack) : { file: "disabled", line: 0 };
  const location = `${caller.file}:${caller.line}`;
  const mergedContext = mergeContexts(ctx?.defaultContext, options?.context);
  const contextualValue = injectContext(value, mergedContext);
  const transformedValue = transformValue(contextualValue, {
    redact: options?.redact,
    maxArrayLength: options?.maxArrayLength
  });
  const formatOptions = {
    colors: options?.colors,
    mode: options?.mode,
    inspectDepth: options?.inspectDepth
  };
  const formattedValue = formatValue(transformedValue, formatOptions);
  const levelTag = level ? levelToTag(level) : void 0;
  if (options?.formatter) {
    const formatted = options.formatter({
      location,
      label,
      value: transformedValue,
      formattedValue,
      level,
      levelTag
    });
    writeLine(consoleMethod, formatted.locationLine);
    writeLine(consoleMethod, formatted.valueLine);
    return;
  }
  if (includeLocation) {
    writeLine(consoleMethod, location);
  }
  const labeledValue = formatLabeledValue(label, formattedValue);
  const valueLine = showLevelTag && levelTag ? `${levelTag} ${String(labeledValue)}` : labeledValue;
  writeLine(consoleMethod, valueLine);
}
var DEV_PRESET = {
  mode: "pretty",
  includeLocation: true,
  colors: true
};
var PROD_PRESET = {
  mode: "fast",
  includeLocation: false,
  colors: false
};
function mergeOptions(base, incoming) {
  if (!base && !incoming) return void 0;
  const merged = {
    ...base ?? {},
    ...incoming ?? {}
  };
  merged.context = mergeContexts(base?.context, incoming?.context);
  return merged;
}
function resolveTimingLevel(durationMs, options) {
  const errorThreshold = options?.errorThresholdMs;
  const warnThreshold = options?.warnThresholdMs;
  if (typeof errorThreshold === "number" && durationMs >= errorThreshold) return "error";
  if (typeof warnThreshold === "number" && durationMs >= warnThreshold) return "warn";
  return "info";
}
function log(arg1, arg2, arg3) {
  runLog(resolveLogArgs(arg1, arg2, arg3));
}
function once(key, arg2, arg3, arg4) {
  const resolved = resolveOnceArgs(key, arg2, arg3, arg4);
  if (resolved.options?.enabled === false) return;
  if (!checkAndMarkOnce(key)) return;
  runLog({ label: resolved.label, value: resolved.value, options: resolved.options });
}
function resetOnce(keys) {
  clearOnce(keys);
}
function time(key, options) {
  if (options?.enabled === false) return;
  const now = options?.clockNow?.() ?? Date.now();
  startTimer(key, now);
}
function timeEnd(key, arg2, arg3, arg4) {
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
          error: "timer_not_started"
        },
        options: resolved.options
      },
      {
        forceLevel: "warn",
        defaultShowLevelTag: true
      }
    );
    return;
  }
  const timedPayload = resolved.options?.includeDurationOnly ? { durationMs } : {
    key,
    durationMs,
    ...resolved.value !== void 0 ? { value: resolved.value } : {}
  };
  const timingLevel = resolveTimingLevel(durationMs, resolved.options);
  runLog(
    {
      label: resolved.label ?? "timer",
      value: timedPayload,
      options: resolved.options
    },
    {
      forceLevel: timingLevel,
      defaultShowLevelTag: true
    }
  );
}
function resetTimers(keys) {
  clearTimers(keys);
}
function logDev(arg1, arg2, arg3) {
  const resolved = resolveLogArgs(arg1, arg2, arg3);
  runLog({
    ...resolved,
    options: mergeOptions(DEV_PRESET, resolved.options)
  });
}
function logProd(arg1, arg2, arg3) {
  const resolved = resolveLogArgs(arg1, arg2, arg3);
  runLog({
    ...resolved,
    options: mergeOptions(PROD_PRESET, resolved.options)
  });
}
function makeLevelMethod(level, presetOptions, defaultContext) {
  const method = (arg1, arg2, arg3) => {
    const resolved = resolveLogArgs(arg1, arg2, arg3);
    runLog(
      {
        ...resolved,
        options: mergeOptions(presetOptions, resolved.options)
      },
      {
        forceLevel: level,
        defaultShowLevelTag: true,
        defaultContext
      }
    );
  };
  return method;
}
function createLogger(presetOptions) {
  const baseContext = presetOptions?.context;
  const fn = (arg1, arg2, arg3) => {
    const resolved = resolveLogArgs(arg1, arg2, arg3);
    runLog(
      {
        ...resolved,
        options: mergeOptions(presetOptions, resolved.options)
      },
      {
        defaultContext: baseContext
      }
    );
  };
  const logger = fn;
  logger.info = makeLevelMethod("info", presetOptions, baseContext);
  logger.success = makeLevelMethod("success", presetOptions, baseContext);
  logger.warn = makeLevelMethod("warn", presetOptions, baseContext);
  logger.error = makeLevelMethod("error", presetOptions, baseContext);
  logger.debug = makeLevelMethod("debug", presetOptions, baseContext);
  logger.once = ((key, arg2, arg3, arg4) => {
    const resolved = resolveOnceArgs(key, arg2, arg3, arg4);
    const merged = mergeOptions(presetOptions, resolved.options);
    if (merged?.enabled === false) return;
    if (!checkAndMarkOnce(key)) return;
    runLog(
      {
        label: resolved.label,
        value: resolved.value,
        options: merged
      },
      {
        defaultContext: baseContext
      }
    );
  });
  logger.time = ((key, options) => {
    const merged = mergeOptions(presetOptions, options);
    if (merged?.enabled === false) return;
    const now = merged?.clockNow?.() ?? Date.now();
    startTimer(key, now);
  });
  logger.timeEnd = ((key, arg2, arg3, arg4) => {
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
          options: merged
        },
        {
          forceLevel: "warn",
          defaultShowLevelTag: true,
          defaultContext: baseContext
        }
      );
      return;
    }
    const timedPayload = merged?.includeDurationOnly ? { durationMs } : {
      key,
      durationMs,
      ...resolved.value !== void 0 ? { value: resolved.value } : {}
    };
    const level = resolveTimingLevel(durationMs, merged);
    runLog(
      {
        label: resolved.label ?? "timer",
        value: timedPayload,
        options: merged
      },
      {
        forceLevel: level,
        defaultShowLevelTag: true,
        defaultContext: baseContext
      }
    );
  });
  logger.withContext = (context) => {
    return createLogger(mergeOptions(presetOptions, { context }));
  };
  logger.resetOnce = (keys) => clearOnce(keys);
  logger.resetTimers = (keys) => clearTimers(keys);
  return logger;
}
function withContext(context, presetOptions) {
  return createLogger(mergeOptions(presetOptions, { context }));
}
var info = makeLevelMethod("info");
var success = makeLevelMethod("success");
var warn = makeLevelMethod("warn");
var error = makeLevelMethod("error");
var debug = makeLevelMethod("debug");
var __internal = {
  getCallerFromStack,
  parseFrameLine,
  formatLabeledValue,
  isLogOptions,
  resolveLogArgs,
  mergeOptions,
  writeLine,
  resolveOnceArgs,
  resolveTimeEndArgs,
  resolveTimingLevel
};
export {
  __internal,
  createLogger,
  debug,
  error,
  info,
  log,
  logDev,
  logProd,
  once,
  resetOnce,
  resetTimers,
  success,
  time,
  timeEnd,
  warn,
  withContext
};
