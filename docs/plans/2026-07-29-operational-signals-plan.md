# Plan: operational-signals

Feature ID: 2026-07-29-operational-signals
Date: 2026-07-29
Status: approved

## Approach

1. Add one server-side cached adapter for the two public PizzINT endpoints.
   Normalize only aggregate activity, freshness, and six bilateral GDELT
   series. Keep the cache in memory because the data is disposable and can be
   refetched.
2. Expose the normalized snapshot through one read-only API route. Upstream
   errors return the last good snapshot when available, otherwise a degraded
   empty snapshot.
3. Fetch the snapshot with the existing briefing client cadence and render two
   compact rows inside Global Situation.
4. Document the gap to WorldMonitor and the credential/safety boundary for
   delayed ADS-B, AIS, and civil-warning layers.

## Proposed Direction

Ship the no-credential aggregate signals first. Keep precise live military
movement out until a dedicated provider, delay policy, and license review are
available.

## Reused Architecture

- Fastify read API and native `fetch`.
- Existing browser polling/live-state flow.
- Existing Global Situation panel and CSS system.
- Existing Point, LineString, Polygon, and geometry history model for later
  movement layers.

## Risks

- PizzINT is a third-party proxy and can change or become unavailable.
- GDELT values are media-derived and must not be described as verified threat
  levels.
- In-memory cache is per process; acceptable for the current single-instance
  deployment.

## Rollback Plan

Remove the operational-signals route and panel rows. No database migration or
stored event data is involved.

## Verification Plan

- Adapter unit test with injected fetch and clock.
- Read API test.
- Monitor-controls render test.
- Typecheck, targeted tests, production build.
