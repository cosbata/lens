# Plan: Monitoring essentials

Feature ID: 2026-07-26-2026-07-26-monitoring-essentials
Date: 2026-07-26
Status: approved

## Summary

Reuse the current briefing collection and `WorldMap`. Add one monitor overlay to
the default map: search and category controls on the left, a scan-friendly live
event list on the right, and a single clean detail panel for the selected
incident. The existing bottom editorial briefing remains the deeper summary.

## Proposed Direction

Build one map-monitor composition rather than a grid of independent dashboards:
controls and a scan list surround the map, while one selected incident owns the
detail view.

## Architecture

- `TodayOverview` owns query, category, active event, and two layer booleans.
- A focused `MonitorControls` presentation component renders native controls.
- A focused `MonitorPanel` renders result rows and selected-event detail.
- `WorldMap` receives filtered events plus marker/activity visibility flags.
- Existing REST/SSE updates continue to replace the source collection in `App`.

## Phases

1. Add deterministic filtering and synchronized monitor selection.
2. Add marker/activity visibility to the existing map.
3. Fit the overlays into desktop and mobile layouts without dashboard clutter.
4. Add component and browser checks, then run the full release verifier.

## Files

- `src/web/screens/TodayOverview.tsx`
- `src/web/components/MonitorControls.tsx`
- `src/web/components/MonitorPanel.tsx`
- `src/web/map/WorldMap.tsx`
- `src/web/map/map.css`
- `tests/web/today-map.test.tsx`
- `tests/e2e/accessibility.spec.ts`

## Risks

- Too much overlay can obscure the map. Panels stay narrow and the bottom
  editorial band remains the strongest visual hierarchy.
- Filtering can invalidate selection. The first visible result becomes active.
- A hidden activity layer must not imply missing data; controls say “Activity”
  and the detail panel states when no trace exists.

## Verification

- `npm test -- tests/web/today-map.test.tsx`
- `npm run typecheck && npm run lint && npm run build`
- `npm run test:e2e -- --grep "monitor"`
- `npm run verify:release`

## Verification Plan

Target filtering, selection, and layer visibility first; then run type, build,
accessibility/browser, and complete release checks.

## Rollback Plan

Remove the two monitor components and optional `WorldMap` visibility props; the
existing overview and event-story routes remain intact.
