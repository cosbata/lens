# Plan: Fifty-event world watchlist

Feature ID: 2026-07-26-fifty-event-world-watchlist
Date: 2026-07-26
Status: approved

## Summary

Reuse the existing provider database and `/api/v1/briefing` request. Add a
`watchlist` field containing up to 50 event details, convert it for the map,
and keep the selected briefing event in separate UI state.

## Proposed Direction

Do not alter ranking. Treat the watchlist as a broader observation surface and
the existing selected events as editorial priority.

## Architecture

- The read API constructs a stable unique list: snapshot IDs first, then active
  mapped scored events ordered by recency.
- `briefingToTodayEvents` prefers the watchlist.
- A small primary-event converter reads only selected briefing events.
- `App` stores watchlist and primary event separately.

## Phases

1. Extend the read contract and server tests.
2. Separate client watchlist and primary conversion.
3. Update UI copy and browser coverage.
4. Verify the local 50-event response and full release.

## Files

- `src/server/api/routes.ts`
- `src/web/data/live-briefing.ts`
- `src/web/App.tsx`
- `src/web/screens/TodayOverview.tsx`
- `tests/server/api/read-api.test.ts`
- `tests/web/live-briefing.test.ts`
- `tests/e2e/accessibility.spec.ts`

## Risks

- A single provider can dominate the list; this release labels observations
  honestly and defers clustering until real density proves it necessary.
- The selected briefing can be empty while the broader watchlist is populated;
  the last known primary remains visible rather than promoting a low-score item.

## Verification

- `npm test -- tests/server/api/read-api.test.ts tests/web/live-briefing.test.ts`
- `npm run test:e2e -- --grep "watchlist"`
- `npm run verify:release`

## Verification Plan

Test the API boundary and conversion separately, then verify the rendered count
and complete release suite.

## Rollback Plan

Remove the optional watchlist field and primary event state; the existing
briefing response remains backward compatible.
