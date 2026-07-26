# LENS evaluation

Dataset: `evaluation-v1` · Scoring: `lens-v1` · Selection threshold: 55

Candidates: **200** across **10** categories.

| Metric | Result |
| --- | ---: |
| Precision | 1.000 |
| Recall | 0.858 |
| F1 | 0.924 |
| Pairwise ranking accuracy | 0.800 (160/200) |

| Category | Candidates | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| climate-environment | 20 | 1.000 | 1.000 | 1.000 |
| conflict | 20 | 1.000 | 1.000 | 1.000 |
| disasters | 20 | 1.000 | 0.750 | 0.857 |
| economy | 20 | 1.000 | 1.000 | 1.000 |
| energy | 20 | 1.000 | 1.000 | 1.000 |
| health | 20 | 1.000 | 0.750 | 0.857 |
| politics-diplomacy | 20 | 1.000 | 0.667 | 0.800 |
| security | 20 | 1.000 | 0.833 | 0.909 |
| supply-chains | 20 | 1.000 | 0.583 | 0.737 |
| technology-infrastructure | 20 | 1.000 | 1.000 | 1.000 |

The current threshold favors precision over recall: the replay produces no false positives but misses 17 positive variants, concentrated in supply chains, politics/diplomacy, disasters, health, and security. Pairwise accuracy is lower because the scorer intentionally ranks event impact and freshness, while the pairwise label compares the underlying historical seeds.

These numbers measure a controlled calibration fixture, not production accuracy. Reproduce the JSON report with:

```sh
npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json
```

Reproduce this Markdown shape with:

```sh
npm run evaluate -- --dataset tests/fixtures/evaluation/v1.json --format markdown
```

## Frozen `lens-v1` decision

The calibration candidate used a 50-point selection threshold. It reached precision 0.950, recall 0.942, and F1 0.946, but admitted six low-quality candidates. The frozen 55-point threshold reaches precision 1.000, recall 0.858, and F1 0.924 with no false positives in the corpus.

LENS is a short general-audience briefing, so the false-positive cost is higher than the cost of omitting a weaker update. The event-score weights remain unchanged because changing them against this small controlled corpus would overfit the fixture. `lens-v1` therefore freezes the existing weights and a shared selection threshold of 55.

The tradeoff is explicit: supply-chain recall is 0.583 and politics/diplomacy recall is 0.667. A future `lens-v2` should be considered only after an independently adjudicated production sample shows that category-specific recall can improve without reducing briefing precision.

## Source-observation sanity sample

`tests/fixtures/evaluation/production.json` freezes the first twelve USGS
M4.5+ observations returned from 00:00–10:00 UTC on 1 January 2024. Labels
were assigned before running `lens-v1`: the Noto Peninsula mainshock is the
single briefing-worthy incident, its nearby foreshock and aftershocks share
one merge identity, and the remaining remote observations stay below the
general-audience threshold.

```sh
npm run evaluate -- --dataset tests/fixtures/evaluation/production.json --format markdown
```

The raw observations produce precision 0.500 and recall 1.000 because the
M6.2 aftershock also clears the score threshold. After applying the existing
incident merge identity, the seven distinct incidents produce precision
1.000 and recall 1.000. This demonstrates why LENS selects incidents rather
than publishing every high-scoring observation.

This is a deliberately small, one-source, one-category integration check. It
does not establish production accuracy or replace a stratified sample across
all ten categories.

## Bounded live-feed smoke

Run:

```sh
npm run live-feed-smoke
```

The command checks one configured feed per category, disables article-page
image scraping, and reports current ingestion outcomes without turning a live
network result into a correctness gate.

The run at `2026-07-26T09:40:43Z` observed:

| Measure | Result |
| --- | ---: |
| Healthy feeds | 9 / 10 |
| Parsed candidates | 190 |
| Canonical stories | 158 |
| Duplicate compression | 16.8% |
| Categories represented | 9 / 10 |
| Distinct source families | 8 |
| Selected stories | 4 |
| Named-hub map points | 9 |
| Country-approximate map points | 39 |
| Unmapped stories | 110 |

This is a feed-availability and pipeline smoke result, not labeled precision.
The high unmapped count is a measured limitation of deterministic text-only
geography. LENS keeps those stories in the list instead of inventing map
coordinates. The command may produce different values on every run.
