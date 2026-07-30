# Tasks: Real-coordinate map drilldown

Feature ID: 2026-07-27-real-coordinate-map-drilldown
Date: 2026-07-27
Status: completed

## Execution Rules

- Execute tasks in dependency order.
- Never manufacture geographic coordinates for visual separation.
- Reuse the existing MapLibre clustering, geography resolver, RSS identity,
  reindex service, and test setup.
- Do not add a dependency or change the database schema.

## Task List

Execute these three dependency-ordered tasks.

### T001 Restore true coordinate cluster expansion

- Status: completed
- Size: S
- Depends on: none
- Expected files: `src/web/map/WorldMap.tsx`,
  `tests/web/today-map.test.tsx`.
- Scope: Remove spider geometry and route every numeric cluster through native
  MapLibre expansion zoom.
- Acceptance: No synthetic legs or offset points exist; distinct coordinates
  keep expanding normally.
- Verification: `npm test -- tests/web/today-map.test.tsx`

### T002 Improve local geography and incident identity

- Status: completed
- Size: M
- Depends on: T001
- Expected files: `src/upstream/worldmonitor/geography.ts`,
  `src/server/services/ingest-rss.ts`,
  `src/core/cluster/deterministic.ts`,
  `src/server/services/reconcile-events.ts`,
  `tests/upstream/geography.test.ts`, `tests/server/rss-ingest.test.ts`,
  `tests/core/cluster/deterministic.test.ts`.
- Scope: Add evidenced subnational place matches, prefer the most specific
  match, and collapse identical URLs before semantic grouping.
- Acceptance: Current France/Spain wildfire places resolve to real supported
  coordinates and one URL cannot produce several canonical events.
- Verification:
  `npm test -- tests/upstream/geography.test.ts tests/server/rss-ingest.test.ts tests/core/cluster/deterministic.test.ts`

### T003 Reindex persisted locations and verify the full product

- Status: completed
- Size: S
- Depends on: T002
- Expected files: `src/server/index.ts`, `tests/server/reindex.test.ts`.
- Scope: Run the existing deterministic location reindex once at startup and
  verify that IDs remain stable.
- Acceptance: Old country centroids are updated before the first briefing is
  served, with no schema or event-ID change.
- Verification: `npm test -- tests/server/reindex.test.ts`

## Completion Criteria

- All three task verifiers pass.
- Full unit tests, typecheck, lint, build, and E2E pass.
- Review records changed files, evidence, and remaining gazetteer coverage
  limitations.
