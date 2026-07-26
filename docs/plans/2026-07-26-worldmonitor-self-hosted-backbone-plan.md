# Plan: World Monitor self-hosted backbone

Feature ID: 2026-07-26-worldmonitor-self-hosted-backbone
Date: 2026-07-26
Status: approved

## Summary

Use the public World Monitor news-intelligence code as an attributed AGPL
upstream, but do not fork its dashboard or deploy its full infrastructure.
Bring only the feed registry subset, RSS parser, source tiers, keyword
classifier, story identity, canonical adoption, and importance formula into the
existing LENS server. Reuse LENS's SQLite store, scheduler, normalization,
snapshots, REST/SSE API, ten-category selection, map, Sidecar detail, timeline,
tests, and evaluation.

The first production shape is one Node process on Railway with one persistent
SQLite volume. Redis, paid AI, paid data, and the hosted World Monitor API are
deferred.

## Proposed Direction

Build a narrow self-hosted news backbone inside the existing LENS server. Reuse
World Monitor's proven public algorithms and reference data at a pinned commit,
adapt persistence to the SQLite store already in LENS, and keep LENS's editorial
selection and visual interface as the product layer. Ship in six verified
phases: license boundary, story identity, feed ingestion, enrichment/scoring,
product integration, and low-cost deployment.

## Architectural Decision

### Adopt

- World Monitor source license and attribution requirements.
- Pinned upstream commit:
  `d9ef780be65caf6669d352dade30fd2d777048eb`.
- Dependency-free RSS parsing and feed body validation.
- Curated source registry and source-tier policy.
- Keyword-first threat classification.
- Dual-view 512-dimensional lexical story vectors and threshold `0.615`.
- Earliest-member canonical identity, member aliases, distinct-source
  corroboration, and deterministic representative selection.
- Published importance components and bounded bonuses.
- Geographic hub and country reference data needed for deterministic placement.

### Keep from LENS

- Ten public categories.
- Existing USGS, EONET, and optional movement providers.
- Observation/Evidence/EventCluster/EventScore model.
- Provider health and last-valid-data behavior.
- SQLite, snapshots, comparison, REST, SSE, and 30-second polling fallback.
- Watchlist exploration separated from the primary bottom briefing.
- MapLibre/deck.gl map, category color system, Mantine playback, Sidecar panel,
  image presentation, and accessibility behavior.
- LENS diversity selection: at most two ordinary events per category/country,
  with critical override.

### Deliberately defer

- World Monitor's UI, Redis topology, Railway seed bundle fleet, 500+ feeds,
  AI summary chain, premium intelligence layers, accounts, MCP, and paid API.
- Semantic embeddings and cross-language paraphrase clustering.
- Horizontal scaling. SQLite remains the first correct storage layer.

## Runtime Flow

```text
30–60 free public RSS feeds       USGS / EONET / structured providers
             │                                  │
             ▼                                  ▼
 bounded fetch + RSS parse              existing normalization
             │                                  │
             ▼                                  │
 source tier + keyword class + image            │
             │                                  │
             ▼                                  │
 deterministic geography                        │
             │                                  │
             ▼                                  │
 World Monitor story identity                   │
 same-cycle cluster + cross-cycle alias         │
             │                                  │
             ▼                                  │
 distinct-source corroboration                  │
 + World Monitor importance                     │
             └──────────────┬───────────────────┘
                            ▼
              LENS Observation / Evidence
                            ▼
              SQLite event and snapshot store
                            ▼
             LENS diversity briefing selection
                            ▼
               REST + SSE → map + detail UI
```

## Storage Changes

Reuse current tables wherever the information already fits.

Add only:

1. `feed_state`
   - feed ID, ETag, Last-Modified, last attempt/success, last error, item count.
2. `story_alias`
   - exact member-title hash, canonical story hash, first/last seen, expiry.

Do not add a separate source-count table. Distinct source families are already
recoverable from Evidence rows attached to an event. Do not add a separate
image table; images remain Evidence metadata.

Alias rows use the same 96-hour news window as the upstream algorithm. Expired
rows are deleted during the existing scheduled maintenance path.

## News Scoring Contract

For news-derived stories, use an explicit `wm-lens-news-v1` score:

```text
severity       55%
source tier    20%
corroboration  15%
recency        10%
bounded published bonuses
```

- Severity values: 100, 75, 50, 25, 0.
- Source tiers: 100, 75, 50, 25.
- Corroboration: distinct source count, capped at five.
- Recency: linear decay to zero over 24 hours.
- Bonuses are preserved as separate reason rows and final public ranking is
  clamped to 100.

This score is not passed through the existing LENS confidence and freshness
multipliers again, because that would count corroboration and recency twice.
Structured sensor events continue using `lens-v1`. Both algorithms produce a
0–100 `EventScore` and identify their version.

The existing LENS selector remains the final editorial step: it applies the
55-point inclusion floor, diversity limits, similarity penalty, and critical
override. This is the product distinction between broad monitoring and a
readable public briefing.

## Geography Contract

Geography is evidence, not decoration.

1. Use provider coordinates when a structured source supplies them.
2. Otherwise match the title and description against the pinned World Monitor
   geographic hub index.
3. Otherwise match a country name/alias and use the center of its public
   bounding box as an approximate overview point.
4. Otherwise keep the story `unmapped`; show it in lists but do not fabricate a
   marker.

Persist `locationPrecision`, matched terms, reference version, and display name
in the observation extension. The UI labels country-center placement as
approximate.

## Image Contract

1. Prefer `media:content`, `media:thumbnail`, and valid image enclosures from
   RSS/Atom.
2. For a selected story without media, fetch at most ten article pages per
   refresh and read `og:image`/`twitter:image`.
3. Allow only HTTP(S) URLs from configured public feed/article hosts, reject
   local/private addresses and unsafe redirects, cap response bytes, and use a
   short timeout.
4. Cache successful metadata for 24 hours in Evidence and do not repeatedly
   scrape failures.
5. Retain the existing location imagery or no-image presentation when no
   attributable article image exists.

## Feed Selection

Create a data manifest rather than copying every upstream feed.

- Target: 30–60 feeds.
- Coverage: all ten LENS categories.
- Priority: official and Tier 1/2 sources first.
- Minimum deterministic fixture coverage: two sources per category.
- Live launch gate: at least 70% of enabled feeds healthy, at least 50 current
  candidates, at least five live categories, and no single source family
  producing more than 40% of selected stories.

Feed health is measured, not assumed. A feed can be disabled or replaced by
editing one manifest entry.

## Phases

### Phase 1 — License and upstream boundary

- Replace the repository MIT license with AGPL-3.0-only for the covered
  distribution.
- Add upstream provenance, pinned commit, copied-file map, modification notes,
  and trademark separation.
- Add a visible source link in the web footer/about surface.
- Add a deterministic license/provenance check.

Exit: LENS can legally receive covered upstream files before any are copied.

### Phase 2 — Story identity parity

- Vendor the minimum dependency-free World Monitor story-identity and dedup
  modules with notices intact.
- Replace only the news-title Jaccard path; preserve structured event hard
  gates.
- Port the upstream labeled-pair tests and canonical-adoption tests.
- Persist 96-hour aliases in SQLite.

Exit: same-cycle and cross-cycle news variants keep one deterministic identity.

### Phase 3 — Free feed ingestion

- Add the curated ten-category feed manifest.
- Reuse the World Monitor server-side RSS parser and body sniffing.
- Add conditional GET, bounded concurrency, timeout, size cap, retry cadence,
  and provider health.
- Store articles as LENS observations/evidence without requiring a World
  Monitor API key.

Exit: a bounded live smoke run collects current articles and survives partial
feed failure.

### Phase 4 — Classification, geography, images, and scoring

- Vendor source tiers and the minimal keyword classifier data.
- Add deterministic hub/country placement with precision labels.
- Extract RSS images and selected-story Open Graph images safely.
- Calculate `wm-lens-news-v1` from final clustered distinct sources.
- Expose the score components, source list, and location precision through the
  existing API.

Exit: every story is explainable and every marker has attributable precision.

### Phase 5 — Product integration

- Remove the paid World Monitor API from the default schedule and environment
  setup; keep it only as an optional compatibility adapter if it still adds
  value.
- Render approximately 50 current candidates on the global watchlist.
- Keep the bottom band limited to the primary selected issue.
- Ensure marker click opens the Sidecar immediately with article image,
  corroborating sources, score explanation, and update history.
- Preserve category filters, basemap switcher, temporal comparison, and
  responsive behavior.

Exit: the browser demonstrates the intended scan → select → understand loop
using self-hosted data.

### Phase 6 — Low-cost deployment and portfolio evidence

- Build the Vite client and serve it from the existing Fastify process.
- Run the scheduler and API in the same Railway service.
- Mount a persistent SQLite volume and document backup/export.
- Add health/readiness endpoints and a source-code link.
- Run deterministic release checks, a bounded live-feed smoke check, and a
  labeled evaluation replay.
- Update the case study with the discovered problem, upstream choice,
  simplification, algorithm adaptation, measured results, costs, and limits.

Exit: a clean clone can reproduce the project and the public deployment can run
without a World Monitor subscription.

## Cost Envelope

Initial monthly target:

| Item | Initial cost |
| --- | ---: |
| Railway Hobby service and SQLite volume | approximately USD 5 plus measured overage |
| Public RSS, USGS, EONET | USD 0 |
| MapLibre/OpenStreetMap development path | USD 0 within provider policy |
| Deterministic classifier | USD 0 |
| World Monitor hosted API | USD 0 |
| Redis | USD 0, deferred |
| Optional domain | annual registrar cost |

Add Redis only when more than one application instance must share state or
measured SQLite contention requires it. Add paid AI only after evaluation proves
that deterministic classification is the limiting error source.

## Risks

- **AGPL/trademark confusion:** complete license and provenance work before
  copying covered files; retain LENS branding and source offer.
- **Feed instability:** independent health, short failure cache, last-valid
  data, conditional fetches, and a replaceable manifest.
- **False duplicate merges:** upstream threshold parity tests plus LENS time,
  event-type, location, entity, and number-conflict gates where applicable.
- **False map precision:** explicit precision enum and no marker for unmapped
  stories.
- **SSRF or oversized article pages:** public-host validation, redirect checks,
  timeout, content-type and byte caps, and a strict per-cycle budget.
- **Score double counting:** news uses `wm-lens-news-v1`; structured events use
  `lens-v1`; do not multiply the news score by LENS confidence/freshness again.
- **One-process limits:** acceptable for the initial portfolio load; move cache
  and scheduling out only after measured need.
- **Network-dependent tests:** use committed fixtures for correctness and keep
  live smoke checks informational/bounded.

## Rollback Plan

- Keep each phase commit-sized and independently verifiable.
- Preserve the current World Monitor API adapter until the self-hosted feed path
  passes full-stack verification; disabling its schedule requires one
  configuration change.
- SQLite migrations are additive in early phases.
- Feed manifest entries can be disabled without code changes.
- If live feed quality is below the launch gate, retain USGS/EONET and the
  fixture fallback while reporting the failed gate; do not fabricate coverage.

## Verification Plan

1. License/provenance checker.
2. Upstream story-identity parity suite.
3. Feed parser, safe fetch, classifier, geography, image, and score unit tests.
4. SQLite migration and cross-cycle identity integration tests.
5. Full-stack REST/SSE/50-event Sidecar Playwright test.
6. Existing release verifier and evaluation replay.
7. Bounded live smoke report with no hard dependency in CI.

Implementation does not begin until this plan and its task ledger are verified.
