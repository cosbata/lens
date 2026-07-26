export function MonitorControls({
  query,
  category,
  categories,
  resultCount,
  showEvents,
  showActivity,
  onQueryChange,
  onCategoryChange,
  onShowEventsChange,
  onShowActivityChange,
}: {
  query: string;
  category: string;
  categories: readonly string[];
  resultCount: number;
  showEvents: boolean;
  showActivity: boolean;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onShowEventsChange: (value: boolean) => void;
  onShowActivityChange: (value: boolean) => void;
}) {
  return (
    <aside className="monitor-controls" aria-label="Map filters and layers">
      <header>
        <p>Global situation</p>
        <strong>{resultCount} visible</strong>
      </header>
      <label className="monitor-search">
        <span>Search current events</span>
        <input
          type="search"
          value={query}
          placeholder="Place, event, source…"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>
      <label className="monitor-category">
        <span>Category</span>
        <select value={category} onChange={(event) => onCategoryChange(event.currentTarget.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <fieldset className="monitor-layers">
        <legend>Map layers</legend>
        <label>
          <input
            type="checkbox"
            checked={showEvents}
            onChange={(event) => onShowEventsChange(event.currentTarget.checked)}
          />
          <span>Selected events</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showActivity}
            onChange={(event) => onShowActivityChange(event.currentTarget.checked)}
          />
          <span>Observed activity</span>
        </label>
      </fieldset>
      <a href="#compare">Watch the last 24 hours →</a>
    </aside>
  );
}
