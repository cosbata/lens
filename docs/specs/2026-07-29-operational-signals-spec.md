# Spec: operational-signals

Feature ID: 2026-07-29-operational-signals
Date: 2026-07-29
Status: draft
Request: Add public-source operational signals: PizzINT aggregate, GDELT tension, and a documented path for delayed aircraft, vessel, and alert layers without fabricating live missile tracks.

## Goal

Extend LENS beyond mapped news by adding a compact, continuously refreshed
operational-signal strip. The first release uses public aggregate PizzINT
activity and GDELT bilateral-tension data, while preserving the existing map
as the primary interface.

## User / Research Problem

The current product explains important events well, but it does not yet show
the ambient operational signals that make a world monitor feel live. Users
cannot distinguish verified movement observations from news reports, alerts,
or indirect indicators.

## Scenarios

- A user opens the briefing and sees whether monitored Washington-area pizza
  activity is normal, elevated, or spiking, with source and freshness.
- A user sees the highest-current bilateral tension signal and its direction.
- A user understands that these are indirect public indicators, not an
  official threat level.
- Future aircraft, vessel, and warning layers can reuse the existing point,
  route, area, and history geometry without redesigning the map.

## Requirements

- Fetch PizzINT aggregate data from its public dashboard endpoint through the
  LENS server, cache it for ten minutes, and fail without breaking briefing.
- Fetch six preselected GDELT country-pair series for the trailing seven days
  and expose the latest signal plus trend.
- Show a small operational-signals section inside the existing Global
  Situation control, not a new dashboard.
- Label PizzINT as a proxy and GDELT as media-derived.
- Do not expose individual customers or fabricate aircraft, vessel, or missile
  positions.
- Do not require a WorldMonitor API key for this release.

## Non-goals

- Global live missile telemetry.
- Exact military aircraft or warship tracking without an approved provider,
  licensing review, delay policy, and credentials.
- Copying WorldMonitor's full command-center UI.
- Treating PizzINT or GDELT as confirmed intelligence.

## Success Criteria

- `/api/v1/operational-signals` returns normalized aggregate activity,
  freshness, and tension pairs.
- Repeated requests within ten minutes reuse the cached upstream result.
- Upstream failure returns a degraded response and the briefing remains usable.
- The Global Situation panel renders the two signals and their caveat.
- Existing map filtering, selection, and live briefing behavior do not regress.

## Verification

- Unit tests cover response normalization, trend calculation, cache reuse, and
  degraded fallback.
- API and component tests cover the endpoint and UI.
- Typecheck, targeted tests, and production build pass.

## Open Questions

- OpenSky/ADS-B and AISStream credentials, retention, and minimum display delay.
- Whether OREF and similar civil-warning relays are acceptable for a later
  city/area alert layer.
