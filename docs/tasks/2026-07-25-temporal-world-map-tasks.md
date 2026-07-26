# Tasks: Temporal World Map

Feature ID: 2026-07-25-temporal-world-map
Date: 2026-07-25
Status: ready

## Task List

Execute the following dependency-ordered tasks one at a time.

### T001 Preserve attributable geometry history

- Status: pending
- Size: M
- Depends on: none
- Expected files: `src/core/model/index.ts`,
  `src/providers/eonet/normalize.ts`,
  `src/server/services/reconcile-events.ts`, targeted core/provider/API tests.
- Scope: Validate optional dated geometry histories, preserve all EONET
  geometries in chronological order, reconcile them into events, and expose
  them through the existing API.
- Non-scope: UI animation and database schema changes.
- Verification: `npm test -- tests/core/model tests/providers/eonet tests/server/api/read-api.test.ts && npm run typecheck`

### T002 Add deterministic temporal-map data utilities

- Status: pending
- Size: M
- Depends on: T001
- Expected files: `src/web/data/live-briefing.ts`,
  `src/web/map/briefing-fixture.ts`, `src/web/map/temporal.ts`, targeted web tests.
- Scope: Convert canonical geometry histories into web frames, provide
  deterministic 24-hour frame selection and visible trace/area calculation,
  and add clearly labeled fixture histories for the comparison demo.
- Non-scope: Map rendering and timer controls.
- Verification: `npm test -- tests/web/live-briefing.test.ts tests/web/temporal-map.test.ts && npm run typecheck`

### T003 Render traces, areas, and the 24-hour player

- Status: pending
- Size: M
- Depends on: T002
- Expected files: `src/web/map/WorldMap.tsx`,
  `src/web/map/ComparisonLayer.tsx`, `src/web/map/TemporalControls.tsx`,
  `src/web/map/map.css`, `src/web/screens/Comparison.tsx`,
  `src/web/styles/comparison.css`, targeted comparison/map tests.
- Scope: Render native GeoJSON paths and areas; add accessible play, pause,
  scrub, UTC clock, before/now shortcuts, and playback-rate controls; keep the
  sidecar synchronized.
- Non-scope: New providers or predicted tracks.
- Verification: `npm test -- tests/web/comparison.test.tsx tests/web/today-map.test.tsx tests/web/temporal-map.test.ts && npm run build`

### T004 Verify and document the temporal map

- Status: pending
- Size: S
- Depends on: T003
- Expected files: `docs/reviews/2026-07-25-temporal-world-map-review.md`
- Scope: Run the full deterministic verification suite, record evidence,
  inspect the browser at desktop and narrow widths, and document data limits.
- Non-scope: Deployment and AIS-provider integration.
- Verification: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

### T005 Repair the local browser verification harness

- Status: pending
- Size: S
- Depends on: T003
- Expected files: `playwright.config.ts`, `tests/e2e/accessibility.spec.ts`
- Scope: Run E2E in isolated bundled Chromium instead of attaching to the
  desktop application's Chrome surface; update the comparison heading contract
  and verify that playback advances and pauses.
- Non-scope: Product behavior changes.
- Verification: `npm run test:e2e`
