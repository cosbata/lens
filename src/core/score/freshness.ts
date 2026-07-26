import type { Category, EventPhase } from "../model";

const HALF_LIFE_HOURS: Record<Category, number> = {
  conflict: 24,
  "politics-diplomacy": 48,
  security: 12,
  disasters: 12,
  "climate-environment": 24 * 7,
  economy: 48,
  energy: 24,
  "supply-chains": 24,
  health: 48,
  "technology-infrastructure": 24,
};

const PHASE_AGE_MULTIPLIER: Record<EventPhase, number> = {
  emerging: 1,
  active: 1,
  recovering: 1.5,
  resolved: 2,
};

export function calculateFreshness(
  category: Category,
  phase: EventPhase,
  lastMaterialUpdateAt: string,
  now: string,
): { factor: number; ageHours: number; halfLifeHours: number } {
  const updated = Date.parse(lastMaterialUpdateAt);
  const current = Date.parse(now);
  if (!Number.isFinite(updated) || !Number.isFinite(current) || updated > current) {
    throw new Error("invalid_freshness_time");
  }

  const ageHours = (current - updated) / 3_600_000;
  const halfLifeHours = HALF_LIFE_HOURS[category];
  const decay = 2 ** (-(ageHours * PHASE_AGE_MULTIPLIER[phase]) / halfLifeHours);
  return {
    factor: Math.round((0.7 + 0.3 * decay) * 10_000) / 10_000,
    ageHours: Math.round(ageHours * 10) / 10,
    halfLifeHours,
  };
}
