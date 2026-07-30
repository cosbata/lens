# Spec: 2026-07-28-lens-product-expansion

Feature ID: 2026-07-28-2026-07-28-lens-product-expansion
Date: 2026-07-28
Status: draft
Request: Implement the approved LENS product expansion proposal beginning with canonical event subtypes, source registry health, and coverage/precision observability, then recommendation v2, evidence-backed detail, live comparison, source expansion, and portfolio proof.

## Goal

Turn the existing high-volume map into a legible public world briefing by
adding canonical event subtypes, measurable source/geography quality,
diversity-aware stable recommendations, evidence-backed event explanations,
and honest 24-hour change playback without making WorldMonitor mandatory.

## User / Research Problem

LENS already collects thousands of articles and exposes hundreds of mapped
events, but broad categories alone do not explain what each point represents.
Most mapped news locations are country approximations, the recommendation
similarity penalty is not currently supplied with real similarities, live
event explanations still contain generic template text, and the comparison UI
uses demonstration fixtures. Adding more feeds before measuring these gaps
would increase noise rather than understanding.

## Scenarios

- A general reader opens the world map, filters ten stable top-level
  categories, and can distinguish concrete event types such as earthquake,
  wildfire, cyberattack, or shipping disruption.
- The reader opens the main briefing and sees roughly 24 distinct, globally
  diverse issues with a reproducible explanation of why each was selected.
- Selecting an event shows verified facts, location precision, material
  changes, impact, watch signals, and independent evidence without fabricated
  detail.
- The reader replays the last 24 hours and sees actual additions, removals,
  score changes, and provider-supplied movement only.
- An operator can see source yield, failure state, event compression, mapping
  precision, and category/type coverage before adding another provider.

## Requirements

- Keep the ten public categories unchanged.
- Add a canonical, validated event subtype with `unknown` as an honest
  fallback.
- Use the subtype for map appearance instead of relying only on headline
  regular expressions.
- Audit feed identity metadata and expose provider/category/type/geography
  coverage metrics.
- Preserve `lens-v1`; add any changed recommendation policy as a separately
  versioned, replayable `lens-v2`.
- Supply real novelty similarity, regional/category diversity, stable
  entry/exit behavior, and human-readable recommendation reasons.
- Replace generic live-detail placeholders with deterministic fields derived
  from measurements, evidence, and snapshots.
- Connect the comparison UI to stored snapshot data and label any remaining
  fixture data explicitly.
- Keep WorldMonitor and authenticated movement providers optional.
- Add sources only when measured coverage gaps justify them and their license,
  polling, mapping, and failure behavior are documented.
- Preserve current cluster expansion, category filtering, camera stability,
  SSE refresh, and polling fallback behavior.

## Non-goals

- Reproducing WorldMonitor's full analyst dashboard or dozens of default
  infrastructure layers.
- Treating static infrastructure as news-event categories.
- Inventing local coordinates for country-level stories.
- Requiring paid AI summaries or a paid WorldMonitor API.
- Displaying anonymous social posts by default.
- Animating movement for events without timestamped provider geometry.

## Success Criteria

- Every persisted and API-visible event has a valid subtype or `unknown`.
- Source registry labels match their actual URLs and repeat failures are
  visible without marking intentionally disabled providers as failed.
- Operational metrics report event counts by category/type, source yield, and
  exact/named/approximate/unmapped geography.
- No canonical incident appears twice in the recommended briefing.
- Each recommendation exposes reproducible selection reasons and the current
  algorithm version.
- Live event detail contains no generic claim that is unsupported by stored
  evidence or measurements.
- The comparison view loads real snapshot changes and only animates
  attributable geometry history.
- Existing unit, integration, accessibility, build, and browser checks pass.
- Methodology and case-study documentation state the measured limits rather
  than claiming production accuracy.

## Verification

- Targeted tests for each task.
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- Live API smoke checks for `/api/v1/briefing`, `/api/v1/metrics`,
  `/api/v1/providers/health`, and comparison endpoints.
- Browser verification of category/type filtering, cluster drill-down,
  selection detail, and 24-hour playback.

## Open Questions

No blocking questions. Defaults approved by the implementation request:
general-reader audience, English-first UI, official/established/specialist
sources, public-safe imagery, free/open data first, and paid providers optional.
