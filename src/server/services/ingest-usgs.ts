import { CATEGORIES, type EventCluster, type EventScore, type Observation } from "../../core/model";
import { calculateCategoryHeat } from "../../core/score/category-heat";
import { calculateConfidence } from "../../core/score/confidence";
import { calculateEarthquakeImpact } from "../../core/score/disaster-impact";
import { calculateEventScore } from "../../core/score/event-score";
import { selectBriefing } from "../../core/select/briefing-selection";
import { fetchUsgsEvents } from "../../providers/usgs/client";
import { normalizeUsgsEvent } from "../../providers/usgs/normalize";
import type { LensStore } from "../store";
import { buildBriefingSnapshot } from "./build-briefing";
import { persistBriefingSnapshot } from "../store/briefing-snapshots";
import { publishBriefingUpdate } from "../api/stream";

type UsgsPayload = Awaited<ReturnType<typeof fetchUsgsEvents>>;

const number = (value: unknown) => typeof value === "number" ? value : 0;
const clamp = (value: number) => Math.min(100, Math.max(0, value));

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
    lastMaterialUpdateAt: String(observation.extension.revisionAt ?? observation.fetchedAt),
    phase: "active",
    measurements: observation.measurements,
    evidenceIds: [`${observation.id}:evidence`],
    sourceFamilies: ["usgs"],
  };
}

function scoreEvent(event: EventCluster, now: string): EventScore {
  const magnitude = number(event.measurements.magnitude);
  const significance = number(event.measurements.significance);
  const felt = event.measurements.felt;
  const tsunami = event.measurements.tsunami === true;
  const alert = event.measurements.alert;
  const impact = calculateEarthquakeImpact({
    magnitude,
    significance,
    felt: typeof felt === "number" ? felt : null,
    tsunami,
    alert: alert === "green" || alert === "yellow" || alert === "orange" || alert === "red"
      ? alert
      : null,
  });
  const confidence = calculateConfidence([{
    sourceId: "usgs",
    sourceFamily: "usgs",
    authority: "official",
    structured: true,
    completeness: 100,
  }]);
  const score = calculateEventScore({
    domainImpact: impact.domainImpact,
    urgency: clamp(significance / 10),
    momentum: 60,
    geographicReach: tsunami ? 70 : 25,
    anomaly: clamp((magnitude - 4) * 25),
    cascadeRelevance: tsunami ? 80 : 25,
    confidence: confidence.confidence,
    category: "disasters",
    phase: event.phase,
    lastMaterialUpdateAt: event.lastMaterialUpdateAt,
    now,
    officialFloor: Math.max(impact.floor, magnitude >= 6 ? 60 : magnitude >= 5 ? 50 : 0),
  });
  return {
    eventId: event.id,
    version: score.version,
    domainImpact: impact.domainImpact,
    urgency: clamp(significance / 10),
    momentum: 60,
    reach: tsunami ? 70 : 25,
    anomaly: clamp((magnitude - 4) * 25),
    cascade: tsunami ? 80 : 25,
    confidence: confidence.confidence,
    freshness: score.freshnessFactor * 100,
    finalScore: score.finalScore,
    floors: score.floorApplied === null ? [] : [`official.${score.floorApplied}`],
    reasons: [...impact.reasons, ...confidence.reasons, ...score.reasons],
    calculatedAt: now,
  };
}

export function rebuildBriefing(store: LensStore, now: string) {
  const scored = store.events().flatMap((event) => {
    if (event.phase === "resolved") return [];
    const score = store.eventScores(event.id)[0];
    return score ? [{ event, score }] : [];
  });
  const selected = selectBriefing(scored.map(({ event, score }) => ({
    id: event.id,
    score: score.finalScore,
    primaryCategory: event.primaryCategory,
    countries: event.affectedCountries,
    similarity: {},
  })));
  const categoryScores = CATEGORIES.map((category) => {
    const heat = calculateCategoryHeat(category, scored.map(({ event, score }) => ({
      id: event.id,
      primaryCategory: event.primaryCategory,
      relatedCategories: event.relatedCategories,
      score: score.finalScore,
      countries: event.affectedCountries,
    })));
    return { ...heat, calculatedAt: now, rankingVersion: "lens-v1" };
  });
  return persistBriefingSnapshot(store, buildBriefingSnapshot({
    id: `briefing:${now}`,
    createdAt: now,
    eventIds: selected.map(({ id }) => id),
    categoryScores,
    rankingVersion: "lens-v1",
    providerRuns: store.providerRuns(),
  }));
}

export async function ingestUsgs({
  store,
  now,
  load = fetchUsgsEvents,
}: {
  store: LensStore;
  now: () => Date;
  load?: () => Promise<UsgsPayload>;
}) {
  const startedAt = now().toISOString();
  try {
    const payloads = await load();
    let materialUpdates = 0;
    for (const payload of payloads) {
      const { observation, evidence } = normalizeUsgsEvent(
        payload.feature,
        payload.detail,
        now().toISOString(),
      );
      const previousObservation = store.observation(observation.id);
      const previousEvent = store.event(observation.id);
      const material =
        !previousObservation ||
        previousObservation.extension.revisionAt !== observation.extension.revisionAt;
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
      id: `usgs:${startedAt}`,
      provider: "usgs",
      startedAt,
      completedAt: now().toISOString(),
      state: "success",
      itemCount: payloads.length,
      stale: false,
    });
    const snapshot = materialUpdates > 0 ? rebuildBriefing(store, now().toISOString()) : null;
    if (snapshot?.created) publishBriefingUpdate(snapshot.snapshot.id);
    return { materialUpdates, snapshot };
  } catch (error) {
    store.saveProviderRun({
      id: `usgs:${startedAt}`,
      provider: "usgs",
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
