# Review: operational-signals

Feature ID: 2026-07-29-operational-signals
Date: 2026-07-29
Status: implemented

## Result

LENS now reads public aggregate PizzINT activity and six GDELT country-pair
series without a WorldMonitor key. The server caches successful responses for
ten minutes and the Global Situation panel labels both values as indirect
signals rather than verified alerts.

## Changed Files

- `src/providers/pizzint/client.ts`
- `src/server/api/routes.ts`
- `src/server/app.ts`
- `src/web/App.tsx`
- `src/web/components/MonitorControls.tsx`
- `src/web/screens/TodayOverview.tsx`
- `src/web/map/map.css`
- provider, API, and Today Overview tests
- `README.md` and `docs/integrations.md`

## Evidence

- Provider/API tests: 12 passed.
- Today Overview tests: 12 passed.
- Full non-E2E suite: 172 passed across 50 files.
- Playwright E2E: 14 passed.
- TypeScript typecheck/lint passed.
- Production build passed; Vite retains its existing large-chunk warning.

## Validation Evidence

- `npm test`: 172 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 14 passed.

## Remaining Work

- Delayed/coarse aircraft activity needs OpenSky or Wingbits credentials and a
  display policy.
- Global AIS needs AISStream or another licensed source.
- Civil-warning and strike reports should be mapped as timestamped alert areas,
  not fabricated missile trajectories.

## Next Step

Add one delayed, coarse movement source—preferably regional aircraft counts or
AIS chokepoint flow—only after credentials, licensing, retention, and public
display delay are fixed.

## Verification

- Production build and full non-E2E suite passed.
