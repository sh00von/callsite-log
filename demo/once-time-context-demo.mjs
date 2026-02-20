import { once, resetOnce, resetTimers, time, timeEnd, withContext } from "where-log";

resetOnce();
resetTimers();

once("startup:cache", "cache warmup started");
once("startup:cache", "cache warmup started");

time("load-users");
timeEnd("load-users", { total: 20 }, { warnThresholdMs: 100, includeLocation: false });

const reqLog = withContext(
  { requestId: "req_1", userId: 7 },
  { includeLocation: false, mode: "fast" },
);
reqLog.info("request", { path: "/api/users" });
