import type { OperationalSignals } from "../../providers/pizzint/client";

export type MapMode = "important" | "monitored" | "live";

export function dataFreshnessLabel(value?: string | null, now = Date.now()) {
  if (!value) return "Waiting for data";
  const elapsed = now - Date.parse(value);
  if (!Number.isFinite(elapsed)) return "Update time unavailable";
  if (elapsed < 60_000) return "Updated just now";
  if (elapsed < 3_600_000) return `Updated ${Math.max(1, Math.floor(elapsed / 60_000))} min ago`;
  return `Updated ${Math.floor(elapsed / 3_600_000)} hr ago`;
}

export function MonitorControls({
  query,
  categories,
  selectedCategories,
  resultCount,
  mode,
  liveState,
  dataState,
  dataTime,
  operationalSignals,
  monitoringGeometryCount,
  showMonitoringGeometry,
  alertCount,
  showAlerts,
  onQueryChange,
  onCategoryToggle,
  onSelectAllCategories,
  onModeChange,
  onMonitoringGeometryChange,
  onAlertsChange,
}: {
  query: string;
  categories: readonly string[];
  selectedCategories: readonly string[];
  resultCount: number;
  mode: MapMode;
  liveState: "live" | "polling" | "offline";
  dataState: "empty" | "fresh" | "stale" | "degraded";
  dataTime?: string | null;
  operationalSignals?: OperationalSignals;
  monitoringGeometryCount: number;
  showMonitoringGeometry: boolean;
  alertCount: number;
  showAlerts: boolean;
  onQueryChange: (value: string) => void;
  onCategoryToggle: (value: string) => void;
  onSelectAllCategories: () => void;
  onModeChange: (value: MapMode) => void;
  onMonitoringGeometryChange: (value: boolean) => void;
  onAlertsChange: (value: boolean) => void;
}) {
  return (
    <aside className="monitor-controls" aria-label="Map filters and layers">
      <header>
        <div>
          <p>Global situation</p>
          <small>
            {liveState === "live" ? "Live stream" : liveState === "polling" ? "Polling" : "Offline"}
            {" · "}
            {dataState === "degraded"
              ? "Partial source outage"
              : dataState === "stale"
                ? "Data delayed"
                : dataFreshnessLabel(dataTime)}
          </small>
        </div>
        <strong>{resultCount} visible</strong>
      </header>
      {operationalSignals && (
        <section className="monitor-signals" aria-label="Operational proxy signals">
          <div>
            <span>PizzINT activity proxy</span>
            <strong>
              {operationalSignals.pizza
                ? `${operationalSignals.pizza.activity.toFixed(0)} / 100`
                : "Unavailable"}
            </strong>
          </div>
          <div>
            <span>Media tension</span>
            <strong>
              {operationalSignals.tensions[0]
                ? `${operationalSignals.tensions[0].label} · ${operationalSignals.tensions[0].trend}`
                : "Unavailable"}
            </strong>
          </div>
          <small>{operationalSignals.caveat}</small>
        </section>
      )}
      <label className="monitor-search">
        <span>Search current events</span>
        <input
          type="search"
          value={query}
          placeholder="Place, event, source…"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>
      <fieldset className="monitor-categories" aria-label="Event categories">
        <legend>Categories</legend>
        {selectedCategories.length < categories.length && (
          <button
            className="monitor-categories__select-all"
            type="button"
            onClick={onSelectAllCategories}
          >
            Select all
          </button>
        )}
        <div className="monitor-categories__options">
          {categories.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={selectedCategories.includes(item)}
                onChange={() => onCategoryToggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="monitor-layers monitor-modes" aria-label="Map display mode">
        <legend>Map display</legend>
        {([
          ["important", "Important"],
          ["monitored", "All monitored"],
          ["live", "Live observations"],
        ] as const).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="map-mode"
              value={value}
              checked={mode === value}
              onChange={() => onModeChange(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="monitor-layers" aria-label="Map context layers">
        <legend>Map context</legend>
        <label>
          <input
            type="checkbox"
            checked={showAlerts}
            onChange={(event) => onAlertsChange(event.currentTarget.checked)}
          />
          <span>Reported alerts ({alertCount})</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showMonitoringGeometry}
            onChange={(event) => onMonitoringGeometryChange(event.currentTarget.checked)}
          />
          <span>Observed routes &amp; areas ({monitoringGeometryCount})</span>
        </label>
      </fieldset>
      <a href="#compare">Watch the last 24 hours →</a>
    </aside>
  );
}
