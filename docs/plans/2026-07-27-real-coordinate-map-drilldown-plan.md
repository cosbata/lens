# Plan: Real-coordinate map drilldown

Feature ID: 2026-07-27-real-coordinate-map-drilldown
Date: 2026-07-27
Status: approved

## Summary

Restore MapLibre's native cluster expansion and fix the upstream data that made
many articles share one coordinate. Keep the implementation local and
deterministic: improve the existing geography table, collapse identical URLs
before semantic grouping, and reindex stored RSS locations on startup.

## Proposed Direction

1. Remove the synthetic spider source and render path.
2. Keep one cluster-click behavior: calculate expansion zoom and ease to it.
3. Expand the existing named-place table only for evidenced current-feed
   locations and choose the most specific single match.
4. Deduplicate identical normalized article URLs before story identity.
5. Bump the geography reference and run the existing reindex service at
   startup so persisted coordinates follow the current resolver.

## Data Rules

- Structured provider coordinates remain exact and unchanged.
- A supported city/region beats a country fallback.
- Multiple supported places in one broad story remain unmapped unless one is
  clearly more specific within the same incident.
- Country-only locations remain approximate.
- Identical URLs are evidence for one event, not separate map events.
- No pixel offset is converted back into geographic coordinates.

## Files

- `src/web/map/WorldMap.tsx`: remove spider expansion.
- `src/upstream/worldmonitor/geography.ts`: specific-place coverage and
  reference version.
- `src/server/services/ingest-rss.ts`: exact-URL grouping.
- `src/server/index.ts`: startup reindex.
- Targeted tests for each changed behavior.

## Verification Plan

Run targeted map, geography, RSS ingest, and reindex tests first. Then run the
configured Bata implementation verifier: unit tests, typecheck, lint, build,
and Playwright E2E.

## Risks

- Reindex may remove unsupported ambiguous points: this is preferable to false
  precision and is covered by dry-run/unit fixtures.
- A finite local gazetteer cannot resolve every world place: unsupported names
  remain approximate rather than fabricated.
- URL normalization can overmerge tracking variants: strip only fragment and
  known tracking parameters while preserving the article path and other query
  semantics.

## Rollback Plan

The change is code-only. The SQLite volume remains compatible; event IDs do not
change during reindex. Reverting the commit restores prior rendering, while
stored coordinates remain valid under the same schema.
