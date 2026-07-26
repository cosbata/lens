import { describe, expect, it } from "vitest";
import {
  calculateCategoryHeat,
  selectTodaysFocus,
  type CategoryEvent,
} from "../../../src/core/score/category-heat";

const event = (overrides: Partial<CategoryEvent> = {}): CategoryEvent => ({
  id: "event-1",
  primaryCategory: "disasters",
  relatedCategories: [],
  score: 70,
  countries: ["KR"],
  ...overrides,
});

describe("category heat", () => {
  it("uses only primary-category events and returns the documented components", () => {
    const result = calculateCategoryHeat("disasters", [
      event(),
      event({ id: "event-2", score: 60, countries: ["JP"] }),
      event({
        id: "secondary",
        primaryCategory: "security",
        relatedCategories: ["disasters"],
        score: 99,
      }),
    ], 50);

    expect(result.qualifyingEventIds).toEqual(["event-1", "event-2"]);
    expect(result).toMatchObject({
      score: 84.2,
      breadthBonus: 3,
      velocityBonus: 4,
    });
  });

  it("automatically includes a category containing an 85-point event", () => {
    const heat = calculateCategoryHeat("disasters", [event({ score: 85 })], 100);
    expect(heat.automaticInclude).toBe(true);
    expect(selectTodaysFocus([heat])).toEqual([heat]);
  });

  it("does not fill Today's Focus with weak categories", () => {
    const categories = [
      { ...calculateCategoryHeat("disasters", [event({ score: 65 })]), score: 65 },
      { ...calculateCategoryHeat("security", []), score: 48 },
      { ...calculateCategoryHeat("economy", []), score: 44 },
    ];

    expect(selectTodaysFocus(categories).map(({ category }) => category))
      .toEqual(["disasters", "security"]);
  });
});
