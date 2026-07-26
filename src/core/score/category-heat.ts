import type { Category } from "../model";

export interface CategoryEvent {
  id: string;
  primaryCategory: Category;
  relatedCategories: Category[];
  score: number;
  countries: string[];
}

export interface CategoryHeat {
  category: Category;
  score: number;
  qualifyingEventIds: string[];
  topEventScore: number;
  breadthBonus: number;
  velocityBonus: number;
  automaticInclude: boolean;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function calculateCategoryHeat(
  category: Category,
  events: CategoryEvent[],
  baselineTopScore = 0,
): CategoryHeat {
  const ranked = events
    .filter(({ primaryCategory, score }) => primaryCategory === category && score >= 55)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  const [top, second, third] = ranked;
  const countries = new Set(ranked.flatMap(({ countries }) => countries));
  const breadthBonus = Math.min(
    8,
    Math.max(0, ranked.length - 1) + Math.max(0, countries.size - 1) * 2,
  );
  const topEventScore = top?.score ?? 0;
  const velocityBonus = Math.min(8, Math.max(0, (topEventScore - baselineTopScore) / 5));
  const score = Math.min(
    100,
    round(
      topEventScore +
        (second?.score ?? 0) * 0.12 +
        (third?.score ?? 0) * 0.08 +
        breadthBonus +
        velocityBonus,
    ),
  );

  return {
    category,
    score,
    qualifyingEventIds: ranked.map(({ id }) => id),
    topEventScore,
    breadthBonus,
    velocityBonus: round(velocityBonus),
    automaticInclude: topEventScore >= 85,
  };
}

export function selectTodaysFocus(categories: CategoryHeat[]): CategoryHeat[] {
  const ranked = [...categories].sort(
    (left, right) =>
      Number(right.automaticInclude) - Number(left.automaticInclude) ||
      right.score - left.score ||
      left.category.localeCompare(right.category),
  );
  const selected = ranked.filter(({ score, automaticInclude }) => score >= 60 || automaticInclude);
  if (selected.length < 3) {
    for (const category of ranked) {
      if (selected.length >= 3) break;
      if (category.score >= 45 && !selected.includes(category)) selected.push(category);
    }
  }
  return selected.slice(0, 5);
}
