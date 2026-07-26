# Review: Temporal World Map

Feature ID: 2026-07-25-temporal-world-map  
Date: 2026-07-26  
Status: complete

## Summary

LENS now preserves source-attributable geometry histories and presents them as
a 24-hour visual playback. The comparison view can play, pause, scrub, jump to
the start or present, change playback speed, and draw only the route or area
supported by observations available at the selected time.

## Changed Files

- Canonical history and ingestion: `src/core/model/index.ts`,
  `src/providers/eonet/normalize.ts`, `src/server/services/reconcile-events.ts`
- Temporal data: `src/web/data/live-briefing.ts`,
  `src/web/map/briefing-fixture.ts`, `src/web/map/temporal.ts`
- Map and controls: `src/web/map/WorldMap.tsx`,
  `src/web/map/ComparisonLayer.tsx`, `src/web/map/TemporalControls.tsx`,
  `src/web/screens/Comparison.tsx`, related CSS
- Verification: targeted model, provider, API, web, and E2E tests;
  `playwright.config.ts`

## Validation Evidence

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

- Vitest: 35 files and 82 tests passed.
- TypeScript typecheck and unused-symbol lint passed.
- Production Vite build passed.
- Playwright: 8 desktop accessibility, routing, fallback, and playback tests
  passed in isolated Chromium.
- Manual browser inspection confirmed immediate before/now switching,
  10× playback advancement, pause behavior, visible route tracing, and the
  narrow stacked layout.

## Scope Drift Check

- No provider, database, prediction, or deployment scope was added.
- The existing MapLibre map, React state, native range input, and CSS were
  reused; no new runtime dependency or abstraction was introduced.
- The E2E server moved from occupied port 4173 to isolated port 4174 so tests
  cannot attach to the Codex desktop surface.

## Risks / Failures

- The included shipping reroute is explicitly labeled as a fixture
  demonstration. Live vessel tracks still require an attributable AIS provider.
- EONET histories are source-backed when its feed supplies dated geometries.
  LENS does not interpolate or predict positions between observations.
- The production JavaScript chunk is about 1.18 MB and triggers Vite's
  500 kB advisory. Route-level splitting can be added when load performance
  becomes a measured problem.
- An SVG projection overlay mirrors the MapLibre trace so the path remains
  visible in embedded WebGL capture environments; MapLibre GeoJSON layers
  remain the map-native rendering path.

## Repair Task

T005 repaired the browser harness by using Playwright's isolated Chromium,
updating the comparison heading contract, and adding a play/advance/pause E2E
check.

## Next Step

Connect a licensed or otherwise permitted AIS history provider to replace the
clearly labeled shipping fixture while keeping the same `geometryHistory`
contract.
