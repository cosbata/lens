# Review: LENS Live World Briefing

Feature ID: 2026-07-25-lens-live-world-briefing  
Date: 2026-07-25  
Status: implementation in progress

## Changed Files

**T001 — Scaffold the single TypeScript application**

- `.gitignore`
- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/server/app.ts`
- `src/server/index.ts`
- `src/web/App.tsx`
- `src/web/main.tsx`
- `tests/server.test.ts`

**T002 — Define canonical schemas and enums**

- `src/core/model/index.ts`
- `tests/core/model/model.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T003 — Add fixture loading and deterministic clock**

- `src/core/fixtures/index.ts`
- `tests/fixtures/observation.json`
- `tests/core/fixtures/fixtures.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T004 — Implement source families and confidence scoring**

- `src/core/model/source-policy.ts`
- `src/core/score/confidence.ts`
- `tests/core/score/confidence.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T005 — Implement the USGS fixture normalizer**

- `src/providers/usgs/normalize.ts`
- `tests/fixtures/usgs/event.json`
- `tests/providers/usgs/normalize.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T006 — Implement disaster impact scoring**

- `src/core/score/impact-config.ts`
- `src/core/score/disaster-impact.ts`
- `tests/core/score/disaster-impact.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T007 — Implement common event scoring and freshness**

- `src/core/score/freshness.ts`
- `src/core/score/event-score.ts`
- `tests/core/score/event-score.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T008 — Implement category heat**

- `src/core/score/category-heat.ts`
- `tests/core/score/category-heat.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T009 — Implement diversity-aware briefing selection**

- `src/core/select/briefing-selection.ts`
- `tests/core/select/briefing-selection.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T010 — Add deterministic event clustering**

- `src/core/cluster/deterministic.ts`
- `tests/fixtures/clustering/cases.json`
- `tests/core/cluster/deterministic.test.ts`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T011 — Compose the fixture-mode briefing pipeline**

- `src/core/pipeline/replay.ts`
- `scripts/replay.ts`
- `tests/fixtures/replay/baseline.json`
- `tests/core/pipeline/replay.test.ts`
- `package.json`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T012 — Establish visual tokens and accessible application shell**

- `src/web/App.tsx`
- `src/web/components/AppShell.tsx`
- `src/web/styles/global.css`
- `tests/web/app-shell.test.tsx`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T013 — Render the map overview from fixture data**

- `src/web/App.tsx`
- `src/web/map/briefing-fixture.ts`
- `src/web/map/WorldMap.tsx`
- `src/web/map/map.css`
- `src/web/screens/TodayOverview.tsx`
- `tests/web/today-map.test.tsx`
- `package.json`
- `package-lock.json`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

**T014 — Build the bottom editorial briefing band**

- `src/web/components/BriefingBand.tsx`
- `src/web/components/StoryProgress.tsx`
- `src/web/map/briefing-fixture.ts`
- `src/web/map/map.css`
- `src/web/screens/TodayOverview.tsx`
- `tests/web/briefing-band.test.tsx`
- `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`

## Validation Evidence

**T001**

Command:

```text
npm run typecheck
npm test
npm run build
```

Outcome:

- TypeScript completed with no errors.
- Vitest passed 1 test in 1 test file.
- Vite completed the production build.
- `npm install` audited 155 packages with 0 vulnerabilities.

**T002**

```text
npm test -- tests/core/model
npm run typecheck
```

- Vitest passed 5 model tests covering all canonical record parsers.
- Invalid time, geometry, category, and score inputs returned stable error codes.
- TypeScript completed with no errors.

**T003**

```text
npm test -- tests/core/fixtures
npm run typecheck
```

- Vitest passed 2 replay-fixture tests.
- Repeated canonical parsing produced byte-identical serialized records.
- The injected fixed clock returned the same instant with a fresh `Date` value.
- TypeScript completed with no errors.

**T004**

```text
npm test -- tests/core/score/confidence.test.ts
npm run typecheck
```

- Vitest passed 3 confidence-scoring tests.
- Syndicated copies remained one source family and did not inflate confidence.
- A structured official source received the documented confidence floor.
- Weak unknown-source reports failed the briefing gate.
- TypeScript completed with no errors.

**T005**

```text
npm test -- tests/providers/usgs
npm run typecheck
```

- Vitest passed 2 USGS normalization tests.
- Recorded feed and detail payloads produced deterministic canonical observation and evidence records.
- Magnitude, significance, felt count, tsunami flag, alert, depth, URL, source ID, and revision time were preserved.
- Malformed geometry and mismatched detail records failed without partial output.
- TypeScript completed with no errors.

**T006**

```text
npm test -- tests/core/score/disaster-impact.test.ts
npm run typecheck
```

- Vitest passed 3 earthquake-impact tests.
- Orange and red PAGER-style alerts applied versioned floors of 75 and 90.
- Ordinary low-impact earthquakes stayed below the 55-point briefing threshold.
- Component scores and reason codes remained inspectable.
- TypeScript completed with no errors.

**T007**

```text
npm test -- tests/core/score/event-score.test.ts
npm run typecheck
```

- Vitest passed 3 common event-scoring tests.
- Golden inputs reproduced the exact versioned score.
- Freshness used only the last material update and category half-life.
- Live official floors applied while stale official floors were ignored.
- TypeScript completed with no errors.

**T008**

```text
npm test -- tests/core/score/category-heat.test.ts
npm run typecheck
```

- Vitest passed 3 category-heat tests.
- Only primary categories contributed to ranking.
- 85-point events triggered automatic focus inclusion.
- Categories below the 45-point fill floor stayed out.
- TypeScript completed with no errors.

**T009**

```text
npm test -- tests/core/select/briefing-selection.test.ts
npm run typecheck
```

- Vitest passed 3 briefing-selection tests.
- The 55-point event floor and two-per-category/country caps held.
- Events scoring at least 90 could bypass diversity caps.
- Similarity penalties produced deterministic, less-redundant ordering.
- TypeScript completed with no errors.

**T010**

```text
npm test -- tests/core/cluster
npm run typecheck
```

- Vitest passed 5 labeled clustering tests.
- Provider IDs, canonical URLs, normalized titles, and 0.55 token similarity produced recorded merge reasons.
- Conflicting event types, locations, entities, and time windows remained separate.
- Cluster order stayed deterministic across input order.
- TypeScript completed with no errors.

**T011**

```text
npm test -- tests/core/pipeline
npm run replay -- --fixture tests/fixtures/replay/baseline.json
npm run typecheck
```

- Vitest passed 2 end-to-end fixture pipeline tests.
- Two replays produced byte-identical ordered snapshots.
- Duplicate observations collapsed into one event.
- Snapshot output retained score, confidence, and selection reasons.
- The replay command emitted a complete three-event briefing snapshot.
- TypeScript completed with no errors.

**T012**

```text
npm test -- tests/web/app-shell.test.tsx
npm run build
```

- Vitest passed the application-shell landmark test.
- The production build completed with the restrained black, off-white, and amber token system.
- Skip navigation, semantic landmarks, visible focus, responsive layout, and reduced-motion behavior were included.

**T013**

```text
npm test -- tests/web/today-map.test.tsx
npm run build
```

- Vitest passed the selected-event overview test.
- Only the three fixture-selected events rendered; the duplicate observation stayed hidden.
- MapLibre rendered Esri satellite imagery with source attribution, accessible event controls, active-marker focus, and a non-map fallback.
- The production build completed; MapLibre remains the dominant bundle and will be split only if measured load performance requires it.

**T014**

```text
npm test -- tests/web/briefing-band.test.tsx
npm run build
```

- Vitest passed 2 editorial-band tests.
- The active event exposes category, score, headline, summary, and source attribution.
- Previous, next, progress, and arrow-key traversal wrap deterministically and share state with the map.
- The production build completed.

**T015**

```text
npm test -- tests/web/event-sidecar.test.tsx
npm run typecheck
npm run build
```

- Vitest passed 2 event-sidecar tests.
- The overview links directly to a StoryMaps-style event view and returns without a page reload.
- The detail view keeps the satellite map visible beside an independently scrollable editorial sidecar.
- What happened, why it matters, what changed, affected groups, selection reasoning, and source timestamps come from the event fixture.
- Official evidence and reporting are visibly labeled in the evidence timeline.
- Browser smoke testing confirmed overview-to-detail navigation at `#event/quake-a`.
- The production build completed; the existing MapLibre chunk-size warning remains.

**T036**

```text
npm test -- tests/web/event-sidecar.test.tsx
npm run typecheck
npm run build
```

- Vitest passed 3 event-sidecar tests.
- Clicking any overview map marker opens that event's sidecar in one action.
- Detail views retain all three map markers and add visible category tabs plus wrapping previous/next links.
- Switching from Security to Economy updated the URL, sidecar content, active option, and map without returning to overview.
- The production build completed; the existing MapLibre chunk-size warning remains.

**T016**

```text
npm test -- tests/web/methodology.test.tsx
npm run typecheck
npm run build
```

- Vitest passed 2 public-methodology tests.
- The displayed fixture recomputed through the production scorer to 42.2 from base 62, confidence 0.8, and freshness 0.85.
- The page exposes the formula, confidence floor, source authority tiers, known limits, and both active scoring versions.
- Browser smoke testing confirmed the `#method` route and corrected dark header treatment on the light editorial surface.
- The production build completed; the existing MapLibre chunk-size warning remains.

**T037**

```text
npm test -- tests/web/event-story-chapters.test.tsx
npm run typecheck
npm run build
```

- Vitest passed 2 chapter-specific tests while the 3 existing sidecar tests remained green.
- Every fixture event now contains five evidence-grounded chapters: happened, spread, change, impact, and what to watch next.
- Sidecar scroll position and the chapter rail update one shared active chapter, which drives map centre, zoom, status, and caption.
- Browser smoke testing moved directly to chapter 03 and confirmed `03 / 05`, active rail state, sidecar scroll, and map focus changed together.
- The production build completed; the existing MapLibre chunk-size warning remains.

**T017**

```text
npm test -- tests/server/store
npm run typecheck
```

- Vitest passed 3 SQLite storage tests.
- Node's built-in `node:sqlite` provides the single-writer WAL store without an added native dependency.
- Empty databases apply both migrations; an existing version-1 database advances to version 2.
- Provider runs, observations, evidence, events, versioned scores, and briefing snapshots round-trip through canonical parsers.
- Snapshot and item update/delete triggers enforce immutability below the application layer.

**T018**

```text
npm test -- tests/server/briefing-snapshots.test.ts
npm run typecheck
```

- Vitest passed 3 briefing-snapshot lifecycle tests and the 3 storage tests remained green.
- Identical event order, category scores, ranking version, and provider health suppress duplicate snapshots.
- Material order changes create a new immutable snapshot and latest provider runs determine health metadata.
- The 24-hour lookup uses SQLite `unixepoch()` rather than lexical ISO comparison, covering timestamps with and without fractional seconds.

**T019**

```text
npm test -- tests/server/api
npm run typecheck
npm test
```

- Vitest passed 4 API contract tests; the full suite passed 53 tests across 20 files.
- Six read-only v1 endpoints expose briefings, all ten categories, event detail, point-in-time snapshots, methodology, and provider health.
- Response metadata distinguishes empty, fresh, stale, and degraded states and includes server/data time plus scoring and selection versions.
- Event responses preserve score breakdowns and attributable evidence URLs; invalid time lookups and missing events return explicit errors.

**T029**

```text
npm test -- tests/integration/comparison.test.ts tests/web/comparison.test.tsx
npm run typecheck
npm test
npm run build
```

- Added, changed, easing, resolved, and unchanged transitions are derived deterministically from immutable snapshots.
- The comparison API resolves the nearest snapshots and the score revision valid at each snapshot time.
- The editorial comparison page switches between now and 24 hours ago without navigation and exposes every status in text, not color alone.
- Browser smoke testing confirmed the map, selected event detail, resolved state, score movement, and both radio views update together.

**T020**

```text
npm test -- tests/server/usgs-ingest.test.ts
npm run typecheck
npm test
```

- The server starts an immediate USGS significant-event poll and repeats every five minutes without overlapping runs.
- Feed and detail responses are validated before normalization; material USGS revisions update the canonical event and append one versioned score.
- Successful material updates rebuild an immutable briefing snapshot; unchanged revisions do not append duplicate scores.
- Poll failures record stale degraded provider health while preserving the last good event and briefing snapshot.

**T021**

```text
npm test -- tests/server/sse.test.ts tests/web/live-briefing.test.ts
npm run typecheck
npm test
npm run build
```

- Material snapshot creation emits a minimal SSE refetch signal containing only the immutable snapshot ID.
- The browser refetches canonical briefing JSON on each signal and falls back to non-overlapping 30-second polling when the stream fails.
- Canonical events become complete map and five-chapter story records, so newly selected live events are navigable without a reload.
- The header exposes live, polling, and last-update states; an empty startup response preserves the last visible briefing.

**T022**

```text
npm test -- tests/providers/worldmonitor
npm run typecheck
npm test
```

- The adapter follows WorldMonitor's proto-defined `/api/conflict/v1/list-iran-events` response rather than an invented aggregate endpoint.
- Recorded fields map into canonical LENS observations with coordinates, category, severity measurement, original LiveUAMap URL, and fetch time intact.
- Unknown categories and severity values fail closed as provider contract errors.
- An upstream `importanceScore: 99` fixture is deliberately discarded; LENS scoring remains independent and reproducible.

**T023**

```text
npm test -- tests/server/worldmonitor-ingest.test.ts
npm run typecheck
npm test
```

- WorldMonitor polls on its own ten-minute non-overlapping schedule, separate from the five-minute USGS loop.
- Valid observations keep the original upstream severity only as a measurement; a new LENS score is calculated from public inputs.
- Material changes rebuild and publish the canonical briefing through the same snapshot path as USGS.
- A WorldMonitor outage records only that provider as degraded and leaves the USGS event and last valid briefing untouched.

**T024**

```text
npm test -- tests/integration/cross-provider-clustering.test.ts
npm run typecheck
npm test
```

- Canonical observations are converted into the existing deterministic clustering contract using category, one-degree location cells, country entities, time, URL, and title.
- A USGS earthquake and corroborating WorldMonitor/GDACS record merge with the explicit reason `merge.title_similarity`.
- An unrelated storm at the same nearby location remains a separate event.
- Reconciled events preserve both evidence records and both source-family identities while preferring the official USGS description.

**T025**

```text
npm test -- tests/web/all-categories.test.tsx
npm run typecheck
npm test
npm run build
```

- The new editorial index exposes all ten fixed categories through one calm, non-card layout.
- Supported categories show native accessible heat meters, score, qualifying event count, and update time.
- Unsupported categories explicitly say `Not scored` and `Awaiting a supported source`; no placeholder score is invented.
- Browser smoke testing confirmed all ten rows, navigation, readable light header, and the live `/api/v1/categories` fallback path.

**T026**

```text
npm test -- tests/core/cluster/story-thread.test.ts tests/web/story-thread.test.tsx
npm run typecheck
npm test
```

- Story threads retain distinct event IDs and require a typed relationship, explanation, valid source URL, and two existing events.
- Self-links, missing targets, and unattributed claims fail validation instead of appearing in the public story.
- Linked stories render both event titles, the relationship in text, the explanation, and a direct evidence link.
- Current fixtures contain no defensible cross-event causal claim, so the detail page explicitly says none has passed the evidence rule yet.

**T027**

```text
npm test -- tests/providers/eonet
npm run typecheck
npm test
```

- NASA EONET v3 is the second direct provider and polls independently every fifteen minutes.
- The adapter validates the documented event, category, source, and latest geometry fields and preserves the original source URL.
- Natural-event categories map only into disasters or climate/environment; unsupported category changes fail closed.
- EONET failure marks only EONET degraded while retaining its last event, the last briefing, and the other provider schedules.

**T028**

```text
npm test -- tests/core/score/impact
npm run typecheck
npm test
```

- `category-impact-v1` covers all ten fixed categories, exceeding the required eight-category minimum.
- Each category uses documented scale, exposure, disruption, and duration weights that sum to one.
- Ten golden fixtures lock deterministic outputs and an official floor is visible in the returned reasons.
- Invalid inputs fail closed; missing provider measurements remain unscored instead of being estimated.

**T030**

```text
npm run validate:evaluation
npm run typecheck
```

- The frozen evaluation corpus expands 20 source-backed historical seeds through ten controlled ingestion variants into 200 deterministic candidates.
- All ten LENS categories are represented, with one public provenance URL per seed.
- Labels cover briefing importance, merge identity, category, geography, source family, and pairwise ranking preference.
- Documentation distinguishes historical seed facts from synthetic replay conditions and records the corpus's calibration-only limitation.

**T031**

```text
npm test -- tests/core/evaluation
npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json
npm run typecheck
```

- The evaluator expands, scores, and reports the frozen corpus deterministically with the production `lens-v1` formula.
- JSON and Markdown include the confusion matrix, precision, recall, F1, pairwise ranking accuracy, and all ten category slices.
- Baseline results are precision 1.000, recall 0.858, F1 0.924, and pairwise accuracy 0.800.
- The report explicitly treats these numbers as controlled-fixture calibration rather than production accuracy.

**T032**

```text
npm test -- tests/core/score tests/core/select
npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json
npm run typecheck
```

- A 50-point calibration candidate improved recall but introduced six false positives; the frozen 55-point threshold keeps precision at 1.000 in the fixture.
- `lens-v1` retains the existing event weights to avoid fitting a small controlled corpus.
- The shared threshold is now named in the scoring contract and consumed by briefing selection rather than duplicated as a literal.
- Documentation records the recall tradeoff and requires a new scoring version before weights, freshness, or threshold changes.

**T033**

```text
npm run verify:e2e
```

- Seven Chrome tests cover briefing, all categories, methodology, 24-hour comparison, event detail, keyboard skip navigation, and the unavailable-stream fallback.
- Axe reports no serious or critical WCAG A/AA violations on the five core views.
- The audit exposed and fixed low-contrast small text on light editorial views.
- The interactive map is no longer hidden from assistive technology while containing focusable controls.

**T034**

```text
npm run verify:docs
```

- README now leads from the product problem to deterministic fixture mode, live development, verification, architecture, metrics, and explicit project boundaries.
- MIT licensing and contribution rules make provider attribution, ranking-version changes, accessibility, and fixture evidence part of the open-source contract.
- Architecture and provider documents trace the complete ingest-to-SSE flow and independent failure boundaries.
- The portfolio case study records the discovered usability problem, editorial design decision, independent-service architecture, measured fixture results, and honest evidence ceiling.

**T035**

```text
npm run verify:release
```

- Vitest: 34 files and 79 tests passed.
- TypeScript typecheck and unused-symbol lint passed.
- Production Vite build passed.
- Playwright: seven Chrome flows passed; the five core views had no serious or critical Axe violations.
- Evaluation reproduced 200 candidates, ten categories, precision 1.000, recall 0.858, F1 0.924, and pairwise accuracy 0.800.

## Spec deviations

- The evaluation corpus uses 20 source-backed historical seeds and ten controlled observation variants. It is reproducible and reaches 200 candidates, but the variants are not presented as 200 independently observed historical reports.
- WorldMonitor contributes one proto-defined conflict feed in this release. LENS does not claim full parity with the upstream project's provider breadth.
- Browser fallback tests intentionally run without the API server so fixture rendering and unavailable-stream behavior are proven independently. Server-backed live updates are covered by integration tests rather than the Playwright suite.

## Remaining risks and follow-up task IDs

- **F001 — Production adjudication sample:** label independently sampled live candidates before treating fixture metrics as real-world accuracy.
- **F002 — Front-end chunk split:** the build succeeds, but the MapLibre bundle produces a greater-than-500 kB warning.
- **F003 — Full-stack browser lane:** add a browser run with the Fastify service and seeded SQLite database to exercise REST and SSE through the proxy.
- **F004 — Provider breadth:** add a provider only when its measurements can support at least one currently unscored category without guessing.

## Final status

All planned implementation tasks are complete and the release verification passes. No production deployment or external repository publication was performed.

## Next Step

No required implementation step remains. Optional work is tracked above as F001–F004.
