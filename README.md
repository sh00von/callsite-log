# callsite-log

Log a value with the caller file and line number.

## Install

```bash
npm install callsite-log
```

## Usage

```ts
import { log } from "callsite-log";

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
```

## Notes

- Node.js: call-site detection is reliable with V8 stack traces.
- Browser/Next.js: call-site depends on source maps and bundler/devtools behavior.
- If stack parsing fails, the package prints `unknown:0` on line 1.

## API

- `log(value: unknown): void`
- `log(value: unknown, options?: LogOptions): void`
- `log(label: string, value: unknown, options?: LogOptions): void`
- `LogOptions`
  - `colors?: boolean` (Node only, default `true`)
  - `formatter?: (input) => { locationLine: unknown; valueLine: unknown }`
