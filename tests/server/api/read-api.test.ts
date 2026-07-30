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
    imageUrl: "https://example.com/earthquake.jpg",
    imageAlt: "Earthquake damage",
    imageCredit: "Official source",
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

function addObservedActivity(store: LensStore) {
  const baseEvent = store.event("event-1") as EventCluster;
  const baseScore = store.eventScores("event-1")[0] as EventScore;
  store.saveEvent({
    ...baseEvent,
    id: "eonet:activity-1",
    title: "Observed wildfire",
    sourceFamilies: ["eonet:InciWeb"],
    evidenceIds: [],
  });
  store.appendEventScore({
    ...baseScore,
    eventId: "eonet:activity-1",
    finalScore: 12,
  });
}

function addMonitoredEvent(store: LensStore) {
  const baseEvent = store.event("event-1") as EventCluster;
  const baseScore = store.eventScores("event-1")[0] as EventScore;
  store.saveEvent({
    ...baseEvent,
    id: "rss:monitored-1",
    title: "Mapped lower-priority report",
    sourceFamilies: ["rss:example"],
    evidenceIds: [],
  });
  store.appendEventScore({
    ...baseScore,
    eventId: "rss:monitored-1",
    finalScore: 12,
  });
}

function addReportedAlert(store: LensStore, overrides: Partial<EventCluster> = {}) {
  const baseEvent = store.event("event-1") as EventCluster;
  const baseScore = store.eventScores("event-1")[0] as EventScore;
  const event = {
    ...baseEvent,
    id: "alert-1",
    primaryCategory: "conflict" as const,
    eventType: "missile-drone" as const,
    lastMaterialUpdateAt: "2026-07-25T12:10:00Z",
    measurements: {
      locationPrecision: "country_approximate",
      locationDisplayName: "Example country",
    },
    evidenceIds: [],
    ...overrides,
  };
  store.saveEvent(event);
  store.appendEventScore({ ...baseScore, eventId: event.id, finalScore: 52 });
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

  it("recommends 24 main issues while leaving all mapped events monitored", async () => {
    const store = storeWith();
    addWatchlistEvents(store, 55);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });

    expect(response.json().data.watchlist).toHaveLength(24);
    expect(response.json().data.monitored).toHaveLength(55);
  });

  it("returns structured activity independently of the editorial score floor", async () => {
    const store = storeWith();
    addObservedActivity(store);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });
    const data = response.json().data as {
      activity: Array<{ event: EventCluster }>;
      watchlist: Array<{ event: EventCluster }>;
    };

    expect(data.activity.map(({ event }) => event.id)).toEqual([
      "eonet:activity-1",
    ]);
    expect(data.watchlist.map(({ event }) => event.id)).not.toContain("eonet:activity-1");
  });

  it("returns every active mapped event in monitored without changing watchlist or activity semantics", async () => {
    const store = storeWith();
    addMonitoredEvent(store);
    addObservedActivity(store);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });
    const data = response.json().data as {
      monitored: Array<{ event: EventCluster }>;
      activity: Array<{ event: EventCluster }>;
      watchlist: Array<{ event: EventCluster }>;
    };

    expect(data.monitored.map(({ event }) => event.id).sort()).toEqual([
      "eonet:activity-1",
      "event-1",
      "rss:monitored-1",
    ].sort());
    expect(response.json().data.monitored.find(
      ({ event }: { event: EventCluster }) => event.id === "event-1",
    ).evidence).toEqual([expect.objectContaining({
      imageUrl: "https://example.com/earthquake.jpg",
    })]);
    expect(data.watchlist.map(({ event }) => event.id)).toEqual(["event-1"]);
    expect(data.activity.map(({ event }) => event.id)).toEqual(["eonet:activity-1"]);
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

  it("does not report an outage for an optional WorldMonitor integration", async () => {
    const store = storeWith();
    store.saveProviderRun({
      id: "run-worldmonitor-optional",
      provider: "worldmonitor",
      startedAt: "2026-07-25T12:05:00Z",
      completedAt: "2026-07-25T12:05:01Z",
      state: "degraded",
      stale: false,
      itemCount: 0,
      errorClass: "worldmonitor_api_key_missing",
    });
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/briefing" });

    expect(response.json().meta.state).toBe("fresh");
  });

  it("publishes pipeline and map integrity metrics", async () => {
    const store = storeWith();
    addObservedActivity(store);
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({ method: "GET", url: "/api/v1/metrics" });

    expect(response.json().data).toMatchObject({
      canonicalEvents: 2,
      selectedEvents: 1,
      observedActivity: 1,
      locations: { mapped: 2 },
      coverage: {
        categories: { disasters: 2 },
        eventTypes: { unknown: 2 },
      },
    });
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

  it("publishes optional operational proxy signals without changing briefing health", async () => {
    const server = buildServer({
      store: storeWith(),
      now: () => new Date("2026-07-25T12:30:00Z"),
      operationalSignals: async () => ({
        state: "fresh",
        updatedAt: "2026-07-25T12:30:00Z",
        sources: { pizzint: "fresh", gdelt: "fresh" },
        pizza: {
          level: 4,
          activity: 31,
          activeSpikes: 0,
          locationsMonitored: 7,
          locationsOpen: 5,
        },
        tensions: [{
          id: "usa_iran",
          label: "USA — IRAN",
          score: 2.3,
          trend: "rising",
          changePercent: 12,
          conflictCount: 200,
          articleCount: 800,
          sentiment: -3,
        }],
        caveat: "Public proxy and media-derived signals; not an official threat level.",
      }),
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/operational-signals",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      meta: { state: "fresh" },
      data: {
        state: "fresh",
        pizza: { level: 4, activity: 31 },
        tensions: [{ id: "usa_iran", conflictCount: 200 }],
      },
    });
  });

  it("projects recent attributed conflict reports into a separate alert layer", async () => {
    const store = storeWith();
    addReportedAlert(store);
    addReportedAlert(store, {
      id: "old-alert",
      lastMaterialUpdateAt: "2026-07-23T12:00:00Z",
    });
    addReportedAlert(store, {
      id: "route-only",
      geometry: {
        type: "LineString",
        coordinates: [[1, 2], [3, 4]],
      },
    });
    addReportedAlert(store, {
      id: "generic-conflict",
      eventType: "unknown",
    });
    const response = await buildServer({
      store,
      now: () => new Date("2026-07-25T12:30:00Z"),
    }).inject({
      method: "GET",
      url: "/api/v1/operational-layers",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      meta: { state: "fresh" },
      data: {
        alerts: [{
          kind: "reported-alert",
          observedAt: "2026-07-25T12:10:00Z",
          expiresAt: "2026-07-26T12:10:00.000Z",
          precision: "country_approximate",
          evidenceClass: "official-or-provider",
          event: {
            id: "alert-1",
            eventType: "missile-drone",
            geometry: { type: "Point" },
            measurements: { locationPrecision: "country_approximate" },
          },
        }],
      },
    });
  });
});
