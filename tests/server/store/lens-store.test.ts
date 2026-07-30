import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  BriefingSnapshot,
  Evidence,
  EventCluster,
  EventScore,
  Observation,
  ProviderRun,
} from "../../../src/core/model";
import { LensStore, MIGRATIONS } from "../../../src/server/store";

const now = "2026-07-25T10:00:00Z";
const location = { geometry: { type: "Point" as const, coordinates: [127, 37] as [number, number] }, globalScope: false };
const providerRun: ProviderRun = {
  id: "run-1", provider: "usgs", startedAt: now, completedAt: now,
  state: "success", itemCount: 1, stale: false,
};
const observation: Observation = {
  id: "observation-1", provider: "usgs", providerSourceId: "usgs-1",
  sourceFamily: "usgs", url: "https://example.com/event", occurredAt: now,
  fetchedAt: now, title: "Earthquake", description: "Magnitude 6.1 earthquake",
  primaryCategory: "disasters", eventType: "earthquake", relatedCategories: [], ...location,
  affectedCountries: ["KR"], measurements: { magnitude: 6.1 }, extension: {},
};
const evidence: Evidence = {
  id: "evidence-1", observationId: observation.id, sourceId: "usgs-1",
  sourceFamily: "usgs", url: observation.url, publishedAt: now,
  fetchedAt: now, title: observation.title,
};
const event: EventCluster = {
  id: "event-1", title: observation.title, description: observation.description,
  primaryCategory: observation.primaryCategory, eventType: "earthquake",
  relatedCategories: [], ...location,
  affectedCountries: ["KR"], firstSeenAt: now, lastSeenAt: now,
  lastMaterialUpdateAt: now, phase: "active", measurements: { magnitude: 6.1 },
  evidenceIds: [evidence.id], sourceFamilies: ["usgs"],
};
const score: EventScore = {
  eventId: event.id, version: "lens-v1", domainImpact: 80, urgency: 75,
  momentum: 40, reach: 50, anomaly: 60, cascade: 30, confidence: 95,
  freshness: 100, finalScore: 72, floors: [], reasons: ["official_source"],
  calculatedAt: now,
};
const snapshot: BriefingSnapshot = {
  id: "snapshot-1", createdAt: now, eventIds: [event.id], rankingVersion: "lens-v1",
  categoryScores: [{
    category: "disasters", score: 72, qualifyingEventIds: [event.id],
    calculatedAt: now, rankingVersion: "lens-v1",
  }],
  providerHealth: [{ provider: "usgs", state: "success", stale: false }],
};

function seed(store: LensStore) {
  store.saveProviderRun(providerRun);
  store.saveObservation(observation);
  store.saveEvidence(evidence);
  store.saveEvent(event);
  store.appendEventScore(score);
  store.appendSnapshot(snapshot);
}

describe("SQLite canonical store", () => {
  it("migrates an empty database and round-trips every canonical record", () => {
    const store = new LensStore();
    seed(store);

    expect(store.migrationVersions()).toEqual(MIGRATIONS.map(({ version }) => version));
    expect(store.providerRun(providerRun.id)).toEqual(providerRun);
    expect(store.observation(observation.id)).toEqual(observation);
    expect(store.evidence(evidence.id)).toEqual(evidence);
    expect(store.event(event.id)).toEqual(event);
    expect(store.eventScores(event.id)).toEqual([score]);
    expect(store.latestEventScores()).toEqual([score]);
    expect(store.snapshot(snapshot.id)).toEqual(snapshot);
    store.close();
  });

  it("applies later migrations to an existing database", () => {
    const directory = mkdtempSync(join(tmpdir(), "lens-store-"));
    const path = join(directory, "existing.sqlite");
    const database = new DatabaseSync(path);
    database.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      ) STRICT;
      ${MIGRATIONS[0].sql}
      INSERT INTO schema_migrations (version, applied_at) VALUES (1, '${now}');
    `);
    database.close();

    const store = new LensStore(path);
    expect(store.migrationVersions()).toEqual([1, 2, 3, 4, 5]);
    expect(store.database.prepare(
      "SELECT event_type FROM observations LIMIT 1",
    ).get()).toBeUndefined();
    store.close();
  });

  it("defaults legacy payloads to an unknown event type", () => {
    const store = new LensStore();
    store.saveObservation({ ...observation, eventType: undefined });
    store.saveEvent({ ...event, eventType: undefined });

    expect(store.observation(observation.id)?.eventType).toBe("unknown");
    expect(store.event(event.id)?.eventType).toBe("unknown");
    expect(store.database.prepare(
      "SELECT event_type FROM observations WHERE id = ?",
    ).get(observation.id)).toEqual({ event_type: "unknown" });
    expect(store.database.prepare(
      "SELECT event_type FROM events WHERE id = ?",
    ).get(event.id)).toEqual({ event_type: "unknown" });
    store.close();
  });

  it("keeps live story aliases and expires old ones", () => {
    const store = new LensStore();
    store.saveStoryAliases(
      "canonical-a",
      ["member-a", "member-b", "member-a"],
      "2026-07-29T00:00:00Z",
    );

    expect(store.storyAliasTargets(
      ["member-a", "member-b"],
      "2026-07-26T00:00:00Z",
    )).toEqual(new Map([
      ["member-a", "canonical-a"],
      ["member-b", "canonical-a"],
    ]));
    expect(store.storyAliasTargets(
      ["member-a"],
      "2026-07-30T00:00:00Z",
    )).toEqual(new Map());
    expect(store.pruneStoryAliases("2026-07-30T00:00:00Z")).toBe(2);
    store.close();
  });

  it("keeps snapshots immutable", () => {
    const store = new LensStore();
    seed(store);

    expect(() => store.appendSnapshot(snapshot)).toThrow();
    expect(() => store.database.prepare(
      "UPDATE briefing_snapshots SET ranking_version = ? WHERE id = ?",
    ).run("lens-v2", snapshot.id)).toThrow(/briefing_snapshot_immutable/);
    expect(store.snapshot(snapshot.id)).toEqual(snapshot);
    store.close();
  });
});
