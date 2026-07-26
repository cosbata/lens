# Spec: LENS Live World Briefing

Feature ID: 2026-07-25-lens-live-world-briefing  
Date: 2026-07-25  
Status: approved for planning  
Request: Build LENS as an open-source, consumer-friendly live world event map with a transparent event and category selection engine, WorldMonitor as one provider, direct official data providers, and StoryMaps-inspired editorial UI.

## Goal

Build a web-first open-source product that turns noisy, real-time world signals
into five to eight understandable map stories for a general audience.

LENS must make two things obvious:

1. What changed in the world?
2. Why did LENS decide that this event deserves attention?

The portfolio narrative is:

> Existing world-monitoring products expose large amounts of live data but ask
> non-specialists to decide what matters. LENS adds a transparent selection
> engine and editorial map-story interface that reduce that cognitive burden.

## User / Research Problem

Products such as WorldMonitor are useful to analysts because they expose many
feeds, layers, and panels at once. For a general user this creates four
problems:

- too many simultaneous signals;
- article-level duplication;
- no clear starting point;
- weak explanation of why one event matters more than another.

News popularity alone cannot solve this. Article counts are affected by
syndication, language, publisher concentration, and media incentives. Sensor
data alone also cannot solve it because measurements do not explain context or
downstream effects.

LENS therefore needs to combine:

- structured observations and official alerts;
- structured event databases;
- multi-source news context;
- category-specific impact models;
- deterministic, inspectable selection rules.

## Product Principles

1. **Event first, article second.** Multiple reports about the same occurrence
   become one event cluster.
2. **Impact is not popularity.** Article volume is a capped corroboration and
   momentum signal, never the main importance score.
3. **Importance and confidence are separate.** A severe but unverified report
   must not outrank a verified official event.
4. **Ten categories, limited focus.** All ten categories remain available, but
   only three to five lead the default briefing.
5. **Fewer is acceptable.** The interface does not fill an eight-item quota
   with weak events.
6. **Rules before AI.** Deterministic classification and scoring select the
   visible event pool. AI may summarize selected evidence but may not invent
   sources or silently alter rank.
7. **Every score is explainable.** The UI and API expose component scores,
   evidence, timestamps, and selection reasons.
8. **One provider is replaceable.** WorldMonitor is an input adapter, not the
   product architecture.

## Scenarios

### S1 — Understand today in under one minute

A user opens LENS and sees three to five active categories and five to eight
representative events. The first screen explains the current global picture
without requiring filters or dashboard configuration.

### S2 — Inspect why an event was selected

A user opens an event and sees:

- What happened;
- Why it matters;
- What changed;
- Who or what is affected;
- the evidence timeline;
- source links;
- impact, urgency, momentum, reach, anomaly, cascade, confidence, and freshness
  scores.

### S3 — Follow a developing event

When a material fact changes, the existing event cluster updates instead of
creating another card. Its phase moves through `breaking`, `developing`,
`ongoing`, `easing`, and `resolved`.

### S4 — Compare now with before

A user can compare the current map and event state with approximately 24 hours
earlier and understand which facts or affected areas changed.

### S5 — Browse a non-featured category

A user can open any of the ten categories even when it is not in Today's Focus.
The category page shows qualifying events without promoting weak items to the
home briefing.

### S6 — Verify provenance

A developer or journalist can inspect a public event JSON response and
reproduce the displayed score from versioned scoring rules and stored evidence.

### S7 — Continue during provider degradation

If WorldMonitor or one direct provider fails, the product keeps the last valid
snapshot, marks it stale, continues with available adapters, and never presents
stale data as live.

## Requirements

### R1 — Fixed taxonomy

LENS must support these ten primary categories:

1. Conflict
2. Politics & Diplomacy
3. Security
4. Disasters
5. Climate & Environment
6. Economy
7. Energy
8. Supply Chains
9. Health
10. Technology & Infrastructure

Every event has exactly one `primaryCategory` and zero or more
`relatedCategories`. Only the primary category contributes to category ranking
to prevent double counting.

### R2 — Initial providers

The first runnable version must integrate:

- WorldMonitor API as the broad multi-domain provider;
- USGS Earthquake feeds as an independent official provider.

The provider interface must support later direct adapters without changing the
canonical event model. NASA EONET or FIRMS is the first planned expansion after
the vertical slice.

Every provider fetch records:

- provider name and source identifier;
- fetch time;
- source event time;
- response freshness;
- degraded or stale state;
- attribution URL where available.

### R3 — Canonical event and evidence model

An event cluster must contain:

- stable event ID;
- normalized title and short description;
- primary and related categories;
- location geometry and affected countries;
- first seen, last seen, last material update, and phase;
- structured measurements;
- evidence records and source families;
- score components and scoring version;
- selection state and selection reasons.

Evidence must preserve the original provider/source URL. Syndicated copies from
one origin count as one source family for corroboration.

### R4 — Event gating

Before ranking, an item must have:

- a parseable occurrence or publication time;
- a category;
- a usable location or explicit global scope;
- a source identifier;
- enough content to distinguish an event from opinion, evergreen analysis, or
  a static information page.

Undated items, future timestamps beyond tolerance, expired alerts, lifestyle
content, opinion-only content, and malformed coordinates are excluded from the
home candidate pool and recorded with a reason.

### R5 — Deduplication and clustering

The MVP clustering path must use:

1. provider-native ID equality;
2. canonical URL and normalized-title equality;
3. matching event type, key entities, location, and time window;
4. token Jaccard similarity above a fixed, documented threshold.

The initial title threshold is `0.55`. A cluster must not merge when key
locations or principal entities conflict. Multilingual embedding clustering is
deferred until replay data demonstrates that the deterministic path misses an
unacceptable number of duplicates.

### R6 — Confidence score

Confidence is a value from 0 to 100:

```text
confidence =
  sourceAuthority      * 0.45
+ independentSupport  * 0.30
+ sourceIndependence  * 0.15
+ dataCompleteness    * 0.10
```

Initial source-authority bands:

- official sensor or public-agency API: 100;
- UN, government, or major wire: 85;
- verified specialist or local source: 70;
- established general source: 55;
- unknown or social-only report: 25.

Events below confidence 45 cannot appear in the default briefing. A single
official structured observation may have high confidence without multiple news
sources.

### R7 — Category-specific domain impact

Each category adapter converts native measurements to `domainImpact` from 0 to
100. The mapping and thresholds must be versioned and testable.

- Disasters: exposure, casualties, displacement, physical intensity,
  PAGER/GDACS-style alert level, and economic loss.
- Conflict: casualties, civilian targeting, attack type, geographic spread,
  escalation against baseline, and infrastructure impact.
- Politics & Diplomacy: enacted status change, affected population/countries,
  sanctions or treaty effect, and cross-domain consequences.
- Security: threat realization, affected people/territory, official warning,
  duration, and critical-asset exposure.
- Climate & Environment: anomaly percentile, affected area, duration,
  population/ecosystem exposure, and persistence.
- Economy: standardized shock against historical volatility, market breadth,
  duration, and real-economy transmission.
- Energy: supply loss, global/regional share, duration, price response, and
  availability of substitutes.
- Supply Chains: route criticality, traffic reduction, cargo exposure, delay,
  and alternative-route cost.
- Health: cases, deaths, growth, geographic spread, official alert, and health
  system pressure.
- Technology & Infrastructure: affected users/organizations/countries,
  duration, service criticality, and recovery state.

Official high-impact provider alerts create documented score floors; they do
not bypass provenance or stale-state checks.

### R8 — Event importance score

The first scoring version is:

```text
baseScore =
  domainImpact       * 0.40
+ urgency           * 0.15
+ momentum          * 0.15
+ geographicReach   * 0.10
+ anomaly           * 0.10
+ cascadeRelevance  * 0.10

eventScore =
  baseScore
  * (confidence / 100)
  * freshnessFactor
```

`freshnessFactor` stays between 0.70 and 1.00. It is based on the time since the
last material update, not the latest duplicate article. Initial category
half-lives are:

- 12 hours: Disasters, Security;
- 24 hours: Conflict, Supply Chains, Energy, Technology & Infrastructure;
- 48 hours: Politics & Diplomacy, Economy, Health;
- 7 days: Climate & Environment.

All component values, thresholds, and the final score must be returned by the
API.

### R9 — Material updates and momentum

Momentum must measure new independent evidence and changed facts rather than
raw article count. Qualifying changes include:

- a new official update;
- a changed casualty, exposure, outage, or traffic measurement;
- spread to a new country or region;
- a new policy or operational response;
- a severity-tier change.

Repeated syndication without a new fact does not reset freshness.

### R10 — Category heat

Within each primary category, rank qualifying clusters by event score. Category
heat is:

```text
categoryScore =
  topEvent
+ secondEvent * 0.12
+ thirdEvent  * 0.08
+ breadthBonus
+ velocityBonus
```

The value is capped at 100. `breadthBonus` and `velocityBonus` each range from
0 to 8 and must be based on documented event/country breadth and change against
the category baseline.

Today's Focus rules:

- include categories scoring at least 60;
- automatically include a category containing an event scoring at least 85;
- show no more than five categories;
- if fewer than three qualify, fill only from categories scoring at least 45;
- allow fewer than three if nothing meets the floor.

### R11 — Final briefing selection

The home briefing contains at most eight and normally at least five events.
Selection balances importance and redundancy:

```text
selectionScore =
  eventScore * 0.80
- maxSimilarityToSelected * 100 * 0.20
```

Default diversity rules:

- maximum two events per primary category;
- maximum two events per country;
- merge events from one causal storyline into a story thread;
- allow an event scoring at least 90 to bypass a diversity cap;
- never include an event below 55 merely to fill the briefing.

### R12 — Editorial map interface

The web UI must use:

- a dark, natural satellite-style map;
- restrained monochrome typography with one amber operational accent;
- a cinematic map-first overview;
- ArcGIS StoryMaps sidecar-style event reading;
- a bottom editorial band or docked sidecar instead of a card dashboard;
- English interface copy for the first public prototype.

It must avoid neon gradients, multicolored category cards, glassmorphism,
decorative AI imagery, and dense analyst controls.

Core views:

1. Today overview;
2. event story sidecar;
3. 24-hour map comparison;
4. all-categories index;
5. methodology and source transparency.

Desktop is the first target. Mobile must remain readable and keyboard/touch
accessible, but feature parity is not required in the first vertical slice.

### R13 — Live-update behavior

- Provider polling intervals are configurable per adapter.
- New data is normalized and rescored without a full page reload.
- Rank changes use a short stabilization window to prevent visible jitter.
- A materially updated selected event refreshes in place.
- Stale and degraded data states are visible.
- Historical snapshots support replay and the 24-hour comparison.

### R14 — Explainability and public methodology

The project must publish:

- scoring formula and version history;
- provider and source-tier policy;
- category-specific impact mappings;
- exclusion and merge reasons;
- known geographic, language, and media-coverage biases;
- an example showing how a final score was reproduced.

LLM-generated prose, if enabled, must be grounded only in selected evidence.
Links and timestamps always come from structured records, never model output.

### R15 — Open-source and portfolio deliverables

The repository must include:

- a clear problem statement and before/after product comparison;
- architecture and data-flow documentation;
- a scoring-methodology document;
- local setup with a fixture/replay mode;
- provider adapter documentation;
- deterministic ranking tests;
- an evaluation report using historical replay;
- screenshots or a short product walkthrough.

The project must use an original architecture. Copying AGPL-covered
WorldMonitor implementation code is outside the initial plan; the adapter
consumes documented API responses and preserves attribution.

## Non-goals

- Recreating every WorldMonitor panel or map layer.
- Providing military, financial, medical, security, or travel advice.
- Claiming that an automated rank is objectively correct.
- Building a social network, personalization engine, or notification system in
  the first release.
- Training a custom language model.
- Supporting all ten categories with equally rich direct providers on day one.
- Building native desktop or mobile applications before the web product works.
- Fully automated fact-checking.
- Real-time sub-second streaming.
- Editing or redistributing copyrighted article bodies.

## Success Criteria

The feature is successful when the following product, data, and evaluation
conditions are observable.

### Product

- A new user can identify the top global developments and open an explanation
  without configuring the interface.
- The home briefing displays zero to eight qualifying event clusters, not
  duplicate articles.
- All ten categories are browsable while only qualifying categories lead.
- Each selected event exposes a readable selection explanation and source list.

### Data and ranking

- The same fixture input always produces the same clusters and ranking.
- Syndicated copies from one origin do not count as independent corroboration.
- Events below the confidence or importance floors do not enter the briefing.
- Official USGS earthquakes can be ingested and ranked without WorldMonitor.
- A WorldMonitor outage does not prevent direct-provider events from appearing.
- A repeated article without a material fact does not refresh event momentum.

### Evaluation

The first evaluation set contains at least 200 historical candidate events
across at least eight categories and reports:

- Precision@8;
- duplicate rate;
- time to detect;
- source-family concentration;
- geographic and category distribution;
- ranking churn between refreshes;
- percentage of selected events with complete explanations.

Initial release targets:

- duplicate rate below 5% in the displayed briefing;
- 100% of displayed events have source provenance and score breakdown;
- deterministic replay produces an identical ordered result;
- no more than two non-exempt briefing items from one category or country;
- provider degradation is accurately labeled in integration tests.

Precision@8 receives a documented baseline during calibration rather than an
invented target before the labeled replay set exists.

## Verification

Verification combines deterministic automated checks with a bounded human
review of ranking quality and usability.

### Deterministic checks

- schema validation for provider, evidence, event, score, and snapshot records;
- unit tests for normalization, time handling, clustering, confidence,
  category impact, freshness, category heat, and diversity selection;
- golden fixture tests for at least one event in every category;
- replay test that runs the same snapshot twice and compares ordered output;
- provider contract tests for WorldMonitor and USGS fixtures;
- API tests for stale/degraded states and score explanations;
- accessibility checks for keyboard operation and contrast;
- production build and browser smoke test.

### Human review

- review a labeled sample of merges and non-merges;
- compare the top eight with a manually curated briefing;
- inspect geographic and source-distribution reports;
- test the Today overview with users unfamiliar with intelligence dashboards;
- verify that every visible claim is traceable to structured evidence.

## Open Questions

These are non-blocking for the first vertical slice:

1. Whether the public repository uses AGPL-3.0 or another license compatible
   with all eventually reused components. The first implementation avoids
   copying WorldMonitor source.
2. Whether NASA EONET or FIRMS becomes the second direct provider after USGS.
3. Whether Korean localization ships with the public release or immediately
   after the English prototype.
4. The production basemap provider and usage budget.
5. The final project name if `LENS` conflicts with an existing product or
   trademark.
