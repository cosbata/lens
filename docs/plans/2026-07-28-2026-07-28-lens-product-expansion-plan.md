# Plan: LENS product expansion

## Summary

Deliver the approved expansion in six verified phases. Preserve the current ten
public categories and map interaction. Improve the canonical event model,
measurement, recommendation, explanation, temporal comparison, and only then
add sources justified by measured gaps.

## Proposed Direction

Keep the current ten public categories as the stable reader-facing taxonomy.
Add a smaller canonical event-type field beneath them, then make ingestion,
storage, recommendation, map rendering, detail copy, and comparison consume
that same field. Expand source coverage only after the resulting metrics show
which categories or regions are genuinely under-covered.

## Phase 1 — Canonical event types and observability

1. Add a validated `EventType` vocabulary with `unknown`.
2. Persist it on observations and events with a backward-compatible migration.
3. Derive it in provider normalization and reconciliation.
4. Render map appearance from the canonical type.
5. Expand operational metrics by category, type, and geography precision.
6. Correct misleading RSS registry identities and provider-health semantics.

## Phase 2 — Recommendation v2

1. Keep `lens-v1` unchanged.
2. Add candidate novelty similarity from canonical title, entities, category,
   and geography.
3. Apply category and regional diversity to the full recommendation set.
4. Add stable entry/exit hysteresis between snapshots.
5. Persist and expose selection reasons and the algorithm version.
6. Evaluate v1 and v2 on the controlled corpus plus a stratified live sample.

## Phase 3 — Evidence-backed detail

1. Derive verified facts from measurements and repeated evidence.
2. Compare the current event with its prior persisted revision.
3. Produce category-specific impact summaries and watch signals.
4. Group evidence by independent source family.
5. Remove generic live-detail claims and render honest empty states.
6. Keep long-form chapters limited to recommended events.

## Phase 4 — Live 24-hour comparison

1. Replace production fixture changes with the snapshot comparison endpoint.
2. Show additions, removals, score changes, evidence changes, and geometry
   revisions.
3. Animate only timestamped provider geometry.
4. Preserve the current camera during playback.
5. Keep demonstration data explicitly labelled and isolated.

## Phase 5 — Measured source expansion

1. Audit current source yield, failures, duplication, mapping, and category
   contribution.
2. Add structured sources one at a time, starting with GDACS and GDELT.
3. Document license, polling, mapping, failure, and retention behavior.
4. Retain a source only when it improves a measured gap without reducing
   briefing precision.

## Phase 6 — Portfolio proof

1. Publish the taxonomy and selection contract.
2. Update methodology, integrations, architecture, and case study.
3. Publish raw-to-event compression, geography precision, provider health, and
   recommendation evaluation.
4. Document one source-backed 24-hour event evolution.

## Risks and mitigations

- Schema migration breaks stored data: add nullable/default-compatible columns
  and migration tests before switching writers.
- Subtype inference creates false precision: preserve `unknown` and use
  provider metadata before title rules.
- Recommendation changes hide urgent events: preserve a critical override and
  replay v1/v2 side by side.
- More data increases noise: source additions require measured retention gates.
- Existing dirty changes are overwritten: edit only task-owned files and do not
  clean or revert unrelated changes.

## Risks

- A stored-data migration can make an existing local database unreadable.
- Heuristic type inference can imply more geographic or semantic precision than
  the source supports.
- Ranking changes can remove an important event from the recommended set.
- Additional feeds can increase duplicates and stale provider warnings.
- The live comparison UI can accidentally present simulated motion as observed.

## Rollback Plan

- Keep `unknown` as the default event type so older rows remain readable.
- Keep `lens-v1` available until v2 evaluation passes.
- Gate each new provider independently so it can be disabled without changing
  the canonical model.
- Retain the current map category fallback when event type is unavailable.
- Keep fixture comparison data isolated and explicitly labelled as demo data.

## Verification Plan

Each phase has targeted tests. Final verification is:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- live REST/SSE/browser smoke checks

## Stop condition

The feature is done only when all six phases pass their task verifiers and the
review artifact records remaining measured limitations. Each phase may stop at
a verified checkpoint without claiming the complete feature is done.
