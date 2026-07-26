# Plan: lens-productionization

Feature ID: 2026-07-26-lens-productionization
Date: 2026-07-26
Status: ready

## Proposed Direction

1. Prove the existing production path before adding features.
   - Seed a temporary `LensStore`.
   - Start the real Fastify server beside Vite.
   - Assert initial REST rendering and an SSE-triggered update in Playwright.
2. Connect one permitted movement-history source.
   - Choose from current official terms.
   - Normalize only the fields required by the existing `geometryHistory` model.
   - Keep fallback provenance explicit.
3. Synchronize the playback UI.
   - Derive markers from event and geometry-history timestamps.
   - Selecting a marker changes the shared timeline time and visible map state.
4. Measure curation quality.
   - Commit a labeled sample with source references.
   - Reuse the existing evaluation command and report deterministic metrics.
5. Prepare the open-source handoff.
   - Update setup, architecture, provider, evaluation, limitations, and release
     documentation.
   - Run the full verification suite and record remaining risks.

## Constraints

- Complete and verify each step before starting the next.
- Reuse the existing store, API, SSE, temporal model, Mantine controls, and
  evaluation pipeline.
- Add no dependency unless the chosen provider cannot be consumed with native
  `fetch`/WebSocket.
- Never convert fixture behavior into a live claim.

## Risks

- Movement providers may require credentials or prohibit redistribution. Verify
  terms first and keep the adapter opt-in.
- A full-stack test can become flaky if it shares ports or databases. Give it
  dedicated ports and a temporary database.
- Temporal UI can imply precision the source does not provide. Display source
  timestamps and provenance without interpolation claims.

## Rollback Plan

- Each step is an isolated commit-sized change.
- Keep the existing fixture and polling fallback until the live path passes the
  release suite.
- If a provider becomes unavailable, disable its environment configuration and
  retain the last attributable snapshot rather than fabricating movement.

## Verification Plan

- Step 1: full-stack Playwright initial-load and live-update assertions.
- Step 2: provider normalization test plus explicit fallback/source labeling.
- Step 3: timeline interaction test plus accessibility check.
- Step 4: deterministic evaluation command output.
- Step 5: tests, typecheck, lint, build, E2E, docs check, and manual smoke.
