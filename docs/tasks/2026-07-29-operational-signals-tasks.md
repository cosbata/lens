# Tasks: operational-signals

## Task List

Execute T001–T003 in dependency order. Complete one task only after its
verification passes.

## T001 — Cached public operational-signal adapter and API

- Normalize aggregate PizzINT and six GDELT series.
- Cache successful results for ten minutes.
- Expose a degraded-safe read endpoint.
- Verification: provider and read-API tests.

### Verification

- `npm test -- --run tests/providers/pizzint/pizzint.test.ts tests/server/api/read-api.test.ts`

## T002 — Compact Global Situation signal rows

- Fetch operational signals with the briefing.
- Render proxy activity, top tension, freshness, and caveat.
- Verification: Today Overview component test.

### Verification

- `npm test -- --run tests/web/today-map.test.tsx`

## T003 — Integration gap documentation and release verification

- Document omitted WorldMonitor layers and why.
- Record the credential/delay requirements for movement data.
- Verification: typecheck and production build.

### Verification

- `npm run typecheck`
- `npm run build`

## Verification

The feature is complete when all task verifiers, typecheck, and production
build pass with no regression to the live briefing.
