# Tasks: operational-alert-layer

Feature ID: 2026-07-29-operational-alert-layer

## Task List

Execute T001–T003 in dependency order. Complete a task only after its
verification passes.

## T001 — Server alert projection and API

- Select recent active mapped conflict/airstrike/missile-drone events.
- Return attributed compact details from `/api/v1/operational-layers`.
- Verify eligibility, expiry, precision preservation, and no inferred path.
- Verification: server read-API tests.

### Verification

`npm test -- --run tests/server/api/read-api.test.ts`

## T002 — Client layer and controls

- Fetch the optional alert collection independently.
- Add the Reported alerts checkbox.
- Render dedicated translucent alert points/clusters and country-level areas.
- Reuse event selection and detail presentation.
- Verification: Today Overview map tests.

### Verification

`npm test -- --run tests/web/today-map.test.tsx`

## T003 — Regression verification and review

- Add API and UI regression tests.
- Run focused tests, full tests, typecheck, lint, and production build.
- Record limitations and cost/credential requirements.
- Verification: full release checks.

### Verification

`npm test && npm run typecheck && npm run lint && npm run build`

## Verification

The feature is complete when the server and web task verifiers pass, followed
by the full test suite, typecheck, lint, and production build.
