# Review: Real-coordinate map drilldown

Feature ID: 2026-07-27-real-coordinate-map-drilldown
Date: 2026-07-27
Status: passed

## Changed Files

- `src/web/map/WorldMap.tsx` removes synthetic spider geometry and uses
  MapLibre's native cluster expansion camera.
- `src/upstream/worldmonitor/geography.ts` adds supported France and Spain
  subnational locations and rejects ambiguous multi-place copy.
- `src/server/services/ingest-rss.ts` collapses tracking variants of one URL
  and groups named-place incident reports independently of noisy categories.
- `src/core/cluster/deterministic.ts` and
  `src/server/services/reconcile-events.ts` reconcile persisted RSS reports
  for the same named-place incident within 96 hours.
- `src/server/index.ts` reindexes persisted RSS locations before serving the
  first briefing.
- Focused tests cover native cluster zoom, place inference, URL identity,
  persisted reindexing, and incident reconciliation.

## Validation Evidence

- `npm test`: 49 files, 158 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 14 browser tests passed.
- Local production server: `/api/health` returned database status `ok`.
- Browser smoke test: selecting a numeric cluster zoomed to Europe; selecting
  the next cluster zoomed again and revealed independent coordinate points.
- Stored Bordeaux/Gironde active incidents at one coordinate were reconciled
  from seven reports to one incident with their evidence retained.

## Next Step

No implementation work remains for this feature. Locations not named in the
bundled gazetteer intentionally stay country-approximate or unmapped; expand
the reviewed place list only when real incoming coverage demonstrates a need.
