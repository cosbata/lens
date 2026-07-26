import { describe, expect, it } from "vitest";
import type { CategoryScore, EventCluster, ProviderRun } from "../../src/core/model";
import { buildBriefingSnapshot } from "../../src/server/services/build-briefing";
import {
  persistBriefingSnapshot,
  snapshotHoursAgo,
} from "../../src/server/store/briefing-snapshots";
import { LensStore } from "../../src/server/store";

const location = { geometry: { type: "Point" as const, coordinates: [0, 0] as [number, number] }, globalScope: false };

function event(id: string, category: EventCluster["primaryCategory"]): EventCluster {
  return {
    id,
    title: `Event ${id}`,
    description: `Description ${id}`,
    primaryCategory: category,
    relatedCategories: [],
    ...location,
    affectedCountries: ["KR"],
    firstSeenAt: "2026-07-24T00:00:00Z",
    lastSeenAt: "2026-07-25T12:00:00Z",
    lastMaterialUpdateAt: "2026-07-25T11:00:00Z",
    phase: "active",
    measurements: {},
    evidenceIds: [],
    sourceFamilies: ["fixture"],
  };
}

const categoryScores: CategoryScore[] = [{
  category: "disasters",
  score: 72,
  qualifyingEventIds: ["event-1"],
  calculatedAt: "2026-07-25T12:00:00Z",
  rankingVersion: "lens-v1",
}];

const providerRuns: ProviderRun[] = [
  {
    id: "usgs-old", provider: "usgs", startedAt: "2026-07-25T10:00:00Z",
    completedAt: "2026-07-25T10:01:00Z", state: "degraded", itemCount: 0, stale: true,
  },
  {
    id: "usgs-new", provider: "usgs", startedAt: "2026-07-25T11:00:00Z",
    completedAt: "2026-07-25T11:01:00Z", state: "success", itemCount: 3, stale: false,
  },
  {
    id: "worldmonitor", provider: "worldmonitor", startedAt: "2026-07-25T11:30:00Z",
    state: "degraded", itemCount: 1, stale: true,
  },
];

function snapshot(id: string, createdAt: string, eventIds = ["event-1"]) {
  return buildBriefingSnapshot({
    id,
    createdAt,
    eventIds,
    categoryScores,
    rankingVersion: "lens-v1",
    providerRuns,
  });
}

function storeWithEvents() {
  const store = new LensStore();
  store.saveEvent(event("event-1", "disasters"));
  store.saveEvent(event("event-2", "security"));
  return store;
}

describe("briefing snapshot lifecycle", () => {
  it("suppresses an unchanged snapshot and keeps latest provider health", () => {
    const store = storeWithEvents();
    const first = persistBriefingSnapshot(
      store,
      snapshot("snapshot-1", "2026-07-25T11:00:00Z"),
    );
    const duplicate = persistBriefingSnapshot(
      store,
      snapshot("snapshot-2", "2026-07-25T12:00:00Z"),
    );

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.snapshot.id).toBe("snapshot-1");
    expect(duplicate.snapshot.providerHealth).toEqual([
      { provider: "usgs", state: "success", stale: false },
      { provider: "worldmonitor", state: "degraded", stale: true },
    ]);
    store.close();
  });

  it("persists a changed material order", () => {
    const store = storeWithEvents();
    expect(persistBriefingSnapshot(
      store,
      snapshot("snapshot-1", "2026-07-25T11:00:00Z", ["event-1", "event-2"]),
    ).created).toBe(true);
    expect(persistBriefingSnapshot(
      store,
      snapshot("snapshot-2", "2026-07-25T12:00:00Z", ["event-2", "event-1"]),
    ).created).toBe(true);
    expect(store.latestSnapshot()?.id).toBe("snapshot-2");
    store.close();
  });

  it("returns the nearest immutable snapshot at or before 24 hours ago", () => {
    const store = storeWithEvents();
    persistBriefingSnapshot(
      store,
      snapshot("snapshot-old", "2026-07-24T10:00:00Z", ["event-1"]),
    );
    persistBriefingSnapshot(
      store,
      snapshot("snapshot-24h", "2026-07-24T12:00:00Z", ["event-2", "event-1"]),
    );
    persistBriefingSnapshot(
      store,
      snapshot("snapshot-new", "2026-07-25T12:00:00Z", ["event-1", "event-2"]),
    );

    expect(snapshotHoursAgo(store, "2026-07-25T12:00:00Z")?.id).toBe("snapshot-24h");
    store.close();
  });
});
