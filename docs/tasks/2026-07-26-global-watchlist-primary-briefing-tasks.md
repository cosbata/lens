# Tasks: Global watchlist and primary briefing

Feature ID: 2026-07-26-global-watchlist-primary-briefing
Date: 2026-07-26
Status: complete

## Summary

Two small tasks separate the two selection roles and verify the result.

## Task List

Execute these dependency-ordered tasks one at a time.

### T001 Separate exploration from editorial priority

- Status: complete
- Size: S
- Scope: Derive one primary issue from the full event set while filtering and
  selecting the map/right watchlist independently.
- Acceptance: A non-main click updates the right detail only; filtering never
  removes the bottom main issue.
- Verification: `npm test -- tests/web/today-map.test.tsx tests/web/briefing-band.test.tsx`

### T002 Verify and document the split

- Status: complete
- Size: S
- Depends on: T001
- Scope: Add the browser regression, full verification evidence, and review.
- Acceptance: The monitor flow and full release command pass.
- Verification: `npm run test:e2e -- --grep "monitor" && npm run verify:release`

## Dependencies

T001 → T002.

## Verification

Each task has a deterministic verifier and the review stage repeats the full
release command.

## Rollback

Revert the state split and single-event navigation treatment.
