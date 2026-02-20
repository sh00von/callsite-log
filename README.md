# where-log

Log a value with the caller file and line number.

## Install

```bash
npm install where-log
```

## Usage

```ts
import { log } from "where-log";

const user = { id: 1, name: "Shovon" };
log(user);
```

Output style:

```txt
user.tsx:44
{ id: 1, name: "Shovon" }
```

Label overload:

```ts
log("user", { id: 1, name: "Shovon" });
```

Options:

```ts
log(user, { colors: false });

log("user", user, {
  formatter: ({ location, label, value }) => ({
    locationLine: `[${location}]`,
    valueLine: `${label}: ${JSON.stringify(value)}`,
  }),
});

log(user, { mode: "fast", includeLocation: false });
```

Preset APIs:

```ts
import { createLogger, logDev, logProd } from "where-log";

logDev("user", user); // pretty + location
logProd("user", user); // fast + no location

const appLog = createLogger({ redact: ["user.token"], includeLocation: false });
appLog("request", { user: { token: "secret" } });
appLog.info("ready", { status: "ok" });
```

Level APIs:

```ts
import { debug, error, info, success, warn } from "where-log";

info("user", user);
success("saved", { id: 1 });
warn("quota", { remaining: 2 });
error("request", { status: 500 });
debug("trace", { step: "auth" });
```

Once / Timer / Context APIs:

```ts
import { once, time, timeEnd, withContext } from "where-log";

once("boot:db", "db connected");
once("boot:db", "db connected again"); // ignored

time("fetch-users");
// ... work
timeEnd("fetch-users", { total: 42 }, { warnThresholdMs: 200, errorThresholdMs: 800 });

const reqLog = withContext({ requestId: "req_123", userId: 7 }, { includeLocation: false });
reqLog.info("request", { path: "/api/users" });
```

## Notes

- Node.js: call-site detection is reliable with V8 stack traces.
- Browser/Next.js: call-site depends on source maps and bundler/devtools behavior.
- If stack parsing fails, the package prints `unknown:0` on line 1.

## Performance Tuning

- `mode: "pretty"` (default): rich formatting via Node inspect.
- `mode: "fast"`: lower overhead formatting for hot paths.
- `includeLocation: false`: skips stack capture/parsing.
- `inspectDepth`: limit inspect depth in pretty mode.
- `enabled: false`: disables log output quickly.

## Safety / Readability

- `redact`: mask sensitive values by path, e.g. `["password", "user.token"]`.
- `maxArrayLength`: trim large arrays and append a summary item.
- level helpers prepend compact tags by default (`[INFO]`, `[ERROR]`, etc.).

## Session Helpers

- `once(key, ...)`: log only first occurrence per runtime session.
- `time(key)` + `timeEnd(key, ...)`: duration logging with optional thresholds.
- `resetOnce(keys?)` and `resetTimers(keys?)`: clear in-memory runtime state.
- `withContext(context)`: create logger with injected structured context.

## API

- `log(value: unknown): void`
- `log(value: unknown, options?: LogOptions): void`
- `log(label: string, value: unknown, options?: LogOptions): void`
- `info(...)`, `success(...)`, `warn(...)`, `error(...)`, `debug(...)`
- `once(...)`, `time(...)`, `timeEnd(...)`
- `logDev(...)`: dev preset (`pretty`, `includeLocation: true`, `colors: true`)
- `logProd(...)`: prod preset (`fast`, `includeLocation: false`, `colors: false`)
- `createLogger(presetOptions?: LogOptions): LoggerFn`
- `withContext(context, presetOptions?): LoggerFn`
- `resetOnce(keys?)`, `resetTimers(keys?)`
- `LogMode = "pretty" | "fast"`
- `LogLevel = "info" | "success" | "warn" | "error" | "debug"`
- `LogOptions`
  - `enabled?: boolean`
  - `mode?: LogMode` (default `"pretty"`)
  - `includeLocation?: boolean` (default `true`)
  - `inspectDepth?: number` (pretty mode only)
  - `maxArrayLength?: number`
  - `redact?: string[]`
  - `level?: LogLevel`
  - `showLevelTag?: boolean`
  - `consoleMethod?: "log" | "info" | "warn" | "error" | "debug"`
  - `context?: Record<string, unknown>`
  - `clockNow?: () => number`
  - `warnThresholdMs?: number`
  - `errorThresholdMs?: number`
  - `includeDurationOnly?: boolean`
  - `colors?: boolean` (Node only, default `true`)
  - `formatter?: (input) => { locationLine: unknown; valueLine: unknown }`
