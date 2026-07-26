import type { FastifyInstance } from "fastify";
import { CATEGORIES } from "../../core/model";
import { BRIEFING_CONFIDENCE_FLOOR, SOURCE_AUTHORITY } from "../../core/model/source-policy";
import { EVENT_SCORE_VERSION } from "../../core/score/event-score";
import type { LensStore } from "../store";
import { registerComparisonApi } from "./snapshots";
import { registerBriefingStream } from "./stream";

const STALE_AFTER_MS = 2 * 60 * 60 * 1_000;
const SELECTION_VERSION = "lens-v1";
const WATCHLIST_SCORE_FLOOR = 40;

function latestProviderHealth(store: LensStore) {
  const seen = new Set<string>();
  return store.providerRuns().filter(({ provider }) => {
    if (seen.has(provider)) return false;
    seen.add(provider);
    return true;
  });
}

function meta(store: LensStore, now: Date, dataTime: string | null) {
  const providers = latestProviderHealth(store);
  const stale =
    dataTime === null ||
    now.getTime() - Date.parse(dataTime) > STALE_AFTER_MS ||
    providers.some((provider) => provider.stale);
  const degraded = providers.some((provider) => provider.state !== "success");
  const state = dataTime === null ? "empty" : degraded ? "degraded" : stale ? "stale" : "fresh";
  return {
    apiVersion: "v1",
    serverTime: now.toISOString(),
    dataTime,
    state,
    stale,
    degraded,
    scoringVersion: EVENT_SCORE_VERSION,
    selectionVersion: SELECTION_VERSION,
  };
}

function eventDetail(store: LensStore, eventId: string) {
  const event = store.event(eventId);
  if (!event) return null;
  return {
    event,
    scores: store.eventScores(eventId),
    evidence: event.evidenceIds.flatMap((id) => {
      const item = store.evidence(id);
      return item ? [item] : [];
    }),
  };
}

function watchlistDetails(store: LensStore, selectedIds: readonly string[]) {
  const ids = new Set<string>();
  const selected = new Set(selectedIds);
  for (const eventId of [...selectedIds, ...store.events().map(({ id }) => id)]) {
    const event = store.event(eventId);
    const score = store.eventScores(eventId)[0];
    if (
      !event?.geometry ||
      event.phase !== "active" ||
      !score ||
      (!selected.has(eventId) && score.finalScore < WATCHLIST_SCORE_FLOOR)
    ) continue;
    ids.add(eventId);
  }
  return [...ids].flatMap((id) => {
    const detail = eventDetail(store, id);
    return detail ? [detail] : [];
  });
}

function activityDetails(store: LensStore) {
  return store.events().flatMap((event) => {
    const structured = event.sourceFamilies.some((source) =>
      source === "usgs" || source.startsWith("eonet:"));
    if (!structured || !event.geometry || event.phase !== "active") return [];
    const detail = eventDetail(store, event.id);
    return detail ? [detail] : [];
  });
}

export function operationalMetrics(store: LensStore) {
  const events = store.events();
  const active = events.filter(({ phase }) => phase === "active");
  const evidenceIds = new Set(events.flatMap(({ evidenceIds: ids }) => ids));
  const precisionCounts = active.reduce<Record<string, number>>((counts, event) => {
    const precision = String(event.measurements.locationPrecision ?? (
      event.geometry ? "provider_exact" : "unmapped"
    ));
    counts[precision] = (counts[precision] ?? 0) + 1;
    return counts;
  }, {});
  const coordinateCounts = new Map<string, number>();
  for (const event of active) {
    if (event.geometry?.type !== "Point") continue;
    const key = event.geometry.coordinates.join(",");
    coordinateCounts.set(key, (coordinateCounts.get(key) ?? 0) + 1);
  }
  const snapshot = store.latestSnapshot();
  return {
    rawArticles: evidenceIds.size,
    canonicalEvents: active.length,
    deduplicatedArticles: active.reduce(
      (count, event) => count + Math.max(0, event.evidenceIds.length - 1),
      0,
    ),
    locations: {
      mapped: active.filter(({ geometry }) => geometry !== null).length,
      exact: precisionCounts.provider_exact ?? 0,
      named: precisionCounts.named_hub ?? 0,
      approximate: precisionCounts.country_approximate ?? 0,
      unmapped: precisionCounts.unmapped ?? 0,
    },
    exactCoordinateCollisionGroups: [...coordinateCounts.values()]
      .filter((count) => count > 1).length,
    selectedEvents: snapshot?.eventIds.length ?? 0,
    observedActivity: activityDetails(store).length,
  };
}

export function registerReadApi(
  server: FastifyInstance,
  store: LensStore,
  now: () => Date,
) {
  registerComparisonApi(server, store);
  registerBriefingStream(server);

  server.get("/api/v1/briefing", async () => {
    const snapshot = store.latestSnapshot();
    return {
      meta: meta(store, now(), snapshot?.createdAt ?? null),
      data: {
        snapshot,
        events: snapshot?.eventIds.flatMap((id) => {
          const detail = eventDetail(store, id);
          return detail ? [detail] : [];
        }) ?? [],
        watchlist: watchlistDetails(store, snapshot?.eventIds ?? []),
        activity: activityDetails(store),
      },
    };
  });

  server.get("/api/v1/categories", async () => {
    const snapshot = store.latestSnapshot();
    const scores = new Map(snapshot?.categoryScores.map((item) => [item.category, item]));
    return {
      meta: meta(store, now(), snapshot?.createdAt ?? null),
      data: CATEGORIES.map((category) => scores.get(category) ?? {
        category,
        score: 0,
        qualifyingEventIds: [],
        calculatedAt: snapshot?.createdAt ?? null,
        rankingVersion: snapshot?.rankingVersion ?? SELECTION_VERSION,
      }),
    };
  });

  server.get<{ Params: { eventId: string } }>("/api/v1/events/:eventId", async (request, reply) => {
    const detail = eventDetail(store, request.params.eventId);
    if (!detail) return reply.code(404).send({ error: "event_not_found" });
    return {
      meta: meta(store, now(), detail.event.lastMaterialUpdateAt),
      data: detail,
    };
  });

  server.get<{ Querystring: { at?: string } }>("/api/v1/snapshots", async (request, reply) => {
    const { at } = request.query;
    if (at !== undefined && !Number.isFinite(Date.parse(at))) {
      return reply.code(400).send({ error: "invalid_snapshot_time" });
    }
    const snapshot = at ? store.snapshotAtOrBefore(at) : store.latestSnapshot();
    return {
      meta: meta(store, now(), snapshot?.createdAt ?? null),
      data: snapshot,
    };
  });

  server.get("/api/v1/methodology", async () => ({
    meta: meta(store, now(), store.latestSnapshot()?.createdAt ?? null),
    data: {
      scoringVersion: EVENT_SCORE_VERSION,
      selectionVersion: SELECTION_VERSION,
      eventScoreWeights: {
        domainImpact: 0.4,
        urgency: 0.15,
        momentum: 0.15,
        geographicReach: 0.1,
        anomaly: 0.1,
        cascadeRelevance: 0.1,
      },
      newsImportance: {
        version: "wm-lens-news-v1",
        severity: 0.55,
        sourceTier: 0.20,
        corroboration: 0.15,
        recency: 0.10,
        publicScoreMaximum: 100,
      },
      confidenceFloor: BRIEFING_CONFIDENCE_FLOOR,
      watchlistScoreFloor: WATCHLIST_SCORE_FLOOR,
      sourceAuthority: SOURCE_AUTHORITY,
    },
  }));

  server.get("/api/v1/providers/health", async () => {
    const snapshot = store.latestSnapshot();
    return {
      meta: meta(store, now(), snapshot?.createdAt ?? null),
      data: {
        providers: latestProviderHealth(store),
        feeds: store.feedStates(),
      },
    };
  });

  server.get("/api/v1/metrics", async () => ({
    meta: meta(store, now(), store.latestSnapshot()?.createdAt ?? null),
    data: operationalMetrics(store),
  }));
}
