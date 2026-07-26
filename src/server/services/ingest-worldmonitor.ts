import type { EventCluster, EventScore, Observation } from "../../core/model";
import { calculateConfidence } from "../../core/score/confidence";
import { calculateEventScore } from "../../core/score/event-score";
import {
  fetchWorldMonitorFeedDigest,
  fetchWorldMonitorIranEvents,
} from "../../providers/worldmonitor/client";
import {
  normalizeWorldMonitorFeedDigest,
  normalizeWorldMonitorIranEvents,
} from "../../providers/worldmonitor/normalize";
import { publishBriefingUpdate } from "../api/stream";
import type { LensStore } from "../store";
import { rebuildBriefing } from "./ingest-usgs";

const SEVERITY_SCORE: Record<string, number> = {
  low: 30,
  medium: 50,
  high: 70,
  critical: 85,
};

function toEvent(observation: Observation, previous: EventCluster | null): EventCluster {
  return {
    id: observation.id,
    title: observation.title,
    description: observation.description,
    primaryCategory: observation.primaryCategory,
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
    sourceFamilies: ["liveuamap"],
  };
}

function scoreEvent(event: EventCluster, now: string): EventScore {
  const severity =
    SEVERITY_SCORE[String(event.measurements.severity)] ??
    SEVERITY_SCORE[String(event.measurements.threatLevel).replace("THREAT_LEVEL_", "").toLowerCase()] ??
    (event.measurements.alert === true ? 65 : 40);
  const corroboration = Math.min(5, Number(event.measurements.corroborationCount ?? 1));
  const confidence = calculateConfidence(
    Array.from({ length: Math.max(1, corroboration) }, (_, index) => ({
      sourceId: `worldmonitor:${index + 1}`,
      sourceFamily: `${event.sourceFamilies[0]}:${index + 1}`,
      authority: "established" as const,
      structured: true,
      completeness: 70 + corroboration * 5,
    })),
  );
  const score = calculateEventScore({
    domainImpact: severity,
    urgency: severity,
    momentum: Math.min(90, 45 + corroboration * 8),
    geographicReach: event.globalScope ? 60 : 30,
    anomaly: 50,
    cascadeRelevance: 40,
    confidence: confidence.confidence,
    category: event.primaryCategory,
    phase: event.phase,
    lastMaterialUpdateAt: event.lastMaterialUpdateAt,
    now,
  });
  return {
    eventId: event.id,
    version: score.version,
    domainImpact: severity,
    urgency: severity,
    momentum: 60,
    reach: 30,
    anomaly: 50,
    cascade: 40,
    confidence: confidence.confidence,
    freshness: score.freshnessFactor * 100,
    finalScore: score.finalScore,
    floors: [],
    reasons: [
      event.measurements.severity
        ? `upstream_severity.${String(event.measurements.severity)}`
        : `upstream_threat.${String(event.measurements.threatLevel).toLowerCase()}`,
      `upstream_corroboration.${corroboration}`,
      ...confidence.reasons,
      ...score.reasons,
    ],
    calculatedAt: now,
  };
}

export async function ingestWorldMonitor({
  store,
  now,
  load,
  loadDigest,
}: {
  store: LensStore;
  now: () => Date;
  load?: () => Promise<unknown>;
  loadDigest?: () => Promise<unknown>;
}) {
  const startedAt = now().toISOString();
  try {
    const hasKey = Boolean(process.env.WORLDMONITOR_API_KEY?.trim());
    const sources = [
      {
        load: load ?? (hasKey ? fetchWorldMonitorIranEvents : null),
        normalize: normalizeWorldMonitorIranEvents,
      },
      {
        load: loadDigest ?? (hasKey ? fetchWorldMonitorFeedDigest : null),
        normalize: normalizeWorldMonitorFeedDigest,
      },
    ].filter((source): source is {
      load: () => Promise<unknown>;
      normalize: typeof normalizeWorldMonitorIranEvents;
    } => source.load !== null);
    if (sources.length === 0) throw new Error("worldmonitor_api_key_missing");
    const settled = await Promise.allSettled(sources.map(({ load: source }) => source()));
    const items = settled.flatMap((result, index) => {
      if (result.status === "rejected") return [];
      return sources[index].normalize(result.value, now().toISOString());
    });
    if (items.length === 0 && settled.every(({ status }) => status === "rejected")) {
      const first = settled[0];
      throw first.status === "rejected" ? first.reason : new Error("worldmonitor_empty");
    }
    let materialUpdates = 0;
    for (const { observation, evidence } of items) {
      const previousObservation = store.observation(observation.id);
      const previousEvent = store.event(observation.id);
      const material =
        !previousObservation ||
        previousObservation.title !== observation.title ||
        previousObservation.url !== observation.url ||
        JSON.stringify(previousObservation.measurements) !== JSON.stringify(observation.measurements);
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
      id: `worldmonitor:${startedAt}`,
      provider: "worldmonitor",
      startedAt,
      completedAt: now().toISOString(),
      state: "success",
      itemCount: items.length,
      stale: settled.some(({ status }) => status === "rejected"),
      errorClass: settled.some(({ status }) => status === "rejected")
        ? "worldmonitor_partial"
        : undefined,
    });
    const snapshot = materialUpdates > 0 ? rebuildBriefing(store, now().toISOString()) : null;
    if (snapshot?.created) publishBriefingUpdate(snapshot.snapshot.id);
    return { materialUpdates, snapshot };
  } catch (error) {
    store.saveProviderRun({
      id: `worldmonitor:${startedAt}`,
      provider: "worldmonitor",
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
