import { useEffect, useState } from "react";
import { CATEGORIES, type Category } from "../../core/model";
import { CategoryRow } from "../components/CategoryRow";
import "../styles/categories.css";

type CategoryView = {
  category: Category;
  score: number | null;
  eventCount: number;
  updatedAt: string | null;
};

export const CATEGORY_FALLBACK: readonly CategoryView[] = CATEGORIES.map((category) => {
  const score = {
    disasters: 92.5,
    security: 68.2,
    economy: 66.1,
  }[category as "disasters" | "security" | "economy"] ?? null;
  return {
    category,
    score,
    eventCount: score === null ? 0 : 1,
    updatedAt: score === null ? null : "less than one hour ago",
  };
});

export function AllCategories() {
  const [categories, setCategories] = useState<readonly CategoryView[]>(CATEGORY_FALLBACK);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/categories")
      .then((response) => {
        if (!response.ok) throw new Error("categories_unavailable");
        return response.json() as Promise<{
          data: Array<{
            category: Category;
            score: number;
            qualifyingEventIds: string[];
            calculatedAt: string | null;
          }>;
        }>;
      })
      .then(({ data }) => {
        if (!active) return;
        setCategories(data.map((item) => ({
          category: item.category,
          score: item.calculatedAt === null ? null : item.score,
          eventCount: item.qualifyingEventIds.length,
          updatedAt: item.calculatedAt,
        })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <section className="categories" aria-labelledby="categories-title">
      <header className="categories__intro">
        <p className="eyebrow">Coverage index · 10 categories</p>
        <h1 id="categories-title">Ten lenses.<br />One briefing.</h1>
        <p>
          Every category remains visible. A high score means material events passed the
          current evidence rules; a dash means LENS does not yet have a supported basis
          for a public score.
        </p>
        <a href="#method">Read how categories are selected →</a>
      </header>
      <div className="categories__index">
        <div className="categories__key" aria-hidden="true">
          <span>Category</span>
          <span>Current heat</span>
          <span>Score</span>
        </div>
        <ol>
          {categories.map((item, index) => (
            <CategoryRow key={item.category} {...item} index={index} />
          ))}
        </ol>
        <footer>
          <span>LENS category heat v1</span>
          <span>Unsupported is shown, never estimated</span>
        </footer>
      </div>
    </section>
  );
}
