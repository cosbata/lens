# Tasks: Fifty-event world watchlist

Feature ID: 2026-07-26-fifty-event-world-watchlist
Date: 2026-07-26
Status: complete

## Summary

Two dependency-ordered tasks expose the stored watchlist and verify the UI.

## Task List

Execute these tasks one at a time.

### T001 Expose and consume a 50-event watchlist

- Status: complete
- Size: M
- Scope: Extend the read response, convert watchlist events, and keep primary
  briefing state separate.
- Acceptance: API returns at most 50 mapped events and Today uses them without
  promoting them into the main briefing.
- Verification: `npm test -- tests/server/api/read-api.test.ts tests/web/live-briefing.test.ts`

### T002 Verify the populated map

- Status: complete
- Size: S
- Depends on: T001
- Scope: Add browser coverage, run release verification, and record review.
- Acceptance: A 50-entry response renders and all release checks pass.
- Verification: `npm run test:e2e -- --grep "watchlist" && npm run verify:release`

## Dependencies

T001 → T002.

## Verification

Each task has a deterministic verifier and review repeats the release suite.

## Rollback

Remove the optional response field and separate primary prop.
