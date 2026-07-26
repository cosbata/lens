# Spec: Fifty-event world watchlist

Feature ID: 2026-07-26-fifty-event-world-watchlist
Date: 2026-07-26
Status: approved
Request: Populate the map with roughly fifty current worldwide events.

## Goal

Show up to 50 attributable events from the existing live provider store on the
map and right watchlist without weakening the smaller ranked main briefing.

## User / Research Problem

Three fallback events demonstrate interaction but do not communicate a living
world monitor. The database already contains current provider observations, yet
the read API exposes only events that pass the narrow briefing selection.

## Scenarios

1. A reader opens Today and sees up to 50 current provider events.
2. A reader filters those events by the existing curated categories.
3. A reader selects any marker and reads its source-backed detail on the right.
4. The bottom main issue remains sourced from the ranked briefing.

## Requirements

- Add an API watchlist containing at most 50 active, mapped, scored events.
- Put ranked briefing events first, then fill from the newest provider events.
- Keep the existing selected `events` response unchanged.
- Prefer the watchlist for map exploration while deriving the primary issue
  only from selected briefing events.
- Preserve the fixture fallback when no live watchlist exists.

## Non-goals

- Lowering the public briefing threshold.
- Claiming all watchlist observations are major news.
- Adding new providers, alerts, clustering, or raw unverified headlines.

## Success Criteria

- The current local provider store returns 50 watchlist entries.
- The browser renders 50 watchlist rows and map markers when 50 are available.
- The bottom main issue does not change when a watchlist observation is clicked.

## Verification

- API and client conversion tests cover watchlist size and separation.
- Browser regression checks the 50-event surface.
- Full release verification passes.

## Open Questions

None. The watchlist is explicitly broader than the ranked briefing.
