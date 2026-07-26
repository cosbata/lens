# Spec: lens-productionization

Feature ID: 2026-07-26-lens-productionization
Date: 2026-07-26
Status: draft
Request: Turn the verified LENS prototype into a live, attributable, portfolio-ready open-source product: first prove the browser-to-Fastify-to-SSE path with seeded SQLite, then connect a permitted movement-history provider, add timeline event markers synchronized with the map, evaluate real curation samples, and finish release documentation without fabricating live data.

## Goal

Turn LENS from a polished fixture-backed prototype into an honest, reproducible
open-source reference implementation whose live claims can be demonstrated end
to end.

## User / Research Problem

The map and timeline already communicate events well, but a visitor cannot yet
distinguish live server data from fixtures or see movement and event history
update through the complete browser/API/SSE path. That weakens both the product
and the portfolio story.

## Scenarios

1. A visitor opens LENS and receives the latest SQLite briefing through Fastify.
2. A new snapshot is published and the open page updates through SSE without a
   reload.
3. A visitor plays a 24-hour window and sees movement history plus timestamped
   event markers stay synchronized with the map.
4. A maintainer can configure an attributable, permitted movement provider; if
   it is unavailable, LENS labels the fixture or stale fallback honestly.
5. A reviewer can inspect a labeled evaluation sample and reproduce the reported
   curation metrics.

## Requirements

- Preserve the existing editorial map and Mantine playback controls.
- Add a full-stack browser test that uses a temporary seeded SQLite database,
  the real Fastify routes, the Vite proxy, and the real SSE event.
- Update the page from an appended snapshot without browser reload.
- Add one permitted movement-history provider behind environment credentials,
  normalize its history into the existing `geometryHistory` model, and retain a
  clearly labeled fixture fallback.
- Render timestamped event markers on the playback control and synchronize
  marker selection with map time and event detail.
- Store a reproducible adjudication sample and calculate precision-oriented
  selection results from it.
- Document setup, provenance, licenses, fallbacks, architecture, evaluation,
  screenshots, and limitations for an open-source portfolio release.
- Never label fixture, cached, inferred, or unavailable data as live.

## Non-goals

- Rebuilding World Monitor or proxying undocumented private APIs.
- Purchasing or redistributing restricted AIS data.
- Claiming global vessel coverage from a partial provider.
- Production deployment or credential provisioning.
- Expanding the ten-category taxonomy without evaluation evidence.

## Success Criteria

- A Playwright full-stack test proves initial REST load and an SSE-driven visual
  update from a new SQLite snapshot.
- Movement history from the configured provider is attributable in the UI and
  tests; the no-credential path remains functional and explicitly labeled.
- Timeline markers are keyboard accessible and selecting one updates the shared
  playback timestamp and visible map state.
- The evaluation command reports deterministic metrics from committed labels.
- A clean clone can install, run, test, and understand data limitations from the
  README and provider documentation.

## Verification

- Targeted server, web, provider, timeline, and evaluation tests.
- TypeScript typecheck and ESLint.
- Production build.
- Existing accessibility E2E plus the new full-stack E2E.
- Manual browser smoke check for the briefing and comparison views.

## Open Questions

- Which movement provider offers sufficient permitted history without
  redistribution restrictions? Resolve from current official terms before
  implementation.
- Whether deployment belongs in this feature remains intentionally deferred
  until the user chooses a host and authorizes production changes.
