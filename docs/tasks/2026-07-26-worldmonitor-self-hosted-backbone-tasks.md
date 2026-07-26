# Tasks: World Monitor self-hosted backbone

Feature ID: 2026-07-26-worldmonitor-self-hosted-backbone
Date: 2026-07-26
Status: ready

## Execution Rules

- Execute one task at a time in dependency order.
- Preserve user changes and the current working fixture fallback.
- Prime Mulch for every file before editing it.
- Do not copy covered World Monitor code before T001 completes.
- Do not add Redis, paid AI, or a new parser dependency.
- Use deterministic fixtures for CI; keep live network checks bounded and
  informational.
- Do not mark a task complete without running its listed verifier.

## Task List

Execute these eight dependency-ordered tasks one at a time.

### T001 Establish the AGPL and upstream provenance boundary

- Status: pending
- Size: S
- Depends on: none
- Expected files: `LICENSE`, `README.md`, `package.json`,
  `docs/upstream-worldmonitor.md`, `scripts/check-licenses.ts`,
  `src/web/**`, targeted tests.
- Scope:
  - Replace the covered distribution license with AGPL-3.0-only.
  - Add the pinned upstream commit, copied-file manifest, modification log,
    copyright notices, trademark separation, and source-offer link.
  - Add a deterministic provenance check without copying upstream code yet.
- Non-scope: Feed collection or ranking behavior.
- Acceptance:
  - A visitor and contributor can identify the license and retrieve source.
  - The checker fails when required provenance fields or files are missing.
- Verification:
  - `npm run docs:check`
  - `npm run typecheck`
  - `npm test -- tests/repository/license-provenance.test.ts`

### T002 Port and verify World Monitor story identity

- Status: pending
- Size: M
- Depends on: T001
- Expected files: `src/upstream/worldmonitor/**`, `src/core/cluster/**`,
  `src/server/store/**`, `tests/upstream/**`, `tests/core/cluster/**`,
  `tests/server/store/**`.
- Scope:
  - Vendor the minimum story-identity and canonical-adoption modules with
    notices intact.
  - Preserve structured provider/geospatial merge rules.
  - Use the upstream lexical matcher only for news-title comparison.
  - Add the SQLite `story_alias` migration and 96-hour expiry.
  - Port upstream labeled-pair and cross-cycle continuity tests.
- Non-scope: Fetching RSS or changing the UI.
- Acceptance:
  - Edited variants merge; actor, number, location, and event-type conflicts do
    not.
  - A later batch adopts the live canonical story through member aliases.
- Verification:
  - `npm test -- tests/upstream/story-identity.test.ts tests/core/cluster tests/server/store`
  - `npm run typecheck`

### T003 Add the curated free-feed ingestion path

- Status: pending
- Size: M
- Depends on: T002
- Expected files: `src/config/news-feeds.*`,
  `src/upstream/worldmonitor/rss-*`, `src/providers/rss/**`,
  `src/server/services/ingest-rss.ts`, `src/server/scheduler/**`,
  `src/server/store/**`, `tests/providers/rss/**`, `tests/server/**`,
  `tests/fixtures/rss/**`.
- Scope:
  - Add a reviewable 30–60 feed manifest covering all ten LENS categories.
  - Reuse the upstream dependency-free RSS/Atom parsing behavior.
  - Implement conditional fetch, safe body validation, time and byte bounds,
    bounded concurrency, independent health, and last-valid preservation.
  - Add the SQLite `feed_state` migration.
- Non-scope: Article-page scraping, paid sources, Redis, and AI.
- Acceptance:
  - Deterministic fixtures cover RSS, Atom, media, invalid HTML, malformed
    dates, future dates, duplicates, and partial feed failure.
  - One failed feed does not stop other feeds, USGS, or EONET.
- Verification:
  - `npm test -- tests/providers/rss tests/server/rss-ingest.test.ts`
  - `npm run typecheck`
  - `npm run lint`

### T004 Add classification and honest geography

- Status: pending
- Size: M
- Depends on: T003
- Expected files: `src/upstream/worldmonitor/classification/**`,
  `src/upstream/worldmonitor/geography/**`, `src/providers/rss/**`,
  `src/core/model/**`, `tests/upstream/**`, `tests/providers/rss/**`.
- Scope:
  - Vendor the minimal source-tier, keyword-classifier, hub, country-name, and
    country-bounds data with provenance.
  - Map upstream categories into the ten LENS categories.
  - Resolve provider coordinates, named hubs, country approximations, and
    unmapped stories in that order.
  - Persist location precision and match evidence.
- Non-scope: External geocoders or inferred exact coordinates.
- Acceptance:
  - Every map marker reports a precision and reference source.
  - Unmapped stories remain listable but have no fabricated marker.
- Verification:
  - `npm test -- tests/upstream/classifier.test.ts tests/upstream/geography.test.ts tests/providers/rss`
  - `npm run typecheck`

### T005 Add images, corroboration, and news importance

- Status: pending
- Size: M
- Depends on: T004
- Expected files: `src/providers/rss/**`,
  `src/upstream/worldmonitor/scoring/**`, `src/server/services/**`,
  `src/server/store/**`, `src/core/score/**`, `tests/providers/rss/**`,
  `tests/core/score/**`, `tests/integration/**`.
- Scope:
  - Prefer RSS media and add a bounded, safe Open Graph fallback for selected
    stories only.
  - Calculate distinct-source corroboration from clustered evidence.
  - Implement `wm-lens-news-v1` with inspectable components and clamp its public
    final score to 100.
  - Choose the representative article by importance, publication time, and
    title.
- Non-scope: AI summaries and scraping every article.
- Acceptance:
  - Images appear when attributable media exists.
  - Score fixtures reproduce the published World Monitor formula.
  - Corroboration counts independent sources once and avoids LENS double
    counting of freshness/confidence.
- Verification:
  - `npm test -- tests/providers/rss tests/core/score tests/integration/news-story-pipeline.test.ts`
  - `npm run typecheck`
  - `npm run lint`

### T006 Integrate the self-hosted stories into the LENS product

- Status: pending
- Size: M
- Depends on: T005
- Expected files: `src/server/index.ts`, `src/server/api/**`,
  `src/web/data/**`, `src/web/screens/**`, `src/web/components/**`,
  `src/web/map/**`, `tests/web/**`, `tests/e2e/**`.
- Scope:
  - Make self-hosted RSS the default broad-news schedule.
  - Keep the hosted World Monitor adapter optional and disabled by default.
  - Render approximately 50 current candidates in the global watchlist.
  - Open the Sidecar immediately on marker selection with inline image,
    corroborating sources, score explanation, precision, and history.
  - Keep the primary bottom briefing independent and uncluttered.
- Non-scope: Recreating World Monitor panels or showing every source as a
  separate map marker.
- Acceptance:
  - The scan → select → understand loop works with self-hosted data and no
    World Monitor API key.
  - Existing category filters, basemap modes, timeline, accessibility, and
    responsive layouts continue to work.
- Verification:
  - `npm test -- tests/web tests/server/api`
  - `npm run build`
  - `npm run test:e2e -- --grep "self-hosted world briefing"`

### T007 Package the single-service low-cost deployment

- Status: pending
- Size: M
- Depends on: T006
- Expected files: `src/server/app.ts`, `src/server/index.ts`, `package.json`,
  deployment configuration, `.env.example`, `docs/deployment.md`,
  `tests/server/**`, `tests/e2e/**`.
- Scope:
  - Serve the built Vite client from Fastify.
  - Run API, SSE, scheduler, and SQLite from one Railway service.
  - Document persistent volume, backup/export, health checks, secrets, cost
    envelope, and scale-up thresholds.
  - Keep production deployment itself credential-gated.
- Non-scope: Redis, multiple replicas, production login, or purchasing a
  domain.
- Acceptance:
  - A production-mode local smoke serves both the UI and API from one port.
  - Restarting against the same SQLite path preserves stories and aliases.
- Verification:
  - `npm run build`
  - `npm test -- tests/server/single-service.test.ts`
  - `npm run test:e2e -- --grep "production service"`

### T008 Evaluate and document the open-source portfolio release

- Status: pending
- Size: M
- Depends on: T007
- Expected files: `README.md`, `docs/**`, `tests/fixtures/evaluation/**`,
  `scripts/evaluate.ts`, `scripts/live-feed-smoke.ts`, repository screenshots.
- Scope:
  - Label a real source-referenced sample for duplicate identity, category,
    geography, and briefing inclusion.
  - Report duplicate compression, precision, category coverage, mapped precision
    mix, source diversity, and feed health.
  - Update the case study with the problem, upstream choice, simplification,
    architecture, measured outcomes, cost, AGPL compliance, and limitations.
  - Run the full release verifier and bounded live smoke.
- Non-scope: Hiding weak metrics or making CI depend on live feeds.
- Acceptance:
  - A clean clone can run and understand the system.
  - Portfolio claims are backed by committed fixtures and reproducible commands.
- Verification:
  - `npm run validate:evaluation`
  - `npm run evaluate -- --dataset tests/fixtures/evaluation/production.json`
  - `npm run verify:release`
  - `npm run verify:docs`
  - `npm run live-feed-smoke`

## Completion Gate

The feature is complete only when all eight machine-ledger tasks are done, the
Bata review stage passes the deterministic verifiers, live smoke limitations are
recorded, and the workflow state is `done`.
