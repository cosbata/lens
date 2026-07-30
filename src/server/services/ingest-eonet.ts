import type { EventCluster, EventScore, Observation } from "../../core/model";
import { calculateConfidence } from "../../core/score/confidence";
import { calculateEventScore } from "../../core/score/event-score";
import { fetchEonetEvents } from "../../providers/eonet/client";
import { normalizeEonetEvents } from "../../providers/eonet/normalize";
import { publishBriefingUpdate } from "../api/stream";
import type { LensStore } from "../store";
import { rebuildBriefing } from "./ingest-usgs";

function toEvent(observation: Observation, previous: EventCluster | null): EventCluster {
  return {
    id: observation.id,
    title: observation.title,
    description: observation.description,
    primaryCategory: observation.primaryCategory,
    eventType: observation.eventType,
    relatedCategories: observation.relatedCategories,
    geometry: observation.geometry,
    globalScope: observation.globalScope,
    affectedCountries: observation.affectedCountries,
    firstSeenAt: previous?.firstSeenAt ?? observation.fetchedAt,
    lastSeenAt: observation.fetchedAt,
    lastMaterialUpdateAt: observation.occurredAt,
    phase: "active",
    measurements: observation.measurements,
    evidenceIds: [`${observation.id}:evidence`],
    sourceFamilies: [observation.sourceFamily],
  };
}

function scoreEvent(event: EventCluster, now: string): EventScore {
  const magnitude = typeof event.measurements.magnitudeValue === "number"
    ? Math.min(100, event.measurements.magnitudeValue * 10)
    : 55;
  const confidence = calculateConfidence([{
    sourceId: "eonet",
    sourceFamily: event.sourceFamilies[0],
    authority: "institutional",
    structured: true,
    completeness: 80,
  }]);
  const score = calculateEventScore({
    domainImpact: magnitude,
    urgency: 55,
    momentum: 50,
    geographicReach: 35,
    anomaly: 45,
    cascadeRelevance: 35,
    confidence: confidence.confidence,
    category: event.primaryCategory,
    phase: event.phase,
    lastMaterialUpdateAt: event.lastMaterialUpdateAt,
    now,
  });
  return {
    eventId: event.id,
    version: score.version,
    domainImpact: magnitude,
    urgency: 55,
    momentum: 50,
    reach: 35,
    anomaly: 45,
    cascade: 35,
    confidence: confidence.confidence,
    freshness: score.freshnessFactor * 100,
    finalScore: score.finalScore,
    floors: [],
    reasons: [...confidence.reasons, ...score.reasons],
    calculatedAt: now,
  };
}

export async function ingestEonet({
  store,
  now,
  load = fetchEonetEvents,
}: {
  store: LensStore;
  now: () => Date;
  load?: () => Promise<unknown>;
}) {
  const startedAt = now().toISOString();
  try {
    const items = normalizeEonetEvents(await load(), now().toISOString());
    let materialUpdates = 0;
    for (const { observation, evidence } of items) {
      const previousObservation = store.observation(observation.id);
      const previousEvent = store.event(observation.id);
      const material =
        !previousObservation ||
        previousObservation.occurredAt !== observation.occurredAt ||
        JSON.stringify(previousObservation.geometry) !== JSON.stringify(observation.geometry);
      store.saveObservation(observation);
      store.saveEvidence(evidence);
      const event = toEvent(observation, previousEvent);
      store.saveEvent(event);
      if (material) {
        store.appendEventScore(scoreEvent(event, now().toISOString()));
        materialUpdates += 1;
      }
    }
    store.saveProviderRun({
      id: `eonet:${startedAt}`,
      provider: "eonet",
      startedAt,
      completedAt: now().toISOString(),
      state: "success",
      itemCount: items.length,
      stale: false,
    });
    const snapshot = materialUpdates > 0 ? rebuildBriefing(store, now().toISOString()) : null;
    if (snapshot?.created) publishBriefingUpdate(snapshot.snapshot.id);
    return { materialUpdates, snapshot };
  } catch (error) {
    store.saveProviderRun({
      id: `eonet:${startedAt}`,
      provider: "eonet",
      startedAt,
      completedAt: now().toISOString(),
      state: "degraded",
      itemCount: 0,
      stale: true,
      errorClass: error instanceof Error ? error.message : "unknown",
    });
    return { materialUpdates: 0, snapshot: null, error };
  }
}
