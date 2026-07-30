import { useCallback, useEffect, useMemo, useState } from "react";
import type { OperationalSignals } from "../../providers/pizzint/client";
import { BriefingBand } from "../components/BriefingBand";
import { MonitorControls, type MapMode } from "../components/MonitorControls";
import { MonitorPanel, MonitorWatchlist } from "../components/MonitorPanel";
import { TODAY_EVENTS, type TodayEvent } from "../map/briefing-fixture";
import {
  MapLegend,
  monitoringGeometryCounts,
  WorldMap,
} from "../map/WorldMap";

export const eventStoryHref = (id: string) => `#event/${id}`;

export function selectPrimaryEvent(events: readonly TodayEvent[]) {
  return events.reduce<TodayEvent | undefined>(
    (primary, event) => !primary || event.score > primary.score ? event : primary,
    undefined,
  );
}

export function filterTodayEvents(
  events: readonly TodayEvent[],
  query: string,
  selectedCategories: readonly string[],
) {
  const needle = query.trim().toLocaleLowerCase();
  return events.filter((event) => {
    if (!selectedCategories.includes(event.category)) return false;
    if (!needle) return true;
    return [
      event.title,
      event.summary,
      event.category,
      event.source,
      event.affected,
    ].some((value) => value.toLocaleLowerCase().includes(needle));
  });
}

export function mapCollectionsForMode(
  mode: MapMode,
  important: readonly TodayEvent[],
  monitored: readonly TodayEvent[],
  live: readonly TodayEvent[],
) {
  if (mode === "important") return { events: important, activityEvents: [] };
  if (mode === "live") return { events: [], activityEvents: live };
  const importantIds = new Set(important.map(({ id }) => id));
  return {
    events: important,
    activityEvents: monitored.filter(({ id }) => !importantIds.has(id)),
  };
}

export function TodayOverview({
  events = TODAY_EVENTS,
  monitoredEvents = [],
  activityEvents = [],
  alertEvents = [],
  primaryEvent,
  liveState = "polling",
  dataState = "empty",
  dataTime,
  operationalSignals,
}: {
  events?: readonly TodayEvent[];
  monitoredEvents?: readonly TodayEvent[];
  activityEvents?: readonly TodayEvent[];
  alertEvents?: readonly TodayEvent[];
  primaryEvent?: TodayEvent;
  liveState?: "live" | "polling" | "offline";
  dataState?: "empty" | "fresh" | "stale" | "degraded";
  dataTime?: string | null;
  operationalSignals?: OperationalSignals;
}) {
  const [activeId, setActiveId] = useState(events[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<MapMode>("monitored");
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  const [countrySelection, setCountrySelection] = useState<{
    name: string;
    eventIds: string[];
  }>();
  const [hasSelectedEvent, setHasSelectedEvent] = useState(false);
  const [showMonitoringGeometry, setShowMonitoringGeometry] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const categories = useMemo(
    () => [...new Set([...events, ...monitoredEvents, ...activityEvents]
      .map((event) => event.category))].sort(),
    [activityEvents, events, monitoredEvents],
  );
  const selectedCategories = useMemo(
    () => categories.filter((category) => !hiddenCategories.has(category)),
    [categories, hiddenCategories],
  );
  const important = useMemo(
    () => filterTodayEvents(events, query, selectedCategories),
    [events, query, selectedCategories],
  );
  const monitored = useMemo(
    () => filterTodayEvents(monitoredEvents, query, selectedCategories),
    [monitoredEvents, query, selectedCategories],
  );
  const live = useMemo(
    () => filterTodayEvents(activityEvents, query, selectedCategories),
    [activityEvents, query, selectedCategories],
  );
  const collections = useMemo(
    () => mapCollectionsForMode(mode, important, monitored, live),
    [important, live, mode, monitored],
  );
  const mapEvents = useMemo(
    () => [...new Map([
      ...collections.events,
      ...collections.activityEvents,
      ...(showAlerts ? alertEvents : []),
    ].map((event) => [event.id, event])).values()],
    [alertEvents, collections, showAlerts],
  );
  const geometryCounts = useMemo(
    () => monitoringGeometryCounts(mapEvents),
    [mapEvents],
  );
  const mainEvent = useMemo(
    () => primaryEvent ?? selectPrimaryEvent(events),
    [events, primaryEvent],
  );
  const activate = useCallback((id: string) => {
    setActiveId(id);
    setCountrySelection(undefined);
    setWatchlistExpanded(false);
    setHasSelectedEvent(true);
  }, []);
  const activateCountry = useCallback((selection: { name: string; eventIds: string[] }) => {
    setCountrySelection(selection);
    setWatchlistExpanded(true);
    const [firstEventId] = selection.eventIds;
    if (firstEventId) {
      setActiveId(firstEventId);
      setHasSelectedEvent(true);
    }
  }, []);
  const activateCountryEvent = useCallback((id: string) => {
    setActiveId(id);
    setHasSelectedEvent(true);
  }, []);
  const toggleCategory = useCallback((category: string) => {
    setHiddenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);
  useEffect(() => {
    if (mapEvents.length && !mapEvents.some(({ id }) => id === activeId)) {
      setActiveId(mapEvents[0].id);
    }
  }, [activeId, mapEvents]);
  const active = mapEvents.find(({ id }) => id === activeId) ?? mapEvents[0];
  const countryEvents = countrySelection
    ? mapEvents.filter(({ id }) => countrySelection.eventIds.includes(id))
    : undefined;
  const showIntro = !hasSelectedEvent && !watchlistExpanded;
  return (
    <section
      className={[
        "today-overview",
        hasSelectedEvent ? "today-overview--selected" : "",
        watchlistExpanded ? "today-overview--list-open" : "",
      ].filter(Boolean).join(" ")}
      aria-labelledby="today-title"
    >
      {active ? (
        <WorldMap
          events={collections.events}
          activityEvents={collections.activityEvents}
          alertEvents={alertEvents}
          activeId={active.id}
          onActivate={activate}
          onCountryActivate={activateCountry}
          showEvents={collections.events.length > 0}
          showActivity={collections.activityEvents.length > 0}
          showMonitoringGeometry={showMonitoringGeometry}
          showAlerts={showAlerts}
          focusActive={hasSelectedEvent}
          showLegend={false}
        />
      ) : <div className="world-map world-map--empty" />}
      {showIntro && (
        <div className="overview-copy">
          <p className="eyebrow">World briefing · {liveState}</p>
          <h1 id="today-title">The world, selected.</h1>
          <p>{mapEvents.length} monitored events are visible. {important.length} are recommended.</p>
        </div>
      )}
      <div className="monitor-stack">
        <div className="monitor-dock">
          <MonitorControls
            query={query}
            categories={categories}
            selectedCategories={selectedCategories}
            resultCount={mapEvents.length}
            mode={mode}
            liveState={liveState}
            dataState={dataState}
            dataTime={dataTime}
            operationalSignals={operationalSignals}
            monitoringGeometryCount={geometryCounts.routes + geometryCounts.areas}
            showMonitoringGeometry={showMonitoringGeometry}
            alertCount={alertEvents.length}
            showAlerts={showAlerts}
            onQueryChange={setQuery}
            onCategoryToggle={toggleCategory}
            onSelectAllCategories={() => setHiddenCategories(new Set())}
            onModeChange={setMode}
            onMonitoringGeometryChange={setShowMonitoringGeometry}
            onAlertsChange={setShowAlerts}
          />
          <MonitorWatchlist
            events={countryEvents ?? (mode === "live" ? live : important)}
            active={active}
            liveState={liveState}
            onSelect={countrySelection ? activateCountryEvent : activate}
            expanded={watchlistExpanded}
            onExpandedChange={setWatchlistExpanded}
            title={countrySelection ? `${countrySelection.name} reports` : "World watchlist"}
          />
        </div>
        <MapLegend events={mapEvents} />
      </div>
      <MonitorPanel
        events={mapEvents}
        active={hasSelectedEvent ? active : undefined}
        liveState={liveState}
        onSelect={activate}
      />
      {mainEvent && showIntro && <BriefingBand events={[mainEvent]} activeIndex={0} />}
    </section>
  );
}
