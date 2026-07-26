import { clusterObservations, type ClusterObservation } from "../cluster/deterministic";
import type { Category, EventPhase } from "../model";
import type { ConfidenceSource } from "../model/source-policy";
import { selectBriefing } from "../select/briefing-selection";
import { calculateCategoryHeat } from "../score/category-heat";
import { calculateConfidence } from "../score/confidence";
import { calculateEventScore } from "../score/event-score";

export interface ReplayEvent extends ClusterObservation {
  category: Category;
  countries: string[];
  domainImpact: number;
  urgency: number;
  momentum: number;
  geographicReach: number;
  anomaly: number;
  cascadeRelevance: number;
  phase: EventPhase;
  lastMaterialUpdateAt: string;
  sources: ConfidenceSource[];
}

export interface ReplayFixture {
  id: string;
  now: string;
  events: ReplayEvent[];
}

export function runFixturePipeline(fixture: ReplayFixture) {
  if (
    !fixture ||
    typeof fixture.id !== "string" ||
    !Number.isFinite(Date.parse(fixture.now)) ||
    !Array.isArray(fixture.events)
  ) {
    throw new Error("invalid_replay_fixture");
  }

  const byId = new Map(fixture.events.map((event) => [event.id, event]));
  const clusters = clusterObservations(fixture.events);
  const scored = clusters.map((ids) => {
    const event = byId.get(ids[0]);
    if (!event) throw new Error("invalid_replay_cluster");
    const sources = ids.flatMap((id) => byId.get(id)?.sources ?? []);
    const confidence = calculateConfidence(sources);
    const score = calculateEventScore({
      domainImpact: event.domainImpact,
      urgency: event.urgency,
      momentum: event.momentum,
      geographicReach: event.geographicReach,
      anomaly: event.anomaly,
      cascadeRelevance: event.cascadeRelevance,
      confidence: confidence.confidence,
      category: event.category,
      phase: event.phase,
      lastMaterialUpdateAt: event.lastMaterialUpdateAt,
      now: fixture.now,
    });
    return {
      id: event.id,
      primaryCategory: event.category,
      relatedCategories: [],
      countries: event.countries,
      score: score.finalScore,
      similarity: {},
      observationIds: ids,
      confidence,
      scoreBreakdown: score,
    };
  });

  const categories = [...new Set(scored.map(({ primaryCategory }) => primaryCategory))]
    .map((category) => calculateCategoryHeat(category, scored))
    .sort((left, right) => right.score - left.score || left.category.localeCompare(right.category));
  const selected = selectBriefing(scored);

  return {
    id: fixture.id,
    createdAt: fixture.now,
    rankingVersion: "lens-v1",
    eventIds: selected.map(({ id }) => id),
    events: selected.map((selection) => {
      const event = scored.find(({ id }) => id === selection.id);
      return {
        id: selection.id,
        observationIds: event?.observationIds ?? [],
        score: event?.score ?? 0,
        scoreReasons: event?.scoreBreakdown.reasons ?? [],
        confidenceReasons: event?.confidence.reasons ?? [],
        selectionReasons: selection.reasons,
      };
    }),
    categoryScores: categories,
    providerHealth: [{ provider: "fixture", state: "success", stale: false }],
  };
}
