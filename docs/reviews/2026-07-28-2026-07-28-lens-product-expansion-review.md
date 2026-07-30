# Review: LENS product expansion

Feature ID: 2026-07-28-2026-07-28-lens-product-expansion
Date: 2026-07-28
Status: passed

## Changed Files

- Canonical event types now flow from ingestion through storage, API metrics,
  map colours, and the event legend.
- Live detail copy is evidence-backed rather than generic.
- Numeric map clusters expand through local zoom levels.
- Events that share one approximate coordinate receive deterministic
  display-only offsets, so every cluster member remains selectable without
  changing its stored location.
- The compact Event Type legend now sits below Global Situation, and the
  initial dock stays above the main briefing at shorter viewport heights.
- Event Type is visually separate from the Global Situation panel.
- Monitored map events now include one representative image-bearing evidence
  item when available, avoiding the previous empty-image detail state.
- The main world map now renders every attributable LineString, Polygon, and
  multi-observation point trace across the visible monitored collection.
- A Map Context checkbox hides or restores those routes and areas; selecting
  either geometry opens its event without connecting unrelated news points.
- Per-event movement links now include the selected event ID and load that
  event's own geometry history instead of the shared demonstration route.

## Validation Evidence

- `npm test`: 49 files, 165 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:e2e`: 14 browser tests passed.
- Manual browser drilldown: a 103-event cluster split into progressively
  smaller regional clusters and individual points across four zoom steps.
- Browser console: no page errors.
- Live API check: 263 of 795 monitored events currently expose source images.
- Manual browser check: selected-event image loaded at its natural dimensions.
- Targeted route/area tests: 17 passed.
- Manual browser check: 810 monitored events loaded, 10 attributable
  routes/areas exposed, and the Map Context checkbox updated immediately.
- Manual browser check: selecting `usgs:us6000tgb9` opened
  `#compare/usgs%3Aus6000tgb9`, retained its earthquake title, and explicitly
  reported that no attributable movement trace was available.

## Next Step

- Live 24-hour snapshot comparison, measured source expansion, and the final
  portfolio evidence pass remain separate follow-up tasks.
