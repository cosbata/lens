import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATEGORIES, type Category } from "../../../../src/core/model";
import {
  CATEGORY_IMPACT_VERSION,
  calculateCategoryImpact,
  type CategoryImpactInput,
} from "../../../../src/core/score/impact/category-impact";

const golden = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/scoring/categories/golden-v1.json", import.meta.url),
    "utf8",
  ),
) as Array<{ category: Category; input: CategoryImpactInput; expected: number }>;

describe("category impact golden fixtures", () => {
  it("covers all ten fixed categories with versioned deterministic outputs", () => {
    expect(golden.map(({ category }) => category)).toEqual(CATEGORIES);
    for (const fixture of golden) {
      expect(calculateCategoryImpact(fixture.category, fixture.input)).toMatchObject({
        version: CATEGORY_IMPACT_VERSION,
        category: fixture.category,
        domainImpact: fixture.expected,
      });
    }
  });

  it("applies a documented official floor and rejects invalid inputs", () => {
    expect(calculateCategoryImpact("disasters", golden[3].input).reasons)
      .toContain("floor.official.75");
    expect(() => calculateCategoryImpact("health", {
      scale: 101,
      exposure: 0,
      disruption: 0,
      duration: 0,
    })).toThrowError("invalid_category_impact");
  });
});
