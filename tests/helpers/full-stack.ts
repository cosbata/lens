import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  BriefingSnapshot,
  EventCluster,
  EventScore,
  Evidence,
  Observation,
  ProviderRun,
} from "../../src/core/model";
import { buildServer } from "../../src/server/app";
import { publishBriefingUpdate } from "../../src/server/api/stream";
import { LensStore } from "../../src/server/store";

const now = "2026-07-26T00:00:00Z";

function appendBriefing(
  store: LensStore,
  id: string,
  title: string,
  longitude: number,
  latitude = 12,
  includeSnapshot = true,
) {
  const observationId = `observation-${id}`;
  const evidenceId = `evidence-${id}`;
  const eventId = `event-${id}`;
  const observedAt = id === "initial" ? "2026-07-25T23:50:00Z" : now;
  const observation: Observation = {
    id: observationId,
    provider: "full-stack-test",
    providerSourceId: id,
    sourceFamily: "official",
    url: `https://example.com/${id}`,
    occurredAt: observedAt,
    fetchedAt: observedAt,
    title,
    description: `${title} description`,
    primaryCategory: "supply-chains",
    relatedCategories: ["economy"],
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    globalScope: false,
    affectedCountries: ["XX"],
    measurements: {},
    extension: {},
  };
  const evidence: Evidence = {
    id: evidenceId,
    observationId,
    sourceId: id,
    sourceFamily: "official",
    url: observation.url,
    publishedAt: observedAt,
    fetchedAt: observedAt,
    title,
    imageUrl: "https://images.example.com/world-briefing.jpg",
    imageAlt: "Newsroom image for the selected world event",
    imageCredit: "Example Newsroom",
  };
  const event: EventCluster = {
    id: eventId,
    title,
    description: observation.description,
    primaryCategory: observation.primaryCategory,
    relatedCategories: observation.relatedCategories,
    geometry: observation.geometry,
    globalScope: false,
    affectedCountries: observation.affectedCountries,
    firstSeenAt: observedAt,
    lastSeenAt: observedAt,
    lastMaterialUpdateAt: observedAt,
    phase: "active",
    measurements: {
      corroborationCount: 2,
      locationPrecision: "named_hub",
      locationDisplayName: "Suez Canal",
    },
    evidenceIds: [evidenceId],
    sourceFamilies: ["Reuters", "BBC World"],
  };
  const score: EventScore = {
    eventId,
    version: "wm-lens-news-v1",
    domainImpact: 80,
    urgency: 80,
    momentum: 70,
    reach: 60,
    anomaly: 60,
    cascade: 70,
    confidence: 95,
    freshness: 100,
    finalScore: 77,
    floors: [],
    reasons: ["severity.medium.50", "source_tier.1.100", "distinct_sources.2.40"],
    calculatedAt: observedAt,
  };
  const run: ProviderRun = {
    id: `run-${id}`,
    provider: "full-stack-test",
    startedAt: observedAt,
    completedAt: observedAt,
    state: "success",
    itemCount: 1,
    stale: false,
  };
  const snapshot: BriefingSnapshot = {
    id: `snapshot-${id}`,
    createdAt: observedAt,
    eventIds: [eventId],
    categoryScores: [{
      category: "supply-chains",
      score: score.finalScore,
      qualifyingEventIds: [eventId],
      calculatedAt: observedAt,
      rankingVersion: "lens-v1",
    }],
    rankingVersion: "lens-v1",
    providerHealth: [{ provider: run.provider, state: run.state, stale: run.stale }],
  };

  store.saveObservation(observation);
  store.saveEvidence(evidence);
  store.saveEvent(event);
  store.appendEventScore(score);
  store.saveProviderRun(run);
  if (includeSnapshot) store.appendSnapshot(snapshot);
  return snapshot.id;
}

export async function startFullStackTestServer({ watchlistCount = 1 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "lens-full-stack-"));
  const store = new LensStore(join(directory, "lens.sqlite"));
  const server = buildServer({ store, now: () => new Date(now) });
  appendBriefing(store, "initial", "Initial live briefing", 42);
  for (let index = 2; index <= watchlistCount; index += 1) {
    appendBriefing(
      store,
      `watch-${index}`,
      `Worldwide observation ${index}`,
      -170 + index * 37 % 340,
      -60 + index * 23 % 120,
      false,
    );
  }
  const baseUrl = await server.listen({ host: "127.0.0.1", port: 0 });
  return {
    baseUrl,
    publishUpdate() {
      publishBriefingUpdate(
        appendBriefing(store, "update", "SSE update reached the map", 54),
      );
    },
    async close() {
      await server.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
