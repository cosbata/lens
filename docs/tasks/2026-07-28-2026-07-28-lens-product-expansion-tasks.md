# Tasks: LENS product expansion

## Task List

Execute T001–T009 in dependency order and stop each task only after its listed
verification succeeds.

## T001 — Canonical event type model

- Add the controlled event-type vocabulary and honest `unknown` fallback.
- Persist the type on observations/events with a safe migration.
- Cover validation and migration behavior.
- Verification: `npm test -- --run tests/core/model.test.ts tests/server/store/lens-store.test.ts`

### Verification

- `npm test -- --run tests/core/model.test.ts tests/server/store/lens-store.test.ts`

## T002 — Provider event-type normalization

- Derive event types from structured provider metadata first.
- Use the existing classifier path for RSS without inventing unsupported types.
- Preserve types during cross-provider reconciliation.

### Verification

- Provider normalization and reconciliation unit tests.

## T003 — Map and operational metrics

- Use canonical event type for map colour/legend behavior.
- Report category/type/geography coverage in operational metrics.
- Preserve cluster expansion and category filtering.

### Verification

- Map interaction tests and API metrics tests.

## T004 — Source registry and provider health

- Correct source display names that do not match configured URLs.
- Distinguish disabled optional providers from failing configured providers.
- Expose repeat feed failures and last-success time.

### Verification

- Source-registry and provider-health service tests.

## T005 — Recommendation v2

- Add real novelty similarity, full-set diversity, stable membership, and
  reproducible reasons under a new version.
- Preserve and replay `lens-v1`.

### Verification

- Controlled-corpus v1/v2 replay and selection API tests.

## T006 — Evidence-backed live detail

- Add deterministic verified facts, change, impact, watch, location-precision,
  and grouped-evidence fields.
- Remove unsupported generic live copy.

### Verification

- Detail DTO tests and browser empty-state checks.

## T007 — Live 24-hour comparison

- Connect the comparison UI to snapshot data.
- Animate only attributable temporal geometry.

### Verification

- Snapshot comparison API tests and comparison browser tests.

## T008 — Measured source expansion

- Add sources only after coverage measurement and provider documentation.
- Start with the highest-value structured gap.

### Verification

- Provider contract, normalization, and ingestion tests.

## T009 — Portfolio proof and final review

- Update public documentation and evaluation.
- Run the full deterministic and browser verification suite.

### Verification

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
