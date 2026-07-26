# Review: LENS Productionization

Feature ID: 2026-07-26-lens-productionization  
Date: 2026-07-26  
Status: complete

## Summary

T001 proves that the current production path is real rather than a UI fixture:
the browser loads a briefing from a temporary SQLite database through Fastify
and Vite, keeps the SSE stream open, then replaces the visible event after a
second immutable snapshot is published.

T002 adds an opt-in Kystverket/BarentsWatch adapter for official 24-hour AIS
history. It enriches an already selected event instead of treating ordinary
vessel motion as news, keeps OAuth credentials on the server, and preserves
NLOD attribution and coverage limits.

T003 turns attributable geometry observations into interactive Mantine
timeline markers. Selecting a marker pauses playback, moves the map to the
exact observed time, and opens the matching event detail. The marks stay as
thin editorial ticks while retaining a larger transparent pointer target.

T004 adds a separately labeled USGS source-observation sample. Evaluation now
uses seed-level importance, observation-specific age, optional pairwise labels,
and incident identities. The report exposes the raw-observation false positive
and the corrected incident-level result instead of presenting calibration
variants as production accuracy.

T005 completes the public handoff with an environment template, local-database
ignore rules, provider and real-time boundaries, updated architecture and case
study evidence, and a release command that verifies both evaluation datasets.

## Changed Files

- `playwright.config.ts`
- `tests/e2e/accessibility.spec.ts`
- `tests/helpers/full-stack.ts`
- `tests/web/comparison.test.tsx`
- `src/providers/barentswatch/client.ts`
- `src/providers/barentswatch/normalize.ts`
- `src/server/services/ingest-barentswatch.ts`
- `src/server/index.ts`
- `tests/providers/barentswatch/barentswatch.test.ts`
- `docs/providers.md`
- `src/web/map/temporal.ts`
- `src/web/components/PlaybackControls.tsx`
- `src/web/map/ComparisonLayer.tsx`
- `src/web/screens/Comparison.tsx`
- `src/web/styles/comparison.css`
- `tests/web/temporal-map.test.ts`
- `tests/fixtures/evaluation/production.json`
- `src/core/evaluation/metrics.ts`
- `scripts/validate-evaluation.ts`
- `tests/core/evaluation/metrics.test.ts`
- `docs/evaluation.md`
- `docs/evaluation-labeling.md`
- `.env.example`
- `.gitignore`
- `package.json`
- `README.md`
- `docs/architecture.md`
- `docs/case-study.md`
- `scripts/check-docs.ts`

## Validation Evidence

```text
npm run test:e2e -- --grep "full stack"
npm test
npm run typecheck
npm run test:e2e
npm test -- tests/providers/barentswatch tests/web/live-briefing.test.ts
npm run lint
npm test -- tests/web
npm run build
npm run test:e2e -- --grep timeline
npm test -- tests/core/evaluation
npm run validate:evaluation
npm run evaluate -- --dataset tests/fixtures/evaluation/production.json --format markdown
npm run verify:release
npm run verify:docs
```

- Full-stack Playwright: 1 test passed.
- Vitest: 35 files and 85 tests passed.
- TypeScript: passed.
- Complete Playwright suite: 9 tests passed.
- BarentsWatch and live-client targets: 5 tests passed.
- Unused-symbol lint: passed.
- Web targets: 11 files and 24 tests passed.
- Production build: passed.
- Timeline synchronization Playwright: 1 test passed.
- Evaluation targets: 3 tests passed.
- Calibration and source-observation dataset validation: passed.
- Source-observation report: 12 observations, 7 incident clusters, raw
  precision 0.500, clustered precision 1.000, recall 1.000.
- Release verification: 36 test files and 90 tests passed; typecheck, unused
  symbol lint, production build, 10 Playwright flows, both evaluation datasets,
  documentation checks, and deterministic replay passed.

## Scope Drift Check

- Reused `LensStore`, `buildServer`, `publishBriefingUpdate`, the existing Vite
  proxy, and the production browser client.
- Added no product abstraction, runtime dependency, or test-only server route.
- Starts and closes the API inside one serial Playwright test, so the preceding
  offline-fallback check retains its original behavior.

## Risks / Failures

- The production entry point still requires providers to populate SQLite; T001
  verifies delivery, not movement-provider coverage.
- The first assertion initially targeted the substring `Live`; it was corrected
  to the accessible status text `Updating · Live`.
- Full verification exposed an earlier Mantine test harness regression; the
  comparison render test now includes the same `MantineProvider` as production.
- A live BarentsWatch request was not made because this workspace has no user
  OAuth client credentials. The HTTP contract, normalization, enrichment, and
  failure boundary are deterministic tests; operational use remains opt-in.
- The source-observation sample is intentionally one USGS window and one
  category. Its incident-level result is a pipeline sanity check, not a
  production-accuracy claim across all ten categories.
- The production bundle is about 1.9 MB before gzip and Vite reports a chunk
  size warning. Code splitting is deferred until measured load performance
  makes it a release constraint.
- Browser automation could not capture a new repository screenshot because
  the local URL was blocked by the app browser policy. Generated design
  references were not mislabeled as implementation screenshots.

## Result

The repository now presents the complete portfolio claim: LENS reduces
world-monitor information overload by selecting attributable incidents,
explaining the selection, and turning timestamped evidence into a readable
map narrative without pretending that narrow evaluation fixtures establish
production accuracy.

## Next Step

No work remains in this feature. A future scoring version should begin only
after a stratified adjudication sample covers all ten categories.
