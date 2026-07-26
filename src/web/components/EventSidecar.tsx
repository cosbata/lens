import { useRef, type UIEvent } from "react";
import type { TodayEvent } from "../map/briefing-fixture";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { buildStoryThread } from "../../core/cluster/story-thread";
import { StoryThread } from "./StoryThread";
import { EventMedia } from "./EventMedia";

export function nearestChapterIndex(offsets: number[], target: number) {
  return offsets.reduce(
    (nearest, offset, index) =>
      Math.abs(offset - target) < Math.abs(offsets[nearest] - target) ? index : nearest,
    0,
  );
}

export function EventSidecar({
  event,
  events,
  position,
  activeChapter,
  onChapterChange,
}: {
  event: TodayEvent;
  events: readonly TodayEvent[];
  position: number;
  activeChapter: number;
  onChapterChange: (index: number) => void;
}) {
  const previous = events[(position - 2 + events.length) % events.length];
  const next = events[position % events.length];
  const sections = useRef<(HTMLElement | null)[]>([]);
  const thread = buildStoryThread(
    events.map((item) => ({
      id: item.id,
      title: item.title,
      occurredAt: item.evidence[0]?.time ?? item.updatedAt,
      category: item.category,
    })),
    [],
  );

  const handleScroll = (scrollEvent: UIEvent<HTMLDivElement>) => {
    const container = scrollEvent.currentTarget;
    const offsets = sections.current.map((section) => section?.offsetTop ?? 0);
    const index = nearestChapterIndex(offsets, container.scrollTop + container.clientHeight * 0.3);
    if (index !== activeChapter) onChapterChange(index);
  };

  const showChapter = (index: number) => {
    sections.current[index]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <aside className="event-sidecar" aria-labelledby="event-story-title">
      <nav className="chapter-rail" aria-label="Story chapters">
        {event.storyChapters.map((chapter, index) => (
          <button
            key={chapter.id}
            type="button"
            aria-label={`Show chapter ${index + 1}: ${chapter.eyebrow}`}
            aria-current={index === activeChapter ? "step" : undefined}
            onClick={() => showChapter(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </nav>
      <div className="event-sidecar__scroll" onScroll={handleScroll}>
        <p className="event-sidecar__chapter">
          Briefing {String(position).padStart(2, "0")} / {String(events.length).padStart(2, "0")}
        </p>
        <nav className="event-switcher" aria-label="Switch briefing event">
          {events.map((option, index) => (
            <a
              key={option.id}
              href={`#event/${option.id}`}
              aria-current={option.id === event.id ? "page" : undefined}
              aria-label={`Show ${option.title}`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {option.category}
            </a>
          ))}
        </nav>
        <h1 id="event-story-title">{event.title}</h1>
        <EventMedia media={event.media} variant="light" className="event-sidecar__media" />
        <a className="map-action" href="#event-map">
          <span aria-hidden="true">◎</span> Locate this event
        </a>

        {event.storyChapters.map((chapter, index) => (
          <section
            className="story-chapter"
            key={chapter.id}
            ref={(node) => { sections.current[index] = node; }}
            data-story-chapter={chapter.id}
            aria-labelledby={`${event.id}-${chapter.id}-title`}
          >
            <p className="story-chapter__index">
              {String(index + 1).padStart(2, "0")} / {String(event.storyChapters.length).padStart(2, "0")}
            </p>
            <p className="sidecar-label">{chapter.eyebrow}</p>
            <h2 id={`${event.id}-${chapter.id}-title`}>{chapter.title}</h2>
            <p className="story-chapter__body">{chapter.body}</p>
            <p className="story-chapter__map-note"><strong>This map:</strong> {chapter.mapNote}</p>

            {chapter.id === "watch" && (
              <div className="story-chapter__evidence">
                <EvidenceTimeline evidence={event.evidence} />
                <StoryThread thread={thread} activeEventId={event.id} />
                <details className="selection-note">
                  <summary>Why this was selected</summary>
                  <p>{event.selectionReason}</p>
                  <p>Selection score {event.score} · LENS v1</p>
                </details>
              </div>
            )}
          </section>
        ))}
      </div>

      <footer className="event-sidecar__footer">
        <a href={`#event/${previous.id}`} aria-label={`Previous event: ${previous.title}`}>← Previous</a>
        <p>{event.source} · Updated {event.updatedAt}</p>
        <p>{String(position).padStart(2, "0")} / {String(events.length).padStart(2, "0")}</p>
        <a href={`#event/${next.id}`} aria-label={`Next event: ${next.title}`}>Next →</a>
      </footer>
    </aside>
  );
}
