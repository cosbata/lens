import type { TodayEvent } from "./briefing-fixture";
import { PlaybackControls } from "../components/PlaybackControls";
import { WorldMap } from "./WorldMap";
import { temporalMapState } from "./temporal";
import type { TimelineMarker } from "./temporal";

export function ComparisonLayer({
  events,
  at,
  activeId,
  onActivate,
  timeline,
}: {
  events: readonly TodayEvent[];
  at: string;
  activeId: string;
  onActivate: (id: string) => void;
  timeline: {
    time: number;
    playing: boolean;
    onTimeChange: (time: number) => void;
    onPlayingChange: (playing: boolean) => void;
    markers: readonly TimelineMarker[];
    onMarkerSelect: (marker: TimelineMarker) => void;
  };
}) {
  const active = events.find(({ id }) => id === activeId) ?? events[0];
  const state = temporalMapState(active, at);
  return (
    <div className="comparison-map">
      <WorldMap
        events={events}
        activeId={activeId}
        onActivate={onActivate}
        temporalAt={at}
      />
      <div className="comparison-map__stamp" aria-live="polite">
        <span>{at.slice(11, 16)} UTC</span>
        <strong>{state.observationCount || "Latest"} attributable observation{state.observationCount === 1 ? "" : "s"}</strong>
      </div>
      <div className="comparison-map__legend" aria-label="Map legend">
        <span><i className="legend-line" />{active.traceLabel ?? "Observed trace"}</span>
      </div>
      <PlaybackControls
        time={timeline.time}
        timestamp={at.slice(11, 16)}
        playing={timeline.playing}
        onTimeChange={timeline.onTimeChange}
        onPlayingChange={timeline.onPlayingChange}
        markers={timeline.markers}
        onMarkerSelect={timeline.onMarkerSelect}
      />
    </div>
  );
}
