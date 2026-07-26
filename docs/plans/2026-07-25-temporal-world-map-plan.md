# Plan: Temporal World Map

Feature ID: 2026-07-25-temporal-world-map
Date: 2026-07-25
Status: ready

## Current Structure

`Observation` and `EventCluster` contain one current geometry. EONET responses
contain dated geometries, but normalization selects only the last one.
`briefingToTodayEvents` accepts only Point geometry. `WorldMap` renders DOM
markers and `Comparison` switches between two static event arrays.

## Proposed Direction

Use the existing model, SQLite JSON payloads, API response, React state, and
MapLibre dependency. Add one optional canonical history field, preserve it
through reconciliation, convert it to small web timeline frames, and render it
through native MapLibre GeoJSON layers. Replace the binary comparison toggle
with a 24-position player while retaining direct before/now actions.

The renderer follows the evidence:

- dated points become an observed trace;
- LineString becomes an attributable route;
- Polygon becomes an affected area;
- a lone point stays a point and explicitly reports that no trace is available.

## Expected Files

- `src/core/model/index.ts`
- `src/providers/eonet/normalize.ts`
- `src/server/services/reconcile-events.ts`
- `src/web/data/live-briefing.ts`
- `src/web/map/briefing-fixture.ts`
- `src/web/map/WorldMap.tsx`
- `src/web/map/ComparisonLayer.tsx`
- `src/web/map/TemporalControls.tsx`
- `src/web/map/temporal.ts`
- `src/web/map/map.css`
- `src/web/screens/Comparison.tsx`
- `src/web/styles/comparison.css`
- targeted model, provider, API, and web tests
- this feature's spec, plan, tasks, and review

## UI Impact

The comparison map becomes the temporal map. It gains a bottom transport strip
with play/pause, UTC time, a native range input, and three speed choices. The
map shows an amber observed trace, a white current-position ring, and subdued
areas or static points. The left sidecar updates with the selected hour and
whether movement is observed, changed, newly present, or unavailable.

## API Impact

No new endpoint is needed. The existing event payload gains
`geometryHistory`, so `/api/v1/briefing` and `/api/v1/events/:eventId` expose it
without a second transport path.

## Data / Storage Impact

No migration is needed because canonical records are stored as JSON payloads.
The current geometry and bounding columns remain unchanged. The validated
history is stored inside observation and event payloads.

## Alternatives Considered

- Store history only in provider `extension`: rejected because downstream code
  could not validate or reliably consume it.
- Build a separate animation API: rejected because current event payloads
  already provide the correct ownership boundary.
- Add a timeline/state library: rejected because one range value, one timer,
  and native controls are sufficient.
- Interpolate every hour: rejected because it would present synthetic positions
  as observations.

## Risks

- Historical geometries may be sparse or outside the selected 24-hour window.
  The UI must expose sparse timestamps and avoid invented observations.
- MapLibre resources may not exist during server rendering or map failures.
  Static semantic status and event controls remain available.
- Continuous animation can harm motion-sensitive users. Reduced motion disables
  autoplay transitions while scrubbing remains available.

## Rollback Plan

The new history field is optional. Removing the temporal controls and GeoJSON
layers returns the application to current point-marker behavior without a
database rollback.

## Verification Plan

1. Model tests prove validation and optional backwards compatibility.
2. EONET tests prove every dated geometry is kept in chronological order.
3. Reconciliation/API tests prove history reaches the browser boundary.
4. Temporal utility tests prove exact frame selection and trace growth.
5. Component tests prove accessible playback controls and honest no-trace text.
6. Run typecheck, lint, full unit/integration suite, production build, and e2e.
