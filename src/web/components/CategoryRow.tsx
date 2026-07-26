import type { Category } from "../../core/model";

const LABELS: Record<Category, string> = {
  conflict: "Conflict",
  "politics-diplomacy": "Politics & diplomacy",
  security: "Security",
  disasters: "Disasters",
  "climate-environment": "Climate & environment",
  economy: "Economy",
  energy: "Energy",
  "supply-chains": "Supply chains",
  health: "Health",
  "technology-infrastructure": "Technology & infrastructure",
};

export function CategoryRow({
  category,
  score,
  eventCount,
  updatedAt,
  index,
}: {
  category: Category;
  score: number | null;
  eventCount: number;
  updatedAt: string | null;
  index: number;
}) {
  return (
    <li className="category-row">
      <span className="category-row__index">{String(index + 1).padStart(2, "0")}</span>
      <div className="category-row__name">
        <h2>{LABELS[category]}</h2>
        <p>{eventCount > 0 ? `${eventCount} qualifying event${eventCount === 1 ? "" : "s"}` : "No qualifying events"}</p>
      </div>
      <div className="category-row__measure">
        {score === null ? (
          <>
            <span className="category-row__unsupported">Not scored</span>
            <p>Awaiting a supported source</p>
          </>
        ) : (
          <>
            <meter min="0" max="100" value={score} aria-label={`${LABELS[category]} heat ${score} out of 100`} />
            <p>{updatedAt ? `Updated ${updatedAt}` : "Update time unavailable"}</p>
          </>
        )}
      </div>
      <strong className="category-row__score">{score === null ? "—" : score.toFixed(1)}</strong>
    </li>
  );
}
