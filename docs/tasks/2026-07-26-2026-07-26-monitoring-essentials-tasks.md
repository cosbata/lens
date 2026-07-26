# Tasks: Monitoring essentials

Feature ID: 2026-07-26-2026-07-26-monitoring-essentials
Date: 2026-07-26
Status: complete

## Summary

Three sequential tasks add the monitor surface, map-layer behavior, and
release evidence without changing providers or ranking.

## Task List

Execute these dependency-ordered tasks one at a time.

### T001 Add the monitoring surface

- Status: complete
- Size: M
- Scope: Add search, category filters, event scan list, and one clean selected
  incident panel to the default map.
- Acceptance: Map, list, detail, and bottom briefing share the active event;
  empty filtering is readable.
- Verification: `npm test -- tests/web/today-map.test.tsx`

### T002 Connect map layer controls

- Status: complete
- Size: S
- Depends on: T001
- Scope: Add marker and activity visibility to the existing `WorldMap`.
- Acceptance: Native layer buttons update MapLibre visibility and keep keyboard
  state inspectable.
- Verification: `npm run typecheck && npm run lint && npm run build`

### T003 Verify and document the monitor

- Status: complete
- Size: S
- Depends on: T002
- Scope: Add one browser flow, update the case study, and complete review.
- Acceptance: Search, selection, and layer controls pass in Playwright and the
  full release command remains green.
- Verification: `npm run test:e2e -- --grep "monitor" && npm run verify:release`

## Dependencies

T001 → T002 → T003.

## Verification

Each task has a deterministic verifier; final Bata review runs the complete
project verifier.

## Rollback

Revert the monitor components and optional visibility props. No schema or
provider data requires migration.
