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
      data: latestProviderHealth(store),
    };
  });
}
