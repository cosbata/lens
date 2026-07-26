import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { TODAY_EVENTS, type TodayEvent } from "./map/briefing-fixture";
import {
  briefingToPrimaryEvent,
  briefingToTodayEvents,
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

export function App() {
  const [hash, setHash] = useState(currentHash);
  const [events, setEvents] = useState<readonly TodayEvent[]>(TODAY_EVENTS);
  const [primaryEvent, setPrimaryEvent] = useState<TodayEvent>(TODAY_EVENTS[0]);
  const [liveState, setLiveState] = useState<"live" | "polling" | "offline">("polling");
  const needsLiveBriefing = !hash || hash === "#briefing" || hash.startsWith("#event/");

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
        setPrimaryEvent((current) => briefingToPrimaryEvent(briefing, current));
      },
      onState: setLiveState,
    });
  }, [needsLiveBriefing]);

  const eventId = eventIdFromHash(hash);
  const event = events.find(({ id }) => id === eventId) ??
    (primaryEvent.id === eventId ? primaryEvent : undefined);
  if (event) {
    const storyEvents = events.some(({ id }) => id === primaryEvent.id)
      ? events
      : [primaryEvent, ...events];
    return <EventStory event={event} events={storyEvents} />;
  }
  if (hash === "#compare") return <Comparison />;

  return (
    <AppShell liveState={liveState}>
      {hash === "#method"
        ? <Methodology />
        : hash === "#categories"
          ? <AllCategories />
          : <TodayOverview events={events} primaryEvent={primaryEvent} liveState={liveState} />}
    </AppShell>
  );
}
