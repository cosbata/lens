# Contributing to LENS

## Start with the reproducible path

```sh
npm install
npm run replay -- --fixture tests/fixtures/replay/baseline.json
npm test
```

The fixture pipeline is the behavioral baseline. Keep inputs deterministic, retain source URLs, and add the smallest test that proves any non-trivial change.

## Local development

Run `npm run dev:server` and `npm run dev` in separate terminals. Node.js 22 or newer is required because persistence uses `node:sqlite`.

Before opening a change:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run docs:check
```

## Data and ranking rules

- Validate every provider response at the adapter boundary.
- Preserve provider ID, source family, original URL, occurrence time, fetch time, and geometry.
- Do not copy an upstream severity or importance number into the LENS score.
- Do not merge observations without an inspectable reason.
- Do not add a new score, category, or causal story without evidence and a deterministic fixture.
- Change the public scoring version before changing frozen `lens-v1` weights, freshness, or threshold.

## Scope

Prefer platform APIs and existing utilities over new dependencies. Keep UI changes editorial and accessible: keyboard use, meaningful landmarks, source attribution, reduced motion, and text contrast are release requirements.

Security reports should not include live secrets, private feeds, or personal data. Open a minimal reproduction that uses public or synthetic fixtures.
