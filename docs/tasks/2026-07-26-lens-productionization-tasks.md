# Tasks: LENS Productionization

Feature ID: 2026-07-26-lens-productionization
Date: 2026-07-26
Status: ready

## Task List

Execute the following dependency-ordered tasks one at a time.

### T001 Prove the browser API and SSE path

- Status: pending
- Size: M
- Depends on: none
- Expected files: `playwright.config.ts`, `tests/e2e/**`, existing server/store
  test helpers where required.
- Scope: Seed a temporary SQLite store, start the real Fastify API beside Vite,
  load the briefing through REST, append a second snapshot, publish its SSE
  signal, and assert the open page updates without reload.
- Non-scope: Provider selection and new UI.
- Verification: `npm run test:e2e -- --grep "full stack"`

### T002 Connect permitted movement history

- Status: pending
- Size: M
- Depends on: T001
- Expected files: `src/providers/**`, `src/server/services/**`,
  `src/web/data/live-briefing.ts`, provider tests, `docs/providers.md`.
- Scope: Select one provider from current official terms, fetch with native
  platform APIs, normalize attributable history into `geometryHistory`, and
  label live, stale, and fixture states honestly.
- Non-scope: Paid credentials, restricted-data redistribution, predictions.
- Verification: `npm test -- tests/providers tests/web/live-briefing.test.ts && npm run typecheck`

### T003 Synchronize timeline markers and map state

- Status: pending
- Size: M
- Depends on: T002
- Expected files: `src/web/components/PlaybackControls.tsx`,
  `src/web/map/**`, `src/web/screens/Comparison.tsx`, targeted web tests.
- Scope: Derive timestamped markers from event and movement history, render
  accessible marker affordances, and synchronize selection, playback time,
  visible trace, and event detail.
- Non-scope: Timeline authoring UI and interpolation.
- Verification: `npm test -- tests/web && npm run build && npm run test:e2e -- --grep "timeline"`

### T004 Evaluate real curation samples

- Status: pending
- Size: M
- Depends on: T003
- Expected files: `tests/fixtures/evaluation/**`, `scripts/evaluate.ts`,
  evaluation tests and documentation.
- Scope: Add a source-referenced adjudication sample, keep metrics
  deterministic, and report what the selection system gets right and misses.
- Non-scope: Changing taxonomy or thresholds without measured evidence.
- Verification: `npm run validate:evaluation && npm run evaluate -- --dataset tests/fixtures/evaluation/production.json`

### T005 Prepare the open-source portfolio release

- Status: pending
- Size: M
- Depends on: T004
- Expected files: `README.md`, `docs/**`, repository metadata and screenshots.
- Scope: Explain the problem, architecture, provenance, setup, evaluation,
  limitations, and reproducible verification; complete the final Bata review.
- Non-scope: Production deployment.
- Verification: `npm run verify:release && npm run verify:docs`

