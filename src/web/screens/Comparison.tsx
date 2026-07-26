import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventChange } from "../../core/compare/snapshots";
import { ComparisonLayer } from "../map/ComparisonLayer";
import { EventMedia } from "../components/EventMedia";
import { TEMPORAL_DEMO_EVENTS } from "../map/briefing-fixture";
import {
  temporalMapState,
  timelineMarkers,
  timeAtStep,
  type TimelineMarker,
} from "../map/temporal";
import "../styles/comparison.css";

export const COMPARISON_CHANGES: readonly EventChange[] = [
  {
    eventId: "route-red-sea",
    title: TEMPORAL_DEMO_EVENTS[0].title,
    category: "supply-chains",
    status: "changed",
    beforeScore: 69.3,
    afterScore: 86.4,
    delta: 17.1,
  },
  {
    eventId: "security-b",
    title: TEMPORAL_DEMO_EVENTS[1].title,
    category: "disasters",
    status: "easing",
    beforeScore: 78.6,
    afterScore: 68.2,
    delta: -10.4,
  },
  {
    eventId: "economy-c",
    title: TEMPORAL_DEMO_EVENTS[2].title,
    category: "economy",
    status: "added",
    beforeScore: null,
    afterScore: 66.1,
    delta: null,
  },
];
const END_AT = "2026-07-25T09:41:00Z";

function signedScore(change: EventChange) {
  if (change.status === "added") return "New";
  if (change.status === "resolved") return "Resolved";
  return `${change.delta! > 0 ? "+" : "−"}${Math.abs(change.delta!).toFixed(1)}`;
}

export function Comparison() {
  const [step, setStep] = useState(24);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeId, setActiveId] = useState(COMPARISON_CHANGES[0].eventId);
  const markers = useMemo(
    () => timelineMarkers(TEMPORAL_DEMO_EVENTS, END_AT),
    [],
  );
  const changeStep = useCallback((next: number) => setStep(next), []);
  const changePlaying = useCallback((next: boolean) => {
    if (next) setStep((current) => current >= 24 ? 0 : current);
    setPlaying(next);
  }, []);
  const selectMarker = useCallback((marker: TimelineMarker) => {
    setPlaying(false);
    setActiveId(marker.eventId);
    setStep(marker.step);
  }, []);
  const activateEvent = useCallback((eventId: string) => {
    setActiveId(eventId);
    const latest = [...markers].reverse().find((marker) => marker.eventId === eventId);
    if (latest) {
      setPlaying(false);
      setStep(latest.step);
    }
  }, [markers]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        const next = Math.min(24, current + speed * 0.05);
        if (next >= 24) setPlaying(false);
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, speed]);
  const timeline = useMemo(() => ({
    time: step,
    playing,
    speed,
    onTimeChange: changeStep,
    onPlayingChange: changePlaying,
    onSpeedChange: setSpeed,
    markers,
    onMarkerSelect: selectMarker,
  }), [changePlaying, changeStep, markers, playing, selectMarker, speed, step]);
  const active = useMemo(
    () => COMPARISON_CHANGES.find(({ eventId }) => eventId === activeId) ?? COMPARISON_CHANGES[0],
    [activeId],
  );
  const activeEvent = TEMPORAL_DEMO_EVENTS.find(({ id }) => id === activeId) ?? TEMPORAL_DEMO_EVENTS[0];
  const at = timeAtStep(END_AT, step);
  const mapState = temporalMapState(activeEvent, at);

  return (
    <main className="comparison">
      <a className="skip-link" href="#comparison-title">Skip to comparison</a>
      <header className="event-story__header">
        <a className="wordmark" href="#briefing" aria-label="Back to LENS briefing">LENS</a>
        <p>What changed in the last 24 hours</p>
        <nav aria-label="Comparison actions">
          <a href="#method">Method</a>
          <a href="#briefing">Close</a>
        </nav>
      </header>
      <div className="comparison__layout">
        <aside className="comparison-panel" aria-labelledby="comparison-title">
          <p className="comparison-panel__chapter">24-hour playback · 09:41 UTC</p>
          <h1 id="comparison-title">Watch the world change, hour by hour.</h1>
          <p className="comparison-panel__lead">
            Play or scrub the last 24 hours. Motion is visually interpolated only
            between dated observations; a single confirmed location remains a point.
          </p>
          <div className="comparison-toggle" aria-label="Jump through the timeline">
            <button type="button" className={step === 0 ? "is-active" : ""} onClick={() => { setPlaying(false); setStep(0); }}>
              24 hours ago
            </button>
            <button type="button" className={step === 24 ? "is-active" : ""} onClick={() => { setPlaying(false); setStep(24); }}>
              Now
            </button>
          </div>
          <ol className="change-list">
            {COMPARISON_CHANGES.map((change, index) => (
              <li key={change.eventId}>
                <button
                  type="button"
                  aria-pressed={active.eventId === change.eventId}
                  onClick={() => activateEvent(change.eventId)}
                >
                  <span className="change-list__number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <small>{change.category.replace("-", " ")} · {change.status}</small>
                    <strong>{change.title}</strong>
                  </span>
                  <b className={`change-score change-score--${change.status}`}>
                    {signedScore(change)}
                  </b>
                </button>
              </li>
            ))}
          </ol>
          <section className="change-detail" aria-live="polite">
            <p>{active.status} · Selection score</p>
            <h2>{active.title}</h2>
            <p className="change-detail__temporal">
              {mapState.trace
                ? `${mapState.observationCount} observed positions through ${mapState.observedAt?.slice(11, 16)} UTC`
                : "No attributable movement trace is available for this event."}
            </p>
            <EventMedia media={activeEvent.media} variant="light" className="change-detail__media" />
            <dl>
              <div><dt>24 hours ago</dt><dd>{active.beforeScore?.toFixed(1) ?? "Not selected"}</dd></div>
              <div><dt>Now</dt><dd>{active.afterScore?.toFixed(1) ?? "No longer selected"}</dd></div>
            </dl>
            <a href={active.status === "resolved" ? "#briefing" : `#event/${active.eventId}`}>
              {active.status === "resolved" ? "Return to current briefing" : "Read the event story"} →
            </a>
          </section>
          <footer>
            <span>{activeEvent.timelineSource === "fixture" ? "Demonstration data" : "Live source data"}</span>
            <span>Visual interpolation · No forecasts</span>
          </footer>
        </aside>
        <section className="comparison__map" aria-label="24-hour event comparison map">
          <ComparisonLayer
            events={TEMPORAL_DEMO_EVENTS}
            at={at}
            activeId={activeId}
            onActivate={activateEvent}
            timeline={timeline}
          />
        </section>
      </div>
    </main>
  );
}
