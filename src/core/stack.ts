type ParsedFrame = {
  file: string;
  line: number;
};

function safeToInt(input: string): number {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? n : 0;
}

function basename(filePath: string): string {
  const clean = filePath.replace(/^file:\/\//, "");
  const normalized = clean.replace(/\\/g, "/");
  const last = normalized.lastIndexOf("/");
  return last >= 0 ? normalized.slice(last + 1) : normalized;
}

export function parseFrameLine(frame: string): ParsedFrame | null {
  const cleaned = frame.trim();
  if (!cleaned) return null;

  const v8Match = cleaned.match(/(?:at\s+)?(?:.+\s+\()?(.+):(\d+):(\d+)\)?$/);
  if (v8Match) {
    return {
      file: basename(v8Match[1]),
      line: safeToInt(v8Match[2]),
    };
  }

  const ffMatch = cleaned.match(/@(.+):(\d+):(\d+)$/);
  if (ffMatch) {
    return {
      file: basename(ffMatch[1]),
      line: safeToInt(ffMatch[2]),
    };
  }

  return null;
}

export function getCallerFromStack(stack?: string): ParsedFrame {
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
