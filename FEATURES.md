# where-log Features

`where-log` is a lightweight logging utility for Node.js and browser-based React/Next.js apps, focused on strong developer experience and low overhead.

## Core Logging

- `log(value, options?)`
- `log(label, value, options?)`
- Caller location output (`file:line`) when `includeLocation` is enabled.

## Level Logging

- `info(...)`
- `success(...)`
- `warn(...)`
- `error(...)`
- `debug(...)`

Level helpers use semantic console routing and compact level tags by default.

## Presets

- `logDev(...)`
  - Default: `pretty`, location enabled, colored output.
- `logProd(...)`
  - Default: `fast`, location disabled, non-colored output.

## Logger Factory

- `createLogger(presetOptions?)`
  - Returns callable logger with level methods.
  - Supports consistent app-level defaults.

## Session Utilities

- `once(key, ...)`
  - Logs only first occurrence per runtime session.
- `resetOnce(keys?)`
  - Clears all or selected `once` keys.
- `time(key, options?)`
  - Starts a named timer.
- `timeEnd(key, ...)`
  - Ends timer and logs elapsed duration.
- `resetTimers(keys?)`
  - Clears all or selected timers.

## Context-Aware Logging

- `withContext(context, presetOptions?)`
  - Returns logger that injects structured `context` into payload.
- `logger.withContext(context)`
  - Creates a child logger with merged context.

## Safety and Readability

- `enabled?: boolean`
- `redact?: string[]`
- `maxArrayLength?: number`
- `inspectDepth?: number`

## Performance Options

- `mode?: "pretty" | "fast"`
- `includeLocation?: boolean`
- `colors?: boolean`

## Advanced Output Control

- `formatter?: (input) => { locationLine; valueLine }`
- `consoleMethod?: "log" | "info" | "warn" | "error" | "debug"`
- `showLevelTag?: boolean`

## Development Quality

- TypeScript declarations generated in `dist`.
- Unit tests with Vitest.
- Smoke import validation for ESM/CJS.
- Benchmark checks included in CI.
