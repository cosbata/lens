# Spec: operational-alert-layer

Feature ID: 2026-07-29-operational-alert-layer
Date: 2026-07-29
Status: draft
Request: Implement Phase 1 of the approved operational monitoring plan: project existing missile-drone, airstrike, and conflict events into a separate attributed alert layer with map toggle, accuracy disclosure, API, and regression tests; no paid provider required.

## Goal

Add a no-cost operational alert layer that reuses recent attributed LENS
events without confusing reported incidents with live sensor telemetry.

## User / Research Problem

LENS currently ranks and maps events, but users cannot separately turn on the
conflict-alert context that makes a world monitor useful. A reported strike
also must not be presented as a precise live missile track when the source
only names a country or region.

## Scenarios

- A user turns on Alerts and sees recent missile/drone, airstrike, and conflict
  reports without changing the recommended-event list.
- A user selects an alert and sees its time, evidence class, source, location
  precision, and related event.
- A country-only report is shown as approximate, never as an invented city
  coordinate or route.
- If alert projection fails, the normal briefing remains available.

## Requirements

- Reuse existing `EventCluster` data and existing geometry types.
- Expose a read-only operational-layer API with projected alert features.
- Include observation time, expiry, geometry, location precision, source, and
  related event ID.
- Add an independent Alerts map toggle.
- Render attributed points or source-provided areas; render no inferred path.
- Preserve current clustering, event selection, zoom, imagery, and playback.
- Require no new paid API or account.

## Non-goals

- OpenSky aircraft activity, AIS vessel flows, and static infrastructure.
- Individual military asset tracking.
- Live missile trajectories or inferred routes.
- Persisting a second copy of alerts in SQLite.
- Requiring WorldMonitor.

## Success Criteria

- Recent relevant events appear through `/api/v1/operational-layers`.
- A single-location alert never produces a `LineString`.
- Country/region precision is visible in the selected alert details.
- Alerts can be hidden without hiding recommended events.
- Provider/API failure does not prevent the briefing from loading.
- Existing map behavior and automated tests remain green.

## Verification

- Unit tests for event-to-alert projection, expiry, and precision.
- API contract test for operational layers.
- UI test for Alerts toggle and map rendering.
- Existing unit, E2E, lint, typecheck, and production build.

## Open Questions

None. The approved default is a separate, no-cost, attributed alert layer.
