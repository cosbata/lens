# Spec: Global watchlist and primary briefing

Feature ID: 2026-07-26-global-watchlist-primary-briefing
Date: 2026-07-26
Status: approved
Request: Separate worldwide map exploration from the single main issue shown in
the bottom editorial briefing.

## Goal

Let readers browse the curated global situation without replacing the main
issue LENS has selected for today.

## User / Research Problem

The current map, right panel, and bottom briefing share one active event. That
makes a quick exploratory click rewrite the page's editorial priority and makes
the two panels feel duplicated.

## Scenarios

1. A reader sees all currently selected worldwide issues on the map.
2. A reader clicks any marker or watchlist item and reads its compact detail on
   the right.
3. The bottom briefing continues to show the highest-ranked main issue.
4. Category and search controls narrow exploration without changing the main
   issue.

## Requirements

- Keep the map and right panel synchronized.
- Select the bottom main issue independently using the highest event score.
- Keep search and category filtering scoped to the map and watchlist.
- Hide unnecessary bottom navigation when only one main issue is shown.
- Preserve live REST/SSE replacement of the event collection.

## Non-goals

- Showing every unverified raw feed item.
- Adding providers, categories, or a second ranking policy.
- Building country dashboards or alert subscriptions.

## Success Criteria

- Clicking a non-main event changes the right detail but not the bottom title.
- Filtering can remove the main event from the map without removing it from the
  bottom briefing.
- Existing map layer controls and full story links continue to work.

## Verification

- Component tests cover independent watchlist and main-issue state.
- Browser tests cover a non-main selection and fixed bottom briefing.
- Typecheck, lint, build, and full release verification pass.

## Open Questions

None. “All issues” means the curated, attributable event collection, not raw
unverified source noise.
