# Evaluation labeling

LENS evaluates selection and ranking against a frozen, reviewable replay corpus.

## Dataset shape

`tests/fixtures/evaluation/v1.json` contains 20 historical event seeds across all ten LENS categories. Each seed has a public source URL, occurrence time, geography, source family, merge identity, importance label, pairwise ranking preference, and seven scoring features.

Each seed is replayed through ten common ingestion conditions: official breaking notice, confirmed wire copy, second source, regional update, partial report, uncorroborated report, duplicate wording, stale recap, resolved follow-up, and low-signal mention. This produces 200 deterministic candidates without copying the same record by hand.

The variants are controlled test inputs. They are not claims that each wording or confidence state appeared in the historical source. Historical facts come only from the seed and linked provenance.

## Labels

- `important`: whether the candidate belongs in a general-audience world briefing.
- `mergeIdentity`: the real-world event that duplicate observations should converge on.
- `category`: the primary public-interest category.
- `geography`: affected ISO alpha-3 codes or `GLOBAL`.
- `sourceFamily`: the organization responsible for the seed evidence.
- `preferredOver`: a seed that this event should outrank when both are current.
- `rankTier`: expected quality of the observation variant, from 1 (best) to 4 (noise/stale).

## Review rubric

An event is important when it has material human, economic, territorial, infrastructure, or cross-border consequences and a general reader can act on the distinction. A label does not become positive merely because a story is widely repeated.

Merge identity follows the underlying occurrence, not headline wording. Geography records direct effects, not every country that published coverage. Source family records origin, so syndicated copies do not masquerade as independent corroboration.

## Reproducibility and limits

Run `npm run validate:evaluation`. The validator checks schema boundaries, unique IDs, dates, feature ranges, pairwise references, source URLs, category coverage, and the expanded candidate count.

This corpus is a calibration fixture, not independent ground truth. It intentionally over-represents globally significant events and should be supplemented with adjudicated production samples before using metrics as a claim about real-world accuracy.

## Source-observation sample

`tests/fixtures/evaluation/production.json` is separate from the controlled
calibration corpus. It records twelve consecutive observations from one
committed USGS query, preserves each event-page URL and observed age, and uses
one unchanged `observed` variant. The label rule is committed in the dataset.

Nearby Noto Peninsula observations share a merge identity so the report can
show both raw score behavior and the incident-level result. Optional
`preferredOver` labels are evaluated only where a reviewer made a direct
ranking judgment; unlabeled pairs are excluded instead of being counted as
failures.

The sample is intentionally narrow. Add a new frozen sample—without changing
old labels—when evaluating another provider or category.
