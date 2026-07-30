import { useEffect, useState } from "react";
import type { OperationalSignals } from "../providers/pizzint/client";
import { AppShell } from "./components/AppShell";
import { TODAY_EVENTS, type TodayEvent } from "./map/briefing-fixture";
import {
  briefingToActivityEvents,
  briefingToMonitoredEvents,
  briefingToPrimaryEvent,
  briefingToTodayEvents,
  operationalLayersToAlertEvents,
  type OperationalLayersResponse,
  watchBriefing,
} from "./data/live-briefing";
import { EventStory } from "./screens/EventStory";
import { Comparison } from "./screens/Comparison";
import { AllCategories } from "./screens/AllCategories";
import { Methodology } from "./screens/Methodology";
import { TodayOverview } from "./screens/TodayOverview";
import "./styles/global.css";

function currentHash() {
  if (typeof window === "undefined") return null;
  return window.location.hash;
}

function eventIdFromHash(hash: string | null) {
  const match = hash?.match(/^#event\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function comparisonEventIdFromHash(hash: string | null) {
  const match = hash?.match(/^#compare\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const [hash, setHash] = useState(currentHash);
  const [events, setEvents] = useState<readonly TodayEvent[]>(TODAY_EVENTS);
  const [monitoredEvents, setMonitoredEvents] = useState<readonly TodayEvent[]>([]);
  const [activityEvents, setActivityEvents] = useState<readonly TodayEvent[]>([]);
  const [primaryEvent, setPrimaryEvent] = useState<TodayEvent>(TODAY_EVENTS[0]);
  const [liveState, setLiveState] = useState<"live" | "polling" | "offline">("polling");
  const [dataState, setDataState] = useState<"empty" | "fresh" | "stale" | "degraded">("empty");
  const [dataTime, setDataTime] = useState<string | null>(null);
  const [operationalSignals, setOperationalSignals] = useState<OperationalSignals>();
  const [alertEvents, setAlertEvents] = useState<readonly TodayEvent[]>([]);
  const needsLiveBriefing = !hash ||
    hash === "#briefing" ||
    hash.startsWith("#event/") ||
    hash.startsWith("#compare/");

  useEffect(() => {
    const updateRoute = () => setHash(currentHash());
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    if (!needsLiveBriefing) return;
    return watchBriefing({
      onBriefing: (briefing) => {
        setEvents((current) => briefingToTodayEvents(briefing, current));
        setMonitoredEvents(briefingToMonitoredEvents(briefing));
        setActivityEvents(briefingToActivityEvents(briefing));
        setPrimaryEvent((current) => briefingToPrimaryEvent(briefing, current));
        setDataState(briefing.meta.state);
        setDataTime(briefing.meta.dataTime);
      },
      onState: setLiveState,
    });
  }, [needsLiveBriefing]);

  useEffect(() => {
    if (!needsLiveBriefing) return;
    let stopped = false;
    const refresh = async () => {
      await Promise.all([
        fetch("/api/v1/operational-signals")
          .then(async (response) => {
            if (!response.ok) return;
            const body = await response.json() as { data: OperationalSignals };
            if (!stopped) setOperationalSignals(body.data);
          })
          .catch(() => undefined),
        fetch("/api/v1/operational-layers")
          .then(async (response) => {
            if (!response.ok) return;
            const body = await response.json() as OperationalLayersResponse;
            if (!stopped) setAlertEvents(operationalLayersToAlertEvents(body));
          })
          .catch(() => undefined),
      ]);
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [needsLiveBriefing]);

  const eventId = eventIdFromHash(hash);
  const comparisonEventId = comparisonEventIdFromHash(hash);
  const availableEvents = [
    ...events,
    ...monitoredEvents.filter(({ id }) => !events.some((event) => event.id === id)),
    ...activityEvents.filter(({ id }) =>
      !events.some((event) => event.id === id) &&
      !monitoredEvents.some((event) => event.id === id)),
  ];
  const event = availableEvents.find(({ id }) => id === eventId) ??
    (primaryEvent.id === eventId ? primaryEvent : undefined) ??
    TODAY_EVENTS.find(({ id }) => id === eventId);
  if (event) {
    const storyEvents = availableEvents.some(({ id }) => id === primaryEvent.id)
      ? availableEvents
      : [primaryEvent, ...availableEvents];
    return <EventStory event={event} events={storyEvents} />;
  }
  const comparisonEvent = availableEvents.find(({ id }) => id === comparisonEventId) ??
    (primaryEvent.id === comparisonEventId ? primaryEvent : undefined) ??
    TODAY_EVENTS.find(({ id }) => id === comparisonEventId);
  if (hash === "#compare" || comparisonEventId) {
    return <Comparison key={comparisonEvent?.id ?? "global"} event={comparisonEvent} />;
  }

  return (
    <AppShell liveState={liveState}>
      {hash === "#method"
        ? <Methodology />
        : hash === "#categories"
          ? <AllCategories />
          : <TodayOverview
              events={events}
              monitoredEvents={monitoredEvents}
              activityEvents={activityEvents}
              alertEvents={alertEvents}
              primaryEvent={primaryEvent}
              liveState={liveState}
              dataState={dataState}
              dataTime={dataTime}
              operationalSignals={operationalSignals}
            />}
    </AppShell>
  );
}
