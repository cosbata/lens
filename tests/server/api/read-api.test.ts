import { afterEach, describe, expect, it } from "vitest";
import type {
  BriefingSnapshot,
  EventCluster,
  EventScore,
  Evidence,
  Observation,
  ProviderRun,
} from "../../../src/core/model";
import { buildServer } from "../../../src/server/app";
import { LensStore } from "../../../src/server/store";

const stores: LensStore[] = [];
afterEach(() => stores.splice(0).forEach((store) => store.close()));

function storeWith(
  provider: Pick<ProviderRun, "state" | "stale"> = { state: "success", stale: false },
) {
  const store = new LensStore();
  stores.push(store);
  const evidence: Evidence = {
    id: "evidence-1",
    observationId: "observation-1",
    sourceId: "usgs",
    sourceFamily: "official",
    url: "https://earthquake.usgs.gov/example",
    publishedAt: "2026-07-25T11:50:00Z",
    fetchedAt: "2026-07-25T11:55:00Z",
    title: "Official bulletin",
  };
  const event: EventCluster = {
    id: "event-1",
    title: "Major earthquake",
    description: "A consequential earthquake.",
    primaryCategory: "disasters",
    relatedCategories: ["supply-chains"],
    geometry: { type: "Point", coordinates: [126, 36] },
    geometryHistory: [
      { observedAt: "2026-07-25T11:00:00Z", geometry: { type: "Point", coordinates: [125.5, 35.7] } },
      { observedAt: "2026-07-25T12:00:00Z", geometry: { type: "Point", coordinates: [126, 36] } },
    ],
    globalScope: false,
    affectedCountries: ["KR"],
    firstSeenAt: "2026-07-25T11:40:00Z",
    lastSeenAt: "2026-07-25T12:00:00Z",
    lastMaterialUpdateAt: "2026-07-25T12:00:00Z",
    phase: "active",
    measurements: { magnitude: 7.1 },
    evidenceIds: [evidence.id],
    sourceFamilies: ["official"],
  };
  const score: EventScore = {
    eventId: event.id,
    version: "lens-v1",
    domainImpact: 80,
    urgency: 90,
    momentum: 70,
    reach: 50,
    anomaly: 70,
    cascade: 60,
    confidence: 92,
    freshness: 100,
    finalScore: 76.4,
    floors: [],
    reasons: ["official_source"],
    calculatedAt: "2026-07-25T12:00:00Z",
  };
  const run: ProviderRun = {
    id: "run-1",
    provider: "usgs",
    startedAt: "2026-07-25T11:55:00Z",
    completedAt: "2026-07-25T11:56:00Z",
    state: provider.state,
    stale: provider.stale,
    itemCount: 1,
  };
  const snapshot: BriefingSnapshot = {
    id: "snapshot-1",
    createdAt: "2026-07-25T12:00:00Z",
    eventIds: [event.id],
    categoryScores: [{
      category: "disasters",
      score: 76.4,
      qualifyingEventIds: [event.id],
      calculatedAt: "2026-07-25T12:00:00Z",
      rankingVersion: "lens-v1",
    }],
    rankingVersion: "lens-v1",
    providerHealth: [{ provider: "usgs", ...provider }],
  };
  const observation: Observation = {
    id: evidence.observationId,
    provider: "usgs",
    providerSourceId: "usgs-1",
    sourceFamily: "official",
    url: evidence.url,
    occurredAt: evidence.publishedAt,
    fetchedAt: evidence.fetchedAt,
    title: evidence.title,
    description: "A consequential earthquake.",
    primaryCategory: "disasters",
    relatedCategories: ["supply-chains"],
    geometry: event.geometry,
    globalScope: false,
    affectedCountries: ["KR"],
    measurements: { magnitude: 7.1 },
    extension: {},
  };
  store.saveObservation(observation);
  store.saveEvidence(evidence);
  store.saveEvent(event);
  store.appendEventScore(score);
  store.saveProviderRun(run);
  store.appendSnapshot(snapshot);
  return store;
}

function addWatchlistEvents(store: LensStore, count: number) {
  const baseEvent = store.event("event-1") as EventCluster;
  const baseScore = store.eventScores("event-1")[0] as EventScore;
  for (let index = 2; index <= count; index += 1) {
    const id = `event-${index}`;
    store.saveEvent({
      ...baseEvent,
      id,
      title: `Observed event ${index}`,
      geometry: { type: "Point", coordinates: [index * 3 % 170, index % 80] },
      evidenceIds: [],
    });
    store.appendEventScore({ ...baseScore, eventId: id, finalScore: 40 + index % 30 });
  }
}

describe("read API", () => {
  it("returns an explicit empty briefing", async () => {
    const store = new LensStore();
    stores.push(store);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:00:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      meta: { state: "empty", stale: true, degraded: false, dataTime: null },
      data: { snapshot: null, events: [] },
    });
  });

  it("returns fresh attributed events and all ten categories", async () => {
    const server = buildServer({
      store: storeWith(),
      now: () => new Date("2026-07-25T12:30:00Z"),
    });
    const briefing = await server.inject({ method: "GET", url: "/api/v1/briefing" });
    const categories = await server.inject({ method: "GET", url: "/api/v1/categories" });

    expect(briefing.json()).toMatchObject({
      meta: {
        state: "fresh",
        stale: false,
        degraded: false,
        scoringVersion: "lens-v1",
        selectionVersion: "lens-v1",
      },
      data: {
        events: [{
          event: { id: "event-1", geometryHistory: expect.any(Array) },
          scores: [{ finalScore: 76.4 }],
          evidence: [{ url: "https://earthquake.usgs.gov/example" }],
        }],
        watchlist: [{ event: { id: "event-1" } }],
      },
    });
    expect(categories.json().data).toHaveLength(10);
  });

  it("returns every qualifying mapped event instead of an arbitrary fixed count", async () => {
    const store = storeWith();
    addWatchlistEvents(store, 55);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });

    expect(response.json().data.watchlist).toHaveLength(55);
    expect(response.json().data.watchlist[0].event.id).toBe("event-1");
  });

  it("distinguishes stale and degraded data", async () => {
    const staleServer = buildServer({
      store: storeWith(),
      now: () => new Date("2026-07-25T16:00:00Z"),
    });
    const degradedServer = buildServer({
      store: storeWith({ state: "degraded", stale: false }),
      now: () => new Date("2026-07-25T12:30:00Z"),
    });

    expect((await staleServer.inject({
      method: "GET",
      url: "/api/v1/briefing",
    })).json().meta.state).toBe("stale");
    expect((await degradedServer.inject({
      method: "GET",
      url: "/api/v1/providers/health",
    })).json().meta).toMatchObject({ state: "degraded", degraded: true });
  });

  it("validates lookups and publishes the methodology contract", async () => {
    const server = buildServer({
      store: storeWith(),
      now: () => new Date("2026-07-25T12:30:00Z"),
    });

    expect((await server.inject({
      method: "GET",
      url: "/api/v1/events/missing",
    })).statusCode).toBe(404);
    expect((await server.inject({
      method: "GET",
      url: "/api/v1/snapshots?at=not-a-date",
    })).statusCode).toBe(400);
    expect((await server.inject({
      method: "GET",
      url: "/api/v1/methodology",
    })).json().data).toMatchObject({
      scoringVersion: "lens-v1",
      eventScoreWeights: { domainImpact: 0.4 },
      newsImportance: { version: "wm-lens-news-v1", severity: 0.55 },
      confidenceFloor: 45,
    });
  });
});
