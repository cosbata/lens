# Spec: 2026-07-26-monitoring-essentials

Feature ID: 2026-07-26-2026-07-26-monitoring-essentials
Date: 2026-07-26
Status: approved
Request: Add the smallest useful WorldMonitor-derived monitoring surface for general users: event feed, search and filters, map layers, regional summary, and source health.

## Goal

Turn the default LENS map from a three-story presentation into a compact,
usable monitoring surface while preserving the editorial visual system.

## User / Research Problem

The current map explains selected stories but does not let a visitor scan,
filter, compare, or inspect the current event set. WorldMonitor provides these
basic monitoring affordances at much greater scale; LENS needs a restrained
subset so it feels useful before opening a story.

## Scenarios

1. A visitor searches the current briefing by place, category, title, or source.
2. A visitor filters the map to one category and sees matching markers and feed items.
3. A visitor toggles event markers or active activity geometry without opening settings.
4. A visitor selects a feed item and immediately sees its score, affected systems,
   source, update age, and selection reason.
5. A visitor can open the existing full story or 24-hour comparison from the monitor.

## Requirements

- Add an always-visible live event feed to the default map on desktop.
- Add native search and category filtering.
- Add visible map-layer toggles for events and activity geometry.
- Keep map, feed, regional summary, and bottom briefing selection synchronized.
- Show current connection state and result count.
- Reuse the existing event model, map, scoring explanation, and navigation.
- Retain keyboard operation, responsive fallback, and restrained editorial styling.

## Non-goals

- Reproducing WorldMonitor's 56 layers, finance radar, military tracking, AI briefs,
  accounts, alerts, or 3D globe.
- Adding new providers or copying AGPL source code.
- Inventing live movement where no geometry history exists.

## Success Criteria

- Search and category filters change both the feed and map.
- Layer controls visibly hide/show markers and active geometry.
- Selecting an item updates the active summary without navigation.
- An explicit action opens the full event story.
- Existing live REST/SSE updates remain the source of the event collection.

## Verification

- Unit tests cover filtering and visible controls.
- Playwright covers search, selection, and layer toggles.
- Typecheck, lint, production build, and the complete test suite pass.

## Open Questions

None. The first release uses existing briefing events and two native layer
toggles; more layers require a real provider and separate evidence.
