import type { FastifyInstance } from "fastify";
import { CATEGORIES, type EventCluster, type EventScore } from "../../core/model";
import { BRIEFING_CONFIDENCE_FLOOR, SOURCE_AUTHORITY } from "../../core/model/source-policy";
import { EVENT_SCORE_VERSION } from "../../core/score/event-score";
import { selectBriefing } from "../../core/select/briefing-selection";
import {
  getOperationalSignals,
  type OperationalSignals,
} from "../../providers/pizzint/client";
import type { LensStore } from "../store";
import { registerComparisonApi } from "./snapshots";
import { registerBriefingStream } from "./stream";

const STALE_AFTER_MS = 2 * 60 * 60 * 1_000;
const SELECTION_VERSION = "lens-v1";
const WATCHLIST_SCORE_FLOOR = 40;
const MAIN_ISSUE_LIMIT = 24;
const ALERT_TTL_MS = 24 * 60 * 60 * 1_000;
const ALERT_EVENT_TYPES = new Set([
  "airstrike",
  "missile-drone",
  "ground-clash",
  "terrorism",
  "civil-unrest",
  "ceasefire",
  "displacement",
]);

function latestProviderHealth(store: LensStore) {
  const seen = new Set<string>();
  return store.providerRuns().filter(({ provider, errorClass }) => {
    if (errorClass === "worldmonitor_api_key_missing") return false;
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
  return detailForEvent(store, event, store.eventScores(eventId));
}

function detailForEvent(
  store: LensStore,
  event: EventCluster,
  scores: readonly EventScore[],
) {
  return {
    event,
    scores,
    evidence: event.evidenceIds.flatMap((id) => {
      const item = store.evidence(id);
      return item ? [item] : [];
    }),
  };
}

function briefingEvent(event: EventCluster) {
  return {
    id: event.id,
    title: event.title,
    description: event.description
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600),
    primaryCategory: event.primaryCategory,
    eventType: event.eventType ?? "unknown",
    geometry: event.geometry,
    geometryHistory: event.geometryHistory,
    affectedCountries: event.affectedCountries,
    lastMaterialUpdateAt: event.lastMaterialUpdateAt,
    sourceFamilies: event.sourceFamilies,
    measurements: event.measurements,
  };
}

function briefingDetail(
  store: LensStore,
  event: EventCluster,
  score: EventScore | undefined,
  evidenceLimit: number,
) {
  return {
    event: briefingEvent(event),
    scores: score ? [{
      finalScore: score.finalScore,
      version: score.version,
      reasons: score.reasons,
    }] : [],
    evidence: event.evidenceIds.slice(0, evidenceLimit).flatMap((id) => {
      const item = store.evidence(id);
      return item ? [item] : [];
    }),
  };
}

function watchlistDetails(
  store: LensStore,
  selectedIds: readonly string[],
  events: readonly EventCluster[],
  scores: ReadonlyMap<string, EventScore>,
) {
  const selected = new Set(selectedIds);
  const eligible = events.flatMap((event) => {
    const score = scores.get(event.id);
    if (
      !event.geometry ||
      event.phase !== "active" ||
      !score ||
      (!selected.has(event.id) && score.finalScore < WATCHLIST_SCORE_FLOOR)
    ) return [];
    return [{ event, score }];
  });
  const diverseIds = selectBriefing(eligible.map(({ event, score }) => ({
    id: event.id,
    score: score.finalScore,
    primaryCategory: event.primaryCategory,
    countries: event.affectedCountries,
    similarity: {},
  }))).map(({ id }) => id);
  const rankedIds = eligible
    .sort((left, right) =>
      right.score.finalScore - left.score.finalScore ||
      left.event.id.localeCompare(right.event.id))
    .map(({ event }) => event.id);
  const issueIds = [...new Set([...diverseIds, ...rankedIds])].slice(0, MAIN_ISSUE_LIMIT);
  const eligibleById = new Map(eligible.map((item) => [item.event.id, item]));
  return issueIds.flatMap((id) => {
    const item = eligibleById.get(id);
    return item ? [briefingDetail(store, item.event, item.score, 8)] : [];
  });
}

const isStructuredActivity = (event: EventCluster) =>
  event.sourceFamilies.some((source) => source === "usgs" || source.startsWith("eonet:"));

function activityDetails(
  store: LensStore,
  events = store.events(),
  scores = new Map(store.latestEventScores().map((score) => [score.eventId, score])),
) {
  return events.flatMap((event) => {
    if (!isStructuredActivity(event) || !event.geometry || event.phase !== "active") return [];
    return [briefingDetail(store, event, scores.get(event.id), 8)];
  });
}

function monitoredDetails(
  store: LensStore,
  events: readonly EventCluster[],
  scores: ReadonlyMap<string, EventScore>,
) {
  return events.flatMap((event) => {
    const score = scores.get(event.id);
    if (!event.geometry || event.phase !== "active" || !score) return [];
    const imageEvidence = event.evidenceIds
      .flatMap((id) => {
        const item = store.evidence(id);
        return item?.imageUrl ? [item] : [];
      })[0];
    return [{
      event: briefingEvent(event),
      scores: [{
        finalScore: score.finalScore,
        version: score.version,
        reasons: score.reasons,
      }],
      evidence: imageEvidence ? [imageEvidence] : [],
    }];
  });
}

export function operationalAlertDetails(store: LensStore, now: Date) {
  const scores = new Map(store.latestEventScores().map((score) => [score.eventId, score]));
  return store.events().flatMap((event) => {
    const observedAt = Date.parse(event.lastMaterialUpdateAt);
    if (
      event.phase !== "active" ||
      !event.geometry ||
      event.geometry.type === "LineString" ||
      !Number.isFinite(observedAt) ||
      now.getTime() - observedAt > ALERT_TTL_MS ||
      !ALERT_EVENT_TYPES.has(event.eventType ?? "")
    ) return [];
    return [{
      kind: "reported-alert" as const,
      observedAt: event.lastMaterialUpdateAt,
      expiresAt: new Date(observedAt + ALERT_TTL_MS).toISOString(),
      precision: String(event.measurements.locationPrecision ?? "provider_exact"),
      evidenceClass: event.sourceFamilies.some((source) =>
        source === "official" || source === "worldmonitor")
        ? "official-or-provider"
        : "reporting",
      ...briefingDetail(store, event, scores.get(event.id), 8),
    }];
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
  const categoryCounts = active.reduce<Record<string, number>>((counts, event) => {
    counts[event.primaryCategory] = (counts[event.primaryCategory] ?? 0) + 1;
    return counts;
  }, {});
  const eventTypeCounts = active.reduce<Record<string, number>>((counts, event) => {
    const eventType = event.eventType ?? "unknown";
    counts[eventType] = (counts[eventType] ?? 0) + 1;
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
    coverage: {
      categories: categoryCounts,
      eventTypes: eventTypeCounts,
    },
    exactCoordinateCollisionGroups: [...coordinateCounts.values()]
      .filter((count) => count > 1).length,
    selectedEvents: snapshot?.eventIds.length ?? 0,
    observedActivity: active.filter((event) =>
      event.geometry && isStructuredActivity(event)).length,
  };
}

export function registerReadApi(
  server: FastifyInstance,
  store: LensStore,
  now: () => Date,
  operationalSignals: () => Promise<OperationalSignals> = getOperationalSignals,
) {
  registerComparisonApi(server, store);
  registerBriefingStream(server);

  server.get("/api/v1/briefing", async () => {
    const snapshot = store.latestSnapshot();
    const allEvents = store.events();
    const latestScores = new Map(
      store.latestEventScores().map((score) => [score.eventId, score]),
    );
    return {
      meta: meta(store, now(), snapshot?.createdAt ?? null),
      data: {
        snapshot,
        events: snapshot?.eventIds.flatMap((id) => {
          const detail = eventDetail(store, id);
          return detail ? [detail] : [];
        }) ?? [],
        watchlist: watchlistDetails(store, snapshot?.eventIds ?? [], allEvents, latestScores),
        monitored: monitoredDetails(store, allEvents, latestScores),
        activity: activityDetails(store, allEvents, latestScores),
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

  server.get("/api/v1/operational-signals", async () => ({
    meta: meta(store, now(), store.latestSnapshot()?.createdAt ?? null),
    data: await operationalSignals(),
  }));

  server.get("/api/v1/operational-layers", async () => ({
    meta: meta(store, now(), store.latestSnapshot()?.createdAt ?? null),
    data: { alerts: operationalAlertDetails(store, now()) },
  }));
}
