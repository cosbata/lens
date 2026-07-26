# Spec: worldmonitor-self-hosted-backbone

Feature ID: 2026-07-26-worldmonitor-self-hosted-backbone
Date: 2026-07-26
Status: draft
Request: Adopt the public World Monitor AGPL source as LENS's self-hosted collection, deduplication, corroboration, and importance backbone; preserve LENS's simpler ten-category map-first editorial UI; avoid the paid World Monitor API; run first on free public data and low-cost infrastructure; publish all covered modifications under AGPL.

## Goal

Replace the paid World Monitor REST dependency with a self-hosted, AGPL-compliant
news intelligence backbone built from the public World Monitor source. LENS
must collect free public feeds, group duplicate coverage into stable stories,
calculate explainable importance, place attributable events on the map, and
continue presenting them through LENS's simpler ten-category editorial UI.

## User / Research Problem

The current LENS product proves the map, event detail, scoring, snapshots, and
live-update experience, but its broad news path depends on a paid World Monitor
API key. Paying for the hosted API would hide the most portfolio-relevant work:
collection, source policy, deduplication, corroboration, ranking, and failure
handling. Rebuilding all of World Monitor would also recreate the complexity
LENS is meant to remove.

## Scenarios

1. A maintainer starts LENS without a World Monitor API key and receives current
   stories from selected public RSS feeds plus the existing USGS and EONET
   providers.
2. Different outlets publish edited versions of the same headline; LENS groups
   them into one stable story while retaining every article and source.
3. A visitor selects a map event and sees the representative article, inline
   image when available, corroborating sources, score explanation, location
   precision, and update history.
4. A feed fails or returns invalid content; its last valid observations remain
   available and provider health shows a degraded state without stopping other
   feeds.
5. A reviewer can trace vendored World Monitor files to a pinned upstream
   commit, inspect LENS modifications, reproduce clustering and ranking tests,
   and access the AGPL source from the deployed site.
6. A maintainer can deploy the initial system as one Railway service with a
   persistent SQLite volume and no Redis or paid data subscription.

## Requirements

- Change the covered LENS distribution from MIT to AGPL-3.0-only before copying
  World Monitor platform code; preserve upstream copyright notices and add an
  upstream provenance manifest pinned to commit
  `d9ef780be65caf6669d352dade30fd2d777048eb`.
- Vendor only the minimum World Monitor news intelligence modules required for
  story identity, source tiers, feed selection, keyword classification, and
  importance scoring. Do not import the World Monitor dashboard.
- Start with 30–60 free public feeds selected across all ten LENS categories,
  biased toward Tier 1/2 and official sources. The feed manifest must be
  reviewable data, not hidden in code.
- Poll feeds with bounded concurrency, timeout, response-size limits,
  conditional requests, non-overlapping schedules, and independent health
  records.
- Parse title, canonical link, source, publication time, description, and RSS
  media. Fetch `og:image` only for selected stories that lack RSS media, with a
  strict request budget and safe outbound URL validation.
- Use World Monitor's edit-tolerant dual-view story identity and canonical
  adoption behavior for news. Preserve LENS's current provider-native and
  geospatial rules for structured sensor events.
- Persist feed state and cross-cycle story aliases in the existing SQLite
  database. Do not add Redis in the first deployment.
- Calculate news importance from the published World Monitor components:
  severity 55%, source tier 20%, distinct-source corroboration 15%, and recency
  10%, with documented bounded bonuses. Keep the score explanation and input
  values inspectable.
- Use World Monitor's public geographic hub and country reference data to place
  news deterministically. Store and display location precision as
  `provider_exact`, `named_hub`, `country_approximate`, or `unmapped`; never
  present an approximate point as an exact incident location.
- Normalize results into the existing LENS Observation, Evidence, EventCluster,
  EventScore, snapshot, REST, SSE, and UI paths.
- Keep the existing ten-category taxonomy, watchlist/primary-briefing
  separation, category colors, Sidecar detail layout, map playback, and source
  attribution.
- Run without paid AI or data APIs. Optional local Ollama enrichment may be
  considered only after the deterministic pipeline is evaluated.
- Serve the built web client, API, scheduler, and SQLite store from one
  low-cost process for the first public deployment.

## Non-goals

- Running all 500+ World Monitor feeds or reproducing its 56 map layers.
- Copying World Monitor's dashboard UI, branding, name, logo, hosted data, API
  keys, Redis contents, or production history.
- Real-time licensed Reuters/Bloomberg content, global AIS, global flight
  tracking, or other restricted commercial feeds.
- Semantic cross-language deduplication in the first release.
- Generating article summaries or event coordinates with a paid LLM.
- Redis, Kafka, a queue cluster, horizontal scaling, accounts, alerts, or
  administrative authoring tools.
- Claiming that RSS polling is second-by-second real time.

## Success Criteria

- With no `WORLDMONITOR_API_KEY`, a clean local run produces at least 50 current
  map/watchlist candidates from at least five categories when public upstreams
  are available; deterministic fixtures cover all ten categories.
- The upstream story-identity parity suite passes, including edited headlines,
  actor swaps, number changes, source suffixes, and non-ASCII titles.
- Same-cycle and cross-cycle duplicates produce one canonical story, distinct
  source counts, stable aliases, and a deterministic representative article.
- Every news score exposes severity, source tier, corroboration, recency,
  bonuses, final score, algorithm version, and reasons.
- Every mapped news story exposes its location source and precision; unmapped
  stories remain available in the global list without a fabricated marker.
- Selected stories render a real RSS or article metadata image when one is
  available, otherwise the existing honest fallback remains.
- A feed outage does not remove the last valid briefing or stop USGS/EONET.
- The existing release verifier plus new ingestion, story-identity, licensing,
  and full-stack tests pass.
- The public deployment exposes a source-code link and can run at the initial
  target of approximately USD 5 per month, excluding the optional domain.

## Verification

- Unit tests for feed parsing, safe URL handling, category classification,
  source tiers, geography precision, story identity, canonical adoption,
  importance scoring, and SQLite migrations.
- Integration replay proving same-cycle and cross-cycle clustering, distinct
  source corroboration, stable representative selection, and degraded-feed
  behavior.
- Full-stack Playwright check proving 50-event map rendering, marker-to-panel
  selection, source list, inline image, score explanation, and SSE refresh.
- License/provenance check confirming AGPL text, upstream notices, pinned commit,
  and deployed source link.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run test:e2e`, evaluation validation, and documentation checks.
- A bounded live smoke command that reports feed success, item count, category
  coverage, mapped/unmapped counts, and duplicate compression without making
  the deterministic test suite depend on the network.

## Open Questions

- The exact 30–60 feed manifest will be selected during implementation from the
  pinned World Monitor registry, then validated for current availability and
  redistribution terms. A failing feed is replaceable without changing the
  architecture.
- A public hostname and Railway account are deployment inputs, not blockers for
  local implementation. Deployment itself requires the account owner's login.
- Redis is deferred until measured load requires more than one application
  instance or SQLite write contention becomes observable.
