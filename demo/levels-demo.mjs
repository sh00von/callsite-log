import { createLogger, debug, error, info, success, warn } from "where-log";

info("boot", { ready: true });
success("saved", { id: 101 });
warn("quota", { left: 2 });
error("request", { status: 500 });
debug("trace", { step: "auth" });

const logger = createLogger({ includeLocation: false, mode: "fast" });
logger.info("session", { id: "s_1" });
logger.error("api", { code: "E_TIMEOUT" });
