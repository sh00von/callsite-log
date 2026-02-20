type UnknownRecord = Record<string, unknown>;

function isObjectLike(value: unknown): value is UnknownRecord | unknown[] {
  return typeof value === "object" && value !== null;
}

function cloneDeep<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  if (!isObjectLike(value)) return value;
  if (seen.has(value as object)) return seen.get(value as object) as T;

  if (Array.isArray(value)) {
    const arr: unknown[] = [];
    seen.set(value, arr);
    for (let i = 0; i < value.length; i += 1) {
      arr.push(cloneDeep(value[i], seen));
    }
    return arr as T;
  }

  const obj: UnknownRecord = {};
  seen.set(value as object, obj);
  for (const [k, v] of Object.entries(value as UnknownRecord)) {
    obj[k] = cloneDeep(v, seen);
  }
  return obj as T;
}

function redactPath(target: unknown, path: string[]): void {
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

function truncateArrays(target: unknown, maxArrayLength: number): unknown {
  if (!isObjectLike(target)) return target;

  if (Array.isArray(target)) {
    const sliced = target.slice(0, maxArrayLength).map((item) => truncateArrays(item, maxArrayLength));
    if (target.length > maxArrayLength) {
      sliced.push(`[... ${target.length - maxArrayLength} more items]`);
    }
    return sliced;
  }

  const out: UnknownRecord = {};
  for (const [k, v] of Object.entries(target)) {
    out[k] = truncateArrays(v, maxArrayLength);
  }
  return out;
}

export function transformValue(
  value: unknown,
  options?: {
    redact?: string[];
    maxArrayLength?: number;
  },
): unknown {
  if (!options?.redact?.length && options?.maxArrayLength == null) {
    return value;
  }

  const cloned = cloneDeep(value);

  if (options.redact?.length) {
    for (const rawPath of options.redact) {
      const path = rawPath
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
      if (path.length === 0) continue;
      redactPath(cloned, path);
    }
  }

  if (typeof options.maxArrayLength === "number" && options.maxArrayLength >= 0) {
    return truncateArrays(cloned, options.maxArrayLength);
  }

  return cloned;
}
