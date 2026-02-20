export type TimerEntry = {
  startedAt: number;
};

const onceKeys = new Set<string>();
const timers = new Map<string, TimerEntry>();

export function checkAndMarkOnce(key: string): boolean {
  if (onceKeys.has(key)) return false;
  onceKeys.add(key);
  return true;
}

export function clearOnce(keys?: string[]): void {
  if (!keys || keys.length === 0) {
    onceKeys.clear();
    return;
  }
  for (const key of keys) {
    onceKeys.delete(key);
  }
}

export function startTimer(key: string, now: number): void {
  timers.set(key, { startedAt: now });
}

export function endTimer(key: string, now: number): number | null {
  const entry = timers.get(key);
  if (!entry) return null;
  timers.delete(key);
  return Math.max(0, now - entry.startedAt);
}

export function clearTimers(keys?: string[]): void {
  if (!keys || keys.length === 0) {
    timers.clear();
    return;
  }
  for (const key of keys) {
    timers.delete(key);
  }
}
