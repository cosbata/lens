# Plan: LENS Live World Briefing

Feature ID: 2026-07-25-lens-live-world-briefing  
Spec: ../specs/2026-07-25-lens-live-world-briefing-spec.md  
Date: 2026-07-25  
Status: implementation-ready

## Current Structure

The LENS project currently contains only Bata workflow state, document
templates, and the approved product specification. No application framework,
runtime dependency, database, or deployment target has been selected or
installed.

This is a greenfield web project. The first implementation should therefore
prove the risky parts in this order:

1. deterministic event selection;
2. provider-independent ingestion;
3. understandable map presentation;
4. live updates and replay evaluation.

The current visual direction is represented by the approved LENS prototypes:

- satellite map as the main canvas;
- black editorial band for the briefing overview;
- white or charcoal StoryMaps-style sidecar for event reading;
- restrained amber accent for the active event or route;
- no card-grid dashboard or decorative AI styling.

## Proposed Direction

Build one self-hostable TypeScript application around a pure, versioned
selection core, then add live providers and the editorial map interface in
vertical slices.

### 1. Smallest architecture that holds

Use one TypeScript repository and one Node.js application:

```text
Browser
  ├─ React + Vite UI
  ├─ MapLibre map
  └─ EventSource for live briefing changes
          │
Node application
  ├─ read-only HTTP API
  ├─ provider polling scheduler
  ├─ normalization and clustering
  ├─ deterministic scoring and selection
  └─ SQLite event and snapshot store
```

Do not start with microservices, a message broker, WebSockets, a vector
database, a monorepo, or Kubernetes. One process is enough for the portfolio
release and is easier for contributors to run.

Suggested runtime:

- Node.js 22;
- TypeScript;
- React and Vite;
- MapLibre GL JS;
- Fastify for the HTTP server;
- SQLite in WAL mode;
- Zod for trust-boundary validation;
- Vitest for deterministic tests;
- Playwright for the final browser smoke path.

Use npm unless the generated project selects another package manager before
the first lockfile is created.

### 2. Code boundaries

Keep boundaries as folders and pure functions, not separately published
packages:

```text
src/
├─ core/
│  ├─ model/
│  ├─ normalize/
│  ├─ cluster/
│  ├─ score/
│  └─ select/
├─ providers/
│  ├─ worldmonitor/
│  └─ usgs/
├─ server/
│  ├─ api/
│  ├─ scheduler/
│  └─ store/
└─ web/
   ├─ components/
   ├─ map/
   ├─ screens/
   └─ styles/
```

`src/core` must not import server, database, map, or provider code. It receives
plain validated records and returns deterministic results. This makes the
selection engine testable, reusable, and central to the portfolio story.

Provider adapters may import shared schemas but cannot return provider-native
objects to the rest of the application.

### 3. Processing pipeline

```text
Provider payload
  → validate at boundary
  → store provider run metadata
  → normalize observations
  → reject or quarantine invalid candidates
  → group source families
  → cluster observations into events
  → detect material changes
  → calculate domain impact
  → calculate confidence and event score
  → calculate category heat
  → apply diversity selection
  → persist briefing snapshot
  → notify connected browsers
```

Each stage produces a reason code. Examples:

- `excluded.missing_time`;
- `excluded.opinion_only`;
- `clustered.native_id`;
- `clustered.entity_geo_time`;
- `confidence.official_observation`;
- `selected.critical_override`;
- `not_selected.below_score_floor`;
- `not_selected.diversity_cap`.

These codes support debugging and the public methodology view without asking
an LLM to explain deterministic behavior.

### 4. Canonical records

Use these logical records:

#### ProviderRun

Tracks provider, start/end time, success, item count, error class, and stale or
degraded state.

#### Observation

One provider-native occurrence or article after normalization. It retains the
source ID, source family, URL, original time, fetch time, text fields,
measurements, and geometry.

#### EventCluster

The user-facing event identity. It contains canonical facts, primary category,
related categories, location, phase, evidence IDs, and material-update time.

#### EventScore

Versioned domain impact, urgency, momentum, reach, anomaly, cascade,
confidence, freshness, final score, floors, and reason codes.

#### BriefingSnapshot

An immutable ordered list of selected event IDs, category scores, timestamp,
ranking version, and provider health summary. Snapshots power replay and the
24-hour comparison.

### 5. Storage

Start with SQLite and these tables:

```text
provider_runs
observations
events
event_evidence
event_scores
briefing_snapshots
briefing_snapshot_items
```

Use JSON columns only for provider-specific measurements and the immutable
component breakdown. Keep identifiers, timestamps, category, phase, score, and
geometry bounds queryable.

Store raw provider payloads only in development fixtures or a bounded debug
retention mode. Do not retain full copyrighted article bodies.

SQLite is sufficient until concurrent writers, multi-instance deployment, or
retention volume is measured to exceed it. PostgreSQL is a migration option,
not an MVP dependency.

### 6. Provider plan

#### WorldMonitor adapter

Purpose:

- broad candidate discovery across several categories;
- initial source links and existing severity metadata;
- fast coverage while direct adapters are still limited.

Rules:

- validate every response;
- preserve WorldMonitor and upstream attribution;
- translate external categories into the LENS taxonomy;
- never treat WorldMonitor's importance score as the LENS final score;
- mark provider data stale using both event time and fetch health.

#### USGS adapter

Purpose:

- prove the architecture works without WorldMonitor;
- supply official earthquake observations;
- implement the first category-specific impact mapper.

Rules:

- use native earthquake IDs for stable clustering;
- prefer PAGER alert data when present;
- retain magnitude, depth, felt reports, significance, tsunami flag, and
  geometry;
- revisions update the same event and may become material updates.

#### Next provider

After the vertical slice, choose NASA EONET for broader natural-event coverage
or FIRMS for richer wildfire measurements. Do not implement both until replay
evaluation shows the need.

### 7. Ranking implementation

Implement ranking as versioned pure functions:

```text
scoreVersion = "lens-v1"
clusterVersion = "cluster-v1"
selectionVersion = "briefing-v1"
```

Configuration lives in reviewed TypeScript or JSON files committed with tests.
Avoid environment variables for scoring weights; runtime environments must not
silently rank the same data differently.

Implement in this order:

1. confidence;
2. disaster impact mapper;
3. common score components;
4. freshness and phase;
5. category heat;
6. diversity-aware final selection;
7. remaining category impact mappers as real providers or evaluation fixtures
   require them.

For unimplemented category-specific mappers, use an explicit
`impactStatus: unsupported` and exclude the event from the public briefing.
Do not ship arbitrary placeholder scores.

### 8. Clustering implementation

The first pass uses no embedding service:

1. provider-native ID match;
2. canonical URL match;
3. normalized exact-title match;
4. entity, event type, geography, and time-window match;
5. token Jaccard threshold `0.55`.

Store merge evidence and reject merges with conflicting principal locations or
entities.

Create a replay report of false splits and false merges. Add multilingual
sentence embeddings only if deterministic clustering cannot meet the displayed
duplicate-rate target.

### 9. HTTP API

Expose a read-only versioned API:

```text
GET /api/v1/briefing
GET /api/v1/categories
GET /api/v1/events/:eventId
GET /api/v1/snapshots?at=<iso-time>
GET /api/v1/methodology
GET /api/v1/providers/health
GET /api/v1/stream
```

`/stream` uses Server-Sent Events and publishes only snapshot IDs and changed
event IDs. The browser fetches canonical JSON from the ordinary endpoints.

Responses include:

- server time;
- data timestamp;
- stale/degraded flags;
- scoring and selection versions;
- source attribution;
- component score breakdown where applicable.

### 10. UI implementation

#### View A — Today overview

- full-bleed world map;
- only selected event markers and relevant route/area geometry;
- logo and minimal `About`, `Sources`, and sound controls;
- bottom editorial band containing active category, headline, one-sentence
  briefing, story progress, sources, and next/previous navigation;
- `Explore all categories` remains secondary.

#### View B — Event sidecar

- map remains visible and responds to the active story step;
- sidecar contains `What happened`, `Why it matters`, `What changed`,
  `Affected`, and `Sources`;
- score explanation is collapsed under `Why this was selected`;
- evidence timeline distinguishes official measurements from reporting;
- keyboard arrows and scrolling move between story steps.

#### View C — 24-hour comparison

- one map with a draggable or toggled `24 hours ago / now` state;
- changed geometry and metrics are emphasized;
- unchanged decorative layers are hidden.

#### View D — All categories

- simple typographic index of ten categories;
- each row shows category heat, number of qualifying events, and latest material
  update;
- no colorful card grid.

#### View E — Methodology

- plain-language explanation of selection;
- exact formulas and version;
- known limitations and source policy;
- one reproducible event example.

### 11. Live update strategy

Initial defaults:

- USGS polling: 60 seconds;
- WorldMonitor polling: 5 minutes;
- ranking stabilization: 90 seconds for non-critical reorder;
- critical or official-alert floor changes publish immediately;
- snapshot creation: on selected-set/material-order change and at least every
  hour;
- retained snapshots: 30 days for the public prototype.

The scheduler uses per-provider non-overlapping timers. A failed fetch does not
erase the last good data. The provider health endpoint and briefing response
state whether the snapshot contains stale inputs.

### 12. Delivery phases

#### Phase 0 — Repository and fixture mode

Create the TypeScript app, quality commands, canonical schemas, fixture loader,
and a static briefing JSON. The UI and engine can develop without live API
availability.

Exit: one command runs the app and one command replays a fixture.

#### Phase 1 — Selection engine vertical slice

Implement USGS normalization, disaster impact, confidence, event score,
category score, and final selection using recorded fixtures.

Exit: deterministic tests reproduce a ranked earthquake briefing with visible
component explanations.

#### Phase 2 — First cinematic UI

Build Today overview and event sidecar against fixture API responses.

Exit: the approved visual direction works in a browser with keyboard
navigation and responsive fallback.

#### Phase 3 — Live backend

Add SQLite, scheduler, USGS polling, snapshots, health, REST endpoints, and
SSE refresh.

Exit: a new or revised USGS event updates the browser without reload and stale
state is testable.

#### Phase 4 — WorldMonitor breadth

Add WorldMonitor normalization, source-family handling, deterministic
clustering, and cross-provider evidence.

Exit: WorldMonitor and USGS can describe one event without creating duplicate
briefing items; WorldMonitor failure leaves USGS functioning.

#### Phase 5 — Category and storyline breadth

Implement the remaining category impact mappings in priority order using
replay fixtures, then add one new direct provider. Build the all-categories
view and causal story threads.

Exit: at least eight categories are represented in the labeled evaluation set,
not necessarily simultaneously visible.

#### Phase 6 — Comparison and evaluation

Build the 24-hour comparison, replay CLI, labeling dataset format, metrics
report, and weight calibration workflow.

Exit: at least 200 historical candidates produce a reproducible evaluation
report.

#### Phase 7 — Open-source portfolio release

Finish methodology, architecture, bias, provider, setup, contribution, and
case-study documentation. Add screenshots and a short walkthrough.

Exit: a new contributor can run fixture mode without provider keys and
understand the problem, decision process, evidence, and remaining limits.

## Expected Files

The exact framework generator may add standard files, but the intended project
surface is:

```text
lens/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ src/
│  ├─ core/
│  │  ├─ model/
│  │  ├─ normalize/
│  │  ├─ cluster/
│  │  ├─ score/
│  │  └─ select/
│  ├─ providers/
│  │  ├─ worldmonitor/
│  │  └─ usgs/
│  ├─ server/
│  │  ├─ api/
│  │  ├─ scheduler/
│  │  └─ store/
│  └─ web/
│     ├─ components/
│     ├─ map/
│     ├─ screens/
│     └─ styles/
├─ tests/
│  ├─ fixtures/
│  ├─ core/
│  ├─ providers/
│  ├─ integration/
│  └─ e2e/
├─ scripts/
│  ├─ replay.ts
│  └─ evaluate.ts
└─ docs/
   ├─ architecture.md
   ├─ methodology.md
   ├─ providers.md
   ├─ evaluation.md
   ├─ case-study.md
   ├─ specs/
   ├─ plans/
   ├─ tasks/
   └─ reviews/
```

Do not create empty folders or placeholder modules before their first task.

## UI Impact

This is a new interface, so there is no migration impact. The main design risk
is drifting back toward a dashboard as categories and providers increase.

Guardrails:

- the home view renders only selected events;
- filters and methodology are secondary surfaces;
- category color is not used as the primary differentiator;
- map geometry, typography, spacing, and motion carry hierarchy;
- every new panel requires removal or replacement of an existing element;
- story reading remains possible without opening a separate article list.

Accessibility requirements:

- full keyboard navigation for briefing and sidecar;
- visible focus treatment;
- reduced-motion behavior;
- readable text over map imagery;
- non-color status labels;
- semantic headings and source links.

## API Impact

All initial endpoints are read-only and versioned under `/api/v1`.

The public contract treats scores as explanatory product data, not hidden
implementation details. Breaking scoring changes create a new scoring version
inside the response; breaking response-shape changes require a new API version.

Provider credentials, if any, remain server-side. Fixture mode and USGS-only
mode must work without a WorldMonitor key.

Rate limiting and cache headers are required before exposing the API publicly,
but authentication and user accounts are not part of the first release.

## Data / Storage Impact

- SQLite is the only mutable local store in the first release.
- Migrations are sequential SQL files and are tested against an empty and an
  existing fixture database.
- Briefing snapshots are immutable.
- Provider observations may be updated only through a new revision or
  source-native update timestamp.
- Article bodies are not persisted.
- Debug raw payload retention is disabled by default and bounded when enabled.
- A database delete/rebuild is acceptable only in local fixture development,
  not as a production migration strategy.

## Alternatives Considered

### Fork WorldMonitor

Rejected for the first release. It would accelerate data coverage but inherit a
large analyst-oriented UI, broad operational surface, and AGPL modification
obligations. LENS instead uses WorldMonitor as one replaceable input.

### WorldMonitor-only frontend

Rejected. A thin frontend would not demonstrate provider independence or an
original selection engine and would fail when the upstream service is
unavailable.

### News-only ranking

Rejected. News attention is useful for corroboration and momentum but is too
biased and duplicate-prone to represent impact.

### LLM-first ranking

Rejected. It is harder to reproduce, calibrate, and explain. LLMs remain
optional after deterministic selection.

### Next.js serverless application

Deferred. Serverless request handlers do not naturally own continuous provider
polling, SQLite, and SSE connections. A single long-running Node process is
simpler for the first self-hosted release.

### PostgreSQL and queue workers

Deferred until multiple instances, write contention, or measured data volume
requires them.

### Embedding database

Deferred until deterministic clustering fails the replay duplicate target.

## Risks

The plan treats ranking quality, source integrity, operational resilience, and
interface scope as the primary delivery risks.

### Ranking appears objective when it is editorial

Mitigation: publish formulas, component scores, versions, evaluation results,
and limitations. Call the output a briefing rank, not truth.

### Source and geographic bias

Mitigation: count independent source families, report concentration, preserve
local/official provenance, and audit category/region distributions.

### Cross-category score comparability

Mitigation: category-specific impact normalization, official floors, replay
labels, and versioned calibration. Do not implement unsupported categories
with guessed scores.

### False merge or duplicate split

Mitigation: conservative deterministic clustering, entity/location vetoes,
stored merge reasons, labeled replay review, and reversible cluster revisions.

### Rank jitter

Mitigation: material-update detection, category-specific freshness, a
stabilization window, immutable snapshots, and immediate bypass only for
critical official changes.

### Upstream failure or API change

Mitigation: boundary validation, fixture contract tests, provider health,
stale snapshots, and independent USGS operation.

### Licensing and redistribution

Mitigation: consume documented APIs, preserve attribution, avoid copied
WorldMonitor code, avoid article-body storage, and complete a license review
before public release.

### Map tile cost or usage terms

Mitigation: inject a map style URL, keep MapLibre provider-neutral, use fixture
mode for development, and select a compliant production provider before
deployment.

### UI grows into another dashboard

Mitigation: enforce the five core views and home briefing cap; treat additional
data as evidence inside stories rather than new panels.

### SQLite ceiling

Mitigation: one writer, WAL mode, bounded retention, and repository methods
that keep a future PostgreSQL migration localized. Do not build the migration
before measurements require it.

## Rollback Plan

No production system exists yet. During implementation:

- every phase ends with a fixture-mode runnable state;
- live provider ingestion can be disabled independently;
- the UI can fall back to the last valid briefing snapshot;
- ranking versions remain selectable in replay, but only one version is
  published live;
- schema migrations include a tested backup/export path before destructive
  changes;
- provider adapters can be disabled without changing canonical records;
- the SSE client falls back to timed briefing refresh if the stream fails.

If a new ranking version regresses evaluation, restore the previous scoring
version and snapshot builder while retaining the new code for offline replay.

## Verification Plan

The planned project commands are:

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run replay -- --fixture tests/fixtures/replay/baseline.json
npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json
```

Verification is layered:

1. pure unit tests for every score and selection branch;
2. golden fixtures for cluster and ordered briefing output;
3. provider contract tests with recorded payloads;
4. SQLite migration and snapshot integration tests;
5. API tests for fresh, stale, degraded, and empty states;
6. browser smoke tests for overview, sidecar, comparison, keyboard navigation,
   and live refresh;
7. replay metrics and a bounded human review of merges and top-eight ranking;
8. production build with no provider secret required for fixture mode.

Each Bata implementation task must name its allowed paths, acceptance
condition, and the smallest deterministic verifier that proves that task.
