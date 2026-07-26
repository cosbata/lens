import type { Category } from "../../model";

export const CATEGORY_IMPACT_VERSION = "category-impact-v1";

export type CategoryImpactInput = {
  scale: number;
  exposure: number;
  disruption: number;
  duration: number;
  officialFloor?: number;
};

const WEIGHTS: Record<Category, [number, number, number, number]> = {
  conflict: [0.35, 0.3, 0.2, 0.15],
  "politics-diplomacy": [0.2, 0.25, 0.35, 0.2],
  security: [0.3, 0.25, 0.3, 0.15],
  disasters: [0.4, 0.3, 0.2, 0.1],
  "climate-environment": [0.25, 0.25, 0.2, 0.3],
  economy: [0.25, 0.2, 0.35, 0.2],
  energy: [0.3, 0.2, 0.35, 0.15],
  "supply-chains": [0.2, 0.2, 0.45, 0.15],
  health: [0.25, 0.4, 0.15, 0.2],
  "technology-infrastructure": [0.25, 0.25, 0.4, 0.1],
};

export function calculateCategoryImpact(category: Category, input: CategoryImpactInput) {
  const components = [input.scale, input.exposure, input.disruption, input.duration];
  if (
    components.some((value) => !Number.isFinite(value) || value < 0 || value > 100) ||
    (input.officialFloor !== undefined &&
      (!Number.isFinite(input.officialFloor) || input.officialFloor < 0 || input.officialFloor > 100))
  ) {
    throw new Error("invalid_category_impact");
  }
  const weights = WEIGHTS[category];
  const raw = Math.round(
    components.reduce((sum, value, index) => sum + value * weights[index], 0) * 10,
  ) / 10;
  const domainImpact = Math.max(raw, input.officialFloor ?? 0);
  return {
    version: CATEGORY_IMPACT_VERSION,
    category,
    domainImpact,
    components: {
      scale: input.scale,
      exposure: input.exposure,
      disruption: input.disruption,
      duration: input.duration,
    },
    weights: {
      scale: weights[0],
      exposure: weights[1],
      disruption: weights[2],
      duration: weights[3],
    },
    reasons: [
      `impact.raw.${raw}`,
      domainImpact > raw ? `floor.official.${input.officialFloor}` : null,
    ].filter((reason): reason is string => reason !== null),
  };
}
