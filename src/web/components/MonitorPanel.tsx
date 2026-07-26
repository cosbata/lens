import type { TodayEvent } from "../map/briefing-fixture";
import { EventMedia } from "./EventMedia";

type MonitorProps = {
  events: readonly TodayEvent[];
  active?: TodayEvent;
  liveState: "live" | "polling" | "offline";
  onSelect: (id: string) => void;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function displayUpdatedAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value;
  return `${MONTHS[Number(value.slice(5, 7)) - 1]} ${Number(value.slice(8, 10))} · ${value.slice(11, 16)} UTC`;
}

export function MonitorWatchlist({
  events,
  active,
  liveState,
  onSelect,
  expanded,
  onExpandedChange,
  title = "World watchlist",
}: MonitorProps & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  title?: string;
}) {
  return (
    <aside className="monitor-watchlist" aria-label="Current world events">
      <header>
        <button
          className="monitor-watchlist__toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="current-event-feed"
          onClick={() => onExpandedChange(!expanded)}
        >
          <div>
            <p>{title}</p>
            <strong>{events.length} events</strong>
          </div>
          <span className={`monitor-panel__state monitor-panel__state--${liveState}`}>
            {liveState}
          </span>
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
      </header>
      {expanded && (events.length ? (
        <ol id="current-event-feed" className="monitor-feed" aria-label="Current event feed">
          {events.map((event, index) => (
            <li key={event.id}>
              <button
                type="button"
                aria-pressed={active?.id === event.id}
                onClick={() => onSelect(event.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <small>{event.category} · {event.updatedAt}</small>
                  <strong>{event.title}</strong>
                </span>
                <b>{event.score.toFixed(0)}</b>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="monitor-empty" role="status">
          <strong>No selected events match.</strong>
          <p>Clear the search or choose another category.</p>
        </div>
      ))}
    </aside>
  );
}

export function MonitorPanel({ events, active, onSelect }: MonitorProps) {
  if (!active) return null;
  const index = events.findIndex(({ id }) => id === active.id);
  const selectOffset = (offset: -1 | 1) =>
    onSelect(events[(index + offset + events.length) % events.length].id);

  return (
    <aside className="monitor-panel" aria-label="Selected event details">
      <header>
        <div>
          <p>Selected event</p>
          <strong>{String(index + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}</strong>
        </div>
        <nav aria-label="Browse selected events">
          <button type="button" aria-label="Previous selected event" onClick={() => selectOffset(-1)}>←</button>
          <button type="button" aria-label="Next selected event" onClick={() => selectOffset(1)}>→</button>
        </nav>
      </header>
      <article className="monitor-detail" key={active.id} aria-live="polite">
        <p>{active.chapter}</p>
        <h2>{active.title}</h2>
        <EventMedia media={active.media} variant="dark" className="monitor-detail__media" />
        <p className="monitor-detail__summary">{active.summary}</p>
        <dl>
          <div><dt>Selection score</dt><dd>{active.score.toFixed(1)}</dd></div>
          <div><dt>Updated</dt><dd><time dateTime={active.updatedAt}>{displayUpdatedAt(active.updatedAt)}</time></dd></div>
          <div><dt>Independent sources</dt><dd>{active.sourceCount ?? active.evidence.length}</dd></div>
          <div><dt>Map precision</dt><dd>{(active.locationPrecision ?? "provider exact").replaceAll("_", " ")}</dd></div>
        </dl>
        {active.locationDisplayName && (
          <p className="monitor-detail__location">◎ {active.locationDisplayName}</p>
        )}
        <section>
          <h3>Why it matters</h3>
          <p>{active.whyItMatters}</p>
        </section>
        {active.scoreReasons?.length ? (
          <details className="monitor-detail__score">
            <summary>Why this score</summary>
            <ul>
              {active.scoreReasons.slice(0, 4).map((reason) => (
                <li key={reason}>{reason.replaceAll("_", " ").replaceAll(".", " · ")}</li>
              ))}
            </ul>
            <p>{active.scoreVersion}</p>
          </details>
        ) : null}
        <div className="monitor-detail__actions">
          <a href="#compare">Watch 24h movement</a>
          <a href={`#event/${active.id}`}>Open full briefing</a>
        </div>
        <footer><span>{active.source}</span></footer>
      </article>
    </aside>
  );
}
