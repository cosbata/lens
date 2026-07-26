# World Monitor self-hosted backbone implementation review

Feature ID: 2026-07-26-worldmonitor-self-hosted-backbone  
Date: 2026-07-26  
Status: complete

## Summary

All eight tasks are implemented. LENS now collects curated public feeds without
a paid World Monitor key, preserves attributed upstream story identity and
importance behavior, explains map precision and score reasons in the product,
and runs as one deployable Fastify/Vite/SQLite service.

## Changed Files

- `LICENSE`, `README.md`, `package.json`, `railway.toml`, `.env.example`
- `src/config/rss-feeds.ts`
- `src/upstream/worldmonitor/**`
- `src/providers/rss/**`
- `src/core/cluster/deterministic.ts`
- `src/core/score/news-importance.ts`
- `src/server/**`
- `src/web/**`
- `scripts/check-docs.ts`, `scripts/check-licenses.ts`,
  `scripts/live-feed-smoke.ts`
- `tests/**`
- `docs/**`

## Validation Evidence

```text
npm run validate:evaluation
npm run evaluate -- --dataset tests/fixtures/evaluation/production.json
npm run verify:release
npm run verify:docs
npm run live-feed-smoke
```

- Vitest: 47 files and 134 tests passed.
- Typecheck, unused-symbol lint, and production build passed.
- Playwright: 14 Chromium tests passed, including accessibility, SQLite,
  REST/SSE, 50-event watchlist, Sidecar, playback, and one-process production.
- Both committed evaluation datasets validated and reproduced their reports.
- Documentation checks and deterministic replay passed.
- The final live smoke observed 8/10 healthy feeds, 160 candidates, 148
  canonical stories, nine categories, seven source families, and two selected
  stories.

## Scope Drift Check

- Reused the existing LENS model, SQLite store, selector, REST/SSE API, map,
  Sidecar, Mantine controls, and provider scheduler.
- Added no Redis, AI model, account system, horizontal scaling, or hosted
  World Monitor subscription.
- Added no runtime dependency for static serving or deployment.

## Risks / Failures

- Deterministic text geography left 108 of 148 stories unmapped in the final
  live smoke. The UI reports this instead of fabricating coordinates.
- Live RSS availability varied from 9/10 to 8/10 healthy feeds across two
  consecutive runs; correctness remains fixture-tested and live smoke remains
  observational.
- SQLite deliberately limits the first deployment to one replica.
- Vite reports a roughly 1.9 MB pre-gzip JavaScript chunk; code splitting is
  deferred until load measurements make it necessary.

## Repair Task, if needed

None for this feature. A future labeled ten-category production sample should
precede any `wm-lens-news-v2` classifier or geography change.

## Next Step

Deploy the documented one-service Railway configuration when repository and
Railway credentials are available.

## T001 — AGPL and upstream provenance

Status: implemented and locally verified.

Changed files:

- `LICENSE`
- `package.json`
- `README.md`
- `docs/upstream-worldmonitor.md`
- `scripts/check-licenses.ts`
- `scripts/check-docs.ts`
- `src/web/components/AppShell.tsx`
- `src/web/styles/global.css`
- `tests/repository/license-provenance.test.ts`

Evidence:

- `npm run docs:check` — passed; 10 required documentation files.
- `npm run typecheck` — passed.
- `npm test -- tests/repository/license-provenance.test.ts` — passed; 2 tests.

Review notes:

- The repository license is now AGPL-3.0-only before upstream implementation
  code is introduced.
- The provenance document pins World Monitor commit
  `d9ef780be65caf6669d352dade30fd2d777048eb`.
- The deterministic checker fails when the pin is absent.
- The web footer exposes both the LENS corresponding-source repository and the
  separate World Monitor upstream repository.

## T002 — World Monitor story identity

Status: implemented and locally verified.

Changed files:

- `src/upstream/worldmonitor/story-identity.js`
- `src/upstream/worldmonitor/story-identity.d.ts`
- `src/upstream/worldmonitor/dedup.mjs`
- `src/upstream/worldmonitor/dedup.d.mts`
- `src/upstream/worldmonitor/README.md`
- `src/core/cluster/deterministic.ts`
- `src/server/store/migrations.ts`
- `src/server/store/lens-store.ts`
- `tests/upstream/story-identity.test.ts`
- `tests/server/store/lens-store.test.ts`

Evidence:

- `npm test -- tests/upstream/story-identity.test.ts tests/core/cluster tests/server/store` — passed; 14 tests.
- `npm run typecheck` — passed.

Review notes:

- Structured-event hard gates for type, location, entity, native ID, URL, and
  time remain in place.
- Only the former title-Jaccard fallback now uses the upstream dual-view
  similarity threshold.
- SQLite migration 3 stores expiring member-to-canonical aliases; the tests
  cover live lookup and expiry.

## T003 — Curated free RSS ingestion

Status: implemented and locally verified.

Changed files:

- `src/config/rss-feeds.ts`
- `src/upstream/worldmonitor/rss-parser.ts`
- `src/providers/rss/client.ts`
- `src/server/services/ingest-rss.ts`
- `src/server/store/migrations.ts`
- `src/server/store/lens-store.ts`
- `tests/fixtures/rss/rss.xml`
- `tests/fixtures/rss/atom.xml`
- `tests/providers/rss/rss.test.ts`
- `tests/server/rss-ingest.test.ts`

Evidence:

- `npm test -- tests/providers/rss tests/server/rss-ingest.test.ts` — passed; 4 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.

Review notes:

- The manifest contains 40 unique HTTPS feeds, four per LENS category.
- Fetches are limited to six concurrent requests, ten seconds, and 2 MiB.
- ETag and Last-Modified headers are reused; a 304 is healthy but creates no
  duplicate item.
- Feed failures update their own state and do not discard successful peers.

## T004 — Classification and honest geography

Status: implemented and locally verified.

Changed files:

- `src/upstream/worldmonitor/classifier.ts`
- `src/upstream/worldmonitor/geography.ts`
- `src/upstream/worldmonitor/country-names.json`
- `src/upstream/worldmonitor/country-bboxes.json`
- `src/core/model/index.ts`
- `src/server/services/ingest-rss.ts`
- `tests/upstream/classifier.test.ts`
- `tests/upstream/geography.test.ts`

Evidence:

- `npm test -- tests/upstream/classifier.test.ts tests/upstream/geography.test.ts tests/providers/rss` — passed; 17 tests.
- `npm run typecheck` — passed.
- `npm test -- tests/server/rss-ingest.test.ts tests/core/model` — passed; 6 tests.

Review notes:

- Keyword evidence overrides the feed hint; the feed hint remains the explicit
  fallback when no event keyword matches.
- Named hubs require a specific city, organization, or strategic-place term.
- Country-only matches use the center of the pinned public bounding box and
  expose `country_approximate`.
- Unsupported geography remains `unmapped` with no point geometry.

## T005 — Images, corroboration, and news importance

Status: implemented and locally verified.

Changed files:

- `src/providers/rss/article-image.ts`
- `src/upstream/worldmonitor/rss-parser.ts`
- `src/upstream/worldmonitor/source-tiers.json`
- `src/upstream/worldmonitor/diplomacy-keywords.json`
- `src/core/score/news-importance.ts`
- `src/server/services/ingest-rss.ts`
- `tests/providers/rss/article-image.test.ts`
- `tests/core/score/news-importance.test.ts`
- `tests/integration/news-story-pipeline.test.ts`

Evidence:

- `npm test -- tests/providers/rss tests/core/score tests/integration/news-story-pipeline.test.ts` — passed; 21 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.

Review notes:

- RSS media is preferred; only the ten strongest image-less representatives
  receive a bounded Open Graph lookup.
- Article image retrieval rejects private/local URL literals, follows only to a
  public HTTP(S) URL, and caps time and response bytes.
- Corroboration counts distinct publishers, not article count.
- Representative selection is deterministic: importance, newest publication,
  then lexical title.
- `wm-lens-news-v1` preserves the published World Monitor weights and bonuses,
  exposes reason codes, and clamps the public score to 100.

## T006 — Self-hosted stories in the LENS product

Status: implemented and locally verified.

Changed files:

- `src/server/index.ts`
- `src/server/api/routes.ts`
- `src/web/data/live-briefing.ts`
- `src/web/map/briefing-fixture.ts`
- `src/web/components/MonitorPanel.tsx`
- `src/web/map/map.css`
- `.env.example`
- `tests/web/live-briefing.test.ts`
- `tests/web/today-map.test.tsx`
- `tests/e2e/accessibility.spec.ts`

Evidence:

- `npm test -- tests/web tests/server/api` — passed; 37 tests.
- `npm run build` — passed.
- `npm run test:e2e -- --grep "self-hosted world briefing"` — passed; 1 browser test.

Review notes:

- Curated RSS is now the default broad-news schedule; the hosted World Monitor
  poller starts only when an API key exists.
- The map keeps up to 50 current mapped candidates while the bottom band remains
  limited to snapshot-selected primary issues.
- A first marker or list selection opens the right panel immediately.
- The panel now shows the article image, distinct publishers, map precision,
  display location, score reasons, and score version.

## T007 — Single-service deployment

Status: implemented and locally verified.

Changed files:

- `src/server/app.ts`
- `src/server/index.ts`
- `package.json`
- `railway.toml`
- `docs/deployment.md`
- `tests/server/single-service.test.ts`
- `tests/e2e/accessibility.spec.ts`

Evidence:

- `npm run build` — passed.
- `npm test -- tests/server/single-service.test.ts` — passed; 1 test.
- `npm run test:e2e -- --grep "production service"` — passed; 1 browser test.

Review notes:

- One Fastify process serves the production web build, API, SSE, and SQLite
  health endpoint.
- Railway can mount `/data`; the server selects `/data/lens.sqlite`
  automatically unless `LENS_DB_PATH` is explicitly configured.
- Static assets are cached immutably while the application shell is not.
- The runbook documents one-replica SQLite operation, volume backups, and the
  small-project cost ceiling without adding deployment-only dependencies.

## T008 — Portfolio release evidence

Status: implemented and locally verified.

Changed files:

- `README.md`
- `docs/assets/lens-world-briefing.png`
- `docs/case-study.md`
- `docs/evaluation.md`
- `docs/deployment.md`
- `scripts/live-feed-smoke.ts`
- `scripts/check-docs.ts`
- `tests/e2e/accessibility.spec.ts`
- `tests/helpers/full-stack.ts`

Evidence:

- `npm run validate:evaluation` — passed; both committed datasets valid.
- `npm run evaluate -- --dataset tests/fixtures/evaluation/production.json` —
  passed; raw precision 0.500 and incident-clustered precision 1.000.
- `npm run verify:release` — passed; 134 unit/integration tests, typecheck,
  lint, production build, 14 Chromium tests, and both evaluations.
- `npm run verify:docs` — passed; 11 required files and deterministic replay.
- `npm run live-feed-smoke` — passed; 8/10 live feeds healthy, 160 candidates,
  148 canonical stories, nine categories, seven source families, and two
  selected stories at `2026-07-26T09:43:11Z`.

Review notes:

- Browser tests no longer depend on a fixed API port or whatever data happens
  to be running on the developer's machine.
- The bounded live command reports feed health, duplicate compression,
  category coverage, map precision, source diversity, and selection without
  treating changing network output as an accuracy gate.
- The case study records the upstream choice, deliberate simplification,
  measured outcomes, cost, AGPL obligations, and the current geography limit.
- The repository includes a current product screenshot and reproducible
  commands for every metric claim.
