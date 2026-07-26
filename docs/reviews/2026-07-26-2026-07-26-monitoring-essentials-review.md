# Review: Monitoring essentials

Feature ID: 2026-07-26-2026-07-26-monitoring-essentials  
Date: 2026-07-26  
Status: complete

## Summary

The default LENS map now supports a restrained monitoring flow: search or
filter the current selected incidents, toggle event and activity layers, then
select a marker or feed item to update a compact right-hand explanation and
the editorial briefing below it.

## Changed Files

- Monitor controls and detail: `src/web/components/MonitorControls.tsx`,
  `src/web/components/MonitorPanel.tsx`
- Shared selection flow: `src/web/screens/TodayOverview.tsx`
- Map visibility: `src/web/map/WorldMap.tsx`, `src/web/map/map.css`
- Verification: `tests/web/today-map.test.tsx`,
  `tests/e2e/accessibility.spec.ts`
- Portfolio narrative: `docs/case-study.md`

## Validation Evidence

```text
npm test -- tests/web/today-map.test.tsx
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- --grep "monitor"
```

- Targeted component tests passed.
- TypeScript, lint, and production build passed.
- The monitor browser flow passed in isolated Chromium.
- Manual in-app browser inspection confirmed immediate selection updates and
  a readable map, right panel, and lower briefing hierarchy.

## Scope Drift Check

- No provider, scoring, database, or deployment behavior changed.
- Existing REST/SSE events, MapLibre layers, React state, native controls, and
  CSS were reused.
- No runtime dependency or speculative dashboard module was added.

## Risks / Failures

- Fixture fallback still contains three demonstrative events when live
  providers are unavailable.
- The interface can display more selected events, but dense global feeds will
  need grouping or clustering only after real usage shows marker overlap.
- The production JavaScript bundle remains above Vite's advisory threshold.

## Next Step

Add a compact country or region summary only after the live selected-event
corpus is broad enough to make aggregation useful.
