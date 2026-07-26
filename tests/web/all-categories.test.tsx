import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../../src/core/model";
import { CATEGORY_FALLBACK, AllCategories } from "../../src/web/screens/AllCategories";

describe("all categories index", () => {
  it("renders every fixed category and explicit unsupported states", () => {
    const html = renderToStaticMarkup(<AllCategories />);

    expect(CATEGORY_FALLBACK).toHaveLength(10);
    for (const category of CATEGORIES) {
      expect(CATEGORY_FALLBACK.some((item) => item.category === category)).toBe(true);
    }
    expect(html.match(/<li class="category-row">/g)).toHaveLength(10);
    expect(html).toContain("Not scored");
    expect(html).toContain("Awaiting a supported source");
    expect(html).toContain("Unsupported is shown, never estimated");
    expect(html).toContain('aria-label="Disasters heat 92.5 out of 100"');
  });
});
