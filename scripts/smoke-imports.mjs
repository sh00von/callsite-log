import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const esm = await import("../dist/index.mjs");
const cjs = require("../dist/index.cjs");

function assertExports(mod, name) {
  if (typeof mod.log !== "function") {
    throw new Error(`${name} missing log export`);
  }
  if (typeof mod.logDev !== "function") {
    throw new Error(`${name} missing logDev export`);
  }
  if (typeof mod.logProd !== "function") {
    throw new Error(`${name} missing logProd export`);
  }
  if (typeof mod.createLogger !== "function") {
    throw new Error(`${name} missing createLogger export`);
  }
  for (const fn of ["once", "time", "timeEnd", "withContext", "resetOnce", "resetTimers"]) {
    if (typeof mod[fn] !== "function") {
      throw new Error(`${name} missing ${fn} export`);
    }
  }
  for (const level of ["info", "success", "warn", "error", "debug"]) {
    if (typeof mod[level] !== "function") {
      throw new Error(`${name} missing ${level} export`);
    }
  }
}

assertExports(esm, "esm");
assertExports(cjs, "cjs");

const logger = esm.createLogger({ includeLocation: false, mode: "fast" });
logger({ smoke: true });
if (typeof logger.info !== "function") {
  throw new Error("logger instance missing info method");
}
logger.info({ smokeLevel: true });
esm.resetOnce();
esm.once("smoke-once", { ok: true }, { includeLocation: false });
esm.time("smoke-timer", { clockNow: () => 10 });
esm.timeEnd("smoke-timer", { clockNow: () => 25, includeLocation: false });
