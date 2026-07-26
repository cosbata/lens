import type { Category, EventPhase } from "../model";
import { calculateFreshness } from "./freshness";

export const EVENT_SCORE_VERSION = "lens-v1";
export const LENS_V1_SELECTION_THRESHOLD = 55;

export interface EventScoreInput {
  domainImpact: number;
  urgency: number;
  momentum: number;
  geographicReach: number;
  anomaly: number;
  cascadeRelevance: number;
  confidence: number;
  category: Category;
  phase: EventPhase;
  lastMaterialUpdateAt: string;
  now: string;
  officialFloor?: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function calculateEventScore(input: EventScoreInput) {
  const components = [
    input.domainImpact,
    input.urgency,
    input.momentum,
    input.geographicReach,
    input.anomaly,
    input.cascadeRelevance,
    input.confidence,
  ];
  if (components.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("invalid_event_score_component");
  }
  if (
    input.officialFloor !== undefined &&
    (!Number.isFinite(input.officialFloor) || input.officialFloor < 0 || input.officialFloor > 100)
  ) {
    throw new Error("invalid_event_score_floor");
  }

  const baseScore = round(
    input.domainImpact * 0.4 +
      input.urgency * 0.15 +
      input.momentum * 0.15 +
      input.geographicReach * 0.1 +
      input.anomaly * 0.1 +
      input.cascadeRelevance * 0.1,
  );
  const freshness = calculateFreshness(
    input.category,
    input.phase,
    input.lastMaterialUpdateAt,
    input.now,
  );
  const calculated = round(baseScore * (input.confidence / 100) * freshness.factor);
  const floorIsLive =
    input.officialFloor !== undefined && freshness.ageHours <= freshness.halfLifeHours;
  const finalScore = floorIsLive ? Math.max(calculated, input.officialFloor as number) : calculated;

  return {
    version: EVENT_SCORE_VERSION,
    baseScore,
    confidenceMultiplier: input.confidence / 100,
    freshnessFactor: freshness.factor,
    finalScore,
    floorApplied: floorIsLive && finalScore > calculated ? input.officialFloor : null,
    reasons: [
      `freshness.age_hours.${freshness.ageHours}`,
      floorIsLive && finalScore > calculated ? "floor.official_live" : null,
      input.officialFloor !== undefined && !floorIsLive ? "floor.official_stale_ignored" : null,
    ].filter((reason): reason is string => reason !== null),
  };
}
