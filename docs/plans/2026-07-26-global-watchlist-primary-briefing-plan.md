# Plan: Global watchlist and primary briefing

Feature ID: 2026-07-26-global-watchlist-primary-briefing
Date: 2026-07-26
Status: approved

## Summary

Split the current shared selection into two existing concepts: an exploratory
watchlist selection for the map and right panel, and a score-derived primary
event for the bottom briefing.

## Proposed Direction

Keep one event collection and one ranking value. Derive the primary event with a
small pure helper, while existing local state continues to own exploratory
selection.

## Architecture

- `TodayOverview` derives the highest-score primary event from all events.
- Filters affect only map and right-panel events.
- Marker and feed selection update only the exploratory active ID.
- `BriefingBand` receives one primary event and omits multi-event controls.

## Phases

1. Separate exploratory and primary selection.
2. Clarify labels and remove single-item navigation.
3. Update component and browser regression checks.
4. Run the full verifier and document the behavior.

## Files

- `src/web/screens/TodayOverview.tsx`
- `src/web/components/BriefingBand.tsx`
- `src/web/components/MonitorControls.tsx`
- `src/web/components/MonitorPanel.tsx`
- `tests/web/today-map.test.tsx`
- `tests/e2e/accessibility.spec.ts`

## Risks

- Initial exploratory and primary events can still be the same, so tests must
  select a different event before checking independence.
- An empty filtered watchlist must not hide the primary briefing.

## Verification

- `npm test -- tests/web/today-map.test.tsx tests/web/briefing-band.test.tsx`
- `npm run test:e2e -- --grep "monitor"`
- `npm run verify:release`

## Verification Plan

Prove the state boundary in component tests, then exercise it in Chromium and
run the complete release verifier.

## Rollback Plan

Restore the prior shared active event passed to `BriefingBand`; no data or
provider migration is involved.
