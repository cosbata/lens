# LENS selection methodology

The public scoring contract is frozen as `lens-v1`. Its event weights are 40%
domain impact, 15% urgency, 15% momentum, 10% geographic reach, 10% anomaly,
and 10% cascade relevance. Confidence and category-specific freshness are
multipliers. Candidates enter briefing selection at 55 points; events at 90
or above may bypass diversity caps.

The 55-point threshold is deliberately precision-first. Calibration results
and the alternative 50-point comparison are recorded in `docs/evaluation.md`.
The version must change before weights, freshness behavior, or the selection
threshold change.

## Category impact v1

Before confidence and freshness are applied, every supported event is reduced
to four public 0–100 measurements:

- **Scale** — physical or institutional size.
- **Exposure** — people, places, or systems plausibly affected.
- **Disruption** — observed interruption to normal activity.
- **Duration** — evidence that effects will persist.

`category-impact-v1` calculates:

```text
impact = scale × category weight
       + exposure × category weight
       + disruption × category weight
       + duration × category weight
```

Weights always sum to 1. Disasters emphasize scale and exposure; supply chains
and infrastructure emphasize disruption; climate emphasizes duration; health
emphasizes exposure. The exact weights and ten golden fixtures live beside the
production function.

An official alert may set a floor, but never an unbounded boost. Missing
measurements are not guessed: the event remains unscored until a provider
adapter can supply a documented mapping.

Provider severity, concern, importance, or risk scores are inputs at most.
They are never copied into the final LENS score.
