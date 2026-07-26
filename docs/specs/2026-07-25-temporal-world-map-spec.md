# Spec: temporal-world-map

Feature ID: 2026-07-25-temporal-world-map
Date: 2026-07-25
Status: ready
Request: Preserve attributable time-indexed geometry, render traces and areas, and provide an accessible 24-hour map playback with 1-10 seconds per represented hour.

## Goal

Turn the map from an event-location index into the primary explanation surface:
preserve attributable geometry over time, draw the movement or affected area
that the source actually provides, and let a reader replay the last 24 hours.

## User / Research Problem

The current interface places news-like event summaries over point markers. It
does not answer where an event moved, how its footprint changed, or when a
material change occurred. The existing canonical model accepts points, lines,
and polygons, but the EONET normalizer keeps only the latest geometry and the
web client reduces every event to one point.

## Scenarios

1. A reader opens the 24-hour comparison and presses Play. The clock advances
   through the day and the visible event traces grow to the selected time.
2. A reader selects an event with a multi-position history and sees its
   attributable track, current position, timestamps, and source.
3. A reader selects an event that only has one confirmed point and sees that
   point without an invented route.
4. A keyboard or reduced-motion user can scrub the same timeline and inspect
   the same state without depending on animation.
5. Live EONET data with multiple geometries reaches the browser without losing
   its dated positions.

## Requirements

- Add a canonical, validated `geometryHistory` made of ISO timestamps and
  canonical geometries to observations and event clusters.
- Keep the latest canonical geometry as the event's current geometry.
- Preserve every valid, ordered EONET geometry and its date.
- Carry geometry history through reconciliation, SQLite payload storage, and
  the existing briefing API.
- Convert API geometry history into web timeline frames without fabricating
  intermediate source observations.
- Render attributable Point, LineString, and Polygon data with MapLibre native
  GeoJSON sources and layers.
- Render a movement trace only when at least two dated point positions or an
  attributable LineString are available.
- Provide a 24-hour timeline with play/pause, range scrubbing, UTC clock, and
  playback rates of 10, 2.5, and 1 seconds per represented hour.
- Synchronize the map, selected event, visible trace, status text, and left
  editorial panel at every timeline position.
- Expose source attribution and distinguish observed data from fixture
  demonstration data.
- Support keyboard operation, reduced motion, narrow screens, loading, map
  failure, and no-trace states.

## Non-goals

- Predicting future movement.
- Interpolating or presenting synthetic positions as observations.
- Individual vessel tracking without an authorized AIS provider.
- A generic layer builder or a new state-management dependency.
- Replacing the existing scoring and event-selection pipeline.

## Success Criteria

- A multi-point EONET fixture produces an ordered canonical geometry history,
  survives event reconciliation, and appears in the briefing API.
- The comparison page presents 24 hourly positions and can play the full period
  in 240, 60, or 24 seconds.
- The selected demo movement draws a visible route that grows as the timeline
  advances; a single-point event does not draw a route.
- The timeline works with mouse, keyboard, and reduced-motion preferences.
- Existing briefing, event story, comparison, provider, and API tests remain
  green.

## Verification

- `npm test -- tests/core/model tests/providers/eonet tests/server/api/read-api.test.ts tests/web/live-briefing.test.ts tests/web/comparison.test.tsx tests/web/temporal-map.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

## Open Questions

- Real vessel tracks remain provider-dependent. This feature ships the data
  contract and visualization behavior, then uses only source-backed histories
  plus clearly labeled fixtures until an AIS source is authorized.
