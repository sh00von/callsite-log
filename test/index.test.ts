import { describe, expect, it, vi } from "vitest";
import {
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
  withContext,
} from "../src/index";

describe("stack parsing", () => {
  it("parses V8 stack frames", () => {
    const frame = "    at render (C:/repo/src/user.tsx:44:12)";
    const result = __internal.parseFrameLine(frame);

    expect(result).toEqual({
      file: "user.tsx",
      line: 44,
    });
  });

  it("parses firefox-like stack frames", () => {
    const frame = "renderUser@http://localhost:3000/src/user.tsx:77:9";
    const result = __internal.parseFrameLine(frame);

    expect(result).toEqual({
      file: "user.tsx",
      line: 77,
    });
  });

  it("returns unknown fallback for unparseable stack", () => {
    const result = __internal.getCallerFromStack("Error\n    at ???");

    expect(result).toEqual({
      file: "unknown",
      line: 0,
    });
  });

  it("extracts the first external caller from stack", () => {
    const stack = [
      "Error",
      "    at log (D:/work/text-editor/src/index.ts:88:10)",
      "    at run (D:/work/app/src/user.tsx:44:5)",
    ].join("\n");

    const result = __internal.getCallerFromStack(stack);
    expect(result).toEqual({
      file: "user.tsx",
      line: 44,
    });
  });
});

describe("log()", () => {
  it("prints two lines", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log({ id: 1, name: "Shovon" });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[0][0])).toMatch(/.+:\d+/);
    spy.mockRestore();
  });

  it("supports log(label, value)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("user", { id: 1, name: "Shovon" });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[1][0])).toContain("user:");
    spy.mockRestore();
  });

  it("supports colors false", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log({ id: 1 }, { colors: false });

    const second = String(spy.mock.calls[1][0]);
    expect(second).not.toMatch(/\u001b\[/);
    spy.mockRestore();
  });

  it("supports custom formatter", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("user", { id: 1 }, {
      formatter: ({ location, label, value }) => ({
        locationLine: `[from ${location}]`,
        valueLine: `${label}:${JSON.stringify(value)}`,
      }),
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[0][0])).toMatch(/^\[from .+:\d+\]$/);
    expect(spy.mock.calls[1][0]).toBe("user:{\"id\":1}");
    spy.mockRestore();
  });

  it("passes disabled location to formatter when includeLocation is false", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("user", { id: 1 }, {
      includeLocation: false,
      formatter: ({ location }) => ({
        locationLine: location,
        valueLine: "ok",
      }),
    });

    expect(spy.mock.calls[0][0]).toBe("disabled:0");
    spy.mockRestore();
  });

  it("supports includeLocation false", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log({ id: 1 }, { includeLocation: false });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("id");
    spy.mockRestore();
  });

  it("supports fast mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log({ id: 1, name: "Shovon" }, { mode: "fast", includeLocation: false });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe("{\"id\":1,\"name\":\"Shovon\"}");
    spy.mockRestore();
  });

  it("supports inspectDepth in pretty mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log(
      { level1: { level2: { level3: { done: true } } } },
      { inspectDepth: 1, includeLocation: false },
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[Object]");
    spy.mockRestore();
  });

  it("supports enabled false", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log({ id: 1 }, { enabled: false });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("supports redact paths", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log(
      {
        user: {
          token: "secret-token",
          profile: { name: "Shovon" },
        },
        password: "abc123",
      },
      {
        includeLocation: false,
        mode: "fast",
        redact: ["user.token", "password"],
      },
    );

    expect(spy).toHaveBeenCalledTimes(1);
    const output = String(spy.mock.calls[0][0]);
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("abc123");
    spy.mockRestore();
  });

  it("supports maxArrayLength", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log(
      {
        items: [1, 2, 3, 4, 5],
      },
      {
        includeLocation: false,
        mode: "fast",
        maxArrayLength: 2,
      },
    );

    const output = String(spy.mock.calls[0][0]);
    expect(output).toContain("[... 3 more items]");
    spy.mockRestore();
  });
});

describe("presets and factory", () => {
  it("logDev defaults to showing location", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logDev({ id: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[0][0])).toMatch(/.+:\d+/);
    spy.mockRestore();
  });

  it("logProd defaults to no location", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logProd({ id: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("createLogger merges default options with call options", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger({ includeLocation: false, mode: "fast" });

    logger("user", { id: 1 }, { mode: "pretty" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("user:");
    expect(String(spy.mock.calls[0][0])).toContain("id");
    spy.mockRestore();
  });

  it("createLogger supports enabled false at preset level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger({ enabled: false });
    logger({ id: 1 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("createLogger exposes level methods", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = createLogger({ includeLocation: false, mode: "fast" });
    logger.info("payload", { id: 1 });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(String(infoSpy.mock.calls[0][0])).toContain("[INFO]");
    infoSpy.mockRestore();
  });
});

describe("level helpers", () => {
  it("routes info to console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info({ id: 1 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[INFO]");
    spy.mockRestore();
  });

  it("routes success to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    success({ id: 1 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[SUCCESS]");
    spy.mockRestore();
  });

  it("routes warn to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warn({ id: 1 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[WARN]");
    spy.mockRestore();
  });

  it("routes error to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    error({ id: 1 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[ERROR]");
    spy.mockRestore();
  });

  it("routes debug to console.debug", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    debug({ id: 1 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("[DEBUG]");
    spy.mockRestore();
  });

  it("supports disabling level tag", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    info({ id: 1 }, { includeLocation: false, showLevelTag: false });
    expect(String(spy.mock.calls[0][0])).not.toContain("[INFO]");
    spy.mockRestore();
  });

  it("supports overriding console method", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    error({ id: 1 }, { includeLocation: false, consoleMethod: "log" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("passes level metadata into formatter", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("user", { id: 1 }, {
      includeLocation: false,
      formatter: ({ level, levelTag, label, value }) => ({
        locationLine: `${level}:${levelTag}`,
        valueLine: `${label}:${JSON.stringify(value)}`,
      }),
    });
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy.mock.calls[0][0]).toBe("info:[INFO]");
    expect(infoSpy.mock.calls[1][0]).toBe("user:{\"id\":1}");
    infoSpy.mockRestore();
  });
});

describe("once/timer/context features", () => {
  it("once logs only first call per key", () => {
    resetOnce();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    once("dup-key", { id: 1 }, { includeLocation: false });
    once("dup-key", { id: 2 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("resetOnce clears selected keys", () => {
    resetOnce();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    once("k1", { id: 1 }, { includeLocation: false });
    once("k1", { id: 2 }, { includeLocation: false });
    resetOnce(["k1"]);
    once("k1", { id: 3 }, { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("time/timeEnd logs duration payload", () => {
    resetTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    time("load", { clockNow: () => 1000 });
    timeEnd("load", { clockNow: () => 1060, includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("durationMs");
    spy.mockRestore();
  });

  it("timeEnd without start logs warning", () => {
    resetTimers();
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    timeEnd("not-started", { includeLocation: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("timer_not_started");
    spy.mockRestore();
  });

  it("timeEnd uses thresholds for level routing", () => {
    resetTimers();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    time("slow", { clockNow: () => 1000 });
    timeEnd("slow", { clockNow: () => 1300, includeLocation: false, errorThresholdMs: 200 });
    expect(errSpy).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("withContext injects context into payload", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = withContext({ requestId: "req_1", userId: 7 }, { includeLocation: false, mode: "fast" });
    logger("payload", { ok: true });
    const output = String(spy.mock.calls[0][0]);
    expect(output).toContain("requestId");
    expect(output).toContain("userId");
    spy.mockRestore();
  });

  it("logger.withContext merges with existing context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const base = createLogger({ includeLocation: false, mode: "fast", context: { app: "web" } });
    const child = base.withContext({ requestId: "r-1" });
    child({ ok: true });
    const output = String(spy.mock.calls[0][0]);
    expect(output).toContain("app");
    expect(output).toContain("requestId");
    spy.mockRestore();
  });
});
