import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefingBand } from "../components/BriefingBand";
import { MonitorControls } from "../components/MonitorControls";
import { MonitorPanel, MonitorWatchlist } from "../components/MonitorPanel";
import { TODAY_EVENTS, type TodayEvent } from "../map/briefing-fixture";
import { WorldMap } from "../map/WorldMap";

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
  category: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  return events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
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

export function TodayOverview({
  events = TODAY_EVENTS,
  activityEvents = [],
  primaryEvent,
  liveState = "polling",
}: {
  events?: readonly TodayEvent[];
  activityEvents?: readonly TodayEvent[];
  primaryEvent?: TodayEvent;
  liveState?: "live" | "polling" | "offline";
}) {
  const [activeId, setActiveId] = useState(events[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showEvents, setShowEvents] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  const [hasSelectedEvent, setHasSelectedEvent] = useState(false);
  const categories = useMemo(
    () => [...new Set(events.map((event) => event.category))].sort(),
    [events],
  );
  const visibleEvents = useMemo(
    () => filterTodayEvents(events, query, category),
    [category, events, query],
  );
  const mapEvents = useMemo(
    () => [
      ...visibleEvents,
      ...activityEvents.filter(({ id }) => !visibleEvents.some((event) => event.id === id)),
    ],
    [activityEvents, visibleEvents],
  );
  const mainEvent = useMemo(
    () => primaryEvent ?? selectPrimaryEvent(events),
    [events, primaryEvent],
  );
  const activate = useCallback((id: string) => {
    setActiveId(id);
    setWatchlistExpanded(false);
    setHasSelectedEvent(true);
  }, []);
  useEffect(() => {
    if (mapEvents.length && !mapEvents.some(({ id }) => id === activeId)) {
      setActiveId(mapEvents[0].id);
    }
  }, [activeId, mapEvents]);
  const active = mapEvents.find(({ id }) => id === activeId) ?? mapEvents[0];
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
          events={visibleEvents}
          activityEvents={activityEvents}
          activeId={active.id}
          onActivate={activate}
          showEvents={showEvents}
          showActivity={showActivity}
          focusActive={hasSelectedEvent}
        />
      ) : <div className="world-map world-map--empty" />}
      {showIntro && (
        <div className="overview-copy">
          <p className="eyebrow">World briefing · {liveState}</p>
          <h1 id="today-title">The world, selected.</h1>
          <p>{events.length} attributable events are visible across the curated world watchlist.</p>
        </div>
      )}
      <div className="monitor-dock">
        <MonitorControls
          query={query}
          category={category}
          categories={categories}
          resultCount={visibleEvents.length}
          showEvents={showEvents}
          showActivity={showActivity}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onShowEventsChange={setShowEvents}
          onShowActivityChange={setShowActivity}
        />
        <MonitorWatchlist
          events={visibleEvents}
          active={active}
          liveState={liveState}
          onSelect={activate}
          expanded={watchlistExpanded}
          onExpandedChange={setWatchlistExpanded}
          title="World watchlist"
        />
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
