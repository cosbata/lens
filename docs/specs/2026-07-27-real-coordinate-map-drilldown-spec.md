# Spec: real-coordinate-map-drilldown

Feature ID: 2026-07-27-real-coordinate-map-drilldown
Date: 2026-07-27
Status: approved
Request: Replace artificial spider expansion with true coordinate-based cluster drilldown, improve news geolocation and deduplication, and reindex stored locations.

## Goal

Make map drilldown spatially truthful: cluster clicks zoom to real stored
coordinates, articles about the same incident become one map event, and
country-only fallbacks are not visually fanned into fabricated locations.

## User / Research Problem

The current exact-collision fallback creates a radial "spider" around one
coordinate. It looks like sublocations but those positions are invented.
Meanwhile RSS location inference misses common subnational names, historical
rows retain obsolete country centroids, and duplicate coverage can inflate a
cluster count.

## Scenarios

- A cluster containing distinct coordinates zooms until its points separate.
- Several articles about one Bordeaux/Gironde wildfire appear as one incident
  with multiple evidence sources.
- A headline or description naming a supported city/region uses that place's
  real coordinate.
- A true same-coordinate collision remains a single stacked location marker;
  it never fans into fake points.
- Stored RSS observations are reindexed when the location reference changes.

## Requirements

- Remove the radial spider source, layers, and click behavior.
- Use MapLibre cluster expansion for every numeric cluster.
- Extend the local open geography table for locations present in current
  production feeds, including Bordeaux/Gironde and the cited France/Spain
  wildfire locations.
- Prefer the most specific supported location and preserve `named_hub`,
  `country_approximate`, and `unmapped` honesty labels.
- Merge duplicate RSS records by canonical URL before semantic incident
  grouping.
- Version location references and run a bounded stored-location reindex at
  server startup.
- Do not invent coordinates or add a paid/external geocoding dependency.

## Non-goals

- Full global gazetteer coverage.
- Splitting one broad multi-country roundup into fabricated event points.
- Changing ranking, visual design, or provider credentials.

## Success Criteria

- Clicking a numeric cluster never displays radial legs or synthetic points.
- Distinct-coordinate clusters continue to zoom and separate.
- Current wildfire fixtures resolve to supported subnational coordinates.
- Duplicate URLs are represented by one canonical event with multiple
  evidence records.
- Startup reindex updates stale country centroids without changing IDs.

## Verification

- Targeted geography, RSS ingestion, reindex, and map tests.
- Full unit suite, typecheck, lint, production build, and Playwright E2E.

## Open Questions

None blocking. Unsupported place names remain honestly approximate until the
local gazetteer is expanded.
