# Tasks: LENS Live World Briefing

Feature ID: 2026-07-25-lens-live-world-briefing  
Spec: ../specs/2026-07-25-lens-live-world-briefing-spec.md  
Plan: ../plans/2026-07-25-lens-live-world-briefing-plan.md  
Date: 2026-07-25  
Status: ready for analyze

## Execution Rules

- Execute one active task at a time through Bata.
- Preserve fixture mode after every phase.
- Do not add infrastructure before the task that proves it is needed.
- Do not change scoring weights without a fixture that demonstrates the change.
- A task is complete only after its listed deterministic verifier passes.
- Tasks are sized for approximately 30–90 minutes; split any task that exceeds
  the budget before implementation.

## Task List

The dependency-ordered ledger below moves from a fixture-mode vertical slice
to live providers, evaluation, and the public portfolio release.

### Phase 0 — Runnable foundation

### T001 Scaffold the single TypeScript application

- Status: pending
- Size: M
- Depends on: none
- Allowed paths: `package.json`, `package-lock.json`, `tsconfig*.json`,
  `vite.config.ts`, `index.html`, `src/**`, `tests/**`, `.gitignore`
- Scope: Create the Node 22, TypeScript, React/Vite, Vitest, and Fastify
  application skeleton with `dev`, `test`, `typecheck`, `lint`, and `build`
  commands. Include one server health route and one rendered page.
- Non-scope: Map, database, providers, ranking logic, deployment.
- Acceptance: A fresh install builds, the test runner executes, and the server
  and browser entrypoints typecheck.
- Verification: `npm run typecheck && npm test && npm run build`

### T002 Define canonical schemas and enums

- Status: pending
- Size: M
- Depends on: T001
- Allowed paths: `src/core/model/**`, `tests/core/model/**`
- Scope: Define and validate the ten categories, provider run, observation,
  evidence, event cluster, event score, category score, and briefing snapshot.
- Non-scope: Database mapping and provider-specific fields beyond an extension
  record.
- Acceptance: Valid examples parse; malformed time, geometry, category, and
  score records fail with stable errors.
- Verification: `npm test -- tests/core/model`

### T003 Add fixture loading and deterministic clock

- Status: pending
- Size: S
- Depends on: T002
- Allowed paths: `src/core/fixtures/**`, `tests/fixtures/**`,
  `tests/core/fixtures/**`
- Scope: Load JSON fixtures through canonical schemas and inject a fixed clock
  into all replayable core operations.
- Non-scope: Live HTTP fetching.
- Acceptance: The same fixture loaded twice produces byte-identical normalized
  records and timestamps.
- Verification: `npm test -- tests/core/fixtures`

### Phase 1 — Selection engine vertical slice

### T004 Implement source families and confidence scoring

- Status: pending
- Size: M
- Depends on: T002, T003
- Allowed paths: `src/core/score/confidence.ts`,
  `src/core/model/source-policy.ts`, `tests/core/score/confidence.test.ts`,
  `tests/fixtures/sources/**`
- Scope: Implement authority bands, independent support, source independence,
  completeness, confidence floor, and reason codes.
- Non-scope: Automated publisher reputation discovery.
- Acceptance: Syndicated copies count as one family; an official structured
  observation can be high-confidence alone; low-confidence items fail the home
  gate.
- Verification: `npm test -- tests/core/score/confidence.test.ts`

### T005 Implement the USGS fixture normalizer

- Status: pending
- Size: M
- Depends on: T002, T003
- Allowed paths: `src/providers/usgs/**`, `tests/providers/usgs/**`,
  `tests/fixtures/usgs/**`
- Scope: Convert recorded USGS GeoJSON and detail payloads into canonical
  observations and evidence, preserving IDs, geometry, revisions, magnitude,
  significance, felt count, tsunami flag, and alert metadata.
- Non-scope: Network polling or persistence.
- Acceptance: Recorded payloads normalize deterministically and malformed
  payloads are rejected without partial canonical records.
- Verification: `npm test -- tests/providers/usgs`

### T006 Implement disaster impact scoring

- Status: pending
- Size: M
- Depends on: T004, T005
- Allowed paths: `src/core/score/disaster-impact.ts`,
  `src/core/score/impact-config.ts`,
  `tests/core/score/disaster-impact.test.ts`,
  `tests/fixtures/scoring/disasters/**`
- Scope: Map earthquake measurements and PAGER-style alert levels into a
  versioned 0–100 domain impact score with documented floors and reasons.
- Non-scope: Flood, wildfire, cyclone, or non-disaster category models.
- Acceptance: Red and orange alerts receive configured floors; ordinary
  low-impact earthquakes remain below the briefing threshold.
- Verification: `npm test -- tests/core/score/disaster-impact.test.ts`

### T007 Implement common event scoring and freshness

- Status: pending
- Size: M
- Depends on: T004, T006
- Allowed paths: `src/core/score/event-score.ts`,
  `src/core/score/freshness.ts`, `src/core/score/score-config.ts`,
  `tests/core/score/event-score.test.ts`
- Scope: Implement base weights, confidence multiplier, category half-lives,
  phase-aware freshness, official floors, score version, and component reasons.
- Non-scope: Category aggregation and final selection.
- Acceptance: Golden inputs reproduce exact scores; a duplicate article does
  not reset freshness; stale official data cannot receive a live floor.
- Verification: `npm test -- tests/core/score/event-score.test.ts`

### T008 Implement category heat

- Status: pending
- Size: S
- Depends on: T007
- Allowed paths: `src/core/score/category-heat.ts`,
  `tests/core/score/category-heat.test.ts`
- Scope: Rank primary-category events and calculate top-three, breadth,
  velocity, automatic-include, and Today's Focus rules.
- Non-scope: User personalization.
- Acceptance: Secondary categories do not double count; a category with an
  85-point event is included; weak categories are not used to fill the view.
- Verification: `npm test -- tests/core/score/category-heat.test.ts`

### T009 Implement diversity-aware briefing selection

- Status: pending
- Size: M
- Depends on: T007, T008
- Allowed paths: `src/core/select/**`,
  `tests/core/select/briefing-selection.test.ts`,
  `tests/fixtures/selection/**`
- Scope: Implement the 5–8 item cap, 55 floor, category/country limits,
  critical override, similarity penalty, and stable tie-breaking.
- Non-scope: Personalized ranking.
- Acceptance: Golden candidate sets produce deterministic order, no weak quota
  filling, and no non-exempt category or country cap violations.
- Verification: `npm test -- tests/core/select/briefing-selection.test.ts`

### T010 Add deterministic event clustering

- Status: pending
- Size: M
- Depends on: T002, T003, T005
- Allowed paths: `src/core/cluster/**`, `tests/core/cluster/**`,
  `tests/fixtures/clustering/**`
- Scope: Implement native-ID, canonical URL, normalized title, entity/geo/time,
  Jaccard 0.55 matching, merge reasons, and location/entity vetoes.
- Non-scope: Embeddings or vector storage.
- Acceptance: Labeled merge/non-merge fixtures pass and repeated USGS revisions
  resolve to one event.
- Verification: `npm test -- tests/core/cluster`

### T011 Compose the fixture-mode briefing pipeline

- Status: pending
- Size: M
- Depends on: T004, T007, T008, T009, T010
- Allowed paths: `src/core/pipeline/**`, `scripts/replay.ts`,
  `tests/core/pipeline/**`, `tests/fixtures/replay/**`, `package.json`
- Scope: Run normalize → cluster → score → category heat → selection from a
  fixed fixture and emit a complete briefing snapshot.
- Non-scope: SQLite or live providers.
- Acceptance: Two runs produce byte-identical ordered snapshots with score and
  selection reasons.
- Verification: `npm test -- tests/core/pipeline && npm run replay -- --fixture tests/fixtures/replay/baseline.json`

### Phase 2 — First cinematic interface

### T012 Establish visual tokens and accessible application shell

- Status: pending
- Size: M
- Depends on: T001
- Allowed paths: `src/web/App.tsx`, `src/web/styles/**`,
  `src/web/components/AppShell.tsx`, `tests/web/app-shell.test.tsx`
- Scope: Implement typography, spacing, black editorial surfaces, off-white
  text, amber accent, focus states, reduced motion, and the minimal LENS header.
- Non-scope: Map and briefing content.
- Acceptance: The shell matches the approved visual guardrails and is operable
  by keyboard at desktop and narrow widths.
- Verification: `npm test -- tests/web/app-shell.test.tsx && npm run build`

### T013 Render the map overview from fixture data

- Status: pending
- Size: M
- Depends on: T011, T012
- Allowed paths: `src/web/map/**`, `src/web/screens/TodayOverview.tsx`,
  `tests/web/today-map.test.tsx`
- Scope: Add MapLibre, configurable style URL, selected markers, active event
  geometry, focus/fit behavior, and a non-map fallback.
- Non-scope: All raw layers or user-configurable layer controls.
- Acceptance: Only selected events render and activating an event moves the
  map without losing keyboard focus.
- Verification: `npm test -- tests/web/today-map.test.tsx && npm run build`

### T014 Build the bottom editorial briefing band

- Status: pending
- Size: M
- Depends on: T011, T012, T013
- Allowed paths: `src/web/components/BriefingBand.tsx`,
  `src/web/components/StoryProgress.tsx`,
  `src/web/screens/TodayOverview.tsx`,
  `tests/web/briefing-band.test.tsx`
- Scope: Show category, headline, one-sentence summary, source attribution,
  progress, previous/next controls, and keyboard navigation.
- Non-scope: Article feed or score methodology details.
- Acceptance: Users can traverse every selected event by controls and arrow
  keys; active map state and text remain synchronized.
- Verification: `npm test -- tests/web/briefing-band.test.tsx`

### T015 Build the event StoryMaps-style sidecar

- Status: pending
- Size: M
- Depends on: T014
- Allowed paths: `src/web/App.tsx`, `src/web/components/BriefingBand.tsx`,
  `src/web/components/EventSidecar.tsx`,
  `src/web/components/EvidenceTimeline.tsx`,
  `src/web/map/briefing-fixture.ts`, `src/web/screens/EventStory.tsx`,
  `src/web/styles/event-story.css`, `tests/web/event-sidecar.test.tsx`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Implement What happened, Why it matters, What changed, Affected,
  Sources, evidence timeline, and collapsible selection explanation.
- Non-scope: LLM summarization.
- Acceptance: All claims and links come from fixture records; official evidence
  and reporting are visibly distinguished.
- Verification: `npm test -- tests/web/event-sidecar.test.tsx`

### T036 Open the event sidecar immediately and switch events in place

- Status: pending
- Size: S
- Depends on: T015
- Allowed paths: `src/web/screens/TodayOverview.tsx`,
  `src/web/screens/EventStory.tsx`, `src/web/components/EventSidecar.tsx`,
  `src/web/styles/event-story.css`, `tests/web/event-sidecar.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Open the detail sidecar from a map event in one action and provide
  in-place event switching from both map markers and sidecar navigation.
- Non-scope: New event data or map layers.
- Acceptance: Selecting a map event opens its sidecar immediately; detail
  navigation switches among all briefing events without returning to overview.
- Verification: `npm test -- tests/web/event-sidecar.test.tsx`

### T016 Add the public methodology view

- Status: pending
- Size: S
- Depends on: T007, T009, T012
- Allowed paths: `src/web/App.tsx`, `src/web/screens/Methodology.tsx`,
  `src/web/components/ScoreBreakdown.tsx`, `src/web/styles/methodology.css`,
  `tests/web/methodology.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Render formulas, version, source policy, known limits, and one
  reproducible event breakdown.
- Non-scope: Editable weights.
- Acceptance: The displayed example recomputes to the fixture's final score and
  all scoring versions are visible.
- Verification: `npm test -- tests/web/methodology.test.tsx`

### Phase 3 — Live storage and API

### T037 Add five synchronized event story chapters

- Status: pending
- Size: M
- Depends on: T015
- Allowed paths: `src/web/map/briefing-fixture.ts`,
  `src/web/map/WorldMap.tsx`, `src/web/components/EventSidecar.tsx`,
  `src/web/screens/EventStory.tsx`, `src/web/styles/event-story.css`,
  `tests/web/event-story-chapters.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Add five narrative chapters per event and synchronize chapter
  scrolling and controls with map focus.
- Non-scope: New live providers or historical comparison data.
- Acceptance: Each event exposes five narrative chapters and changing the
  active chapter updates the map focus.
- Verification: `npm test -- tests/web/event-story-chapters.test.tsx`

### T017 Add SQLite migrations and repositories

- Status: pending
- Size: M
- Depends on: T002
- Allowed paths: `src/server/store/**`, `tests/server/store/**`,
  `tests/fixtures/db/**`, `package.json`, `package-lock.json`
- Scope: Add SQLite WAL store, sequential migrations, repositories for provider
  runs, observations, events, evidence, scores, and snapshots.
- Non-scope: PostgreSQL abstraction.
- Acceptance: Empty and existing fixture databases migrate; snapshots remain
  immutable; repository round trips preserve canonical records.
- Verification: `npm test -- tests/server/store`

### T018 Persist and retrieve briefing snapshots

- Status: pending
- Size: M
- Depends on: T011, T017
- Allowed paths: `src/server/store/lens-store.ts`,
  `src/server/store/briefing-snapshots.ts`,
  `src/server/services/build-briefing.ts`,
  `tests/server/briefing-snapshots.test.ts`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Persist snapshots on selected-set/material-order change, retrieve the
  latest and nearest prior snapshot, and include provider health.
- Non-scope: Scheduled polling.
- Acceptance: Duplicate snapshots are suppressed; a 24-hour lookup returns the
  nearest valid immutable snapshot.
- Verification: `npm test -- tests/server/briefing-snapshots.test.ts`

### T019 Implement the read-only API

- Status: pending
- Size: M
- Depends on: T017, T018
- Allowed paths: `src/server/api/**`, `src/server/app.ts`,
  `src/server/index.ts`, `tests/server/api/**`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Implement briefing, categories, event, snapshot, methodology, and
  provider-health endpoints with versions and stale/degraded metadata.
- Non-scope: Authentication and public rate limiting.
- Acceptance: Fresh, empty, stale, and degraded fixture states have validated
  response contracts.
- Verification: `npm test -- tests/server/api`

### T020 Add live USGS polling

- Status: pending
- Size: M
- Depends on: T005, T017, T018, T029
- Allowed paths: `src/providers/usgs/client.ts`,
  `src/server/scheduler/**`, `src/server/services/ingest-usgs.ts`,
  `src/server/index.ts`, `tests/server/usgs-ingest.test.ts`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Poll without overlap, validate responses, record provider health,
  update revisions, rescore material changes, and preserve the last good state.
- Non-scope: WorldMonitor or background worker infrastructure.
- Acceptance: Recorded HTTP responses create/update one event; a failed fetch
  marks degradation without deleting the last valid snapshot.
- Verification: `npm test -- tests/server/usgs-ingest.test.ts`

### T021 Add SSE briefing notifications

- Status: pending
- Size: S
- Depends on: T019, T020
- Allowed paths: `src/server/api/stream.ts`, `src/server/api/routes.ts`,
  `src/server/services/ingest-usgs.ts`, `src/web/data/live-briefing.ts`,
  `src/web/App.tsx`, `src/web/components/AppShell.tsx`,
  `src/web/screens/TodayOverview.tsx`, `src/web/screens/EventStory.tsx`,
  `tests/server/sse.test.ts`, `tests/web/live-briefing.test.ts`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Publish snapshot/change IDs, refetch canonical JSON, reconnect with
  timed polling fallback, and avoid full-page reload.
- Non-scope: WebSockets.
- Acceptance: A material fixture update refreshes the active briefing; stream
  failure falls back without duplicate renders.
- Verification: `npm test -- tests/server/sse.test.ts tests/web/live-briefing.test.ts`

### Phase 4 — WorldMonitor breadth

### T022 Implement the WorldMonitor adapter contract

- Status: pending
- Size: M
- Depends on: T002, T003, T029
- Allowed paths: `src/providers/worldmonitor/**`,
  `tests/providers/worldmonitor/**`, `tests/fixtures/worldmonitor/**`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Validate recorded API responses, translate categories and severity,
  preserve upstream attribution, and emit canonical observations without using
  upstream importance as the LENS score.
- Non-scope: Copying WorldMonitor source code or reproducing all providers.
- Acceptance: Fixtures normalize deterministically and unsupported response
  changes fail as provider errors rather than malformed events.
- Verification: `npm test -- tests/providers/worldmonitor`

### T023 Add WorldMonitor polling and degradation isolation

- Status: pending
- Size: M
- Depends on: T017, T018, T022
- Allowed paths: `src/providers/worldmonitor/client.ts`,
  `src/server/services/ingest-worldmonitor.ts`,
  `src/server/services/ingest-usgs.ts`, `src/server/scheduler/**`,
  `src/server/index.ts`, `tests/server/worldmonitor-ingest.test.ts`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Poll on its own schedule, record health, ingest valid observations,
  and isolate failures from USGS processing.
- Non-scope: New category impact models.
- Acceptance: WorldMonitor failure leaves USGS events and the last valid
  briefing available with accurate degraded metadata.
- Verification: `npm test -- tests/server/worldmonitor-ingest.test.ts`

### T024 Cluster cross-provider evidence and material updates

- Status: pending
- Size: M
- Depends on: T010, T020, T023
- Allowed paths: `src/core/cluster/**`,
  `src/server/services/reconcile-events.ts`,
  `tests/integration/cross-provider-clustering.test.ts`,
  `tests/fixtures/clustering/cross-provider/**`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Reconcile USGS and WorldMonitor observations, source families,
  revisions, merge reasons, and material-update detection.
- Non-scope: Embedding clustering.
- Acceptance: The same earthquake from both providers becomes one event with
  separate evidence; unrelated nearby events do not merge.
- Verification: `npm test -- tests/integration/cross-provider-clustering.test.ts`

### Phase 5 — Product breadth

### T025 Build the all-categories index

- Status: pending
- Size: S
- Depends on: T008, T012, T019, T029
- Allowed paths: `src/web/screens/AllCategories.tsx`,
  `src/web/components/CategoryRow.tsx`,
  `src/web/App.tsx`, `src/web/components/AppShell.tsx`,
  `src/web/styles/categories.css`, `tests/web/all-categories.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Render all ten categories with heat, qualifying event count, latest
  material update, and links to category views.
- Non-scope: Color-coded card dashboards.
- Acceptance: Non-featured categories remain accessible and unsupported
  categories are labeled without invented scores.
- Verification: `npm test -- tests/web/all-categories.test.tsx`

### T026 Add causal story threads

- Status: pending
- Size: M
- Depends on: T015, T024
- Allowed paths: `src/core/cluster/story-thread.ts`,
  `src/web/components/StoryThread.tsx`, `src/web/components/EventSidecar.tsx`,
  `src/web/styles/event-story.css`, `tests/core/cluster/story-thread.test.ts`,
  `tests/web/story-thread.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Link related events across categories without collapsing their
  identities and display the causal sequence inside one story.
- Non-scope: Model-generated causal claims.
- Acceptance: Every thread link has structured evidence; related shipping,
  energy, and economy events do not consume separate home slots unnecessarily.
- Verification: `npm test -- tests/core/cluster/story-thread.test.ts tests/web/story-thread.test.tsx`

### T027 Implement the second direct provider

- Status: pending
- Size: M
- Depends on: T023, T024
- Allowed paths: `src/providers/eonet/**`, `src/server/services/ingest-eonet.ts`,
  `src/server/index.ts`, `tests/providers/eonet/**`,
  `tests/fixtures/eonet/**`, `docs/providers.md`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Add NASA EONET unless a documented review selects FIRMS, following the
  same validation, health, attribution, and canonical normalization contract.
- Non-scope: Adding both providers.
- Acceptance: The new provider can create a canonical event and fail
  independently without affecting existing providers.
- Verification: `npm test -- tests/providers/eonet`

### T028 Add category impact mappers from replay fixtures

- Status: pending
- Size: M
- Depends on: T007, T022, T027
- Allowed paths: `src/core/score/impact/**`,
  `tests/core/score/impact/**`, `tests/fixtures/scoring/categories/**`,
  `docs/methodology.md`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Implement one reviewed mapper per supported category using real
  measurements or explicit structured evidence; record unsupported states.
- Non-scope: Guessing scores where inputs are absent.
- Acceptance: At least eight categories have golden impact fixtures and every
  threshold is documented and versioned.
- Verification: `npm test -- tests/core/score/impact`

### Phase 6 — Comparison and evaluation

### T029 Build the 24-hour comparison API and UI

- Status: pending
- Size: M
- Depends on: T018, T019, T015
- Allowed paths: `src/server/api/snapshots.ts`,
  `src/core/compare/**`, `src/web/screens/Comparison.tsx`,
  `src/server/api/routes.ts`, `src/web/map/ComparisonLayer.tsx`,
  `src/web/App.tsx`, `src/web/screens/EventStory.tsx`,
  `src/web/map/briefing-fixture.ts`, `src/web/styles/comparison.css`,
  `src/web/styles/event-story.css`, `tests/integration/comparison.test.ts`,
  `tests/web/comparison.test.tsx`,
  `docs/tasks/2026-07-25-lens-live-world-briefing-tasks.md`,
  `docs/reviews/2026-07-25-lens-live-world-briefing-review.md`
- Scope: Compare current and nearest 24-hour snapshots, expose changed facts
  and geometry, and render a simple toggle or slider.
- Non-scope: Arbitrary historical analytics.
- Acceptance: Added, changed, easing, and resolved events are distinguishable
  without relying only on color.
- Verification: `npm test -- tests/integration/comparison.test.ts tests/web/comparison.test.tsx`

### T030 Define the labeled evaluation dataset

- Status: pending
- Size: M
- Depends on: T011, T024, T028
- Allowed paths: `tests/fixtures/evaluation/**`,
  `docs/evaluation-labeling.md`, `scripts/validate-evaluation.ts`,
  `package.json`
- Scope: Define labels for importance, merge identity, category, geography,
  source family, and pairwise rank preference; assemble at least 200 historical
  candidates across at least eight categories.
- Non-scope: Tuning weights while labels are being created.
- Acceptance: The dataset validates with no duplicate IDs, missing provenance,
  or unresolved required labels.
- Verification: `npm run validate:evaluation`

### T031 Implement replay metrics and ranking report

- Status: pending
- Size: M
- Depends on: T030
- Allowed paths: `scripts/evaluate.ts`, `src/core/evaluation/**`,
  `tests/core/evaluation/**`, `docs/evaluation.md`, `package.json`
- Scope: Calculate Precision@8, duplicate rate, detection delay, source
  concentration, category/geographic distribution, rank churn, and explanation
  coverage.
- Non-scope: Automatically changing production weights.
- Acceptance: The same dataset and scoring version produce an identical JSON
  report and a readable Markdown summary.
- Verification: `npm test -- tests/core/evaluation && npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json`

### T032 Calibrate and freeze `lens-v1`

- Status: pending
- Size: M
- Depends on: T031
- Allowed paths: `src/core/score/**`, `src/core/select/**`,
  `tests/fixtures/evaluation/**`, `docs/evaluation.md`,
  `docs/methodology.md`
- Scope: Review metrics and labeled disagreements, adjust documented weights or
  thresholds with fixture evidence, then freeze the first public scoring
  version.
- Non-scope: Optimizing only for one headline day or hiding failed metrics.
- Acceptance: The evaluation report records before/after values, tradeoffs,
  chosen version, and unresolved bias.
- Verification: `npm test -- tests/core/score tests/core/select && npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json`

### Phase 7 — Release verification and portfolio

### T033 Add browser accessibility and live-flow tests

- Status: pending
- Size: M
- Depends on: T021, T025, T029
- Allowed paths: `tests/e2e/**`, `playwright.config.ts`, `package.json`,
  `package-lock.json`
- Scope: Cover Today overview, keyboard navigation, sidecar, categories,
  comparison, stale state, SSE refresh, reduced motion, and narrow viewport.
- Non-scope: Pixel-perfect tests for map tiles.
- Acceptance: Core paths pass in a production build and expose no serious
  automated accessibility violations.
- Verification: `npm run build && npm run test:e2e`

### T034 Complete open-source and case-study documentation

- Status: pending
- Size: M
- Depends on: T031, T032, T033
- Allowed paths: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `docs/**`,
  `examples/**`
- Scope: Document setup, fixture mode, architecture, providers, scoring,
  evaluation, bias, licensing, screenshots, problem discovery, design
  decisions, implementation evidence, and remaining limits.
- Non-scope: Marketing claims unsupported by evaluation.
- Acceptance: A new contributor can run fixture mode from the README and a
  reviewer can trace the portfolio story from problem to measured result.
- Verification: `npm run docs:check && npm run replay -- --fixture tests/fixtures/replay/baseline.json`

### T035 Run final release review

- Status: pending
- Size: M
- Depends on: T034
- Allowed paths: `docs/reviews/**`
- Scope: Review the approved spec, final diff, deterministic evidence,
  evaluation report, license/attribution, and release limitations. Record
  pass/fail findings without modifying implementation.
- Non-scope: Fixing findings inside the review task.
- Acceptance: The review lists exact commands and outcomes, spec deviations,
  open risks, and any follow-up task IDs.
- Verification: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json`

## Analysis Result

Analysis date: 2026-07-25  
Result: ready for implementation

The approved specification, implementation plan, Markdown task list, and Bata
ledger were checked together.

### Requirement coverage

| Spec requirement | Delivery tasks |
|---|---|
| R1 Fixed taxonomy | T002, T008, T025 |
| R2 Initial providers | T005, T020, T022, T023 |
| R3 Canonical event/evidence model | T002, T017 |
| R4 Event gating | T002, T005, T022 |
| R5 Deduplication and clustering | T010, T024 |
| R6 Confidence | T004 |
| R7 Category impact | T006, T027, T028 |
| R8 Event importance | T007, T032 |
| R9 Material updates and momentum | T007, T020, T024 |
| R10 Category heat | T008 |
| R11 Final briefing selection | T009, T011 |
| R12 Editorial map interface | T012–T016, T025, T029 |
| R13 Live updates | T018–T021, T023 |
| R14 Explainability | T016, T031, T034 |
| R15 Open-source portfolio | T030–T035 |

### Corrections made during analysis

- Raised the Bata changed-file ceiling from 5 to 12 so the initial scaffold and
  documentation tasks can complete without weakening per-task path limits.
- Added every task's targeted test and fixture path to the machine ledger.
- Kept EONET as the single planned second direct provider; FIRMS remains a
  later alternative rather than parallel scope.
- Confirmed that unsupported category impact models are excluded instead of
  receiving placeholder scores.
- Confirmed that T001 is the only initially ready task.

### Deterministic ledger check

The ledger contains 35 unique tasks. Every task has:

- at least one allowed path;
- an observable acceptance condition;
- at least one verifier;
- only existing dependency IDs.

The dependency graph has no cycles.

### Deliberate limits

- No implementation or dependency installation was performed during planning.
- Production map provider, public license, and hosting remain release gates,
  not blockers for fixture-mode implementation.
- The initial scoring weights remain hypotheses until T030–T032 complete the
  labeled replay and calibration.
