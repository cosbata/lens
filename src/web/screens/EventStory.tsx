import { useCallback, useEffect, useState } from "react";
import { EventSidecar } from "../components/EventSidecar";
import { TODAY_EVENTS, type TodayEvent } from "../map/briefing-fixture";
import { WorldMap } from "../map/WorldMap";
import "../styles/event-story.css";

export function EventStory({
  event,
  events = TODAY_EVENTS,
}: {
  event: TodayEvent;
  events?: readonly TodayEvent[];
}) {
  const position = events.findIndex(({ id }) => id === event.id) + 1;
  const [activeChapter, setActiveChapter] = useState(0);
  const chapter = event.storyChapters[activeChapter];
  const openEvent = useCallback((id: string) => {
    window.location.hash = `#event/${id}`;
  }, []);

  useEffect(() => setActiveChapter(0), [event.id]);

  return (
    <main className="event-story">
      <a className="skip-link" href="#event-story-title">Skip to story</a>
      <header className="event-story__header">
        <a className="wordmark" href="#briefing" aria-label="Back to LENS briefing">LENS</a>
        <p>{event.title}</p>
        <nav aria-label="Story actions">
          <a href="#compare">Compare 24h</a>
          <a href={event.evidence[0].url} target="_blank" rel="noreferrer" aria-label="Open primary source">Source ↗</a>
          <a href="#briefing" aria-label="Close event story">Close</a>
        </nav>
      </header>
      <div className="event-story__layout">
        <EventSidecar
          key={event.id}
          event={event}
          events={events}
          position={position}
          activeChapter={activeChapter}
          onChapterChange={setActiveChapter}
        />
        <section className="event-story__map" id="event-map" aria-label={`Map of ${event.title}`}>
          <div className="event-story__map-status">
            <span>{String(activeChapter + 1).padStart(2, "0")} / {String(event.storyChapters.length).padStart(2, "0")}</span>
            <span>{chapter.eyebrow}</span>
          </div>
          <WorldMap
            events={events}
            activeId={event.id}
            onActivate={openEvent}
            focus={{ coordinates: chapter.coordinates, zoom: chapter.zoom }}
          />
          <div className="event-story__map-caption">
            <p>{chapter.mapNote}</p>
            <span>{event.category} · Updated {event.updatedAt}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
