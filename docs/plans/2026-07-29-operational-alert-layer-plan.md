# Plan: operational-alert-layer

Feature ID: 2026-07-29-operational-alert-layer

## Summary

Project recent attributed conflict reports into a separate alert collection.
Reuse the existing event detail shape, geometry, map source pattern, and
briefing polling. No new provider, database table, dependency, or inferred
route is needed.

## Proposed Direction

1. Add a pure server projection that selects active, mapped `airstrike`,
   `missile-drone`, and `conflict` events, limits them to recent records, and
   returns the existing compact briefing detail shape.
2. Publish the result from `/api/v1/operational-layers`.
3. Fetch the optional layer beside operational signals and normalize its alert
   details through the existing live-briefing converter.
4. Add an Alerts checkbox and a dedicated MapLibre source/layer. Reuse event
   IDs so selecting an alert opens the existing event detail panel.
5. Keep country-level precision as a country surface and never create a route
   from a point.

## Files

- `src/server/api/routes.ts`
- `src/web/App.tsx`
- `src/web/data/live-briefing.ts`
- `src/web/screens/TodayOverview.tsx`
- `src/web/components/MonitorControls.tsx`
- `src/web/map/WorldMap.tsx`
- `tests/server/api/read-api.test.ts`
- `tests/web/today-map.test.tsx`

## Risks

- Duplicate visual markers: use a smaller translucent alert halo and dedupe
  country surfaces by event ID.
- False real-time implication: label the layer “Reported alerts” and retain
  source time and precision.
- Optional endpoint failure: catch it independently from briefing polling.
- Map regression: preserve existing event/activity sources and verify cluster,
  zoom, country, and route tests.

## Rollback Plan

Remove the optional endpoint fetch, Alerts control, and dedicated map source.
The existing briefing API and map collections remain unchanged.

## Verification Plan

- `npm test -- --run tests/server/api/read-api.test.ts tests/web/today-map.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
