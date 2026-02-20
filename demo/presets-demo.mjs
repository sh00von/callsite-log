import { createLogger, logDev, logProd } from "where-log";

const payload = {
  user: {
    id: 1,
    name: "Shovon",
    token: "very-secret-token",
  },
  items: [1, 2, 3, 4, 5, 6],
};

logDev("payload", payload);
logProd("payload", payload);

const safeLogger = createLogger({
  includeLocation: false,
  mode: "fast",
  redact: ["user.token"],
  maxArrayLength: 3,
});

safeLogger("safePayload", payload);
