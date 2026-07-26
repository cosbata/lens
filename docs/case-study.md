# Case study: from world monitor to public briefing

## Problem found

Existing world-monitoring products are strong at collecting many feeds but ask ordinary readers to interpret a dense analyst interface. The hard problem was not drawing another map. It was deciding which events deserve attention, showing why, and preserving enough evidence that the decision can be challenged.

## Design decision

LENS replaces the dashboard with an editorial sequence inspired by map-led story experiences:

1. A small “today” briefing establishes priority.
2. Selecting an event opens its explanation immediately.
3. Five chapters move from what happened to what to watch.
4. The map changes with the narrative instead of exposing every layer.
5. Score components, evidence, provider health, and 24-hour changes remain inspectable.

The interface uses restrained paper, ink, satellite imagery, and one amber action color. It avoids a card grid so hierarchy comes from typography, position, and sequence.

## Monitoring without the control-room clutter

The default view keeps the useful first step of WorldMonitor—scanning a live
world map—but removes the analyst dashboard around it. Readers can search,
filter by category, and toggle selected incidents or observed activity. A map
marker or feed item updates one compact right-hand explanation, while the
highest-ranked issue remains fixed in the editorial briefing below. Exploration
therefore does not silently rewrite LENS's stated priority.

This is intentionally not a 56-layer clone. It preserves the live REST/SSE
event flow and traceable sources while making one decision at a time legible
to a general reader.

## Engineering decision

The project is an independent service rather than a skin over one upstream
API. It ports a small, attributed subset of World Monitor's public AGPL news
pipeline at a pinned commit: story identity, RSS parsing, source tiers,
classification references, and importance scoring. LENS keeps its own SQLite,
ten-category model, selection policy, API, map, and narrative UI. The hosted
World Monitor API remains optional.

That choice removes Redis, accounts, paid AI summaries, the full analyst
dashboard, and hundreds of specialist feeds from the first release. Forty
curated feeds, USGS, and NASA EONET run in one Node process with one SQLite
volume. This is enough to demonstrate the problem and solution without
rebuilding infrastructure that the portfolio claim does not need.

Selection is reproducible:

- category-specific impact from documented public measurements;
- fixed score weights;
- confidence and freshness multipliers;
- a 55-point precision-first floor;
- diversity caps with a 90-point critical override;
- source URLs and reasons retained through the result.

## Evidence of improvement

The result can be checked rather than demonstrated only by screenshots:

- 200 deterministic replay candidates across ten categories;
- precision 1.000, recall 0.858, and F1 0.924 on the controlled corpus;
- pairwise ranking accuracy 0.800;
- a separately labeled USGS observation window that reveals a raw aftershock
  false positive and verifies incident-level merging;
- unit, integration, and full-stack browser tests covering REST, SSE, temporal
  playback, keyboard use, and provider failure;
- zero serious or critical Axe violations on the five core views.

A bounded live run on 26 July 2026 checked ten representative feeds: nine were
healthy, 190 articles became 158 canonical stories, and four passed final
selection. The 16.8% duplicate compression demonstrates that the story layer
is doing visible work. Geography is the clearest remaining weakness: 110
stories stayed unmapped, 39 used labeled country approximations, and only nine
matched named hubs. These are operational observations, not accuracy metrics.

These results establish reproducibility and accessibility for the included
fixtures and the narrow USGS sanity sample. They do not establish real-world
accuracy; a stratified, independently adjudicated sample across all ten
categories is the next evidence threshold.

## What this demonstrates

The portfolio value is the chain from product observation to verifiable implementation: identifying information overload, defining a public-interest selection policy, separating provider data from judgment, designing an understandable map narrative, and leaving tests and metrics that make the tradeoffs visible.

## Cost, license, and limits

- The initial Railway shape is one Hobby service plus a persistent volume,
  expected to stay near the USD 5 monthly minimum at portfolio traffic.
- Public feeds, deterministic classification, SQLite, USGS, and EONET require
  no paid data subscription.
- The distribution is AGPL-3.0-only, pins its World Monitor source commit, lists
  every copied or adapted file, and links to corresponding source in the UI.
- SQLite intentionally limits the first release to one application replica.
- Live RSS availability changes, English keyword classification misses nuance,
  and deterministic geography leaves many stories unmapped.
- The next evidence threshold is a source-referenced, independently labeled
  sample across all ten categories; the current controlled corpus and narrow
  USGS sample must not be described as production accuracy.
