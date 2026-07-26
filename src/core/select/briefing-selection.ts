import type { Category } from "../model";
import { LENS_V1_SELECTION_THRESHOLD } from "../score/event-score";

export interface BriefingCandidate {
  id: string;
  score: number;
  primaryCategory: Category;
  countries: string[];
  similarity: Record<string, number>;
}

export interface SelectedBriefingEvent extends BriefingCandidate {
  selectionScore: number;
  reasons: string[];
}

const count = (values: string[], value: string) => values.filter((item) => item === value).length;
const round = (value: number) => Math.round(value * 10) / 10;

export function selectBriefing(
  candidates: BriefingCandidate[],
  limit = 8,
): SelectedBriefingEvent[] {
  const remaining = candidates.filter(({ score }) => score >= LENS_V1_SELECTION_THRESHOLD);
  const selected: SelectedBriefingEvent[] = [];

  while (remaining.length > 0 && selected.length < Math.min(8, limit)) {
    const eligible = remaining.filter((candidate) => {
      if (candidate.score >= 90) return true;
      const categories = selected.map(({ primaryCategory }) => primaryCategory);
      const countries = selected.flatMap(({ countries }) => countries);
      return (
        count(categories, candidate.primaryCategory) < 2 &&
        candidate.countries.every((country) => count(countries, country) < 2)
      );
    });
    if (eligible.length === 0) break;

    const ranked = eligible
      .map((candidate) => {
        const maxSimilarity = selected.reduce(
          (highest, event) =>
            Math.max(highest, candidate.similarity[event.id] ?? event.similarity[candidate.id] ?? 0),
          0,
        );
        return {
          ...candidate,
          selectionScore: round(candidate.score * 0.8 - maxSimilarity * 100 * 0.2),
          reasons: [
            `importance.${candidate.score}`,
            `similarity_penalty.${round(maxSimilarity * 20)}`,
            candidate.score >= 90 ? "override.critical_event" : "diversity.passed",
          ],
        };
      })
      .sort(
        (left, right) =>
          right.selectionScore - left.selectionScore ||
          right.score - left.score ||
          left.id.localeCompare(right.id),
      );
    const winner = ranked[0];
    selected.push(winner);
    remaining.splice(remaining.findIndex(({ id }) => id === winner.id), 1);
  }

  return selected;
}
