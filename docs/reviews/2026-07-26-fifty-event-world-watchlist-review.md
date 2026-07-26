# Review: Fifty-event world watchlist

## Summary

The live briefing now exposes up to 50 stored, attributable events as a broad
watchlist while preserving the stricter ranked briefing for the bottom main
issue. Today opens at a world-scale camera and focuses an event only after a
user selects it.

## Changed Files

- `src/server/api/routes.ts`: adds the capped watchlist response.
- `src/web/data/live-briefing.ts`: converts watchlist and primary events separately.
- `src/web/App.tsx`: stores watchlist and main issue independently.
- `src/web/screens/TodayOverview.tsx`: renders the watchlist without changing the main issue.
- `src/web/map/WorldMap.tsx`: keeps the initial world camera and focuses after selection.
- `tests/server/api/read-api.test.ts`: verifies the 50-event API cap.
- `tests/web/live-briefing.test.ts`: verifies watchlist/primary separation.
- `tests/helpers/full-stack.ts`: seeds a 50-event full-stack fixture.
- `tests/e2e/accessibility.spec.ts`: verifies 50 markers and camera interaction.

## Validation Evidence

- Targeted unit/API tests: 8 passed.
- Targeted browser test: 1 passed.
- `npm run verify:release`: 95 unit/integration tests and 12 browser tests passed;
  typecheck, lint, production build, dataset validation, and both evaluations passed.
- Live local data inspection: the response and watchlist each showed 50 stored events.

## Scope Drift Check

The change does not weaken the main briefing threshold or introduce another
ranking model. It reuses the existing store, scores, map, filters, and detail
panel.

## Risks / Failures

- The current live provider mix makes the 50-event list heavily weighted toward
  EONET wildfires, storms, and icebergs.
- The production bundle remains large and emits the existing Vite chunk warning.
- Browser fallback tests intentionally log API proxy failures when testing offline mode.

## Next Step

Add attributable providers for conflict, diplomacy, economy, energy, health,
security, supply chains, and technology so the live 50-event watchlist spans
the full ten-category model.
