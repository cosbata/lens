import { describe, expect, it, vi } from "vitest";
import type { BriefingSnapshot, EventCluster } from "../../../src/core/model";
import { fetchBarentsWatchTrack } from "../../../src/providers/barentswatch/client";
import { normalizeBarentsWatchTrack } from "../../../src/providers/barentswatch/normalize";
import { LensStore } from "../../../src/server/store";
import { ingestBarentsWatchTrack } from "../../../src/server/services/ingest-barentswatch";

const track = [
  {
    mmsi: 257111020,
    msgtime: "2026-07-25T10:00:00Z",
    longitude: 5.1,
    latitude: 60.1,
    name: "OPEN DATA",
    speedOverGround: 8.2,
    stream: "terra",
  },
  {
    mmsi: 257111020,
    msgtime: "2026-07-25T11:00:00Z",
    longitude: 5.4,
    latitude: 60.3,
    name: "OPEN DATA",
    speedOverGround: 9.1,
    stream: "satellite",
  },
];

describe("BarentsWatch historic AIS provider", () => {
  it("authenticates server-side and requests the official 24-hour endpoint", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" })))
      .mockResolvedValueOnce(new Response(JSON.stringify(track)));
    expect(await fetchBarentsWatchTrack({
      clientId: "client",
      clientSecret: "secret",
      mmsi: 257111020,
      fetcher,
    })).toEqual(track);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://historic.ais.barentswatch.no/v1/historic/trackslast24hours/257111020",
      { headers: { authorization: "Bearer token" } },
    );
  });

  it("normalizes ordered attributable positions into geometryHistory", () => {
    const result = normalizeBarentsWatchTrack(
      [...track].reverse(),
      "2026-07-25T11:05:00Z",
      257111020,
    );
    expect(result.observation).toMatchObject({
      provider: "barentswatch",
      sourceFamily: "barentswatch:kystverket",
      geometry: { type: "Point", coordinates: [5.4, 60.3] },
      geometryHistory: [
        { observedAt: "2026-07-25T10:00:00Z", geometry: { type: "Point", coordinates: [5.1, 60.1] } },
        { observedAt: "2026-07-25T11:00:00Z", geometry: { type: "Point", coordinates: [5.4, 60.3] } },
      ],
      measurements: { positionCount: 2, stream: "satellite" },
      extension: { license: "NLOD" },
    });
  });

  it("enriches an existing selected event without inventing a new event", async () => {
    const store = new LensStore();
    const event: EventCluster = {
      id: "event-route",
      title: "Observed shipping disruption",
      description: "A selected event with an attributable vessel.",
      primaryCategory: "supply-chains",
      relatedCategories: ["economy"],
      geometry: { type: "Point", coordinates: [5, 60] },
      globalScope: false,
      affectedCountries: ["NO"],
      firstSeenAt: "2026-07-25T09:00:00Z",
      lastSeenAt: "2026-07-25T09:00:00Z",
      lastMaterialUpdateAt: "2026-07-25T09:00:00Z",
      phase: "active",
      measurements: {},
      evidenceIds: [],
      sourceFamilies: ["official"],
    };
    const snapshot: BriefingSnapshot = {
      id: "snapshot-route",
      createdAt: "2026-07-25T09:00:00Z",
      eventIds: [event.id],
      categoryScores: [],
      rankingVersion: "lens-v1",
      providerHealth: [],
    };
    store.saveEvent(event);
    store.appendSnapshot(snapshot);

    const result = await ingestBarentsWatchTrack({
      store,
      eventId: event.id,
      mmsi: 257111020,
      clientId: "client",
      clientSecret: "secret",
      now: () => new Date("2026-07-25T11:05:00Z"),
      load: async () => track,
    });

    expect(result.materialUpdates).toBe(1);
    expect(store.events()).toHaveLength(1);
    expect(store.event(event.id)).toMatchObject({
      geometryHistory: expect.any(Array),
      sourceFamilies: ["official", "barentswatch:kystverket"],
    });
    store.close();
  });
});
