# Skill: where-log Maintainer

## Purpose

Use this skill when working on the `where-log` package to keep API quality, DX, and release safety consistent.

## Project Context

- Package: `where-log`
- Entry point: `src/index.ts`
- Build output: `dist/`
- Tests: `test/index.test.ts`
- Benchmarks: `bench/run-bench.mjs`
- Smoke imports: `scripts/smoke-imports.mjs`

## Standard Workflow

1. Implement changes in `src/` first.
2. Update `README.md` for any API/output change.
3. Update or add tests in `test/index.test.ts`.
4. Run:
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - `npm run smoke:imports`
   - `npm run bench:ci`
5. Confirm package contents:
   - `npm run pack:dry-run`
   - `npm run publish:dry-run`

## Design Rules

- Keep existing APIs backward compatible unless explicitly versioned for breaking changes.
- Prefer additive features with sensible defaults.
- Keep logging path lightweight for high-frequency usage.
- Route level methods to semantic console methods by default.
- Ensure browser behavior remains best-effort with clear docs.

## Release Checklist

1. Bump version in `package.json`.
2. Rebuild `dist`.
3. Ensure all checks pass.
4. Commit changes with clear release message.
5. Push `main`.
6. Tag with matching version (`vX.Y.Z`) for publish workflow.
