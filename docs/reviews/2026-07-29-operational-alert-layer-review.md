# Review: operational-alert-layer

Feature ID: 2026-07-29-operational-alert-layer
Date: 2026-07-29
Status: implemented

## Result

LENS now separates recent reported operational alerts from the broader news
feed and renders them as an independently toggleable map layer. Only reports
with a concrete alert type, usable point or area geometry, and an observation
within the last 24 hours are included.

## Changed Files

- `src/server/api/routes.ts`
- `src/web/data/live-briefing.ts`
- `src/web/App.tsx`
- `src/web/screens/TodayOverview.tsx`
- `src/web/components/MonitorControls.tsx`
- `src/web/map/WorldMap.tsx`
- focused server and web tests

## Evidence

- Full non-E2E suite: 174 passed across 50 files.
- Playwright E2E: 14 passed.
- TypeScript typecheck and lint passed.
- Production build passed.
- Live local API returned four current, explicitly typed alerts and excluded a
  generic conflict-classified sports story caught during verification.

## Validation Evidence

- `npm test`: 174 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 14 passed.

## Remaining Work

- Live vessel and aircraft movement need separate provider credentials and
  licensing review; this alert layer does not fabricate trajectories.
- AISStream is a possible no-fee beta source but requires a server-side API
  key and offers no uptime SLA.
- OpenSky requires written permission for operational use in a live service.
- WorldMonitor API access remains optional; LENS continues to work from its
  independent public-source pipeline.

## Next Step

Add AISStream as the first real movement layer after the user creates a free
API key, then evaluate aircraft data under an explicitly approved license.

## Verification

- Acceptance criteria passed without adding a dependency or requiring a paid
  WorldMonitor plan.
