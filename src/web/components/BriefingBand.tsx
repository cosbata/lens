import type { KeyboardEvent } from "react";
import type { TodayEvent } from "../map/briefing-fixture";
import { StoryProgress } from "./StoryProgress";

export function moveIndex(current: number, direction: -1 | 1, count: number) {
  return (current + direction + count) % count;
}

export function BriefingBand({
  events,
  activeIndex,
  onSelect = () => undefined,
}: {
  events: readonly TodayEvent[];
  activeIndex: number;
  onSelect?: (index: number) => void;
}) {
  const event = events[activeIndex];
  const hasTraversal = events.length > 1;
  const move = (direction: -1 | 1) =>
    onSelect?.(moveIndex(activeIndex, direction, events.length));
  const onKeyDown = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (!hasTraversal) return;
    if (keyboardEvent.key === "ArrowLeft") move(-1);
    if (keyboardEvent.key === "ArrowRight") move(1);
  };

  return (
    <article
      className="briefing-band"
      aria-label="Active world event"
      tabIndex={hasTraversal ? 0 : undefined}
      onKeyDown={onKeyDown}
    >
      <div className="briefing-band__meta">
        <p>LENS / World briefing</p>
        <p>{hasTraversal
          ? `${String(activeIndex + 1).padStart(2, "0")} of ${String(events.length).padStart(2, "0")}`
          : "Today’s main issue"}</p>
      </div>
      <div className="briefing-band__story" aria-live="polite">
        <p className="briefing-band__category">{event.category} · Score {event.score}</p>
        <h2>{event.title}</h2>
        <p>{event.summary}</p>
      </div>
      <div className="briefing-band__source">
        <p>{event.source}</p>
        <p>Selected by LENS v1</p>
        <a href={`#event/${event.id}`}>Read the full briefing →</a>
      </div>
      {hasTraversal && (
        <>
          <button
            className="briefing-arrow briefing-arrow--previous"
            type="button"
            aria-label="Previous event"
            onClick={() => move(-1)}
          >←</button>
          <StoryProgress
            eventIds={events.map(({ id }) => id)}
            activeIndex={activeIndex}
            onSelect={onSelect}
          />
          <button
            className="briefing-arrow briefing-arrow--next"
            type="button"
            aria-label="Next event"
            onClick={() => move(1)}
          >→</button>
        </>
      )}
    </article>
  );
}
