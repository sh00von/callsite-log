import { describe, expect, it, vi } from "vitest";
import { __internal, log } from "../src/index";

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
});
