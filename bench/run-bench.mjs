import { performance } from "node:perf_hooks";
import { info, log, once, resetOnce, resetTimers, time, timeEnd } from "../dist/index.mjs";

const isCi = process.argv.includes("--ci");

const sampleSmall = { id: 1, name: "Shovon", active: true };
const sampleDeep = {
  user: { id: 1, profile: { name: "Shovon", tags: ["a", "b", "c"] } },
  settings: { featureA: true, featureB: false, nested: { level: 4 } },
};

function runCase(name, fn, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn();
  }
  const end = performance.now();
  const durationMs = end - start;
  const opsPerSec = (iterations / durationMs) * 1000;
  return {
    name,
    iterations,
    durationMs,
    opsPerSec,
  };
}

function printResult(result) {
  console.log(
    `${result.name.padEnd(28)} ${result.opsPerSec.toFixed(0).padStart(8)} ops/s (${result.durationMs.toFixed(1)}ms)`,
  );
}

const realConsoleLog = console.log;
const realConsoleInfo = console.info;
console.log = () => {};
console.info = () => {};
resetOnce();
resetTimers();

const results = [
  runCase("pretty + location (small)", () => log(sampleSmall), 4000),
  runCase("fast + location (small)", () => log(sampleSmall, { mode: "fast" }), 4000),
  runCase("fast + no location (small)", () =>
    log(sampleSmall, { mode: "fast", includeLocation: false }), 4000),
  runCase("pretty + location (deep)", () => log(sampleDeep), 2000),
  runCase("fast + no location (deep)", () =>
    log(sampleDeep, { mode: "fast", includeLocation: false }), 2000),
  runCase("info + fast + no location", () =>
    info(sampleSmall, { mode: "fast", includeLocation: false }), 4000),
  runCase("once repeat no-op", () => once("bench:once", sampleSmall, { includeLocation: false }), 4000),
  runCase("time/timeEnd pair", () => {
    time("bench:timer", { clockNow: () => 100 });
    timeEnd("bench:timer", { clockNow: () => 140, includeLocation: false });
  }, 2000),
];

console.log = realConsoleLog;
console.info = realConsoleInfo;

console.log("where-log benchmark");
for (const result of results) {
  printResult(result);
}

if (isCi) {
  const prettySmall = results.find((r) => r.name === "pretty + location (small)");
  const fastNoLocSmall = results.find((r) => r.name === "fast + no location (small)");
  const prettyDeep = results.find((r) => r.name === "pretty + location (deep)");
  const fastNoLocDeep = results.find((r) => r.name === "fast + no location (deep)");

  if (!prettySmall || !fastNoLocSmall || !prettyDeep || !fastNoLocDeep) {
    console.error("Benchmark threshold check failed: missing benchmark rows.");
    process.exit(1);
  }

  const smallRatio = fastNoLocSmall.opsPerSec / prettySmall.opsPerSec;
  const deepRatio = fastNoLocDeep.opsPerSec / prettyDeep.opsPerSec;

  if (smallRatio < 2 || deepRatio < 1.5) {
    console.error(
      `Performance threshold failed: small=${smallRatio.toFixed(2)}x deep=${deepRatio.toFixed(2)}x`,
    );
    process.exit(1);
  }
}
