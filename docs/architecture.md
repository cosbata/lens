# Architecture

LENS is one TypeScript application with a React/Vite web client and a Fastify/SQLite service.

## Runtime flow

1. Independent non-overlapping schedules fetch USGS, NASA EONET, and the WorldMonitor-compatible conflict endpoint. An optional Kystverket/BarentsWatch schedule can add 24-hour geometry history to an already selected event.
2. Provider adapters validate untrusted payloads and normalize them into observations and evidence.
3. Reconciliation clusters compatible observations while retaining every source identity and merge reason.
4. Category impact, confidence, freshness, and `lens-v1` scoring produce inspectable event scores.
5. Briefing selection applies the 55-point floor, country/category diversity caps, and a critical-event override.
6. SQLite stores provider runs, observations, evidence, events, scores, and immutable briefing snapshots.
7. REST endpoints serve the current state and 24-hour comparison; SSE publishes only a snapshot ID so clients refetch canonical data.

## Failure boundaries

Each provider owns its run state and schedule. A timeout or invalid payload degrades that provider, preserves its last valid data, and does not stop another provider. Read responses expose `fresh`, `stale`, `degraded`, or `empty` metadata instead of hiding uncertainty.

The browser begins with a readable fixture briefing, then replaces it with canonical API data when available. If SSE fails, it polls every 30 seconds.

The comparison view derives its playback path and timeline markers from
timestamped geometry history. Marker selection, event detail, slider position,
and the rendered map share one time state; no decorative route is presented as
live provider data.

## Public API

- `GET /api/v1/briefing`
- `GET /api/v1/categories`
- `GET /api/v1/events/:eventId`
- `GET /api/v1/snapshots?at=<ISO time>`
- `GET /api/v1/comparison`
- `GET /api/v1/methodology`
- `GET /api/v1/providers/health`
- `GET /api/v1/stream`

The API is intentionally read-only in v1. Provider credentials, editorial overrides, accounts, notifications, and administrative UI are outside the current open-source scope.
